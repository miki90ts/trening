const pool = require("../db/connection");
const { httpError } = require("../helpers/httpError");
const {
  toInt,
  toDecimal,
  toSqlDateTime,
  calcPaceSecondsPerKm,
  canAccessUserId,
} = require("../helpers/activities");

const TARGET_TYPES = ["distance", "duration"];
const TARGET_METRICS = ["none", "pace", "hr", "cadence"];
const RECOVERY_TYPES = ["none", "distance", "duration"];
const SEGMENT_TYPES = ["warmup", "run", "recover", "rest", "cooldown", "other"];
const SEGMENT_TYPE_LABELS = {
  warmup: "Warm up",
  run: "Run",
  recover: "Recover",
  rest: "Rest",
  cooldown: "Cool down",
  other: "Other",
};
const SESSION_STATUSES = ["scheduled", "in_progress", "completed", "skipped"];

function parsePositiveInt(value, field, { allowNull = true } = {}) {
  if (value === undefined || value === null || value === "") {
    if (allowNull) return null;
    throw httpError(400, `${field} je obavezan`);
  }
  const parsed = toInt(value);
  if (!parsed || parsed <= 0) {
    throw httpError(400, `${field} mora biti broj > 0`);
  }
  return parsed;
}

function parseOptionalDecimal(value, field) {
  if (value === undefined || value === null || value === "") return null;
  const parsed = toDecimal(value);
  if (parsed === null || parsed < 0) {
    throw httpError(400, `${field} mora biti broj >= 0`);
  }
  return parsed;
}

function parseOptionalInt(value, field) {
  if (value === undefined || value === null || value === "") return null;
  const parsed = toInt(value);
  if (parsed === null || parsed < 0) {
    throw httpError(400, `${field} mora biti broj >= 0`);
  }
  return parsed;
}

function calcSpeedKmh(distanceMeters, durationSeconds) {
  if (!distanceMeters || !durationSeconds) return null;
  return Number(((distanceMeters / durationSeconds) * 3.6).toFixed(2));
}

function getSegmentTypeLabel(type) {
  return SEGMENT_TYPE_LABELS[type] || SEGMENT_TYPE_LABELS.other;
}

function buildPlanSegmentTitle(segmentType, label) {
  const base = getSegmentTypeLabel(segmentType);
  const trimmedLabel = String(label || "").trim();
  return trimmedLabel ? `${base} · ${trimmedLabel}` : base;
}

function buildSessionSegmentTitle(segment, options = {}) {
  const {
    segmentKind = "work",
    groupIndex = null,
    groupTotal = null,
    repeatIndex = null,
    repeatTotal = null,
  } = options;

  const baseTitle = buildPlanSegmentTitle(segment.segment_type, segment.label);
  const tags = [];
  if (groupTotal && groupTotal > 1 && groupIndex) {
    tags.push(`Set ${groupIndex}/${groupTotal}`);
  }
  if (repeatTotal && repeatTotal > 1 && repeatIndex) {
    tags.push(`Rep ${repeatIndex}/${repeatTotal}`);
  }

  if (segmentKind === "recovery") {
    return tags.length > 0
      ? `Recovery posle ${baseTitle} · ${tags.join(" · ")}`
      : `Recovery posle ${baseTitle}`;
  }

  if (segmentKind === "set_recovery") {
    return groupTotal && groupTotal > 1 && groupIndex
      ? `Recovery između setova · posle seta ${groupIndex}/${groupTotal}`
      : "Recovery između setova";
  }

  return tags.length > 0 ? `${baseTitle} · ${tags.join(" · ")}` : baseTitle;
}

