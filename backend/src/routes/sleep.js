const express = require("express");
const router = express.Router();
const pool = require("../db/connection");
const { authenticate } = require("../middleware/auth");

const toYmd = (date) => {
  const d = date ? new Date(date) : new Date();
  if (Number.isNaN(d.getTime())) return null;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
};

const getPeriodRange = (granularity, anchorValue) => {
  const anchor = anchorValue ? new Date(anchorValue) : new Date();
  if (Number.isNaN(anchor.getTime())) return null;
  anchor.setHours(0, 0, 0, 0);

  if (granularity === "year") {
    const start = new Date(anchor.getFullYear(), 0, 1);
    const end = new Date(anchor.getFullYear(), 11, 31);
    return { start: toYmd(start), end: toYmd(end) };
  }
  if (granularity === "month") {
    const start = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
    const end = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0);
    return { start: toYmd(start), end: toYmd(end) };
  }
  const end = new Date(anchor);
  const start = new Date(anchor);
  start.setDate(start.getDate() - 6);
  return { start: toYmd(start), end: toYmd(end) };
};

const prevYmd = (ymd) => {
  const [y, m, d] = ymd.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() - 1);
  return toYmd(dt);
};

const nextYmd = (ymd) => {
  const [y, m, d] = ymd.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + 1);
  return toYmd(dt);
};

const toBelgradeYmd = (date = new Date()) => {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Belgrade",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
};

/** Compute duration from bedtime/wake_time in minutes. Handles overnight. */
const calcDuration = (bedtime, wakeTime) => {
  if (!bedtime || !wakeTime) return null;
  const [bh, bm] = bedtime.split(":").map(Number);
  const [wh, wm] = wakeTime.split(":").map(Number);
  let bedMin = bh * 60 + bm;
  let wakeMin = wh * 60 + wm;
  if (wakeMin <= bedMin) wakeMin += 1440; // overnight
  return wakeMin - bedMin;
};

// ============ CRUD ============

// GET /api/sleep/entries
router.get("/entries", authenticate, async (req, res, next) => {
  try {
    const { start_date, end_date, date, limit } = req.query;
    let where = "WHERE user_id = ?";
    const params = [req.user.id];

    if (date) {
      where += " AND sleep_date = ?";
      params.push(date);
    } else {
      if (start_date) { where += " AND sleep_date >= ?"; params.push(start_date); }
      if (end_date) { where += " AND sleep_date <= ?"; params.push(end_date); }
    }

    const lim = Math.min(parseInt(limit) || 500, 2000);
    const [rows] = await pool.query(
      `SELECT * FROM sleep_entries ${where} ORDER BY sleep_date DESC LIMIT ?`,
      [...params, lim]
    );
    res.json(rows);
  } catch (err) { next(err); }
});

