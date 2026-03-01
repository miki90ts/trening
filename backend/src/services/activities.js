const pool = require("../db/connection");
const { parseFile } = require("../utils/activityFitParser");
const {
  toInt,
  toDecimal,
  toSqlDateTime,
  calcPaceSecondsPerKm,
  validateHeartRates,
  validateNumericField,
  validateDecimalField,
  validateSplits,
  canAccessUserId,
  buildVirtualKmRows,
} = require("../helpers/activities");
const { httpError } = require("../helpers/httpError");

const SORT_MAP = {
  newest: "a.performed_at DESC, a.id DESC",
  duration: "a.duration_seconds DESC, a.id DESC",
  distance: "a.distance_meters DESC, a.id DESC",
  pace: "a.avg_pace_seconds_per_km ASC, a.id DESC",
};

async function fetchActivityById(id) {
  const [rows] = await pool.query(
    `SELECT a.*, t.name AS activity_type_name, t.code AS activity_type_code,
            u.first_name, u.last_name, u.nickname
     FROM activities a
     JOIN activity_types t ON t.id = a.activity_type_id
     JOIN users u ON u.id = a.user_id
     WHERE a.id = ?`,
    [id],
  );
  return rows[0] || null;
}

async function getActivitySplits(activityId) {
  const [splits] = await pool.query(
    `SELECT id, activity_id, split_order, label, distance_meters,
            duration_seconds, avg_pace_seconds_per_km
     FROM activity_splits
     WHERE activity_id = ?
     ORDER BY split_order ASC`,
    [activityId],
  );
  return splits;
}