function normalizeSegments(segments) {
  if (!Array.isArray(segments) || segments.length === 0) {
    throw httpError(400, "Plan mora imati bar jedan segment");
  }

  return segments.map((segment, index) => {
    const segmentType = SEGMENT_TYPES.includes(segment.segment_type)
      ? segment.segment_type
      : "run";
    const label = String(segment.label || "").trim() || null;
    const title = buildPlanSegmentTitle(segmentType, label);

    const targetType = TARGET_TYPES.includes(segment.target_type)
      ? segment.target_type
      : "distance";

    const targetMetric = TARGET_METRICS.includes(segment.target_metric)
      ? segment.target_metric
      : "none";

    const targetDistanceMeters =
      targetType === "distance"
        ? parsePositiveInt(
            segment.target_distance_meters,
            `Segment #${index + 1}: target_distance_meters`,
            { allowNull: false },
          )
        : null;

    const targetDurationSeconds =
      targetType === "duration"
        ? parsePositiveInt(
            segment.target_duration_seconds,
            `Segment #${index + 1}: target_duration_seconds`,
            { allowNull: false },
          )
        : null;

    const paceMin =
      targetMetric === "pace"
        ? parseOptionalDecimal(
            segment.target_pace_min_sec_per_km,
            `Segment #${index + 1}: target_pace_min_sec_per_km`,
          )
        : null;
    const paceMax =
      targetMetric === "pace"
        ? parseOptionalDecimal(
            segment.target_pace_max_sec_per_km,
            `Segment #${index + 1}: target_pace_max_sec_per_km`,
          )
        : null;
    if (paceMin !== null && paceMax !== null && paceMin > paceMax) {
      throw httpError(
        400,
        `Segment #${index + 1}: min pace ne može biti veći od max pace`,
      );
    }
    if (targetMetric === "pace" && paceMin === null && paceMax === null) {
      throw httpError(
        400,
        `Segment #${index + 1}: unesi bar jedan pace target`,
      );
    }

    const hrMin =
      targetMetric === "hr"
        ? parseOptionalInt(
            segment.target_hr_min,
            `Segment #${index + 1}: target_hr_min`,
          )
        : null;
    const hrMax =
      targetMetric === "hr"
        ? parseOptionalInt(
            segment.target_hr_max,
            `Segment #${index + 1}: target_hr_max`,
          )
        : null;
    if (hrMin !== null && hrMax !== null && hrMin > hrMax) {
      throw httpError(
        400,
        `Segment #${index + 1}: min HR ne može biti veći od max HR`,
      );
    }
    if (targetMetric === "hr" && hrMin === null && hrMax === null) {
      throw httpError(400, `Segment #${index + 1}: unesi bar jedan HR target`);
    }

    const cadenceMin =
      targetMetric === "cadence"
        ? parseOptionalInt(
            segment.target_cadence_min,
            `Segment #${index + 1}: target_cadence_min`,
          )
        : null;
    const cadenceMax =
      targetMetric === "cadence"
        ? parseOptionalInt(
            segment.target_cadence_max,
            `Segment #${index + 1}: target_cadence_max`,
          )
        : null;
    if (cadenceMin !== null && cadenceMax !== null && cadenceMin > cadenceMax) {
      throw httpError(
        400,
        `Segment #${index + 1}: min cadence ne može biti veći od max cadence`,
      );
    }
    if (
      targetMetric === "cadence" &&
      cadenceMin === null &&
      cadenceMax === null
    ) {
      throw httpError(
        400,
        `Segment #${index + 1}: unesi bar jedan cadence target`,
      );
    }

    const repeatCount = parsePositiveInt(
      segment.repeat_count || 1,
      `Segment #${index + 1}: repeat_count`,
      { allowNull: false },
    );

    const recoveryType = RECOVERY_TYPES.includes(segment.recovery_type)
      ? segment.recovery_type
      : "none";

    const recoveryDistanceMeters =
      recoveryType === "distance"
        ? parsePositiveInt(
            segment.recovery_distance_meters,
            `Segment #${index + 1}: recovery_distance_meters`,
            { allowNull: false },
          )
        : null;

    const recoveryDurationSeconds =
      recoveryType === "duration"
        ? parsePositiveInt(
            segment.recovery_duration_seconds,
            `Segment #${index + 1}: recovery_duration_seconds`,
            { allowNull: false },
          )
        : null;

    const groupRepeatCount = parsePositiveInt(
      segment.group_repeat_count || 1,
      `Segment #${index + 1}: group_repeat_count`,
      { allowNull: false },
    );

    const groupRecoveryType =
      groupRepeatCount > 1 &&
      RECOVERY_TYPES.includes(segment.group_recovery_type)
        ? segment.group_recovery_type
        : "none";

    const groupRecoveryDistanceMeters =
      groupRecoveryType === "distance"
        ? parsePositiveInt(
            segment.group_recovery_distance_meters,
            `Segment #${index + 1}: group_recovery_distance_meters`,
            { allowNull: false },
          )
        : null;

    const groupRecoveryDurationSeconds =
      groupRecoveryType === "duration"
        ? parsePositiveInt(
            segment.group_recovery_duration_seconds,
            `Segment #${index + 1}: group_recovery_duration_seconds`,
            { allowNull: false },
          )
        : null;

    return {
      segment_order: index + 1,
      segment_type: segmentType,
      label,
      title,
      target_type: targetType,
      target_metric: targetMetric,
      target_distance_meters: targetDistanceMeters,
      target_duration_seconds: targetDurationSeconds,
      target_pace_min_sec_per_km: paceMin,
      target_pace_max_sec_per_km: paceMax,
      target_hr_min: hrMin,
      target_hr_max: hrMax,
      target_cadence_min: cadenceMin,
      target_cadence_max: cadenceMax,
      repeat_count: repeatCount,
      recovery_type: recoveryType,
      recovery_distance_meters: recoveryDistanceMeters,
      recovery_duration_seconds: recoveryDurationSeconds,
      group_repeat_count: groupRepeatCount,
      group_recovery_type: groupRecoveryType,
      group_recovery_distance_meters: groupRecoveryDistanceMeters,
      group_recovery_duration_seconds: groupRecoveryDurationSeconds,
      notes: segment.notes || null,
    };
  });
}

