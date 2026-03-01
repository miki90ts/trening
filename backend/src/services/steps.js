const pool = require("../db/connection");
const { toYmd, getSimplePeriodRange } = require("../helpers/date");
const { httpError } = require("../helpers/httpError");

const METERS_PER_STEP = 0.75;

async function getEntries(user, query) {
  const { start_date, end_date, date, limit } = query;
  let where = "WHERE user_id = ?";
  const params = [user.id];

  if (date) {
    where += " AND step_date = ?";
    params.push(date);
  } else {
    if (start_date) {
      where += " AND step_date >= ?";
      params.push(start_date);
    }
    if (end_date) {
      where += " AND step_date <= ?";
      params.push(end_date);
    }
  }

  const lim = Math.min(parseInt(limit, 10) || 300, 1000);
  const [rows] = await pool.query(
    `SELECT * FROM step_metrics ${where} ORDER BY step_date DESC LIMIT ?`,
    [...params, lim],
  );

  return rows;
}

async function createEntry(user, body) {
  const { step_date, step_count, goal, notes } = body;

  if (!step_date) throw httpError(400, "Datum je obavezan.");
  if (step_count == null || step_count < 0) {
    throw httpError(400, "Broj koraka mora biti >= 0.");
  }

  const [existing] = await pool.query(
    "SELECT id FROM step_metrics WHERE user_id = ? AND step_date = ?",
    [user.id, step_date],
  );

  if (existing.length > 0) {
    await pool.query(
      "UPDATE step_metrics SET step_count = ?, goal = COALESCE(?, goal), notes = ? WHERE id = ?",
      [step_count, goal, notes || null, existing[0].id],
    );
    const [updated] = await pool.query(
      "SELECT * FROM step_metrics WHERE id = ?",
      [existing[0].id],
    );
    return updated[0];
  }

  const [result] = await pool.query(
    "INSERT INTO step_metrics (user_id, step_date, step_count, goal, notes) VALUES (?, ?, ?, ?, ?)",
    [user.id, step_date, step_count, goal || 10000, notes || null],
  );
  const [created] = await pool.query(
    "SELECT * FROM step_metrics WHERE id = ?",
    [result.insertId],
  );
  return created[0];
}

async function updateEntry(id, user, body) {
  const [rows] = await pool.query("SELECT * FROM step_metrics WHERE id = ?", [
    id,
  ]);
  if (rows.length === 0) throw httpError(404, "Unos nije pronađen.");
  if (rows[0].user_id !== user.id && user.role !== "admin") {
    throw httpError(403, "Nemate dozvolu.");
  }

  const { step_date, step_count, goal, notes } = body;
  const updates = [];
  const values = [];
  if (step_date !== undefined) {
    updates.push("step_date = ?");
    values.push(step_date);
  }
  if (step_count !== undefined) {
    updates.push("step_count = ?");
    values.push(step_count);
  }
  if (goal !== undefined) {
    updates.push("goal = ?");
    values.push(goal);
  }
  if (notes !== undefined) {
    updates.push("notes = ?");
    values.push(notes);
  }

  if (updates.length === 0) throw httpError(400, "Nema podataka za izmenu.");

  values.push(id);
  await pool.query(
    `UPDATE step_metrics SET ${updates.join(", ")} WHERE id = ?`,
    values,
  );
  const [updated] = await pool.query(
    "SELECT * FROM step_metrics WHERE id = ?",
    [id],
  );
  return updated[0];
}

async function deleteEntry(id, user) {
  const [rows] = await pool.query("SELECT * FROM step_metrics WHERE id = ?", [
    id,
  ]);
  if (rows.length === 0) throw httpError(404, "Unos nije pronađen.");
  if (rows[0].user_id !== user.id && user.role !== "admin") {
    throw httpError(403, "Nemate dozvolu.");
  }
  await pool.query("DELETE FROM step_metrics WHERE id = ?", [id]);
  return { success: true, id: parseInt(id, 10) };
}