async function getActivities(user, query) {
  const {
    page,
    pageSize,
    q = "",
    activity_type_id,
    start_date,
    end_date,
    distance_min,
    distance_max,
    duration_min,
    duration_max,
    pace_min,
    pace_max,
    hr_min,
    hr_max,
    sort = "newest",
    user_id,
  } = query;

  const filters = [];
  const values = [];

  const requestedUserId = user_id ? toInt(user_id) : null;
  const effectiveUserId = requestedUserId || user.id;

  if (!canAccessUserId(user, effectiveUserId)) {
    throw httpError(403, "Nemate dozvolu za ovu akciju");
  }

  filters.push("a.user_id = ?");
  values.push(effectiveUserId);
  filters.push("t.is_active = 1");

  if (String(q).trim()) {
    const like = `%${String(q).trim()}%`;
    filters.push("(a.name LIKE ? OR COALESCE(a.description, '') LIKE ?)");
    values.push(like, like);
  }

  if (activity_type_id) {
    const activityTypeId = toInt(activity_type_id);
    if (!activityTypeId || activityTypeId <= 0) {
      throw httpError(400, "activity_type_id nije validan");
    }
    filters.push("a.activity_type_id = ?");
    values.push(activityTypeId);
  }

  if (start_date) {
    filters.push("DATE(a.performed_at) >= ?");
    values.push(start_date);
  }

  if (end_date) {
    filters.push("DATE(a.performed_at) <= ?");
    values.push(end_date);
  }

  if (distance_min !== undefined && distance_min !== "") {
    const parsed = toInt(distance_min);
    if (parsed === null || parsed < 0) {
      throw httpError(400, "distance_min mora biti broj >= 0");
    }
    filters.push("a.distance_meters >= ?");
    values.push(parsed);
  }

  if (distance_max !== undefined && distance_max !== "") {
    const parsed = toInt(distance_max);
    if (parsed === null || parsed < 0) {
      throw httpError(400, "distance_max mora biti broj >= 0");
    }
    filters.push("a.distance_meters <= ?");
    values.push(parsed);
  }

  if (duration_min !== undefined && duration_min !== "") {
    const parsed = toInt(duration_min);
    if (parsed === null || parsed < 0) {
      throw httpError(400, "duration_min mora biti broj >= 0");
    }
    filters.push("a.duration_seconds >= ?");
    values.push(parsed);
  }

  if (duration_max !== undefined && duration_max !== "") {
    const parsed = toInt(duration_max);
    if (parsed === null || parsed < 0) {
      throw httpError(400, "duration_max mora biti broj >= 0");
    }
    filters.push("a.duration_seconds <= ?");
    values.push(parsed);
  }

  if (pace_min !== undefined && pace_min !== "") {
    const parsed = toDecimal(pace_min);
    if (parsed === null || parsed < 0) {
      throw httpError(400, "pace_min mora biti broj >= 0");
    }
    filters.push("a.avg_pace_seconds_per_km >= ?");
    values.push(parsed);
  }

  if (pace_max !== undefined && pace_max !== "") {
    const parsed = toDecimal(pace_max);
    if (parsed === null || parsed < 0) {
      throw httpError(400, "pace_max mora biti broj >= 0");
    }
    filters.push("a.avg_pace_seconds_per_km <= ?");
    values.push(parsed);
  }

  if (hr_min !== undefined && hr_min !== "") {
    const parsed = toInt(hr_min);
    if (parsed === null || parsed < 0) {
      throw httpError(400, "hr_min mora biti broj >= 0");
    }
    filters.push("a.avg_heart_rate >= ?");
    values.push(parsed);
  }

  if (hr_max !== undefined && hr_max !== "") {
    const parsed = toInt(hr_max);
    if (parsed === null || parsed < 0) {
      throw httpError(400, "hr_max mora biti broj >= 0");
    }
    filters.push("a.avg_heart_rate <= ?");
    values.push(parsed);
  }

  const whereSql = filters.length ? `WHERE ${filters.join(" AND ")}` : "";
  const hasPagination = page !== undefined || pageSize !== undefined;
  const safeSort = SORT_MAP[sort] || SORT_MAP.newest;

  if (hasPagination) {
    const parsedPage = Math.max(1, toInt(page) || 1);
    const parsedPageSizeRaw = toInt(pageSize) || 10;
    const parsedPageSize = [10, 25, 50].includes(parsedPageSizeRaw)
      ? parsedPageSizeRaw
      : 10;
    const offset = (parsedPage - 1) * parsedPageSize;

    const [countRows] = await pool.query(
      `SELECT COUNT(*) AS total
       FROM activities a
       JOIN activity_types t ON t.id = a.activity_type_id
       ${whereSql}`,
      values,
    );

    const total = countRows[0]?.total || 0;

    const [rows] = await pool.query(
      `SELECT a.id, a.user_id, a.activity_type_id, a.name, a.description,
              a.performed_at, a.distance_meters, a.duration_seconds,
              a.avg_pace_seconds_per_km, a.avg_heart_rate, a.calories,
              a.ascent_meters, a.descent_meters,
              t.name AS activity_type_name, t.code AS activity_type_code,
              COUNT(s.id) AS split_count
       FROM activities a
       JOIN activity_types t ON t.id = a.activity_type_id
       LEFT JOIN activity_splits s ON s.activity_id = a.id
       ${whereSql}
       GROUP BY a.id
       ORDER BY ${safeSort}
       LIMIT ? OFFSET ?`,
      [...values, parsedPageSize, offset],
    );

    return {
      data: rows,
      pagination: {
        page: parsedPage,
        pageSize: parsedPageSize,
        total,
        totalPages: Math.ceil(total / parsedPageSize),
      },
    };
  }

  const [rows] = await pool.query(
    `SELECT a.id, a.user_id, a.activity_type_id, a.name, a.description,
            a.performed_at, a.distance_meters, a.duration_seconds,
            a.avg_pace_seconds_per_km, a.avg_heart_rate, a.calories,
            a.ascent_meters, a.descent_meters,
            t.name AS activity_type_name, t.code AS activity_type_code,
            COUNT(s.id) AS split_count
     FROM activities a
     JOIN activity_types t ON t.id = a.activity_type_id
     LEFT JOIN activity_splits s ON s.activity_id = a.id
     ${whereSql}
     GROUP BY a.id
     ORDER BY ${safeSort}`,
    values,
  );

  return rows;
}

async function getActivityById(activityId, user) {
  const parsedActivityId = toInt(activityId);
  if (!parsedActivityId || parsedActivityId <= 0) {
    throw httpError(400, "Nevalidan ID");
  }

  const activity = await fetchActivityById(parsedActivityId);
  if (!activity) {
    throw httpError(404, "Activity nije pronađen");
  }

  if (!canAccessUserId(user, activity.user_id)) {
    throw httpError(403, "Nemate dozvolu za ovu akciju");
  }

  const splits = await getActivitySplits(parsedActivityId);
  return { ...activity, splits };
}