async function ensureActivityType(conn, activityTypeId) {
  const parsedId = parsePositiveInt(activityTypeId, "activity_type_id", {
    allowNull: false,
  });
  const [rows] = await conn.query(
    "SELECT id, is_active FROM activity_types WHERE id = ?",
    [parsedId],
  );
  if (rows.length === 0 || !rows[0].is_active) {
    throw httpError(404, "Tip aktivnosti nije pronađen");
  }
  return parsedId;
}

function expandPlanSegments(planSegments) {
  const expanded = [];
  let order = 1;

  planSegments.forEach((segment) => {
    const groupRepeatCount = Math.max(
      1,
      parseInt(segment.group_repeat_count, 10) || 1,
    );
    const repeatCount = Math.max(1, parseInt(segment.repeat_count, 10) || 1);

    for (let groupIndex = 1; groupIndex <= groupRepeatCount; groupIndex += 1) {
      for (let rep = 1; rep <= repeatCount; rep += 1) {
        expanded.push({
          plan_segment_id: segment.id,
          segment_order: order,
          segment_kind: "work",
          group_index: groupRepeatCount > 1 ? groupIndex : null,
          group_total: groupRepeatCount > 1 ? groupRepeatCount : null,
          repeat_index: repeatCount > 1 ? rep : null,
          repeat_total: repeatCount > 1 ? repeatCount : null,
          segment_type: segment.segment_type || "run",
          label: segment.label || null,
          title: buildSessionSegmentTitle(segment, {
            segmentKind: "work",
            groupIndex,
            groupTotal: groupRepeatCount,
            repeatIndex: rep,
            repeatTotal: repeatCount,
          }),
          target_type: segment.target_type,
          target_metric: segment.target_metric || "none",
          target_distance_meters: segment.target_distance_meters,
          target_duration_seconds: segment.target_duration_seconds,
          target_pace_min_sec_per_km: segment.target_pace_min_sec_per_km,
          target_pace_max_sec_per_km: segment.target_pace_max_sec_per_km,
          target_hr_min: segment.target_hr_min,
          target_hr_max: segment.target_hr_max,
          target_cadence_min: segment.target_cadence_min,
          target_cadence_max: segment.target_cadence_max,
          notes: segment.notes || null,
        });
        order += 1;

        if (segment.recovery_type !== "none" && rep < repeatCount) {
          expanded.push({
            plan_segment_id: segment.id,
            segment_order: order,
            segment_kind: "recovery",
            group_index: groupRepeatCount > 1 ? groupIndex : null,
            group_total: groupRepeatCount > 1 ? groupRepeatCount : null,
            repeat_index: rep,
            repeat_total: repeatCount > 1 ? repeatCount : null,
            segment_type: "recover",
            label: null,
            title: buildSessionSegmentTitle(segment, {
              segmentKind: "recovery",
              groupIndex,
              groupTotal: groupRepeatCount,
              repeatIndex: rep,
              repeatTotal: repeatCount,
            }),
            target_type: segment.recovery_type,
            target_metric: "none",
            target_distance_meters: segment.recovery_distance_meters,
            target_duration_seconds: segment.recovery_duration_seconds,
            target_pace_min_sec_per_km: null,
            target_pace_max_sec_per_km: null,
            target_hr_min: null,
            target_hr_max: null,
            target_cadence_min: null,
            target_cadence_max: null,
            notes: null,
          });
          order += 1;
        }
      }

      if (
        segment.group_recovery_type !== "none" &&
        groupIndex < groupRepeatCount
      ) {
        expanded.push({
          plan_segment_id: segment.id,
          segment_order: order,
          segment_kind: "set_recovery",
          group_index: groupIndex,
          group_total: groupRepeatCount > 1 ? groupRepeatCount : null,
          repeat_index: null,
          repeat_total: null,
          segment_type: "recover",
          label: null,
          title: buildSessionSegmentTitle(segment, {
            segmentKind: "set_recovery",
            groupIndex,
            groupTotal: groupRepeatCount,
          }),
          target_type: segment.group_recovery_type,
          target_metric: "none",
          target_distance_meters: segment.group_recovery_distance_meters,
          target_duration_seconds: segment.group_recovery_duration_seconds,
          target_pace_min_sec_per_km: null,
          target_pace_max_sec_per_km: null,
          target_hr_min: null,
          target_hr_max: null,
          target_cadence_min: null,
          target_cadence_max: null,
          notes: null,
        });
        order += 1;
      }
    }
  });

  return expanded;
}

