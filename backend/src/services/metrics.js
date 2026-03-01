const pool = require("../db/connection");
const { toDateOnly, toYmd, addDays } = require("../helpers/date");
const { toSqlDateTime } = require("../helpers/activities");
const { httpError } = require("../helpers/httpError");

const VALID_GRANULARITIES = ["7d", "month"];

function parseWeight(value) {
  const parsed = parseFloat(value);
  if (!Number.isFinite(parsed)) return null;
  return parsed;
}

function getPeriodRange(granularity, anchorValue) {
  const anchor = toDateOnly(anchorValue);
  if (!anchor) return null;

  const granularitySafe = VALID_GRANULARITIES.includes(granularity)
    ? granularity
    : "7d";

  let start;
  let end;

  if (granularitySafe === "month") {
    start = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
    start.setHours(0, 0, 0, 0);
    end = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0);
    end.setHours(0, 0, 0, 0);
  } else {
    end = new Date(anchor);
    end.setHours(0, 0, 0, 0);
    start = addDays(end, -6);
  }

  return {
    granularity: granularitySafe,
    anchor: toYmd(anchor),
    startDate: toYmd(start),
    endDate: toYmd(end),
  };
}

function calcDeltaPercent(current, baseline) {
  const currentNum = parseFloat(current);
  const baselineNum = parseFloat(baseline);

  if (!Number.isFinite(currentNum) || !Number.isFinite(baselineNum))
    return null;
  if (baselineNum === 0) return null;

  return ((currentNum - baselineNum) / baselineNum) * 100;
}

async function getEntries(user, query) {
  const { start_date, end_date, date, limit = 300 } = query;

  const values = [user.id];
  let whereSql = "WHERE user_id = ?";

  if (date) {
    const parsedDate = toDateOnly(date);
    if (!parsedDate) {
      throw httpError(400, "Nevalidan date filter");
    }
    whereSql += " AND DATE(metric_datetime) = ?";
    values.push(toYmd(parsedDate));
  } else {
    if (start_date) {
      const parsedStart = toDateOnly(start_date);
      if (!parsedStart) {
        throw httpError(400, "Nevalidan start_date");
      }
      whereSql += " AND DATE(metric_datetime) >= ?";
      values.push(toYmd(parsedStart));
    }

    if (end_date) {
      const parsedEnd = toDateOnly(end_date);
      if (!parsedEnd) {
        throw httpError(400, "Nevalidan end_date");
      }
      whereSql += " AND DATE(metric_datetime) <= ?";
      values.push(toYmd(parsedEnd));
    }
  }

  const safeLimit = Math.max(1, Math.min(parseInt(limit, 10) || 300, 1000));
  values.push(safeLimit);

  const [rows] = await pool.query(
    `SELECT id, user_id, metric_datetime, weight_kg, notes, created_at, updated_at
     FROM weight_metrics
     ${whereSql}
     ORDER BY metric_datetime DESC, id DESC
     LIMIT ?`,
    values,
  );

  return rows;
}

async function createEntry(user, body) {
  const { metric_datetime, weight_kg, notes } = body;

  const weight = parseWeight(weight_kg);
  if (weight === null || weight <= 0) {
    throw httpError(400, "weight_kg mora biti broj > 0");
  }

  const metricDateTimeSql = toSqlDateTime(metric_datetime);
  if (!metricDateTimeSql) {
    throw httpError(400, "metric_datetime je obavezan i mora biti validan");
  }

  const [insertResult] = await pool.query(
    `INSERT INTO weight_metrics (user_id, metric_datetime, weight_kg, notes)
     VALUES (?, ?, ?, ?)`,
    [user.id, metricDateTimeSql, weight, notes || null],
  );

  const [rows] = await pool.query(
    `SELECT id, user_id, metric_datetime, weight_kg, notes, created_at, updated_at
     FROM weight_metrics
     WHERE id = ?`,
    [insertResult.insertId],
  );

  return rows[0];
}