// POST /api/sleep/entries — upsert for date
router.post("/entries", authenticate, async (req, res, next) => {
  try {
    const {
      sleep_date, bedtime, wake_time, duration_min,
      awake_min, rem_min, light_min, deep_min,
      sleep_quality, avg_hr, min_hr, avg_hrv,
      target_min, notes
    } = req.body;

    if (!sleep_date) return res.status(400).json({ error: "Datum je obavezan." });

    // Auto-calculate duration if bedtime & wake provided
    const computedDuration = duration_min != null
      ? parseInt(duration_min)
      : calcDuration(bedtime, wake_time);

    const [existing] = await pool.query(
      "SELECT id FROM sleep_entries WHERE user_id = ? AND sleep_date = ?",
      [req.user.id, sleep_date]
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
          bedtime || null, wake_time || null, computedDuration,
          awake_min != null ? parseInt(awake_min) : null,
          rem_min != null ? parseInt(rem_min) : null,
          light_min != null ? parseInt(light_min) : null,
          deep_min != null ? parseInt(deep_min) : null,
          sleep_quality != null ? parseFloat(sleep_quality) : null,
          avg_hr != null ? parseInt(avg_hr) : null,
          min_hr != null ? parseInt(min_hr) : null,
          avg_hrv != null ? parseInt(avg_hrv) : null,
          target_min != null ? parseInt(target_min) : null,
          notes || null,
          existing[0].id
        ]
      );
      const [updated] = await pool.query("SELECT * FROM sleep_entries WHERE id = ?", [existing[0].id]);
      return res.json(updated[0]);
    }

    // Get last target if not provided
    let finalTarget = target_min != null ? parseInt(target_min) : null;
    if (finalTarget == null) {
      const [lastRow] = await pool.query(
        "SELECT target_min FROM sleep_entries WHERE user_id = ? AND target_min IS NOT NULL ORDER BY sleep_date DESC LIMIT 1",
        [req.user.id]
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
        req.user.id, sleep_date, bedtime || null, wake_time || null, computedDuration,
        awake_min != null ? parseInt(awake_min) : null,
        rem_min != null ? parseInt(rem_min) : null,
        light_min != null ? parseInt(light_min) : null,
        deep_min != null ? parseInt(deep_min) : null,
        sleep_quality != null ? parseFloat(sleep_quality) : null,
        avg_hr != null ? parseInt(avg_hr) : null,
        min_hr != null ? parseInt(min_hr) : null,
        avg_hrv != null ? parseInt(avg_hrv) : null,
        finalTarget,
        notes || null
      ]
    );
    const [created] = await pool.query("SELECT * FROM sleep_entries WHERE id = ?", [result.insertId]);
    res.status(201).json(created[0]);
  } catch (err) { next(err); }
});

// PUT /api/sleep/entries/:id
router.put("/entries/:id", authenticate, async (req, res, next) => {
  try {
    const [rows] = await pool.query("SELECT * FROM sleep_entries WHERE id = ?", [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: "Unos nije pronađen." });
    if (rows[0].user_id !== req.user.id && req.user.role !== "admin") {
      return res.status(403).json({ error: "Nemate dozvolu." });
    }

    const {
      sleep_date, bedtime, wake_time, duration_min,
      awake_min, rem_min, light_min, deep_min,
      sleep_quality, avg_hr, min_hr, avg_hrv,
      target_min, notes
    } = req.body;

    const updates = [];
    const values = [];

    if (sleep_date !== undefined) { updates.push("sleep_date = ?"); values.push(sleep_date); }
    if (bedtime !== undefined) { updates.push("bedtime = ?"); values.push(bedtime || null); }
    if (wake_time !== undefined) { updates.push("wake_time = ?"); values.push(wake_time || null); }
    if (duration_min !== undefined) { updates.push("duration_min = ?"); values.push(duration_min != null ? parseInt(duration_min) : null); }
    if (awake_min !== undefined) { updates.push("awake_min = ?"); values.push(awake_min != null ? parseInt(awake_min) : null); }
    if (rem_min !== undefined) { updates.push("rem_min = ?"); values.push(rem_min != null ? parseInt(rem_min) : null); }
    if (light_min !== undefined) { updates.push("light_min = ?"); values.push(light_min != null ? parseInt(light_min) : null); }
    if (deep_min !== undefined) { updates.push("deep_min = ?"); values.push(deep_min != null ? parseInt(deep_min) : null); }
    if (sleep_quality !== undefined) { updates.push("sleep_quality = ?"); values.push(sleep_quality != null ? parseFloat(sleep_quality) : null); }
    if (avg_hr !== undefined) { updates.push("avg_hr = ?"); values.push(avg_hr != null ? parseInt(avg_hr) : null); }
    if (min_hr !== undefined) { updates.push("min_hr = ?"); values.push(min_hr != null ? parseInt(min_hr) : null); }
    if (avg_hrv !== undefined) { updates.push("avg_hrv = ?"); values.push(avg_hrv != null ? parseInt(avg_hrv) : null); }
    if (target_min !== undefined) { updates.push("target_min = ?"); values.push(target_min != null ? parseInt(target_min) : null); }
    if (notes !== undefined) { updates.push("notes = ?"); values.push(notes); }

    // Auto-recalc duration if bed/wake changed
    if ((bedtime !== undefined || wake_time !== undefined) && duration_min === undefined) {
      const newBed = bedtime !== undefined ? bedtime : rows[0].bedtime;
      const newWake = wake_time !== undefined ? wake_time : rows[0].wake_time;
      const dur = calcDuration(newBed, newWake);
      if (dur != null) { updates.push("duration_min = ?"); values.push(dur); }
    }

    if (updates.length === 0) return res.status(400).json({ error: "Nema podataka za izmenu." });

    values.push(req.params.id);
    await pool.query(`UPDATE sleep_entries SET ${updates.join(", ")} WHERE id = ?`, values);
    const [updated] = await pool.query("SELECT * FROM sleep_entries WHERE id = ?", [req.params.id]);
    res.json(updated[0]);
  } catch (err) { next(err); }
});