async function getPlans(user) {
  const [rows] = await pool.query(
    `SELECT ap.*, at.name AS activity_type_name, at.code AS activity_type_code,
            COUNT(aps.id) AS segment_count
     FROM activity_plans ap
     JOIN activity_types at ON at.id = ap.activity_type_id
     LEFT JOIN activity_plan_segments aps ON aps.plan_id = ap.id
     WHERE ap.user_id = ?
     GROUP BY ap.id
     ORDER BY ap.updated_at DESC, ap.id DESC`,
    [user.id],
  );
  return rows;
}

async function getPlanById(planId, user) {
  const parsedPlanId = parsePositiveInt(planId, "plan_id", {
    allowNull: false,
  });
  const [rows] = await pool.query(
    `SELECT ap.*, at.name AS activity_type_name, at.code AS activity_type_code
     FROM activity_plans ap
     JOIN activity_types at ON at.id = ap.activity_type_id
     WHERE ap.id = ? AND ap.user_id = ?`,
    [parsedPlanId, user.id],
  );
  if (rows.length === 0) {
    throw httpError(404, "Plan aktivnosti nije pronađen");
  }

  const plan = rows[0];
  const [segments] = await pool.query(
    `SELECT * FROM activity_plan_segments
     WHERE plan_id = ?
     ORDER BY segment_order ASC`,
    [plan.id],
  );
  plan.segments = segments;
  return plan;
}