async function getPeriodStats(user, query) {
  const { granularity = "7d", anchor } = query;
  const range = getSimplePeriodRange(granularity, anchor);
  if (!range) throw httpError(400, "Neispravan anchor datum.");

  const [rows] = await pool.query(
    `
      SELECT 
        step_date as bucket_key,
        step_count,
        goal,
        ROUND(step_count * ${METERS_PER_STEP}, 0) as meters
      FROM step_metrics
      WHERE user_id = ? AND step_date >= ? AND step_date <= ?
      ORDER BY step_date ASC
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
        COUNT(*) as total_days,
        COALESCE(SUM(step_count), 0) as total_steps,
        COALESCE(AVG(step_count), 0) as avg_steps,
        COALESCE(MAX(step_count), 0) as max_steps_day,
        COALESCE(MIN(step_count), 0) as min_steps_day,
        COALESCE(AVG(goal), 10000) as avg_goal,
        SUM(CASE WHEN step_count >= goal THEN 1 ELSE 0 END) as days_goal_met
      FROM step_metrics
      WHERE user_id = ? AND step_date >= ? AND step_date <= ?
    `,
    [user.id, range.start, range.end],
  );

  const today = toYmd(new Date());
  const [todayRow] = await pool.query(
    "SELECT * FROM step_metrics WHERE user_id = ? AND step_date = ?",
    [user.id, today],
  );

  const [lastGoalRow] = await pool.query(
    "SELECT goal FROM step_metrics WHERE user_id = ? AND goal IS NOT NULL ORDER BY step_date DESC LIMIT 1",
    [user.id],
  );

  const stats = agg[0];
  const currentGoal = lastGoalRow[0]?.goal || 10000;

  return {
    period: range,
    total_days: stats.total_days,
    total_steps: parseInt(stats.total_steps, 10),
    avg_steps: Math.round(parseFloat(stats.avg_steps)),
    max_steps_day: parseInt(stats.max_steps_day, 10),
    min_steps_day: parseInt(stats.min_steps_day, 10),
    avg_goal: Math.round(parseFloat(stats.avg_goal)),
    days_goal_met: parseInt(stats.days_goal_met, 10),
    total_meters: Math.round(parseInt(stats.total_steps, 10) * METERS_PER_STEP),
    avg_meters: Math.round(parseFloat(stats.avg_steps) * METERS_PER_STEP),
    today: todayRow[0] || null,
    current_goal: currentGoal,
  };
}

async function getRecords(user) {
  const [dayRecord] = await pool.query(
    `
      SELECT step_date, step_count
      FROM step_metrics WHERE user_id = ?
      ORDER BY step_count DESC LIMIT 1
    `,
    [user.id],
  );

  const [avgAll] = await pool.query(
    `
      SELECT COALESCE(AVG(step_count), 0) as avg_daily
      FROM step_metrics WHERE user_id = ?
    `,
    [user.id],
  );

  const [weekRecord] = await pool.query(
    `
      SELECT 
        MIN(step_date) as week_start,
        MAX(step_date) as week_end,
        SUM(step_count) as total
      FROM step_metrics
      WHERE user_id = ?
      GROUP BY YEARWEEK(step_date, 1)
      ORDER BY total DESC LIMIT 1
    `,
    [user.id],
  );

  const [monthRecord] = await pool.query(
    `
      SELECT 
        DATE_FORMAT(step_date, '%Y-%m') as month_key,
        SUM(step_count) as total,
        COUNT(*) as days,
        AVG(step_count) as avg_daily
      FROM step_metrics WHERE user_id = ?
      GROUP BY month_key
      ORDER BY total DESC LIMIT 1
    `,
    [user.id],
  );

  const [yearRecord] = await pool.query(
    `
      SELECT 
        YEAR(step_date) as year_key,
        SUM(step_count) as total,
        COUNT(*) as days,
        AVG(step_count) as avg_daily
      FROM step_metrics WHERE user_id = ?
      GROUP BY year_key
      ORDER BY total DESC LIMIT 1
    `,
    [user.id],
  );

  const [totals] = await pool.query(
    `
      SELECT 
        COALESCE(SUM(step_count), 0) as total_steps,
        COUNT(*) as total_days
      FROM step_metrics WHERE user_id = ?
    `,
    [user.id],
  );

  return {
    daily: dayRecord[0] || null,
    weekly: weekRecord[0] || null,
    monthly: monthRecord[0] || null,
    yearly: yearRecord[0] || null,
    avg_daily: Math.round(parseFloat(avgAll[0]?.avg_daily || 0)),
    total_steps_alltime: parseInt(totals[0]?.total_steps || 0, 10),
    total_days_tracked: parseInt(totals[0]?.total_days || 0, 10),
    total_meters_alltime: Math.round(
      parseInt(totals[0]?.total_steps || 0, 10) * METERS_PER_STEP,
    ),
  };
}

async function getGoal(user) {
  const [rows] = await pool.query(
    "SELECT goal FROM step_metrics WHERE user_id = ? AND goal IS NOT NULL ORDER BY step_date DESC LIMIT 1",
    [user.id],
  );
  return { goal: rows[0]?.goal || 10000 };
}

module.exports = {
  getEntries,
  createEntry,
  updateEntry,
  deleteEntry,
  getPeriodStats,
  getSummary,
  getRecords,
  getGoal,
};