// DELETE /api/sleep/entries/:id
router.delete("/entries/:id", authenticate, async (req, res, next) => {
  try {
    const [rows] = await pool.query("SELECT * FROM sleep_entries WHERE id = ?", [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: "Unos nije pronađen." });
    if (rows[0].user_id !== req.user.id && req.user.role !== "admin") {
      return res.status(403).json({ error: "Nemate dozvolu." });
    }
    await pool.query("DELETE FROM sleep_entries WHERE id = ?", [req.params.id]);
    res.json({ success: true, id: parseInt(req.params.id) });
  } catch (err) { next(err); }
});

// ============ STATS ============

// GET /api/sleep/period-stats
router.get("/period-stats", authenticate, async (req, res, next) => {
  try {
    const { granularity = "7d", anchor } = req.query;
    const range = getPeriodRange(granularity, anchor);
    if (!range) return res.status(400).json({ error: "Neispravan anchor datum." });

    const [rows] = await pool.query(`
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
    `, [req.user.id, range.start, range.end]);

    res.json({ period: range, data: rows });
  } catch (err) { next(err); }
});

// GET /api/sleep/summary
router.get("/summary", authenticate, async (req, res, next) => {
  try {
    const { granularity = "7d", anchor } = req.query;
    const range = getPeriodRange(granularity, anchor);
    if (!range) return res.status(400).json({ error: "Neispravan anchor datum." });

    const [agg] = await pool.query(`
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
    `, [req.user.id, range.start, range.end]);

    const today = toYmd(new Date());
    const [todayRow] = await pool.query(
      "SELECT * FROM sleep_entries WHERE user_id = ? AND sleep_date = ?",
      [req.user.id, today]
    );

    const [lastTargetRow] = await pool.query(
      "SELECT target_min FROM sleep_entries WHERE user_id = ? AND target_min IS NOT NULL ORDER BY sleep_date DESC LIMIT 1",
      [req.user.id]
    );

    const stats = agg[0];
    const currentTarget = lastTargetRow[0]?.target_min || 480;

    res.json({
      period: range,
      total_days: stats.total_days,
      avg_duration: Math.round(parseFloat(stats.avg_duration)),
      max_duration: parseInt(stats.max_duration),
      min_duration: parseInt(stats.min_duration),
      avg_quality: parseFloat(parseFloat(stats.avg_quality).toFixed(1)),
      avg_hr: Math.round(parseFloat(stats.avg_hr)),
      lowest_hr: parseInt(stats.lowest_hr),
      avg_hrv: Math.round(parseFloat(stats.avg_hrv)),
      avg_awake: Math.round(parseFloat(stats.avg_awake)),
      avg_rem: Math.round(parseFloat(stats.avg_rem)),
      avg_light: Math.round(parseFloat(stats.avg_light)),
      avg_deep: Math.round(parseFloat(stats.avg_deep)),
      days_target_met: parseInt(stats.days_target_met),
      avg_target: Math.round(parseFloat(stats.avg_target)),
      today: todayRow[0] || null,
      current_target: currentTarget,
    });
  } catch (err) { next(err); }
});

