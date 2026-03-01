const pool = require("../db/connection");
const {
  toYmd,
  getSimplePeriodRange,
  prevYmd,
  nextYmd,
  toBelgradeYmd,
} = require("../helpers/date");
const { httpError } = require("../helpers/httpError");

function calcDuration(bedtime, wakeTime) {
  if (!bedtime || !wakeTime) return null;
  const [bh, bm] = bedtime.split(":").map(Number);
  const [wh, wm] = wakeTime.split(":").map(Number);
  let bedMin = bh * 60 + bm;
  let wakeMin = wh * 60 + wm;
  if (wakeMin <= bedMin) wakeMin += 1440;
  return wakeMin - bedMin;
}

async function getEntries(user, query) {
  const { start_date, end_date, date, limit } = query;
  let where = "WHERE user_id = ?";
  const params = [user.id];

  if (date) {
    where += " AND sleep_date = ?";
    params.push(date);
  } else {
    if (start_date) {
      where += " AND sleep_date >= ?";
      params.push(start_date);
    }
    if (end_date) {
      where += " AND sleep_date <= ?";
      params.push(end_date);
    }
  }

  const lim = Math.min(parseInt(limit, 10) || 500, 2000);
  const [rows] = await pool.query(
    `SELECT * FROM sleep_entries ${where} ORDER BY sleep_date DESC LIMIT ?`,
    [...params, lim],
  );
  return rows;
}