async function createPlan(user, body) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const name = String(body.name || "").trim();
    if (!name) {
      throw httpError(400, "Naziv plana je obavezan");
    }

    const activityTypeId = await ensureActivityType(
      conn,
      body.activity_type_id,
    );
    const segments = normalizeSegments(body.segments);

    const [insertPlan] = await conn.query(
      `INSERT INTO activity_plans (user_id, activity_type_id, name, description, color)
       VALUES (?, ?, ?, ?, ?)`,
      [
        user.id,
        activityTypeId,
        name,
        body.description || null,
        body.color || "#3b82f6",
      ],
    );

    for (const segment of segments) {
      await conn.query(
        `INSERT INTO activity_plan_segments (
          plan_id, segment_order, segment_type, label, title, target_type, target_metric,
          target_distance_meters, target_duration_seconds, target_pace_min_sec_per_km,
          target_pace_max_sec_per_km, target_hr_min, target_hr_max,
          target_cadence_min, target_cadence_max, repeat_count, recovery_type,
          recovery_distance_meters, recovery_duration_seconds, group_repeat_count,
          group_recovery_type, group_recovery_distance_meters,
          group_recovery_duration_seconds, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          insertPlan.insertId,
          segment.segment_order,
          segment.segment_type,
          segment.label,
          segment.title,
          segment.target_type,
          segment.target_metric,
          segment.target_distance_meters,
          segment.target_duration_seconds,
          segment.target_pace_min_sec_per_km,
          segment.target_pace_max_sec_per_km,
          segment.target_hr_min,
          segment.target_hr_max,
          segment.target_cadence_min,
          segment.target_cadence_max,
          segment.repeat_count,
          segment.recovery_type,
          segment.recovery_distance_meters,
          segment.recovery_duration_seconds,
          segment.group_repeat_count,
          segment.group_recovery_type,
          segment.group_recovery_distance_meters,
          segment.group_recovery_duration_seconds,
          segment.notes,
        ],
      );
    }

    await conn.commit();
    return { id: insertPlan.insertId, message: "Plan aktivnosti kreiran" };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

async function updatePlan(planId, user, body) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const parsedPlanId = parsePositiveInt(planId, "plan_id", {
      allowNull: false,
    });

    const [existing] = await conn.query(
      "SELECT * FROM activity_plans WHERE id = ? AND user_id = ?",
      [parsedPlanId, user.id],
    );
    if (existing.length === 0) {
      throw httpError(404, "Plan aktivnosti nije pronađen");
    }

    const name = String(body.name || existing[0].name || "").trim();
    if (!name) {
      throw httpError(400, "Naziv plana je obavezan");
    }

    const activityTypeId = await ensureActivityType(
      conn,
      body.activity_type_id || existing[0].activity_type_id,
    );

    await conn.query(
      `UPDATE activity_plans
       SET activity_type_id = ?, name = ?, description = ?, color = ?, updated_at = NOW()
       WHERE id = ?`,
      [
        activityTypeId,
        name,
        body.description !== undefined
          ? body.description
          : existing[0].description,
        body.color || existing[0].color,
        parsedPlanId,
      ],
    );

    if (Array.isArray(body.segments)) {
      const segments = normalizeSegments(body.segments);
      await conn.query("DELETE FROM activity_plan_segments WHERE plan_id = ?", [
        parsedPlanId,
      ]);

      for (const segment of segments) {
        await conn.query(
          `INSERT INTO activity_plan_segments (
            plan_id, segment_order, segment_type, label, title, target_type, target_metric,
            target_distance_meters, target_duration_seconds, target_pace_min_sec_per_km,
            target_pace_max_sec_per_km, target_hr_min, target_hr_max,
            target_cadence_min, target_cadence_max, repeat_count, recovery_type,
            recovery_distance_meters, recovery_duration_seconds, group_repeat_count,
            group_recovery_type, group_recovery_distance_meters,
            group_recovery_duration_seconds, notes
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            parsedPlanId,
            segment.segment_order,
            segment.segment_type,
            segment.label,
            segment.title,
            segment.target_type,
            segment.target_metric,
            segment.target_distance_meters,
            segment.target_duration_seconds,
            segment.target_pace_min_sec_per_km,
            segment.target_pace_max_sec_per_km,
            segment.target_hr_min,
            segment.target_hr_max,
            segment.target_cadence_min,
            segment.target_cadence_max,
            segment.repeat_count,
            segment.recovery_type,
            segment.recovery_distance_meters,
            segment.recovery_duration_seconds,
            segment.group_repeat_count,
            segment.group_recovery_type,
            segment.group_recovery_distance_meters,
            segment.group_recovery_duration_seconds,
            segment.notes,
          ],
        );
      }
    }

    await conn.commit();
    return { message: "Plan aktivnosti ažuriran" };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

async function deletePlan(planId, user) {
  const parsedPlanId = parsePositiveInt(planId, "plan_id", {
    allowNull: false,
  });
  const [result] = await pool.query(
    "DELETE FROM activity_plans WHERE id = ? AND user_id = ?",
    [parsedPlanId, user.id],
  );
  if (result.affectedRows === 0) {
    throw httpError(404, "Plan aktivnosti nije pronađen");
  }
  return { message: "Plan aktivnosti obrisan" };
}