async function exportActivityData(activityId, user) {
  const parsedActivityId = toInt(activityId);
  if (!parsedActivityId || parsedActivityId <= 0) {
    throw httpError(400, "Nevalidan ID");
  }

  const activity = await fetchActivityById(parsedActivityId);
  if (!activity) {
    throw httpError(404, "Activity nije pronađen");
  }

  if (!canAccessUserId(user, activity.user_id)) {
    throw httpError(403, "Nemate dozvolu za ovu akciju");
  }

  const splits = await getActivitySplits(parsedActivityId);
  const virtual_km_rows = buildVirtualKmRows(splits);

  return {
    activity: { ...activity, splits },
    virtual_km_rows,
    exported_at: new Date().toISOString(),
  };
}

async function createActivity(user, body) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const {
      user_id,
      activity_type_id,
      name,
      description,
      performed_at,
      distance_meters,
      duration_seconds,
      avg_heart_rate,
      min_heart_rate,
      max_heart_rate,
      ascent_meters,
      descent_meters,
      min_elevation_meters,
      max_elevation_meters,
      calories,
      running_cadence_avg,
      running_cadence_min,
      running_cadence_max,
      avg_speed_kmh,
      max_speed_kmh,
      moving_time_seconds,
      splits,
    } = body;

    const ownerUserId =
      user.role === "admin" && user_id ? toInt(user_id) : user.id;
    if (!ownerUserId || ownerUserId <= 0) {
      throw httpError(400, "Nevalidan user_id");
    }

    const activityTypeId = toInt(activity_type_id);
    if (!activityTypeId || activityTypeId <= 0) {
      throw httpError(400, "activity_type_id je obavezan");
    }

    if (!name || !String(name).trim()) {
      throw httpError(400, "Naziv aktivnosti je obavezan");
    }

    const distance = toInt(distance_meters);
    const duration = toInt(duration_seconds);
    if (!distance || distance <= 0) {
      throw httpError(400, "distance_meters mora biti > 0");
    }
    if (!duration || duration <= 0) {
      throw httpError(400, "duration_seconds mora biti > 0");
    }

    const performedAtSql = toSqlDateTime(performed_at);
    if (!performedAtSql) {
      throw httpError(400, "performed_at mora biti validan datum");
    }

    const [typeRows] = await conn.query(
      "SELECT id, is_active FROM activity_types WHERE id = ?",
      [activityTypeId],
    );
    if (typeRows.length === 0 || !typeRows[0].is_active) {
      throw httpError(404, "Tip aktivnosti nije pronađen");
    }

    const heart = validateHeartRates({
      avg_heart_rate,
      min_heart_rate,
      max_heart_rate,
    });
    if (heart.error) {
      throw httpError(400, heart.error);
    }

    const ascent = validateNumericField(ascent_meters, "ascent_meters");
    const descent = validateNumericField(descent_meters, "descent_meters");
    const minElevation = validateNumericField(
      min_elevation_meters,
      "min_elevation_meters",
    );
    const maxElevation = validateNumericField(
      max_elevation_meters,
      "max_elevation_meters",
    );
    const caloriesSafe = validateNumericField(calories, "calories");
    const cadenceAvg = validateNumericField(
      running_cadence_avg,
      "running_cadence_avg",
    );
    const cadenceMin = validateNumericField(
      running_cadence_min,
      "running_cadence_min",
    );
    const cadenceMax = validateNumericField(
      running_cadence_max,
      "running_cadence_max",
    );
    const movingTime = validateNumericField(
      moving_time_seconds,
      "moving_time_seconds",
    );
    const avgSpeed = validateDecimalField(avg_speed_kmh, "avg_speed_kmh");
    const maxSpeed = validateDecimalField(max_speed_kmh, "max_speed_kmh");

    const validations = [
      ascent,
      descent,
      minElevation,
      maxElevation,
      caloriesSafe,
      cadenceAvg,
      cadenceMin,
      cadenceMax,
      movingTime,
      avgSpeed,
      maxSpeed,
    ];

    const invalid = validations.find((v) => !v.ok);
    if (invalid) {
      throw httpError(400, invalid.error);
    }

    if (
      minElevation.value !== undefined &&
      maxElevation.value !== undefined &&
      minElevation.value > maxElevation.value
    ) {
      throw httpError(
        400,
        "min_elevation_meters ne može biti veći od max_elevation_meters",
      );
    }

    const splitsValidation = validateSplits(splits);
    if (!splitsValidation.ok) {
      throw httpError(400, splitsValidation.error);
    }

    const avgPace = calcPaceSecondsPerKm(distance, duration);

    const [insertResult] = await conn.query(
      `INSERT INTO activities (
        user_id, activity_type_id, name, description, performed_at,
        distance_meters, duration_seconds, avg_pace_seconds_per_km,
        avg_heart_rate, min_heart_rate, max_heart_rate,
        ascent_meters, descent_meters, min_elevation_meters, max_elevation_meters,
        calories, running_cadence_avg, running_cadence_min, running_cadence_max,
        avg_speed_kmh, max_speed_kmh, moving_time_seconds
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        ownerUserId,
        activityTypeId,
        String(name).trim(),
        description || null,
        performedAtSql,
        distance,
        duration,
        avgPace,
        heart.avg_heart_rate !== undefined ? heart.avg_heart_rate : null,
        heart.min_heart_rate !== undefined ? heart.min_heart_rate : null,
        heart.max_heart_rate !== undefined ? heart.max_heart_rate : null,
        ascent.value !== undefined ? ascent.value : null,
        descent.value !== undefined ? descent.value : null,
        minElevation.value !== undefined ? minElevation.value : null,
        maxElevation.value !== undefined ? maxElevation.value : null,
        caloriesSafe.value !== undefined ? caloriesSafe.value : null,
        cadenceAvg.value !== undefined ? cadenceAvg.value : null,
        cadenceMin.value !== undefined ? cadenceMin.value : null,
        cadenceMax.value !== undefined ? cadenceMax.value : null,
        avgSpeed.value !== undefined ? avgSpeed.value : null,
        maxSpeed.value !== undefined ? maxSpeed.value : null,
        movingTime.value !== undefined ? movingTime.value : null,
      ],
    );

    const activityId = insertResult.insertId;

    if (splitsValidation.splits && splitsValidation.splits.length > 0) {
      for (const split of splitsValidation.splits) {
        await conn.query(
          `INSERT INTO activity_splits
           (activity_id, split_order, label, distance_meters, duration_seconds, avg_pace_seconds_per_km)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [
            activityId,
            split.split_order,
            split.label,
            split.distance_meters,
            split.duration_seconds,
            split.avg_pace_seconds_per_km,
          ],
        );
      }
    }

    await conn.commit();

    const activity = await fetchActivityById(activityId);
    const savedSplits = await getActivitySplits(activityId);

    return { ...activity, splits: savedSplits };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