// GET /api/sleep/records
router.get("/records", authenticate, async (req, res, next) => {
  try {
    // Longest sleep
    const [longestSleep] = await pool.query(`
      SELECT sleep_date, duration_min FROM sleep_entries
      WHERE user_id = ? AND duration_min IS NOT NULL
      ORDER BY duration_min DESC LIMIT 1
    `, [req.user.id]);

    // Best quality
    const [bestQuality] = await pool.query(`
      SELECT sleep_date, sleep_quality FROM sleep_entries
      WHERE user_id = ? AND sleep_quality IS NOT NULL
      ORDER BY sleep_quality DESC LIMIT 1
    `, [req.user.id]);

    // Lowest resting HR
    const [lowestHr] = await pool.query(`
      SELECT sleep_date, min_hr FROM sleep_entries
      WHERE user_id = ? AND min_hr IS NOT NULL
      ORDER BY min_hr ASC LIMIT 1
    `, [req.user.id]);

    // Best HRV
    const [bestHrv] = await pool.query(`
      SELECT sleep_date, avg_hrv FROM sleep_entries
      WHERE user_id = ? AND avg_hrv IS NOT NULL
      ORDER BY avg_hrv DESC LIMIT 1
    `, [req.user.id]);

    // Most deep sleep
    const [mostDeep] = await pool.query(`
      SELECT sleep_date, deep_min FROM sleep_entries
      WHERE user_id = ? AND deep_min IS NOT NULL
      ORDER BY deep_min DESC LIMIT 1
    `, [req.user.id]);

    // Most REM sleep
    const [mostRem] = await pool.query(`
      SELECT sleep_date, rem_min FROM sleep_entries
      WHERE user_id = ? AND rem_min IS NOT NULL
      ORDER BY rem_min DESC LIMIT 1
    `, [req.user.id]);

    // All-time averages
    const [avgAll] = await pool.query(`
      SELECT
        COALESCE(AVG(duration_min), 0) AS avg_duration,
        COALESCE(AVG(sleep_quality), 0) AS avg_quality,
        COUNT(*) AS total_days
      FROM sleep_entries WHERE user_id = ?
    `, [req.user.id]);

    res.json({
      longest_sleep: longestSleep[0] || null,
      best_quality: bestQuality[0] || null,
      lowest_hr: lowestHr[0] || null,
      best_hrv: bestHrv[0] || null,
      most_deep: mostDeep[0] || null,
      most_rem: mostRem[0] || null,
      avg_duration_alltime: Math.round(parseFloat(avgAll[0]?.avg_duration || 0)),
      avg_quality_alltime: parseFloat(parseFloat(avgAll[0]?.avg_quality || 0).toFixed(1)),
      total_days_tracked: parseInt(avgAll[0]?.total_days || 0),
    });
  } catch (err) { next(err); }
});

// GET /api/sleep/streak — days meeting sleep target
router.get("/streak", authenticate, async (req, res, next) => {
  try {
    const [metDays] = await pool.query(`
      SELECT DATE_FORMAT(sleep_date, '%Y-%m-%d') AS day_key
      FROM sleep_entries
      WHERE user_id = ? AND duration_min IS NOT NULL AND duration_min >= target_min
      ORDER BY sleep_date DESC
    `, [req.user.id]);

    if (metDays.length === 0) {
      return res.json({ current_streak: 0, longest_streak: 0, total_target_days: 0 });
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

    res.json({
      current_streak: currentStreak,
      longest_streak: longestStreak,
      total_target_days: metDays.length,
    });
  } catch (err) { next(err); }
});

// GET /api/sleep/goal — last known target
router.get("/goal", authenticate, async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      "SELECT target_min FROM sleep_entries WHERE user_id = ? AND target_min IS NOT NULL ORDER BY sleep_date DESC LIMIT 1",
      [req.user.id]
    );
    res.json({ target: rows[0]?.target_min || 480 });
  } catch (err) { next(err); }
});

module.exports = router;