async function schedulePlan(planId, user, payload) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const parsedPlanId = parsePositiveInt(planId, "plan_id", {
      allowNull: false,
    });
    const scheduledDate = payload.scheduled_date;
    if (!scheduledDate) {
      throw httpError(400, "Datum je obavezan");
    }

    let targetUserId = user.id;
    if (user.role === "admin" && payload.user_id) {
      targetUserId = parsePositiveInt(payload.user_id, "user_id", {
        allowNull: false,
      });
      const [targetUsers] = await conn.query(
        "SELECT id FROM users WHERE id = ? AND is_approved = 1",
        [targetUserId],
      );
      if (targetUsers.length === 0) {
        throw httpError(404, "Korisnik nije pronađen");
      }
    }

    const [plans] = await conn.query(
      "SELECT * FROM activity_plans WHERE id = ? AND user_id = ?",
      [parsedPlanId, user.id],
    );
    if (plans.length === 0) {
      throw httpError(404, "Plan aktivnosti nije pronađen");
    }

    const [planSegments] = await conn.query(
      "SELECT * FROM activity_plan_segments WHERE plan_id = ? ORDER BY segment_order ASC",
      [parsedPlanId],
    );
    if (planSegments.length === 0) {
      throw httpError(400, "Plan nema nijedan segment");
    }

    const expandedSegments = expandPlanSegments(planSegments);
    const [insertSession] = await conn.query(
      `INSERT INTO activity_sessions (
        user_id, scheduled_by, plan_id, plan_name, activity_type_id, scheduled_date, status, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        targetUserId,
        user.id,
        parsedPlanId,
        plans[0].name,
        plans[0].activity_type_id,
        scheduledDate,
        "scheduled",
        null,
      ],
    );

    for (const segment of expandedSegments) {
      await conn.query(
        `INSERT INTO activity_session_segments (
          session_id, plan_segment_id, segment_order, segment_kind,
          group_index, group_total, repeat_index, repeat_total,
          segment_type, label, title, target_type, target_metric,
          target_distance_meters, target_duration_seconds,
          target_pace_min_sec_per_km, target_pace_max_sec_per_km,
          target_hr_min, target_hr_max, target_cadence_min, target_cadence_max, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          insertSession.insertId,
          segment.plan_segment_id,
          segment.segment_order,
          segment.segment_kind,
          segment.group_index,
          segment.group_total,
          segment.repeat_index,
          segment.repeat_total,
          segment.segment_type,
          segment.label,
          segment.title,
          segment.target_type,
          segment.target_metric,
          segment.target_distance_meters,
          segment.target_duration_seconds,
          segment.target_pace_min_sec_per_km,
          segment.target_pace_max_sec_per_km,
          segment.target_hr_min,
          segment.target_hr_max,
          segment.target_cadence_min,
          segment.target_cadence_max,
          segment.notes,
        ],
      );
    }

    await conn.commit();
    return { id: insertSession.insertId, message: "Plan aktivnosti zakazan" };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

async function getSessionsList(user, query) {
  const { status } = query;
  let where =
    "WHERE (s.user_id = ? OR (? = 'admin' AND s.scheduled_by = ? AND s.user_id <> ?))";
  const values = [user.id, user.role || "user", user.id, user.id];

  if (status) {
    if (!SESSION_STATUSES.includes(status)) {
      throw httpError(400, "Status nije validan");
    }
    where += " AND s.status = ?";
    values.push(status);
  }

  const [rows] = await pool.query(
    `SELECT s.*, s.user_id AS assigned_user_id,
            assigned.first_name AS assigned_first_name,
            assigned.last_name AS assigned_last_name,
            assigned.nickname AS assigned_nickname,
            sender.first_name AS scheduled_by_first_name,
            sender.last_name AS scheduled_by_last_name,
            sender.nickname AS scheduled_by_nickname,
            at.name AS activity_type_name,
            CASE
              WHEN s.scheduled_by = ? AND s.user_id <> ? THEN 'sent_to_other'
              WHEN s.user_id = ? AND s.scheduled_by IS NOT NULL AND s.scheduled_by <> ? THEN 'sent_to_me'
              WHEN s.user_id = ? THEN 'my_plan'
              ELSE 'other'
            END AS session_type,
            COUNT(ss.id) AS segment_count,
            COALESCE(SUM(ss.is_completed), 0) AS completed_segments
     FROM activity_sessions s
     JOIN activity_types at ON at.id = s.activity_type_id
     LEFT JOIN users assigned ON assigned.id = s.user_id
     LEFT JOIN users sender ON sender.id = s.scheduled_by
     LEFT JOIN activity_session_segments ss ON ss.session_id = s.id
     ${where}
     GROUP BY s.id
     ORDER BY s.scheduled_date DESC, s.id DESC`,
    [user.id, user.id, user.id, user.id, user.id, ...values],
  );

  return rows;
}