async function updateActivity(activityId, user, body) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const parsedActivityId = toInt(activityId);
    if (!parsedActivityId || parsedActivityId <= 0) {
      throw httpError(400, "Nevalidan ID");
    }

    const [existingRows] = await conn.query(
      "SELECT * FROM activities WHERE id = ?",
      [parsedActivityId],
    );
    if (existingRows.length === 0) {
      throw httpError(404, "Activity nije pronađen");
    }

    const existing = existingRows[0];
    if (!canAccessUserId(user, existing.user_id)) {
      throw httpError(403, "Nemate dozvolu za ovu akciju");
    }

    const updates = [];
    const values = [];

    if (body.activity_type_id !== undefined) {
      const activityTypeId = toInt(body.activity_type_id);
      if (!activityTypeId || activityTypeId <= 0) {
        throw httpError(400, "activity_type_id nije validan");
      }

      const [typeRows] = await conn.query(
        "SELECT id, is_active FROM activity_types WHERE id = ?",
        [activityTypeId],
      );
      if (typeRows.length === 0 || !typeRows[0].is_active) {
        throw httpError(404, "Tip aktivnosti nije pronađen");
      }

      updates.push("activity_type_id = ?");
      values.push(activityTypeId);
    }

    if (body.name !== undefined) {
      if (!String(body.name).trim()) {
        throw httpError(400, "Naziv aktivnosti ne može biti prazan");
      }
      updates.push("name = ?");
      values.push(String(body.name).trim());
    }

    if (body.description !== undefined) {
      updates.push("description = ?");
      values.push(body.description || null);
    }

    if (body.performed_at !== undefined) {
      const performedAtSql = toSqlDateTime(body.performed_at);
      if (!performedAtSql) {
        throw httpError(400, "performed_at mora biti validan");
      }
      updates.push("performed_at = ?");
      values.push(performedAtSql);
    }

    const distanceInput = body.distance_meters;
    const durationInput = body.duration_seconds;
    let nextDistance = existing.distance_meters;
    let nextDuration = existing.duration_seconds;

    if (distanceInput !== undefined) {
      const distance = toInt(distanceInput);
      if (!distance || distance <= 0) {
        throw httpError(400, "distance_meters mora biti > 0");
      }
      nextDistance = distance;
      updates.push("distance_meters = ?");
      values.push(distance);
    }

    if (durationInput !== undefined) {
      const duration = toInt(durationInput);
      if (!duration || duration <= 0) {
        throw httpError(400, "duration_seconds mora biti > 0");
      }
      nextDuration = duration;
      updates.push("duration_seconds = ?");
      values.push(duration);
    }

    const heart = validateHeartRates({
      avg_heart_rate: body.avg_heart_rate,
      min_heart_rate: body.min_heart_rate,
      max_heart_rate: body.max_heart_rate,
    });
    if (heart.error) {
      throw httpError(400, heart.error);
    }

    if (heart.avg_heart_rate !== undefined) {
      updates.push("avg_heart_rate = ?");
      values.push(heart.avg_heart_rate);
    }
    if (heart.min_heart_rate !== undefined) {
      updates.push("min_heart_rate = ?");
      values.push(heart.min_heart_rate);
    }
    if (heart.max_heart_rate !== undefined) {
      updates.push("max_heart_rate = ?");
      values.push(heart.max_heart_rate);
    }

    const mapping = [
      ["ascent_meters", "ascent_meters"],
      ["descent_meters", "descent_meters"],
      ["min_elevation_meters", "min_elevation_meters"],
      ["max_elevation_meters", "max_elevation_meters"],
      ["calories", "calories"],
      ["running_cadence_avg", "running_cadence_avg"],
      ["running_cadence_min", "running_cadence_min"],
      ["running_cadence_max", "running_cadence_max"],
      ["moving_time_seconds", "moving_time_seconds"],
    ];

    for (const [requestKey, columnKey] of mapping) {
      const validated = validateNumericField(body[requestKey], requestKey);
      if (!validated.ok) {
        throw httpError(400, validated.error);
      }
      if (validated.value !== undefined) {
        updates.push(`${columnKey} = ?`);
        values.push(validated.value);
      }
    }

    const decimalMapping = [
      ["avg_speed_kmh", "avg_speed_kmh"],
      ["max_speed_kmh", "max_speed_kmh"],
    ];
    for (const [requestKey, columnKey] of decimalMapping) {
      const validated = validateDecimalField(body[requestKey], requestKey);
      if (!validated.ok) {
        throw httpError(400, validated.error);
      }
      if (validated.value !== undefined) {
        updates.push(`${columnKey} = ?`);
        values.push(validated.value);
      }
    }

    const nextPace = calcPaceSecondsPerKm(nextDistance, nextDuration);
    updates.push("avg_pace_seconds_per_km = ?");
    values.push(nextPace);

    if (updates.length > 0) {
      values.push(parsedActivityId);
      await conn.query(
        `UPDATE activities SET ${updates.join(", ")} WHERE id = ?`,
        values,
      );
    }

    const splitsValidation = validateSplits(body.splits);
    if (!splitsValidation.ok) {
      throw httpError(400, splitsValidation.error);
    }

    if (splitsValidation.splits !== undefined) {
      await conn.query("DELETE FROM activity_splits WHERE activity_id = ?", [
        parsedActivityId,
      ]);
      for (const split of splitsValidation.splits) {
        await conn.query(
          `INSERT INTO activity_splits
           (activity_id, split_order, label, distance_meters, duration_seconds, avg_pace_seconds_per_km)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [
            parsedActivityId,
            split.split_order,
            split.label,
            split.distance_meters,
            split.duration_seconds,
            split.avg_pace_seconds_per_km,
          ],
        );
      }
    }

    await conn.commit();

    const activity = await fetchActivityById(parsedActivityId);
    const savedSplits = await getActivitySplits(parsedActivityId);

    return { ...activity, splits: savedSplits };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

async function deleteActivity(activityId, user) {
  const parsedActivityId = toInt(activityId);
  if (!parsedActivityId || parsedActivityId <= 0) {
    throw httpError(400, "Nevalidan ID");
  }

  const [existingRows] = await pool.query(
    "SELECT id, user_id FROM activities WHERE id = ?",
    [parsedActivityId],
  );
  if (existingRows.length === 0) {
    throw httpError(404, "Activity nije pronađen");
  }

  if (!canAccessUserId(user, existingRows[0].user_id)) {
    throw httpError(403, "Nemate dozvolu za ovu akciju");
  }

  await pool.query("DELETE FROM activities WHERE id = ?", [parsedActivityId]);
  return { success: true, id: parsedActivityId };
}

async function importActivities(user, files, payload) {
  const conn = await pool.getConnection();
  try {
    if (!files || files.length === 0) {
      throw httpError(400, "Morate uploadovati bar jedan fajl (.fit)");
    }

    const overrideTypeId = payload.activity_type_id
      ? toInt(payload.activity_type_id)
      : null;

    const [typesRows] = await conn.query(
      "SELECT id, code FROM activity_types WHERE is_active = 1",
    );
    const typeCodeMap = {};
    for (const t of typesRows) {
      typeCodeMap[t.code] = t.id;
    }
    const defaultTypeId = typeCodeMap.running || typesRows[0]?.id;

    await conn.beginTransaction();

    const imported = [];
    const errors = [];

    for (const file of files) {
      try {
        const ext = (file.originalname || "").split(".").pop().toLowerCase();
        let fileType;
        if (ext === "fit") {
          fileType = "fit";
        } else {
          errors.push({
            file: file.originalname,
            error: "Nepodržan format. Koristite .fit",
          });
          continue;
        }

        const parsed = await parseFile(file.buffer, fileType);

        if (!parsed.distance_meters || parsed.distance_meters <= 0) {
          errors.push({
            file: file.originalname,
            error: "Nema podataka o distanci u fajlu",
          });
          continue;
        }
        if (!parsed.duration_seconds || parsed.duration_seconds <= 0) {
          errors.push({
            file: file.originalname,
            error: "Nema podataka o trajanju u fajlu",
          });
          continue;
        }

        let activityTypeId = overrideTypeId;
        if (!activityTypeId && parsed.sport_code) {
          activityTypeId = typeCodeMap[parsed.sport_code] || defaultTypeId;
        }
        if (!activityTypeId) {
          activityTypeId = defaultTypeId;
        }

        const performedAt = parsed.performed_at || toSqlDateTime(new Date());

        const [insertResult] = await conn.query(
          `INSERT INTO activities (
            user_id, activity_type_id, name, description, performed_at,
            distance_meters, duration_seconds, avg_pace_seconds_per_km,
            avg_heart_rate, min_heart_rate, max_heart_rate,
            ascent_meters, descent_meters, min_elevation_meters, max_elevation_meters,
            calories, running_cadence_avg, running_cadence_min, running_cadence_max,
            avg_speed_kmh, max_speed_kmh, moving_time_seconds
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            user.id,
            activityTypeId,
            parsed.name || "Import",
            parsed.description || null,
            performedAt,
            parsed.distance_meters,
            parsed.duration_seconds,
            parsed.avg_pace_seconds_per_km,
            parsed.avg_heart_rate || null,
            parsed.min_heart_rate || null,
            parsed.max_heart_rate || null,
            parsed.ascent_meters || null,
            parsed.descent_meters || null,
            parsed.min_elevation_meters || null,
            parsed.max_elevation_meters || null,
            parsed.calories || null,
            parsed.running_cadence_avg || null,
            parsed.running_cadence_min || null,
            parsed.running_cadence_max || null,
            parsed.avg_speed_kmh || null,
            parsed.max_speed_kmh || null,
            parsed.moving_time_seconds || null,
          ],
        );

        const activityId = insertResult.insertId;

        if (parsed.splits && parsed.splits.length > 0) {
          for (const split of parsed.splits) {
            await conn.query(
              `INSERT INTO activity_splits
               (activity_id, split_order, label, distance_meters, duration_seconds, avg_pace_seconds_per_km)
               VALUES (?, ?, ?, ?, ?, ?)`,
              [
                activityId,
                split.split_order,
                split.label || null,
                split.distance_meters,
                split.duration_seconds,
                split.avg_pace_seconds_per_km,
              ],
            );
          }
        }

        imported.push({
          id: activityId,
          file: file.originalname,
          name: parsed.name,
          distance_meters: parsed.distance_meters,
          duration_seconds: parsed.duration_seconds,
          splits_count: (parsed.splits || []).length,
        });
      } catch (fileErr) {
        errors.push({ file: file.originalname, error: fileErr.message });
      }
    }

    await conn.commit();

    return {
      success: true,
      imported_count: imported.length,
      error_count: errors.length,
      imported,
      errors,
    };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

module.exports = {
  getActivities,
  getActivityById,
  exportActivityData,
  createActivity,
  updateActivity,
  deleteActivity,
  importActivities,
};