async function updateEntry(metricId, user, body) {
  const parsedMetricId = parseInt(metricId, 10);
  if (!Number.isInteger(parsedMetricId) || parsedMetricId <= 0) {
    throw httpError(400, "Nevalidan ID");
  }

  const [existingRows] = await pool.query(
    "SELECT * FROM weight_metrics WHERE id = ?",
    [parsedMetricId],
  );

  if (existingRows.length === 0) {
    throw httpError(404, "Merenje nije pronađeno");
  }

  const existing = existingRows[0];
  if (existing.user_id !== user.id && user.role !== "admin") {
    throw httpError(403, "Nemate dozvolu za ovu akciju");
  }

  const updates = [];
  const values = [];

  if (body.metric_datetime !== undefined) {
    const metricDateTimeSql = toSqlDateTime(body.metric_datetime);
    if (!metricDateTimeSql) {
      throw httpError(400, "metric_datetime mora biti validan");
    }
    updates.push("metric_datetime = ?");
    values.push(metricDateTimeSql);
  }

  if (body.weight_kg !== undefined) {
    const weight = parseWeight(body.weight_kg);
    if (weight === null || weight <= 0) {
      throw httpError(400, "weight_kg mora biti broj > 0");
    }
    updates.push("weight_kg = ?");
    values.push(weight);
  }

  if (body.notes !== undefined) {
    updates.push("notes = ?");
    values.push(body.notes || null);
  }

  if (updates.length === 0) {
    throw httpError(400, "Nema podataka za izmenu");
  }

  values.push(parsedMetricId);
  await pool.query(
    `UPDATE weight_metrics
     SET ${updates.join(", ")}
     WHERE id = ?`,
    values,
  );

  const [rows] = await pool.query(
    `SELECT id, user_id, metric_datetime, weight_kg, notes, created_at, updated_at
     FROM weight_metrics
     WHERE id = ?`,
    [parsedMetricId],
  );

  return rows[0];
}

async function deleteEntry(metricId, user) {
  const parsedMetricId = parseInt(metricId, 10);
  if (!Number.isInteger(parsedMetricId) || parsedMetricId <= 0) {
    throw httpError(400, "Nevalidan ID");
  }

  const [existingRows] = await pool.query(
    "SELECT * FROM weight_metrics WHERE id = ?",
    [parsedMetricId],
  );

  if (existingRows.length === 0) {
    throw httpError(404, "Merenje nije pronađeno");
  }

  const existing = existingRows[0];
  if (existing.user_id !== user.id && user.role !== "admin") {
    throw httpError(403, "Nemate dozvolu za ovu akciju");
  }

  await pool.query("DELETE FROM weight_metrics WHERE id = ?", [parsedMetricId]);
  return { success: true, id: parsedMetricId };
}