async function getSessionById(sessionId, user) {
  const parsedSessionId = parsePositiveInt(sessionId, "sessionId", {
    allowNull: false,
  });
  const [rows] = await pool.query(
    `SELECT s.*, s.user_id AS assigned_user_id,
            assigned.first_name AS assigned_first_name,
            assigned.last_name AS assigned_last_name,
            assigned.nickname AS assigned_nickname,
            sender.first_name AS scheduled_by_first_name,
            sender.last_name AS scheduled_by_last_name,
            sender.nickname AS scheduled_by_nickname,
            at.name AS activity_type_name,
            at.code AS activity_type_code,
            CASE
              WHEN s.scheduled_by = ? AND s.user_id <> ? THEN 'sent_to_other'
              WHEN s.user_id = ? AND s.scheduled_by IS NOT NULL AND s.scheduled_by <> ? THEN 'sent_to_me'
              WHEN s.user_id = ? THEN 'my_plan'
              ELSE 'other'
            END AS session_type
     FROM activity_sessions s
     JOIN activity_types at ON at.id = s.activity_type_id
     LEFT JOIN users assigned ON assigned.id = s.user_id
     LEFT JOIN users sender ON sender.id = s.scheduled_by
     WHERE s.id = ? AND (s.user_id = ? OR s.scheduled_by = ?)`,
    [
      user.id,
      user.id,
      user.id,
      user.id,
      user.id,
      parsedSessionId,
      user.id,
      user.id,
    ],
  );
  if (rows.length === 0) {
    throw httpError(404, "Activity session nije pronađen");
  }

  const session = rows[0];
  const [segments] = await pool.query(
    `SELECT * FROM activity_session_segments
     WHERE session_id = ?
     ORDER BY segment_order ASC`,
    [session.id],
  );
  session.segments = segments;
  return session;
}

async function startSession(sessionId, user) {
  const parsedSessionId = parsePositiveInt(sessionId, "sessionId", {
    allowNull: false,
  });
  const [rows] = await pool.query(
    "SELECT * FROM activity_sessions WHERE id = ? AND user_id = ?",
    [parsedSessionId, user.id],
  );
  if (rows.length === 0) {
    throw httpError(404, "Activity session nije pronađen");
  }
  if (rows[0].status === "completed") {
    throw httpError(400, "Sesija je već završena");
  }

  await pool.query(
    "UPDATE activity_sessions SET status = 'in_progress', started_at = NOW() WHERE id = ?",
    [parsedSessionId],
  );
  return { message: "Activity session započet" };
}

async function updateSession(sessionId, user, payload) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const parsedSessionId = parsePositiveInt(sessionId, "sessionId", {
      allowNull: false,
    });

    const [sessions] = await conn.query(
      "SELECT * FROM activity_sessions WHERE id = ? AND user_id = ?",
      [parsedSessionId, user.id],
    );
    if (sessions.length === 0) {
      throw httpError(404, "Activity session nije pronađen");
    }
    if (sessions[0].status === "completed") {
      throw httpError(400, "Sesija je već završena, ne može se menjati.");
    }

    if (payload.notes !== undefined) {
      await conn.query("UPDATE activity_sessions SET notes = ? WHERE id = ?", [
        payload.notes || null,
        parsedSessionId,
      ]);
    }

    if (Array.isArray(payload.segments)) {
      for (const segment of payload.segments) {
        if (!segment.id) continue;
        await conn.query(
          `UPDATE activity_session_segments
           SET actual_distance_meters = ?, actual_duration_seconds = ?,
               actual_avg_hr = ?, actual_avg_cadence = ?, is_completed = ?, notes = ?
           WHERE id = ? AND session_id = ?`,
          [
            segment.actual_distance_meters !== undefined &&
            segment.actual_distance_meters !== null &&
            segment.actual_distance_meters !== ""
              ? parsePositiveInt(
                  segment.actual_distance_meters,
                  "actual_distance_meters",
                )
              : null,
            segment.actual_duration_seconds !== undefined &&
            segment.actual_duration_seconds !== null &&
            segment.actual_duration_seconds !== ""
              ? parsePositiveInt(
                  segment.actual_duration_seconds,
                  "actual_duration_seconds",
                )
              : null,
            parseOptionalInt(segment.actual_avg_hr, "actual_avg_hr"),
            parseOptionalInt(segment.actual_avg_cadence, "actual_avg_cadence"),
            segment.is_completed ? 1 : 0,
            segment.notes || null,
            segment.id,
            parsedSessionId,
          ],
        );
      }
    }

    await conn.commit();
    return { message: "Activity session ažuriran" };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

