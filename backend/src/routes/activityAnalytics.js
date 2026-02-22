const express = require("express");
const router = express.Router();
const pool = require("../db/connection");
const { authenticate } = require("../middleware/auth");

const VALID_GRANULARITIES = ["week", "month"];

const toDateOnly = (value) => {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return null;
  date.setHours(0, 0, 0, 0);
  return date;
};

const toYmd = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const addDays = (date, days) => {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
};

const startOfWeekMonday = (value) => {
  const date = toDateOnly(value);
  if (!date) return null;
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  return date;
};

const getPeriodRange = (granularity, anchorValue) => {
  const anchor = toDateOnly(anchorValue);
  if (!anchor) return null;

  const safeGranularity = VALID_GRANULARITIES.includes(granularity)
    ? granularity
    : "week";

  let start;
  let end;
  if (safeGranularity === "month") {
    start = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
    end = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0);
  } else {
    start = startOfWeekMonday(anchor);
    end = addDays(start, 6);
  }

  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);

  return {
    granularity: safeGranularity,
    anchor: toYmd(anchor),
    startDate: toYmd(start),
    endDate: toYmd(end),
  };
};

const formatPeriodLabel = (period) => {
  const anchorDate = new Date(`${period.anchor}T00:00:00`);
  if (Number.isNaN(anchorDate.getTime())) return "";

  if (period.granularity === "month") {
    return anchorDate.toLocaleDateString("sr-RS", {
      month: "long",
      year: "numeric",
    });
  }

  const start = new Date(`${period.startDate}T00:00:00`);
  const end = new Date(`${period.endDate}T00:00:00`);
  return `${start.toLocaleDateString("sr-RS")} - ${end.toLocaleDateString("sr-RS")}`;
};