async function createEntry(user, body) {
  const {
    sleep_date,
    bedtime,
    wake_time,
    duration_min,
    awake_min,
    rem_min,
    light_min,
    deep_min,
    sleep_quality,
    avg_hr,
    min_hr,
    avg_hrv,
    target_min,
    notes,
  } = body;

  if (!sleep_date) throw httpError(400, "Datum je obavezan.");

  const computedDuration =
    duration_min != null
      ? parseInt(duration_min, 10)
      : calcDuration(bedtime, wake_time);

  const [existing] = await pool.query(
    "SELECT id FROM sleep_entries WHERE user_id = ? AND sleep_date = ?",
    [user.id, sleep_date],
  );

  if (existing.length > 0) {
    await pool.query(
      `UPDATE sleep_entries SET
        bedtime = ?, wake_time = ?, duration_min = ?,
        awake_min = ?, rem_min = ?, light_min = ?, deep_min = ?,
        sleep_quality = ?, avg_hr = ?, min_hr = ?, avg_hrv = ?,
        target_min = COALESCE(?, target_min), notes = ?
      WHERE id = ?`,
      [
        bedtime || null,
        wake_time || null,
        computedDuration,
        awake_min != null ? parseInt(awake_min, 10) : null,
        rem_min != null ? parseInt(rem_min, 10) : null,
        light_min != null ? parseInt(light_min, 10) : null,
        deep_min != null ? parseInt(deep_min, 10) : null,
        sleep_quality != null ? parseFloat(sleep_quality) : null,
        avg_hr != null ? parseInt(avg_hr, 10) : null,
        min_hr != null ? parseInt(min_hr, 10) : null,
        avg_hrv != null ? parseInt(avg_hrv, 10) : null,
        target_min != null ? parseInt(target_min, 10) : null,
        notes || null,
        existing[0].id,
      ],
    );
    const [updated] = await pool.query(
      "SELECT * FROM sleep_entries WHERE id = ?",
      [existing[0].id],
    );
    return updated[0];
  }

  let finalTarget = target_min != null ? parseInt(target_min, 10) : null;
  if (finalTarget == null) {
    const [lastRow] = await pool.query(
      "SELECT target_min FROM sleep_entries WHERE user_id = ? AND target_min IS NOT NULL ORDER BY sleep_date DESC LIMIT 1",
      [user.id],
    );
    finalTarget = lastRow[0]?.target_min || 480;
  }

  const [result] = await pool.query(
    `INSERT INTO sleep_entries (
      user_id, sleep_date, bedtime, wake_time, duration_min,
      awake_min, rem_min, light_min, deep_min,
      sleep_quality, avg_hr, min_hr, avg_hrv,
      target_min, notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      user.id,
      sleep_date,
      bedtime || null,
      wake_time || null,
      computedDuration,
      awake_min != null ? parseInt(awake_min, 10) : null,
      rem_min != null ? parseInt(rem_min, 10) : null,
      light_min != null ? parseInt(light_min, 10) : null,
      deep_min != null ? parseInt(deep_min, 10) : null,
      sleep_quality != null ? parseFloat(sleep_quality) : null,
      avg_hr != null ? parseInt(avg_hr, 10) : null,
      min_hr != null ? parseInt(min_hr, 10) : null,
      avg_hrv != null ? parseInt(avg_hrv, 10) : null,
      finalTarget,
      notes || null,
    ],
  );
  const [created] = await pool.query(
    "SELECT * FROM sleep_entries WHERE id = ?",
    [result.insertId],
  );
  return created[0];
}

async function updateEntry(id, user, body) {
  const [rows] = await pool.query("SELECT * FROM sleep_entries WHERE id = ?", [
    id,
  ]);
  if (rows.length === 0) throw httpError(404, "Unos nije pronađen.");
  if (rows[0].user_id !== user.id && user.role !== "admin") {
    throw httpError(403, "Nemate dozvolu.");
  }

  const {
    sleep_date,
    bedtime,
    wake_time,
    duration_min,
    awake_min,
    rem_min,
    light_min,
    deep_min,
    sleep_quality,
    avg_hr,
    min_hr,
    avg_hrv,
    target_min,
    notes,
  } = body;

  const updates = [];
  const values = [];

  if (sleep_date !== undefined) {
    updates.push("sleep_date = ?");
    values.push(sleep_date);
  }
  if (bedtime !== undefined) {
    updates.push("bedtime = ?");
    values.push(bedtime || null);
  }
  if (wake_time !== undefined) {
    updates.push("wake_time = ?");
    values.push(wake_time || null);
  }
  if (duration_min !== undefined) {
    updates.push("duration_min = ?");
    values.push(duration_min != null ? parseInt(duration_min, 10) : null);
  }
  if (awake_min !== undefined) {
    updates.push("awake_min = ?");
    values.push(awake_min != null ? parseInt(awake_min, 10) : null);
  }
  if (rem_min !== undefined) {
    updates.push("rem_min = ?");
    values.push(rem_min != null ? parseInt(rem_min, 10) : null);
  }
  if (light_min !== undefined) {
    updates.push("light_min = ?");
    values.push(light_min != null ? parseInt(light_min, 10) : null);
  }
  if (deep_min !== undefined) {
    updates.push("deep_min = ?");
    values.push(deep_min != null ? parseInt(deep_min, 10) : null);
  }
  if (sleep_quality !== undefined) {
    updates.push("sleep_quality = ?");
    values.push(sleep_quality != null ? parseFloat(sleep_quality) : null);
  }
  if (avg_hr !== undefined) {
    updates.push("avg_hr = ?");
    values.push(avg_hr != null ? parseInt(avg_hr, 10) : null);
  }
  if (min_hr !== undefined) {
    updates.push("min_hr = ?");
    values.push(min_hr != null ? parseInt(min_hr, 10) : null);
  }
  if (avg_hrv !== undefined) {
    updates.push("avg_hrv = ?");
    values.push(avg_hrv != null ? parseInt(avg_hrv, 10) : null);
  }
  if (target_min !== undefined) {
    updates.push("target_min = ?");
    values.push(target_min != null ? parseInt(target_min, 10) : null);
  }
  if (notes !== undefined) {
    updates.push("notes = ?");
    values.push(notes);
  }

  if (
    (bedtime !== undefined || wake_time !== undefined) &&
    duration_min === undefined
  ) {
    const newBed = bedtime !== undefined ? bedtime : rows[0].bedtime;
    const newWake = wake_time !== undefined ? wake_time : rows[0].wake_time;
    const dur = calcDuration(newBed, newWake);
    if (dur != null) {
      updates.push("duration_min = ?");
      values.push(dur);
    }
  }

  if (updates.length === 0) throw httpError(400, "Nema podataka za izmenu.");

  values.push(id);
  await pool.query(
    `UPDATE sleep_entries SET ${updates.join(", ")} WHERE id = ?`,
    values,
  );
  const [updated] = await pool.query(
    "SELECT * FROM sleep_entries WHERE id = ?",
    [id],
  );
  return updated[0];
}

async function deleteEntry(id, user) {
  const [rows] = await pool.query("SELECT * FROM sleep_entries WHERE id = ?", [
    id,
  ]);
  if (rows.length === 0) throw httpError(404, "Unos nije pronađen.");
  if (rows[0].user_id !== user.id && user.role !== "admin") {
    throw httpError(403, "Nemate dozvolu.");
  }
  await pool.query("DELETE FROM sleep_entries WHERE id = ?", [id]);
  return { success: true, id: parseInt(id, 10) };
}

async function getPeriodStats(user, query) {
  const { granularity = "7d", anchor } = query;
  const range = getSimplePeriodRange(granularity, anchor);
  if (!range) throw httpError(400, "Neispravan anchor datum.");

  const [rows] = await pool.query(
    `
      SELECT
        sleep_date AS bucket_key,
        duration_min,
        target_min,
        awake_min, rem_min, light_min, deep_min,
        sleep_quality, avg_hr, min_hr, avg_hrv,
        bedtime, wake_time
      FROM sleep_entries
      WHERE user_id = ? AND sleep_date >= ? AND sleep_date <= ?
      ORDER BY sleep_date ASC
    `,
    [user.id, range.start, range.end],
  );

  return { period: range, data: rows };
}

async function getSummary(user, query) {
  const { granularity = "7d", anchor } = query;
  const range = getSimplePeriodRange(granularity, anchor);
  if (!range) throw httpError(400, "Neispravan anchor datum.");

  const [agg] = await pool.query(
    `
      SELECT
        COUNT(*) AS total_days,
        COALESCE(AVG(duration_min), 0) AS avg_duration,
        COALESCE(MAX(duration_min), 0) AS max_duration,
        COALESCE(MIN(duration_min), 0) AS min_duration,
        COALESCE(AVG(sleep_quality), 0) AS avg_quality,
        COALESCE(AVG(avg_hr), 0) AS avg_hr,
        COALESCE(MIN(min_hr), 0) AS lowest_hr,
        COALESCE(AVG(avg_hrv), 0) AS avg_hrv,
        COALESCE(AVG(awake_min), 0) AS avg_awake,
        COALESCE(AVG(rem_min), 0) AS avg_rem,
        COALESCE(AVG(light_min), 0) AS avg_light,
        COALESCE(AVG(deep_min), 0) AS avg_deep,
        SUM(CASE WHEN duration_min >= target_min THEN 1 ELSE 0 END) AS days_target_met,
        COALESCE(AVG(target_min), 480) AS avg_target
      FROM sleep_entries
      WHERE user_id = ? AND sleep_date >= ? AND sleep_date <= ?
    `,
    [user.id, range.start, range.end],
  );

  const today = toYmd(new Date());
  const [todayRow] = await pool.query(
    "SELECT * FROM sleep_entries WHERE user_id = ? AND sleep_date = ?",
    [user.id, today],
  );

  const [lastTargetRow] = await pool.query(
    "SELECT target_min FROM sleep_entries WHERE user_id = ? AND target_min IS NOT NULL ORDER BY sleep_date DESC LIMIT 1",
    [user.id],
  );

  const stats = agg[0];
  const currentTarget = lastTargetRow[0]?.target_min || 480;

  return {
    period: range,
    total_days: stats.total_days,
    avg_duration: Math.round(parseFloat(stats.avg_duration)),
    max_duration: parseInt(stats.max_duration, 10),
    min_duration: parseInt(stats.min_duration, 10),
    avg_quality: parseFloat(parseFloat(stats.avg_quality).toFixed(1)),
    avg_hr: Math.round(parseFloat(stats.avg_hr)),
    lowest_hr: parseInt(stats.lowest_hr, 10),
    avg_hrv: Math.round(parseFloat(stats.avg_hrv)),
    avg_awake: Math.round(parseFloat(stats.avg_awake)),
    avg_rem: Math.round(parseFloat(stats.avg_rem)),
    avg_light: Math.round(parseFloat(stats.avg_light)),
    avg_deep: Math.round(parseFloat(stats.avg_deep)),
    days_target_met: parseInt(stats.days_target_met, 10),
    avg_target: Math.round(parseFloat(stats.avg_target)),
    today: todayRow[0] || null,
    current_target: currentTarget,
  };
}

async function getRecords(user) {
  const [longestSleep] = await pool.query(
    `
      SELECT sleep_date, duration_min FROM sleep_entries
      WHERE user_id = ? AND duration_min IS NOT NULL
      ORDER BY duration_min DESC LIMIT 1
    `,
    [user.id],
  );

  const [bestQuality] = await pool.query(
    `
      SELECT sleep_date, sleep_quality FROM sleep_entries
      WHERE user_id = ? AND sleep_quality IS NOT NULL
      ORDER BY sleep_quality DESC LIMIT 1
    `,
    [user.id],
  );

  const [lowestHr] = await pool.query(
    `
      SELECT sleep_date, min_hr FROM sleep_entries
      WHERE user_id = ? AND min_hr IS NOT NULL
      ORDER BY min_hr ASC LIMIT 1
    `,
    [user.id],
  );

  const [bestHrv] = await pool.query(
    `
      SELECT sleep_date, avg_hrv FROM sleep_entries
      WHERE user_id = ? AND avg_hrv IS NOT NULL
      ORDER BY avg_hrv DESC LIMIT 1
    `,
    [user.id],
  );

  const [mostDeep] = await pool.query(
    `
      SELECT sleep_date, deep_min FROM sleep_entries
      WHERE user_id = ? AND deep_min IS NOT NULL
      ORDER BY deep_min DESC LIMIT 1
    `,
    [user.id],
  );

  const [mostRem] = await pool.query(
    `
      SELECT sleep_date, rem_min FROM sleep_entries
      WHERE user_id = ? AND rem_min IS NOT NULL
      ORDER BY rem_min DESC LIMIT 1
    `,
    [user.id],
  );

  const [avgAll] = await pool.query(
    `
      SELECT
        COALESCE(AVG(duration_min), 0) AS avg_duration,
        COALESCE(AVG(sleep_quality), 0) AS avg_quality,
        COUNT(*) AS total_days
      FROM sleep_entries WHERE user_id = ?
    `,
    [user.id],
  );

  return {
    longest_sleep: longestSleep[0] || null,
    best_quality: bestQuality[0] || null,
    lowest_hr: lowestHr[0] || null,
    best_hrv: bestHrv[0] || null,
    most_deep: mostDeep[0] || null,
    most_rem: mostRem[0] || null,
    avg_duration_alltime: Math.round(parseFloat(avgAll[0]?.avg_duration || 0)),
    avg_quality_alltime: parseFloat(
      parseFloat(avgAll[0]?.avg_quality || 0).toFixed(1),
    ),
    total_days_tracked: parseInt(avgAll[0]?.total_days || 0, 10),
  };
}

async function getStreak(user) {
  const [metDays] = await pool.query(
    `
      SELECT DATE_FORMAT(sleep_date, '%Y-%m-%d') AS day_key
      FROM sleep_entries
      WHERE user_id = ? AND duration_min IS NOT NULL AND duration_min >= target_min
      ORDER BY sleep_date DESC
    `,
    [user.id],
  );

  if (metDays.length === 0) {
    return { current_streak: 0, longest_streak: 0, total_target_days: 0 };
  }

  const dayKeysDesc = metDays.map((r) => r.day_key);
  const uniqueDayKeys = [...new Set(dayKeysDesc)];
  const daySet = new Set(uniqueDayKeys);

  const todayKey = toBelgradeYmd(new Date());
  const yesterdayKey = prevYmd(todayKey);

  let currentStreak = 0;
  let cursor = null;

  if (daySet.has(todayKey)) {
    cursor = todayKey;
  } else if (daySet.has(yesterdayKey)) {
    cursor = yesterdayKey;
  }

  while (cursor && daySet.has(cursor)) {
    currentStreak++;
    cursor = prevYmd(cursor);
  }

  const dayKeysAsc = [...uniqueDayKeys].sort();
  let longestStreak = 1;
  let tempStreak = 1;
  for (let i = 1; i < dayKeysAsc.length; i++) {
    if (dayKeysAsc[i] === nextYmd(dayKeysAsc[i - 1])) {
      tempStreak++;
      longestStreak = Math.max(longestStreak, tempStreak);
    } else {
      tempStreak = 1;
    }
  }

  return {
    current_streak: currentStreak,
    longest_streak: longestStreak,
    total_target_days: metDays.length,
  };
}

async function getGoal(user) {
  const [rows] = await pool.query(
    "SELECT target_min FROM sleep_entries WHERE user_id = ? AND target_min IS NOT NULL ORDER BY sleep_date DESC LIMIT 1",
    [user.id],
  );
  return { target: rows[0]?.target_min || 480 };
}

module.exports = {
  getEntries,
  createEntry,
  updateEntry,
  deleteEntry,
  getPeriodStats,
  getSummary,
  getRecords,
  getStreak,
  getGoal,
};
