const express = require("express");
const router = express.Router();
const pool = require("../db/connection");
const { authenticate } = require("../middleware/auth");

// Average step length in meters (approx 0.75m per step)
const METERS_PER_STEP = 0.75;

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
  // default: 7d
  const end = new Date(anchor);
  const start = new Date(anchor);
  start.setDate(start.getDate() - 6);
  return { start: toYmd(start), end: toYmd(end) };
};

// ============ CRUD ============

// GET /api/steps/entries
router.get("/entries", authenticate, async (req, res, next) => {
  try {
    const { start_date, end_date, date, limit } = req.query;
    let where = "WHERE user_id = ?";
    const params = [req.user.id];

    if (date) {
      where += " AND step_date = ?";
      params.push(date);
    } else {
      if (start_date) { where += " AND step_date >= ?"; params.push(start_date); }
      if (end_date) { where += " AND step_date <= ?"; params.push(end_date); }
    }

    const lim = Math.min(parseInt(limit) || 300, 1000);
    const [rows] = await pool.query(
      `SELECT * FROM step_metrics ${where} ORDER BY step_date DESC LIMIT ?`,
      [...params, lim]
    );
    res.json(rows);
  } catch (err) { next(err); }
});

// POST /api/steps/entries — upsert za datum
router.post("/entries", authenticate, async (req, res, next) => {
  try {
    const { step_date, step_count, goal, notes } = req.body;

    if (!step_date) return res.status(400).json({ error: "Datum je obavezan." });
    if (step_count == null || step_count < 0) return res.status(400).json({ error: "Broj koraka mora biti >= 0." });

    const [existing] = await pool.query(
      "SELECT id FROM step_metrics WHERE user_id = ? AND step_date = ?",
      [req.user.id, step_date]
    );

    if (existing.length > 0) {
      await pool.query(
        "UPDATE step_metrics SET step_count = ?, goal = COALESCE(?, goal), notes = ? WHERE id = ?",
        [step_count, goal, notes || null, existing[0].id]
      );
      const [updated] = await pool.query("SELECT * FROM step_metrics WHERE id = ?", [existing[0].id]);
      return res.json(updated[0]);
    }

    const [result] = await pool.query(
      "INSERT INTO step_metrics (user_id, step_date, step_count, goal, notes) VALUES (?, ?, ?, ?, ?)",
      [req.user.id, step_date, step_count, goal || 10000, notes || null]
    );
    const [created] = await pool.query("SELECT * FROM step_metrics WHERE id = ?", [result.insertId]);
    res.status(201).json(created[0]);
  } catch (err) { next(err); }
});

// PUT /api/steps/entries/:id
router.put("/entries/:id", authenticate, async (req, res, next) => {
  try {
    const [rows] = await pool.query("SELECT * FROM step_metrics WHERE id = ?", [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: "Unos nije pronađen." });
    if (rows[0].user_id !== req.user.id && req.user.role !== "admin") {
      return res.status(403).json({ error: "Nemate dozvolu." });
    }

    const { step_date, step_count, goal, notes } = req.body;
    const updates = [];
    const values = [];
    if (step_date !== undefined) { updates.push("step_date = ?"); values.push(step_date); }
    if (step_count !== undefined) { updates.push("step_count = ?"); values.push(step_count); }
    if (goal !== undefined) { updates.push("goal = ?"); values.push(goal); }
    if (notes !== undefined) { updates.push("notes = ?"); values.push(notes); }

    if (updates.length === 0) return res.status(400).json({ error: "Nema podataka za izmenu." });

    values.push(req.params.id);
    await pool.query(`UPDATE step_metrics SET ${updates.join(", ")} WHERE id = ?`, values);
    const [updated] = await pool.query("SELECT * FROM step_metrics WHERE id = ?", [req.params.id]);
    res.json(updated[0]);
  } catch (err) { next(err); }
});

// DELETE /api/steps/entries/:id
router.delete("/entries/:id", authenticate, async (req, res, next) => {
  try {
    const [rows] = await pool.query("SELECT * FROM step_metrics WHERE id = ?", [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: "Unos nije pronađen." });
    if (rows[0].user_id !== req.user.id && req.user.role !== "admin") {
      return res.status(403).json({ error: "Nemate dozvolu." });
    }
    await pool.query("DELETE FROM step_metrics WHERE id = ?", [req.params.id]);
    res.json({ success: true, id: parseInt(req.params.id) });
  } catch (err) { next(err); }
});

// ============ STATS ============

// GET /api/steps/period-stats
router.get("/period-stats", authenticate, async (req, res, next) => {
  try {
    const { granularity = "7d", anchor } = req.query;
    const range = getPeriodRange(granularity, anchor);
    if (!range) return res.status(400).json({ error: "Neispravan anchor datum." });

    const [rows] = await pool.query(`
      SELECT 
        step_date as bucket_key,
        step_count,
        goal,
        ROUND(step_count * ${METERS_PER_STEP}, 0) as meters
      FROM step_metrics
      WHERE user_id = ? AND step_date >= ? AND step_date <= ?
      ORDER BY step_date ASC
    `, [req.user.id, range.start, range.end]);

    res.json({ period: range, data: rows });
  } catch (err) { next(err); }
});