const getPeriodStatsPayload = async (userId, granularity, anchor) => {
  const period = getPeriodRange(granularity, anchor);
  if (!period) return null;

  const [dailyRows] = await pool.query(
    `SELECT
       DATE(a.performed_at) AS bucket_key,
       SUM(a.distance_meters) AS total_distance_meters,
       SUM(a.duration_seconds) AS total_duration_seconds,
       SUM(COALESCE(a.ascent_meters, 0)) AS total_ascent_meters,
       COUNT(*) AS activity_count,
       CASE
         WHEN SUM(a.distance_meters) > 0 THEN (SUM(a.duration_seconds) * 1000.0) / SUM(a.distance_meters)
         ELSE NULL
       END AS avg_pace_seconds_per_km
     FROM activities a
     WHERE a.user_id = ?
       AND DATE(a.performed_at) BETWEEN ? AND ?
     GROUP BY DATE(a.performed_at)
     ORDER BY bucket_key ASC`,
    [userId, period.startDate, period.endDate],
  );

  const index = new Map(
    dailyRows.map((row) => [toYmd(new Date(row.bucket_key)), row]),
  );

  const data = [];
  const start = new Date(`${period.startDate}T00:00:00`);
  const end = new Date(`${period.endDate}T00:00:00`);

  for (
    let current = new Date(start);
    current <= end;
    current = addDays(current, 1)
  ) {
    const key = toYmd(current);
    const source = index.get(key);

    data.push({
      bucket_key: key,
      total_distance_meters: parseInt(source?.total_distance_meters || 0, 10),
      total_duration_seconds: parseInt(source?.total_duration_seconds || 0, 10),
      total_ascent_meters: parseInt(source?.total_ascent_meters || 0, 10),
      activity_count: parseInt(source?.activity_count || 0, 10),
      avg_pace_seconds_per_km:
        source?.avg_pace_seconds_per_km !== null &&
        source?.avg_pace_seconds_per_km !== undefined
          ? parseFloat(source.avg_pace_seconds_per_km)
          : null,
    });
  }

  const [summaryRows] = await pool.query(
    `SELECT
       COUNT(*) AS total_activities,
       SUM(distance_meters) AS total_distance_meters,
       SUM(duration_seconds) AS total_duration_seconds,
       SUM(COALESCE(ascent_meters, 0)) AS total_ascent_meters,
       SUM(COALESCE(calories, 0)) AS total_calories,
       CASE
         WHEN SUM(distance_meters) > 0 THEN (SUM(duration_seconds) * 1000.0) / SUM(distance_meters)
         ELSE NULL
       END AS avg_pace_seconds_per_km
     FROM activities
     WHERE user_id = ?
       AND DATE(performed_at) BETWEEN ? AND ?`,
    [userId, period.startDate, period.endDate],
  );

  const [byTypeRows] = await pool.query(
    `SELECT
       t.id AS activity_type_id,
       t.name AS activity_type_name,
       t.code AS activity_type_code,
       COUNT(*) AS activity_count,
       SUM(a.distance_meters) AS total_distance_meters,
       SUM(a.duration_seconds) AS total_duration_seconds,
       SUM(COALESCE(a.ascent_meters, 0)) AS total_ascent_meters,
       CASE
         WHEN SUM(a.distance_meters) > 0 THEN (SUM(a.duration_seconds) * 1000.0) / SUM(a.distance_meters)
         ELSE NULL
       END AS avg_pace_seconds_per_km
     FROM activities a
     JOIN activity_types t ON t.id = a.activity_type_id
     WHERE a.user_id = ?
       AND DATE(a.performed_at) BETWEEN ? AND ?
     GROUP BY t.id, t.name, t.code
     ORDER BY total_distance_meters DESC, activity_count DESC`,
    [userId, period.startDate, period.endDate],
  );

  const [byWeekdayRows] = await pool.query(
    `SELECT
       WEEKDAY(a.performed_at) AS weekday_index,
       COUNT(*) AS activity_count,
       SUM(a.distance_meters) AS total_distance_meters,
       SUM(a.duration_seconds) AS total_duration_seconds
     FROM activities a
     WHERE a.user_id = ?
       AND DATE(a.performed_at) BETWEEN ? AND ?
     GROUP BY WEEKDAY(a.performed_at)
     ORDER BY weekday_index ASC`,
    [userId, period.startDate, period.endDate],
  );

  return {
    period,
    summary: summaryRows[0] || {},
    data,
    by_type: byTypeRows,
    by_weekday: byWeekdayRows,
  };
};

router.get("/period-stats", authenticate, async (req, res, next) => {
  try {
    const { granularity = "week", anchor } = req.query;
    const payload = await getPeriodStatsPayload(
      req.user.id,
      granularity,
      anchor,
    );
    if (!payload) {
      return res.status(400).json({ error: "Invalid anchor date format" });
    }
    res.json(payload);
  } catch (err) {
    next(err);
  }
});

router.get("/period-export", authenticate, async (req, res, next) => {
  try {
    const { granularity = "week", anchor } = req.query;
    const payload = await getPeriodStatsPayload(
      req.user.id,
      granularity,
      anchor,
    );
    if (!payload) {
      return res.status(400).json({ error: "Invalid anchor date format" });
    }

    res.json({
      ...payload,
      period_label: formatPeriodLabel(payload.period),
      exported_at: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
});

router.get("/summary", authenticate, async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT
         COUNT(*) AS total_activities,
         SUM(distance_meters) AS total_distance_meters,
         SUM(duration_seconds) AS total_duration_seconds,
         SUM(COALESCE(ascent_meters, 0)) AS total_ascent_meters,
         SUM(COALESCE(calories, 0)) AS total_calories,
         AVG(avg_heart_rate) AS avg_heart_rate,
         CASE
           WHEN SUM(distance_meters) > 0 THEN (SUM(duration_seconds) * 1000.0) / SUM(distance_meters)
           ELSE NULL
         END AS avg_pace_seconds_per_km
       FROM activities
       WHERE user_id = ?`,
      [req.user.id],
    );

    res.json(rows[0] || {});
  } catch (err) {
    next(err);
  }
});

module.exports = router;
