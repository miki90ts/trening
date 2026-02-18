const express = require("express");
const router = express.Router();
const pool = require("../db/connection");
const { authenticate } = require("../middleware/auth");

const VALID_GRANULARITIES = ["week", "month", "year"];

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

const startOfWeekMonday = (date) => {
  const copy = new Date(date);
  const day = copy.getDay(); // 0 = Sunday
  const diff = day === 0 ? -6 : 1 - day;
  copy.setDate(copy.getDate() + diff);
  copy.setHours(0, 0, 0, 0);
  return copy;
};

const getPeriodRange = (granularity, anchorValue) => {
  const granularitySafe = VALID_GRANULARITIES.includes(granularity)
    ? granularity
    : "week";
  const anchor = toDateOnly(anchorValue);
  if (!anchor) return null;

  let start;
  let end;

  if (granularitySafe === "week") {
    start = startOfWeekMonday(anchor);
    end = addDays(start, 6);
  } else if (granularitySafe === "month") {
    start = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
    start.setHours(0, 0, 0, 0);
    end = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0);
    end.setHours(0, 0, 0, 0);
  } else {
    start = new Date(anchor.getFullYear(), 0, 1);
    start.setHours(0, 0, 0, 0);
    end = new Date(anchor.getFullYear(), 11, 31);
    end.setHours(0, 0, 0, 0);
  }

  return {
    granularity: granularitySafe,
    anchor: toYmd(anchor),
    startDate: toYmd(start),
    endDate: toYmd(end),
  };
};

// ======== HELPER: Score SQL ========
const SCORE_SQL = `
  CASE 
    WHEN c.has_weight = 1 THEN COALESCE(SUM(ws.reps * ws.weight), 0)
    ELSE COALESCE(SUM(ws.reps), 0)
  END
`;

// ============================================================
// GET /api/analytics/progress?category_id=X
// Grafikon napretka po kategoriji (score, volume, max weight, estimated 1RM)
// ============================================================
router.get("/progress", authenticate, async (req, res, next) => {
  try {
    const { category_id, granularity, anchor } = req.query;
    const user_id = req.user.id;

    if (!category_id)
      return res.status(400).json({ error: "category_id is required" });

    const [catRows] = await pool.query(
      "SELECT c.*, e.name as exercise_name, e.icon as exercise_icon FROM categories c JOIN exercises e ON c.exercise_id = e.id WHERE c.id = ?",
      [category_id],
    );
    if (catRows.length === 0)
      return res.status(404).json({ error: "Category not found" });
    const category = catRows[0];

    const hasPeriodParams = Boolean(granularity || anchor);
    const period = hasPeriodParams
      ? getPeriodRange(granularity || "week", anchor)
      : null;
    if (hasPeriodParams && !period)
      return res.status(400).json({ error: "Invalid anchor date format" });

    const scoreExpr = category.has_weight
      ? "COALESCE(SUM(ws.reps * ws.weight), 0)"
      : "COALESCE(SUM(ws.reps), 0)";

    const queryParams = [user_id, category_id];
    const periodFilterSql = period
      ? "AND DATE(w.attempt_date) BETWEEN ? AND ?"
      : "";

    if (period) {
      queryParams.push(period.startDate, period.endDate);
    }

    const [rows] = await pool.query(
      `
      SELECT 
        w.id,
        w.attempt_date,
        ${scoreExpr} as score,
        COUNT(ws.id) as total_sets,
        COALESCE(SUM(ws.reps), 0) as total_reps,
        COALESCE(MAX(ws.weight), 0) as max_weight,
        COALESCE(SUM(ws.reps * COALESCE(ws.weight, 0)), 0) as volume_load
      FROM workouts w
      LEFT JOIN workout_sets ws ON ws.workout_id = w.id
      JOIN categories c ON w.category_id = c.id
      WHERE w.user_id = ?
        AND w.category_id = ?
        ${periodFilterSql}
      GROUP BY w.id
      ORDER BY w.attempt_date ASC
    `,
      queryParams,
    );

    // Za svaki workout izračunaj procenjeni 1RM (Epley formula)
    // 1RM = weight × (1 + reps / 30)
    for (const row of rows) {
      const [sets] = await pool.query(
        "SELECT reps, weight FROM workout_sets WHERE workout_id = ? ORDER BY set_number",
        [row.id],
      );

      let best1RM = 0;
      for (const s of sets) {
        if (s.weight && s.weight > 0 && s.reps > 0) {
          const estimated =
            parseFloat(s.weight) * (1 + parseFloat(s.reps) / 30);
          if (estimated > best1RM) best1RM = estimated;
        }
      }
      row.estimated_1rm = Math.round(best1RM * 10) / 10;
    }

    res.json({
      category,
      period: period || null,
      data: rows,
    });
  } catch (err) {
    next(err);
  }
});