async function getPeriodStats(user, query) {
  const { granularity = "7d", anchor } = query;
  const period = getPeriodRange(granularity, anchor);

  if (!period) {
    throw httpError(400, "Invalid anchor date format");
  }

  const userId = user.id;

  const [periodRows] = await pool.query(
    `SELECT
       DATE(metric_datetime) AS bucket_key,
       AVG(weight_kg) AS avg_weight,
       COUNT(*) AS entry_count,
       MIN(weight_kg) AS min_weight,
       MAX(weight_kg) AS max_weight
     FROM weight_metrics
     WHERE user_id = ?
       AND DATE(metric_datetime) BETWEEN ? AND ?
     GROUP BY DATE(metric_datetime)
     ORDER BY bucket_key ASC`,
    [userId, period.startDate, period.endDate],
  );

  const index = new Map(
    periodRows.map((row) => [toYmd(new Date(row.bucket_key)), row]),
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
      label: key,
      avg_weight: source ? parseFloat(source.avg_weight) : null,
      entry_count: source ? parseInt(source.entry_count, 10) : 0,
      min_weight: source ? parseFloat(source.min_weight) : null,
      max_weight: source ? parseFloat(source.max_weight) : null,
    });
  }

  const [periodAggregateRows] = await pool.query(
    `SELECT
       AVG(weight_kg) AS period_avg_weight,
       COUNT(*) AS total_entries
     FROM weight_metrics
     WHERE user_id = ?
       AND DATE(metric_datetime) BETWEEN ? AND ?`,
    [userId, period.startDate, period.endDate],
  );

  const [baselineRows] = await pool.query(
    `SELECT id, metric_datetime, weight_kg
     FROM weight_metrics
     WHERE user_id = ?
       AND DATE(metric_datetime) BETWEEN ? AND ?
     ORDER BY metric_datetime ASC, id ASC
     LIMIT 1`,
    [userId, period.startDate, period.endDate],
  );

  const [latestRows] = await pool.query(
    `SELECT id, metric_datetime, weight_kg
     FROM weight_metrics
     WHERE user_id = ?
     ORDER BY metric_datetime DESC, id DESC
     LIMIT 1`,
    [userId],
  );

  const baseline = baselineRows[0] || null;
  const current = latestRows[0] || null;

  const baselineWeight = baseline ? parseFloat(baseline.weight_kg) : null;
  const currentWeight = current ? parseFloat(current.weight_kg) : null;
  const diffKg =
    baselineWeight !== null && currentWeight !== null
      ? currentWeight - baselineWeight
      : null;

  return {
    period,
    data,
    summary: {
      period_avg_weight: parseFloat(
        periodAggregateRows[0]?.period_avg_weight || 0,
      ),
      total_entries: parseInt(periodAggregateRows[0]?.total_entries || 0, 10),
      baseline_weight: baselineWeight,
      baseline_datetime: baseline?.metric_datetime || null,
      current_weight: currentWeight,
      current_datetime: current?.metric_datetime || null,
      difference_kg: diffKg,
      difference_percent: calcDeltaPercent(currentWeight, baselineWeight),
    },
  };
}

async function getSummary(user, query) {
  const { granularity = "7d", anchor } = query;
  const period = getPeriodRange(granularity, anchor);

  if (!period) {
    throw httpError(400, "Invalid anchor date format");
  }

  const userId = user.id;

  const [latestRows] = await pool.query(
    `SELECT id, metric_datetime, weight_kg
     FROM weight_metrics
     WHERE user_id = ?
     ORDER BY metric_datetime DESC, id DESC
     LIMIT 1`,
    [userId],
  );

  const [baselineRows] = await pool.query(
    `SELECT id, metric_datetime, weight_kg
     FROM weight_metrics
     WHERE user_id = ?
       AND DATE(metric_datetime) BETWEEN ? AND ?
     ORDER BY metric_datetime ASC, id ASC
     LIMIT 1`,
    [userId, period.startDate, period.endDate],
  );

  const [periodAvgRows] = await pool.query(
    `SELECT AVG(weight_kg) AS period_avg_weight, COUNT(*) AS total_entries
     FROM weight_metrics
     WHERE user_id = ?
       AND DATE(metric_datetime) BETWEEN ? AND ?`,
    [userId, period.startDate, period.endDate],
  );

  const latest = latestRows[0] || null;
  const baseline = baselineRows[0] || null;

  const currentWeight = latest ? parseFloat(latest.weight_kg) : null;
  const baselineWeight = baseline ? parseFloat(baseline.weight_kg) : null;

  return {
    period,
    current_weight: currentWeight,
    current_datetime: latest?.metric_datetime || null,
    baseline_weight: baselineWeight,
    baseline_datetime: baseline?.metric_datetime || null,
    period_avg_weight: parseFloat(periodAvgRows[0]?.period_avg_weight || 0),
    total_entries: parseInt(periodAvgRows[0]?.total_entries || 0, 10),
    difference_kg:
      currentWeight !== null && baselineWeight !== null
        ? currentWeight - baselineWeight
        : null,
    difference_percent: calcDeltaPercent(currentWeight, baselineWeight),
  };
}

module.exports = {
  getEntries,
  createEntry,
  updateEntry,
  deleteEntry,
  getPeriodStats,
  getSummary,
};