async function completeSession(sessionId, user) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const parsedSessionId = parsePositiveInt(sessionId, "sessionId", {
      allowNull: false,
    });

    const [sessions] = await conn.query(
      "SELECT * FROM activity_sessions WHERE id = ? AND user_id = ?",
      [parsedSessionId, user.id],
    );
    if (sessions.length === 0) {
      throw httpError(404, "Activity session nije pronađen");
    }
    if (sessions[0].status === "completed") {
      throw httpError(400, "Sesija je već završena");
    }

    const session = sessions[0];
    const [segments] = await conn.query(
      `SELECT * FROM activity_session_segments
       WHERE session_id = ?
       ORDER BY segment_order ASC`,
      [parsedSessionId],
    );

    const completedSegments = segments.filter((segment) => {
      if (!segment.is_completed) return false;
      const duration = Number(segment.actual_duration_seconds || 0);
      const distance = Number(segment.actual_distance_meters || 0);
      if (duration <= 0) return false;
      return distance > 0 || segment.target_type === "duration";
    });

    if (completedSegments.length === 0) {
      throw httpError(
        400,
        "Označi bar jedan segment sa stvarnim vremenom ili distancom.",
      );
    }

    const totalDistance = completedSegments.reduce(
      (sum, segment) => sum + Number(segment.actual_distance_meters || 0),
      0,
    );
    const totalDuration = completedSegments.reduce(
      (sum, segment) => sum + Number(segment.actual_duration_seconds || 0),
      0,
    );
    const avgPace = calcPaceSecondsPerKm(totalDistance, totalDuration);
    const avgSpeed = calcSpeedKmh(totalDistance, totalDuration);
    const avgHrValues = completedSegments
      .map((segment) => Number(segment.actual_avg_hr || 0))
      .filter((value) => value > 0);
    const cadenceValues = completedSegments
      .map((segment) => Number(segment.actual_avg_cadence || 0))
      .filter((value) => value > 0);

    const [insertActivity] = await conn.query(
      `INSERT INTO activities (
        user_id, activity_type_id, name, description, performed_at,
        distance_meters, duration_seconds, avg_pace_seconds_per_km,
        avg_heart_rate, running_cadence_avg, avg_speed_kmh, moving_time_seconds
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        user.id,
        session.activity_type_id,
        session.plan_name,
        session.notes || null,
        toSqlDateTime(new Date()),
        totalDistance,
        totalDuration,
        avgPace,
        avgHrValues.length > 0
          ? Math.round(
              avgHrValues.reduce((sum, value) => sum + value, 0) /
                avgHrValues.length,
            )
          : null,
        cadenceValues.length > 0
          ? Math.round(
              cadenceValues.reduce((sum, value) => sum + value, 0) /
                cadenceValues.length,
            )
          : null,
        avgSpeed,
        totalDuration,
      ],
    );

    for (let index = 0; index < completedSegments.length; index += 1) {
      const segment = completedSegments[index];
      await conn.query(
        `INSERT INTO activity_splits (
          activity_id, split_order, label, distance_meters, duration_seconds, avg_pace_seconds_per_km
        ) VALUES (?, ?, ?, ?, ?, ?)`,
        [
          insertActivity.insertId,
          index + 1,
          segment.title,
          Number(segment.actual_distance_meters || 0),
          Number(segment.actual_duration_seconds),
          calcPaceSecondsPerKm(
            Number(segment.actual_distance_meters || 0),
            Number(segment.actual_duration_seconds),
          ),
        ],
      );
    }

    await conn.query(
      `UPDATE activity_sessions
       SET status = 'completed', completed_at = NOW(), activity_id = ?
       WHERE id = ?`,
      [insertActivity.insertId, parsedSessionId],
    );

    await conn.commit();
    return {
      message: "Plan aktivnosti završen",
      activity_id: insertActivity.insertId,
    };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

async function deleteSession(sessionId, user) {
  const parsedSessionId = parsePositiveInt(sessionId, "sessionId", {
    allowNull: false,
  });
  const [rows] = await pool.query(
    "SELECT * FROM activity_sessions WHERE id = ? AND user_id = ?",
    [parsedSessionId, user.id],
  );
  if (rows.length === 0) {
    throw httpError(404, "Activity session nije pronađen");
  }
  if (rows[0].status === "completed") {
    throw httpError(400, "Završena sesija ne može da se obriše");
  }

  await pool.query("DELETE FROM activity_sessions WHERE id = ?", [
    parsedSessionId,
  ]);
  return { message: "Activity session obrisan" };
}

module.exports = {
  getPlans,
  getPlanById,
  createPlan,
  updatePlan,
  deletePlan,
  schedulePlan,
  getSessionsList,
  getSessionById,
  startSession,
  updateSession,
  completeSession,
  deleteSession,
};