// ============================================================
// GET /api/analytics/period-stats?granularity=week|month|year&anchor=YYYY-MM-DD
// Statistika agregirana po bucket-ima unutar izabranog perioda
// week: 7 dana, month: dani u mesecu, year: 12 meseci
// ============================================================
router.get("/period-stats", authenticate, async (req, res, next) => {
  try {
    const { granularity = "week", anchor } = req.query;
    const user_id = req.user.id;
    const period = getPeriodRange(granularity, anchor);

    if (!period)
      return res.status(400).json({ error: "Invalid anchor date format" });

    let rows;

    if (period.granularity === "year") {
      const [yearRows] = await pool.query(
        `
        SELECT
          DATE_FORMAT(w.attempt_date, '%Y-%m') as bucket_key,
          COUNT(DISTINCT w.id) as total_workouts,
          COUNT(DISTINCT DATE(w.attempt_date)) as training_days,
          COUNT(DISTINCT w.category_id) as categories_trained,
          COALESCE(SUM(ws.reps * COALESCE(ws.weight, 0)), 0) as total_volume,
          COALESCE(SUM(ws.reps), 0) as total_reps,
          COUNT(ws.id) as total_sets
        FROM workouts w
        LEFT JOIN workout_sets ws ON ws.workout_id = w.id
        WHERE w.user_id = ?
          AND DATE(w.attempt_date) BETWEEN ? AND ?
        GROUP BY DATE_FORMAT(w.attempt_date, '%Y-%m')
        ORDER BY bucket_key ASC
      `,
        [user_id, period.startDate, period.endDate],
      );

      const index = new Map(yearRows.map((r) => [r.bucket_key, r]));
      rows = [];
      const startDate = new Date(`${period.startDate}T00:00:00`);
      for (let month = 0; month < 12; month++) {
        const current = new Date(startDate.getFullYear(), month, 1);
        const key = `${current.getFullYear()}-${String(month + 1).padStart(2, "0")}`;
        const source = index.get(key) || {};
        rows.push({
          bucket_key: key,
          label: key,
          total_workouts: source.total_workouts || 0,
          training_days: source.training_days || 0,
          categories_trained: source.categories_trained || 0,
          total_volume: source.total_volume || 0,
          total_reps: source.total_reps || 0,
          total_sets: source.total_sets || 0,
        });
      }
    } else {
      const [periodRows] = await pool.query(
        `
        SELECT
          DATE(w.attempt_date) as bucket_key,
          COUNT(DISTINCT w.id) as total_workouts,
          COUNT(DISTINCT DATE(w.attempt_date)) as training_days,
          COUNT(DISTINCT w.category_id) as categories_trained,
          COALESCE(SUM(ws.reps * COALESCE(ws.weight, 0)), 0) as total_volume,
          COALESCE(SUM(ws.reps), 0) as total_reps,
          COUNT(ws.id) as total_sets
        FROM workouts w
        LEFT JOIN workout_sets ws ON ws.workout_id = w.id
        WHERE w.user_id = ?
          AND DATE(w.attempt_date) BETWEEN ? AND ?
        GROUP BY DATE(w.attempt_date)
        ORDER BY bucket_key ASC
      `,
        [user_id, period.startDate, period.endDate],
      );

      const index = new Map(
        periodRows.map((r) => [toYmd(new Date(r.bucket_key)), r]),
      );
      rows = [];
      const startDate = new Date(`${period.startDate}T00:00:00`);
      const endDate = new Date(`${period.endDate}T00:00:00`);

      for (
        let current = new Date(startDate);
        current <= endDate;
        current = addDays(current, 1)
      ) {
        const key = toYmd(current);
        const source = index.get(key) || {};
        rows.push({
          bucket_key: key,
          label: key,
          total_workouts: source.total_workouts || 0,
          training_days: source.training_days || 0,
          categories_trained: source.categories_trained || 0,
          total_volume: source.total_volume || 0,
          total_reps: source.total_reps || 0,
          total_sets: source.total_sets || 0,
        });
      }
    }

    res.json({
      period,
      data: rows,
    });
  } catch (err) {
    next(err);
  }
});