// GET /api/steps/summary
router.get("/summary", authenticate, async (req, res, next) => {
  try {
    const { granularity = "7d", anchor } = req.query;
    const range = getPeriodRange(granularity, anchor);
    if (!range) return res.status(400).json({ error: "Neispravan anchor datum." });

    const [agg] = await pool.query(`
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
    `, [req.user.id, range.start, range.end]);

    const today = toYmd(new Date());
    const [todayRow] = await pool.query(
      "SELECT * FROM step_metrics WHERE user_id = ? AND step_date = ?",
      [req.user.id, today]
    );

    const [lastGoalRow] = await pool.query(
      "SELECT goal FROM step_metrics WHERE user_id = ? AND goal IS NOT NULL ORDER BY step_date DESC LIMIT 1",
      [req.user.id]
    );

    const stats = agg[0];
    const currentGoal = lastGoalRow[0]?.goal || 10000;

    res.json({
      period: range,
      total_days: stats.total_days,
      total_steps: parseInt(stats.total_steps),
      avg_steps: Math.round(parseFloat(stats.avg_steps)),
      max_steps_day: parseInt(stats.max_steps_day),
      min_steps_day: parseInt(stats.min_steps_day),
      avg_goal: Math.round(parseFloat(stats.avg_goal)),
      days_goal_met: parseInt(stats.days_goal_met),
      total_meters: Math.round(parseInt(stats.total_steps) * METERS_PER_STEP),
      avg_meters: Math.round(parseFloat(stats.avg_steps) * METERS_PER_STEP),
      today: todayRow[0] || null,
      current_goal: currentGoal
    });
  } catch (err) { next(err); }
});

// GET /api/steps/records
router.get("/records", authenticate, async (req, res, next) => {
  try {
    // Rekord za dan
    const [dayRecord] = await pool.query(`
      SELECT step_date, step_count
      FROM step_metrics WHERE user_id = ?
      ORDER BY step_count DESC LIMIT 1
    `, [req.user.id]);

    // Prosečno dnevno (all-time)
    const [avgAll] = await pool.query(`
      SELECT COALESCE(AVG(step_count), 0) as avg_daily
      FROM step_metrics WHERE user_id = ?
    `, [req.user.id]);

    // Rekord za nedelju (ISO week)
    const [weekRecord] = await pool.query(`
      SELECT 
        MIN(step_date) as week_start,
        MAX(step_date) as week_end,
        SUM(step_count) as total
      FROM step_metrics
      WHERE user_id = ?
      GROUP BY YEARWEEK(step_date, 1)
      ORDER BY total DESC LIMIT 1
    `, [req.user.id]);

    // Rekord za mesec
    const [monthRecord] = await pool.query(`
      SELECT 
        DATE_FORMAT(step_date, '%Y-%m') as month_key,
        SUM(step_count) as total,
        COUNT(*) as days,
        AVG(step_count) as avg_daily
      FROM step_metrics WHERE user_id = ?
      GROUP BY month_key
      ORDER BY total DESC LIMIT 1
    `, [req.user.id]);

    // Rekord za godinu
    const [yearRecord] = await pool.query(`
      SELECT 
        YEAR(step_date) as year_key,
        SUM(step_count) as total,
        COUNT(*) as days,
        AVG(step_count) as avg_daily
      FROM step_metrics WHERE user_id = ?
      GROUP BY year_key
      ORDER BY total DESC LIMIT 1
    `, [req.user.id]);

    // Total all-time
    const [totals] = await pool.query(`
      SELECT 
        COALESCE(SUM(step_count), 0) as total_steps,
        COUNT(*) as total_days
      FROM step_metrics WHERE user_id = ?
    `, [req.user.id]);

    res.json({
      daily: dayRecord[0] || null,
      weekly: weekRecord[0] || null,
      monthly: monthRecord[0] || null,
      yearly: yearRecord[0] || null,
      avg_daily: Math.round(parseFloat(avgAll[0]?.avg_daily || 0)),
      total_steps_alltime: parseInt(totals[0]?.total_steps || 0),
      total_days_tracked: parseInt(totals[0]?.total_days || 0),
      total_meters_alltime: Math.round(parseInt(totals[0]?.total_steps || 0) * METERS_PER_STEP),
    });
  } catch (err) { next(err); }
});

// GET /api/steps/goal
router.get("/goal", authenticate, async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      "SELECT goal FROM step_metrics WHERE user_id = ? AND goal IS NOT NULL ORDER BY step_date DESC LIMIT 1",
      [req.user.id]
    );
    res.json({ goal: rows[0]?.goal || 10000 });
  } catch (err) { next(err); }
});

module.exports = router;
