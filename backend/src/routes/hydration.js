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
  // default: 7d
  const end = new Date(anchor);
  const start = new Date(anchor);
  start.setDate(start.getDate() - 6);
  return { start: toYmd(start), end: toYmd(end) };
};

const VALID_DRINK_TYPES = ["water", "tea", "coffee", "other"];

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

// ============ CRUD ============

// GET /api/hydration/entries
router.get("/entries", authenticate, async (req, res, next) => {
  try {
    const { start_date, end_date, date, drink_type, limit } = req.query;
    let where = "WHERE user_id = ?";
    const params = [req.user.id];

    if (date) {
      where += " AND entry_date = ?";
      params.push(date);
    } else {
      if (start_date) {
        where += " AND entry_date >= ?";
        params.push(start_date);
      }
      if (end_date) {
        where += " AND entry_date <= ?";
        params.push(end_date);
      }
    }

    if (drink_type && VALID_DRINK_TYPES.includes(drink_type)) {
      where += " AND drink_type = ?";
      params.push(drink_type);
    }

    const lim = Math.min(parseInt(limit) || 500, 2000);
    const [rows] = await pool.query(
      `SELECT * FROM hydration_entries ${where} ORDER BY entry_date DESC, created_at DESC LIMIT ?`,
      [...params, lim],
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// POST /api/hydration/entries
router.post("/entries", authenticate, async (req, res, next) => {
  try {
    const { entry_date, amount_ml, drink_type, goal_ml, notes } = req.body;

    if (!entry_date)
      return res.status(400).json({ error: "Datum je obavezan." });
    if (amount_ml == null || amount_ml < 0)
      return res.status(400).json({ error: "Količina mora biti >= 0." });
    if (drink_type && !VALID_DRINK_TYPES.includes(drink_type)) {
      return res.status(400).json({ error: "Nevažeći tip pića." });
    }

    const [result] = await pool.query(
      `INSERT INTO hydration_entries (user_id, entry_date, amount_ml, drink_type, goal_ml, notes)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        req.user.id,
        entry_date,
        parseInt(amount_ml),
        drink_type || "water",
        goal_ml ? parseInt(goal_ml) : 2500,
        notes || null,
      ],
    );
    const [created] = await pool.query(
      "SELECT * FROM hydration_entries WHERE id = ?",
      [result.insertId],
    );
    res.status(201).json(created[0]);
  } catch (err) {
    next(err);
  }
});

// PUT /api/hydration/entries/:id
router.put("/entries/:id", authenticate, async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      "SELECT * FROM hydration_entries WHERE id = ?",
      [req.params.id],
    );
    if (rows.length === 0)
      return res.status(404).json({ error: "Unos nije pronađen." });
    if (rows[0].user_id !== req.user.id && req.user.role !== "admin") {
      return res.status(403).json({ error: "Nemate dozvolu." });
    }

    const { entry_date, amount_ml, drink_type, goal_ml, notes } = req.body;
    const updates = [];
    const values = [];
    if (entry_date !== undefined) {
      updates.push("entry_date = ?");
      values.push(entry_date);
    }
    if (amount_ml !== undefined) {
      updates.push("amount_ml = ?");
      values.push(parseInt(amount_ml));
    }
    if (drink_type !== undefined) {
      if (!VALID_DRINK_TYPES.includes(drink_type))
        return res.status(400).json({ error: "Nevažeći tip pića." });
      updates.push("drink_type = ?");
      values.push(drink_type);
    }
    if (goal_ml !== undefined) {
      updates.push("goal_ml = ?");
      values.push(parseInt(goal_ml));
    }
    if (notes !== undefined) {
      updates.push("notes = ?");
      values.push(notes);
    }

    if (updates.length === 0)
      return res.status(400).json({ error: "Nema podataka za izmenu." });

    values.push(req.params.id);
    await pool.query(
      `UPDATE hydration_entries SET ${updates.join(", ")} WHERE id = ?`,
      values,
    );
    const [updated] = await pool.query(
      "SELECT * FROM hydration_entries WHERE id = ?",
      [req.params.id],
    );
    res.json(updated[0]);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/hydration/entries/:id
router.delete("/entries/:id", authenticate, async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      "SELECT * FROM hydration_entries WHERE id = ?",
      [req.params.id],
    );
    if (rows.length === 0)
      return res.status(404).json({ error: "Unos nije pronađen." });
    if (rows[0].user_id !== req.user.id && req.user.role !== "admin") {
      return res.status(403).json({ error: "Nemate dozvolu." });
    }
    await pool.query("DELETE FROM hydration_entries WHERE id = ?", [
      req.params.id,
    ]);
    res.json({ success: true, id: parseInt(req.params.id) });
  } catch (err) {
    next(err);
  }
});

// ============ STATS ============

// GET /api/hydration/period-stats — daily or monthly aggregated data for chart
router.get("/period-stats", authenticate, async (req, res, next) => {
  try {
    const { granularity = "7d", anchor } = req.query;
    const range = getPeriodRange(granularity, anchor);
    if (!range)
      return res.status(400).json({ error: "Neispravan anchor datum." });

    if (granularity === "year") {
      // Monthly buckets for year view
      const [rows] = await pool.query(
        `
        SELECT 
          DATE_FORMAT(entry_date, '%Y-%m-01') AS bucket_key,
          DATE_FORMAT(entry_date, '%Y-%m') AS month_key,
          SUM(amount_ml) AS total_ml,
          MAX(goal_ml) AS goal_ml,
          COUNT(*) AS entry_count,
          COUNT(DISTINCT entry_date) AS days_tracked,
          GROUP_CONCAT(DISTINCT drink_type) AS drink_types
        FROM hydration_entries
        WHERE user_id = ? AND entry_date >= ? AND entry_date <= ?
        GROUP BY month_key, bucket_key
        ORDER BY month_key ASC
      `,
        [req.user.id, range.start, range.end],
      );
      return res.json({ period: range, data: rows, bucket_type: "month" });
    }

    // Daily buckets for 7d and month view
    const [rows] = await pool.query(
      `
      SELECT 
        entry_date AS bucket_key,
        SUM(amount_ml) AS total_ml,
        MAX(goal_ml) AS goal_ml,
        COUNT(*) AS entry_count,
        GROUP_CONCAT(DISTINCT drink_type) AS drink_types
      FROM hydration_entries
      WHERE user_id = ? AND entry_date >= ? AND entry_date <= ?
      GROUP BY entry_date
      ORDER BY entry_date ASC
    `,
      [req.user.id, range.start, range.end],
    );

    res.json({ period: range, data: rows, bucket_type: "day" });
  } catch (err) {
    next(err);
  }
});

// GET /api/hydration/summary — period aggregates
router.get("/summary", authenticate, async (req, res, next) => {
  try {
    const { granularity = "7d", anchor } = req.query;
    const range = getPeriodRange(granularity, anchor);
    if (!range)
      return res.status(400).json({ error: "Neispravan anchor datum." });

    // Aggregate per day first, then compute stats
    const [dailyAgg] = await pool.query(
      `
      SELECT 
        entry_date,
        SUM(amount_ml) AS day_total,
        MAX(goal_ml) AS goal_ml
      FROM hydration_entries
      WHERE user_id = ? AND entry_date >= ? AND entry_date <= ?
      GROUP BY entry_date
    `,
      [req.user.id, range.start, range.end],
    );

    const totalDays = dailyAgg.length;
    const totalMl = dailyAgg.reduce((s, r) => s + parseInt(r.day_total), 0);
    const avgMl = totalDays > 0 ? Math.round(totalMl / totalDays) : 0;
    const maxDay =
      totalDays > 0
        ? Math.max(...dailyAgg.map((r) => parseInt(r.day_total)))
        : 0;
    const minDay =
      totalDays > 0
        ? Math.min(...dailyAgg.map((r) => parseInt(r.day_total)))
        : 0;
    const daysGoalMet = dailyAgg.filter(
      (r) => parseInt(r.day_total) >= parseInt(r.goal_ml),
    ).length;

    // Today's data
    const today = toYmd(new Date());
    const [todayRows] = await pool.query(
      "SELECT * FROM hydration_entries WHERE user_id = ? AND entry_date = ? ORDER BY created_at DESC",
      [req.user.id, today],
    );
    const todayTotal = todayRows.reduce((s, r) => s + parseInt(r.amount_ml), 0);
    const todayGoal =
      todayRows.length > 0 ? parseInt(todayRows[0].goal_ml) : null;

    // Last known goal
    const [lastGoalRow] = await pool.query(
      "SELECT goal_ml FROM hydration_entries WHERE user_id = ? AND goal_ml IS NOT NULL ORDER BY entry_date DESC, created_at DESC LIMIT 1",
      [req.user.id],
    );
    const currentGoal = lastGoalRow[0]?.goal_ml || 2500;

    // Drink type breakdown for period
    const [typeBreakdown] = await pool.query(
      `
      SELECT drink_type, SUM(amount_ml) AS total_ml, COUNT(*) AS count
      FROM hydration_entries
      WHERE user_id = ? AND entry_date >= ? AND entry_date <= ?
      GROUP BY drink_type
      ORDER BY total_ml DESC
    `,
      [req.user.id, range.start, range.end],
    );

    res.json({
      period: range,
      total_days: totalDays,
      total_ml: totalMl,
      avg_ml: avgMl,
      max_day_ml: maxDay,
      min_day_ml: minDay,
      days_goal_met: daysGoalMet,
      today: {
        total_ml: todayTotal,
        goal_ml: todayGoal || currentGoal,
        entries: todayRows,
      },
      current_goal: currentGoal,
      type_breakdown: typeBreakdown,
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/hydration/records — all-time records
router.get("/records", authenticate, async (req, res, next) => {
  try {
    // Best day
    const [dayRecord] = await pool.query(
      `
      SELECT entry_date, SUM(amount_ml) AS total_ml
      FROM hydration_entries WHERE user_id = ?
      GROUP BY entry_date
      ORDER BY total_ml DESC LIMIT 1
    `,
      [req.user.id],
    );

    // Average daily (all-time)
    const [avgAll] = await pool.query(
      `
      SELECT COALESCE(AVG(day_total), 0) AS avg_daily FROM (
        SELECT SUM(amount_ml) AS day_total
        FROM hydration_entries WHERE user_id = ?
        GROUP BY entry_date
      ) AS daily
    `,
      [req.user.id],
    );

    // Best week
    const [weekRecord] = await pool.query(
      `
      SELECT 
        MIN(entry_date) AS week_start,
        MAX(entry_date) AS week_end,
        SUM(amount_ml) AS total_ml
      FROM hydration_entries
      WHERE user_id = ?
      GROUP BY YEARWEEK(entry_date, 1)
      ORDER BY total_ml DESC LIMIT 1
    `,
      [req.user.id],
    );

    // Best month
    const [monthRecord] = await pool.query(
      `
      SELECT 
        DATE_FORMAT(entry_date, '%Y-%m') AS month_key,
        SUM(amount_ml) AS total_ml,
        COUNT(DISTINCT entry_date) AS days
      FROM hydration_entries WHERE user_id = ?
      GROUP BY month_key
      ORDER BY total_ml DESC LIMIT 1
    `,
      [req.user.id],
    );

    // Best year
    const [yearRecord] = await pool.query(
      `
      SELECT 
        YEAR(entry_date) AS year_key,
        SUM(amount_ml) AS total_ml,
        COUNT(DISTINCT entry_date) AS days
      FROM hydration_entries WHERE user_id = ?
      GROUP BY year_key
      ORDER BY total_ml DESC LIMIT 1
    `,
      [req.user.id],
    );

    // Totals
    const [totals] = await pool.query(
      `
      SELECT 
        COALESCE(SUM(amount_ml), 0) AS total_ml,
        COUNT(DISTINCT entry_date) AS total_days
      FROM hydration_entries WHERE user_id = ?
    `,
      [req.user.id],
    );

    res.json({
      daily: dayRecord[0] || null,
      weekly: weekRecord[0] || null,
      monthly: monthRecord[0] || null,
      yearly: yearRecord[0] || null,
      avg_daily: Math.round(parseFloat(avgAll[0]?.avg_daily || 0)),
      total_ml_alltime: parseInt(totals[0]?.total_ml || 0),
      total_days_tracked: parseInt(totals[0]?.total_days || 0),
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/hydration/streak — current + longest streak
router.get("/streak", authenticate, async (req, res, next) => {
  try {
    // Get all dates where daily total >= goal
    const [goalMetDays] = await pool.query(
      `
      SELECT DATE_FORMAT(entry_date, '%Y-%m-%d') AS day_key, SUM(amount_ml) AS day_total, MAX(goal_ml) AS goal_ml
      FROM hydration_entries
      WHERE user_id = ?
      GROUP BY entry_date
      HAVING day_total >= goal_ml
      ORDER BY entry_date DESC
    `,
      [req.user.id],
    );

    if (goalMetDays.length === 0) {
      return res.json({
        current_streak: 0,
        longest_streak: 0,
        total_goal_days: 0,
      });
    }

    const dayKeysDesc = goalMetDays.map((r) => r.day_key);
    const uniqueDayKeys = [...new Set(dayKeysDesc)];
    const daySet = new Set(uniqueDayKeys);

    // Current streak: start from today/yesterday and walk backwards
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

    // Longest streak: iterate ASC
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
      total_goal_days: goalMetDays.length,
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/hydration/goal — last known goal
router.get("/goal", authenticate, async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      "SELECT goal_ml FROM hydration_entries WHERE user_id = ? AND goal_ml IS NOT NULL ORDER BY entry_date DESC, created_at DESC LIMIT 1",
      [req.user.id],
    );
    res.json({ goal: rows[0]?.goal_ml || 2500 });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