// ============================================================
// GET /api/analytics/weekly?weeks=4
// Nedeljni pregled treninga
// ============================================================
router.get("/weekly", authenticate, async (req, res, next) => {
  try {
    const user_id = req.user.id;
    const weeks = parseInt(req.query.weeks) || 8;

    const [rows] = await pool.query(
      `
      SELECT 
        YEARWEEK(w.attempt_date, 1) as year_week,
        MIN(DATE(w.attempt_date)) as week_start,
        COUNT(DISTINCT w.id) as total_workouts,
        COUNT(DISTINCT DATE(w.attempt_date)) as training_days,
        COUNT(DISTINCT w.category_id) as categories_trained,
        COALESCE(SUM(ws.reps * COALESCE(ws.weight, 0)), 0) as total_volume,
        COALESCE(SUM(ws.reps), 0) as total_reps,
        COUNT(ws.id) as total_sets
      FROM workouts w
      LEFT JOIN workout_sets ws ON ws.workout_id = w.id
      WHERE w.user_id = ? 
        AND w.attempt_date >= DATE_SUB(CURDATE(), INTERVAL ? WEEK)
      GROUP BY YEARWEEK(w.attempt_date, 1)
      ORDER BY year_week ASC
    `,
      [user_id, weeks],
    );

    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// ============================================================
// GET /api/analytics/monthly?months=6
// Mesečni pregled treninga
// ============================================================
router.get("/monthly", authenticate, async (req, res, next) => {
  try {
    const user_id = req.user.id;
    const months = parseInt(req.query.months) || 6;

    const [rows] = await pool.query(
      `
      SELECT 
        DATE_FORMAT(w.attempt_date, '%Y-%m') as month,
        COUNT(DISTINCT w.id) as total_workouts,
        COUNT(DISTINCT DATE(w.attempt_date)) as training_days,
        COUNT(DISTINCT w.category_id) as categories_trained,
        COALESCE(SUM(ws.reps * COALESCE(ws.weight, 0)), 0) as total_volume,
        COALESCE(SUM(ws.reps), 0) as total_reps,
        COUNT(ws.id) as total_sets
      FROM workouts w
      LEFT JOIN workout_sets ws ON ws.workout_id = w.id
      WHERE w.user_id = ? 
        AND w.attempt_date >= DATE_SUB(CURDATE(), INTERVAL ? MONTH)
      GROUP BY DATE_FORMAT(w.attempt_date, '%Y-%m')
      ORDER BY month ASC
    `,
      [user_id, months],
    );

    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// ============================================================
// GET /api/analytics/streak
// Streak counter - koliko dana zaredom korisnik trenira
// ============================================================
router.get("/streak", authenticate, async (req, res, next) => {
  try {
    const user_id = req.user.id;

    // Dohvati sve unikatne datume treninga za korisnika
    const [rows] = await pool.query(
      `
      SELECT DISTINCT DATE(attempt_date) as training_date
      FROM workouts
      WHERE user_id = ?
      ORDER BY training_date DESC
    `,
      [user_id],
    );

    if (rows.length === 0) {
      return res.json({
        current_streak: 0,
        longest_streak: 0,
        total_training_days: 0,
      });
    }

    const dates = rows.map((r) => {
      const d = new Date(r.training_date);
      d.setHours(0, 0, 0, 0);
      return d;
    });

    // Trenutni streak - proveravamo od danas/juče unazad
    let currentStreak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const firstDate = dates[0]; // najnoviji datum
    const diffFromToday = Math.floor(
      (today - firstDate) / (1000 * 60 * 60 * 24),
    );

    if (diffFromToday <= 1) {
      // Poslednji trening je danas ili juče - imamo aktivan streak
      currentStreak = 1;
      for (let i = 1; i < dates.length; i++) {
        const diff = Math.floor(
          (dates[i - 1] - dates[i]) / (1000 * 60 * 60 * 24),
        );
        if (diff === 1) {
          currentStreak++;
        } else {
          break;
        }
      }
    }

    // Najduži streak ikad
    let longestStreak = 1;
    let tempStreak = 1;
    for (let i = 1; i < dates.length; i++) {
      const diff = Math.floor(
        (dates[i - 1] - dates[i]) / (1000 * 60 * 60 * 24),
      );
      if (diff === 1) {
        tempStreak++;
        if (tempStreak > longestStreak) longestStreak = tempStreak;
      } else {
        tempStreak = 1;
      }
    }

    res.json({
      current_streak: currentStreak,
      longest_streak: longestStreak,
      total_training_days: dates.length,
    });
  } catch (err) {
    next(err);
  }
});

// ============================================================
// GET /api/analytics/personal-records
// Lični rekordi po kategoriji
// ============================================================
router.get("/personal-records", authenticate, async (req, res, next) => {
  try {
    const user_id = req.user.id;

    const [rows] = await pool.query(
      `
      SELECT 
        ranked.workout_id,
        ranked.score,
        ranked.attempt_date,
        ranked.total_sets,
        ranked.total_reps,
        ranked.max_weight,
        ranked.estimated_1rm,
        ranked.category_id,
        ranked.category_name,
        ranked.value_type,
        ranked.has_weight,
        ranked.exercise_name,
        ranked.exercise_icon
      FROM (
        SELECT 
          w.id as workout_id,
          w.attempt_date,
          w.category_id,
          c.name as category_name,
          c.value_type,
          c.has_weight,
          e.name as exercise_name,
          e.icon as exercise_icon,
          CASE 
            WHEN c.has_weight = 1 THEN COALESCE(SUM(ws.reps * ws.weight), 0)
            ELSE COALESCE(SUM(ws.reps), 0)
          END as score,
          COUNT(ws.id) as total_sets,
          COALESCE(SUM(ws.reps), 0) as total_reps,
          COALESCE(MAX(ws.weight), 0) as max_weight,
          COALESCE(MAX(ws.weight * (1 + ws.reps / 30)), 0) as estimated_1rm,
          ROW_NUMBER() OVER (PARTITION BY w.category_id ORDER BY 
            CASE 
              WHEN c.has_weight = 1 THEN COALESCE(SUM(ws.reps * ws.weight), 0)
              ELSE COALESCE(SUM(ws.reps), 0)
            END DESC
          ) as rn
        FROM workouts w
        JOIN categories c ON w.category_id = c.id
        JOIN exercises e ON c.exercise_id = e.id
        LEFT JOIN workout_sets ws ON ws.workout_id = w.id
        WHERE w.user_id = ?
        GROUP BY w.id, w.attempt_date, w.category_id, c.name, c.value_type, c.has_weight, e.name, e.icon
      ) ranked
      WHERE ranked.rn = 1
      ORDER BY ranked.exercise_name, ranked.category_name
    `,
      [user_id],
    );

    // Zaokruži estimated_1rm
    for (const row of rows) {
      row.estimated_1rm = Math.round(parseFloat(row.estimated_1rm) * 10) / 10;
    }

    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// ============================================================
// GET /api/analytics/summary
// Ukupni statistički pregled za korisnika
// ============================================================
router.get("/summary", authenticate, async (req, res, next) => {
  try {
    const user_id = req.user.id;

    const [stats] = await pool.query(
      `
      SELECT 
        COUNT(DISTINCT w.id) as total_workouts,
        COUNT(DISTINCT DATE(w.attempt_date)) as total_training_days,
        COUNT(DISTINCT w.category_id) as total_categories,
        COALESCE(SUM(ws.reps * COALESCE(ws.weight, 0)), 0) as total_volume,
        COALESCE(SUM(ws.reps), 0) as total_reps,
        COUNT(ws.id) as total_sets,
        COALESCE(MAX(ws.weight), 0) as heaviest_weight
      FROM workouts w
      LEFT JOIN workout_sets ws ON ws.workout_id = w.id
      WHERE w.user_id = ?
    `,
      [user_id],
    );

    // Poslednji trening
    const [lastWorkout] = await pool.query(
      `
      SELECT w.attempt_date, c.name as category_name, e.name as exercise_name, e.icon as exercise_icon
      FROM workouts w
      JOIN categories c ON w.category_id = c.id
      JOIN exercises e ON c.exercise_id = e.id
      WHERE w.user_id = ?
      ORDER BY w.attempt_date DESC
      LIMIT 1
    `,
      [user_id],
    );

    res.json({
      ...stats[0],
      last_workout: lastWorkout[0] || null,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
