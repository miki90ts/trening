const pool = require("../db/connection");
const {
  toDateOnly,
  toYmd,
  addDays,
  startOfWeekMonday,
  prevYmd,
  toBelgradeYmd,
} = require("../helpers/date");
const { httpError } = require("../helpers/httpError");

const VALID_GRANULARITIES = ["week", "month", "year"];

function getPeriodRange(granularity, anchorValue) {
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
}

async function getProgress(userId, query) {
  const { category_id, granularity, anchor } = query;

  if (!category_id) {
    throw httpError(400, "category_id is required");
  }

  const [catRows] = await pool.query(
    "SELECT c.*, e.name as exercise_name, e.icon as exercise_icon FROM categories c JOIN exercises e ON c.exercise_id = e.id WHERE c.id = ?",
    [category_id],
  );
  if (catRows.length === 0) {
    throw httpError(404, "Category not found");
  }
  const category = catRows[0];

  const hasPeriodParams = Boolean(granularity || anchor);
  const period = hasPeriodParams
    ? getPeriodRange(granularity || "week", anchor)
    : null;
  if (hasPeriodParams && !period) {
    throw httpError(400, "Invalid anchor date format");
  }

  const scoreExpr = category.has_weight
    ? "COALESCE(SUM(ws.reps * ws.weight), 0)"
    : "COALESCE(SUM(ws.reps), 0)";

  const queryParams = [userId, category_id];
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

  for (const row of rows) {
    const [sets] = await pool.query(
      "SELECT reps, weight FROM workout_sets WHERE workout_id = ? ORDER BY set_number",
      [row.id],
    );

    let best1RM = 0;
    for (const s of sets) {
      if (s.weight && s.weight > 0 && s.reps > 0) {
        const estimated = parseFloat(s.weight) * (1 + parseFloat(s.reps) / 30);
        if (estimated > best1RM) best1RM = estimated;
      }
    }
    row.estimated_1rm = Math.round(best1RM * 10) / 10;
  }

  return {
    category,
    period: period || null,
    data: rows,
  };
}

async function getPeriodStats(userId, query) {
  const { granularity = "week", anchor } = query;
  const period = getPeriodRange(granularity, anchor);

  if (!period) {
    throw httpError(400, "Invalid anchor date format");
  }

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
      [userId, period.startDate, period.endDate],
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
      [userId, period.startDate, period.endDate],
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

  return {
    period,
    data: rows,
  };
}

async function getWeekly(userId, query) {
  const weeks = parseInt(query.weeks, 10) || 8;

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
    [userId, weeks],
  );

  return rows;
}

async function getMonthly(userId, query) {
  const months = parseInt(query.months, 10) || 6;

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
    [userId, months],
  );

  return rows;
}

async function getStreak(userId) {
  const [rows] = await pool.query(
    `
      SELECT training_date
      FROM (
        SELECT DATE(w.attempt_date) as training_date
        FROM workouts w
        WHERE w.user_id = ?
        UNION DISTINCT
        SELECT DATE(a.performed_at) as training_date
        FROM activities a
        WHERE a.user_id = ?
      ) training_days
      ORDER BY training_date DESC
    `,
    [userId, userId],
  );

  const normalizeYmd = (value) => {
    if (!value) return null;

    if (typeof value === "string") {
      if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        return value;
      }

      const parsed = new Date(value);
      if (Number.isNaN(parsed.getTime())) return null;
      return toBelgradeYmd(parsed);
    }

    if (value instanceof Date) {
      return toBelgradeYmd(value);
    }

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return null;
    return toBelgradeYmd(parsed);
  };

  const dates = rows
    .map((r) => normalizeYmd(r.training_date))
    .filter(Boolean)
    .sort((a, b) => b.localeCompare(a));

  if (dates.length === 0) {
    return {
      current_streak: 0,
      longest_streak: 0,
      total_training_days: 0,
    };
  }

  let currentStreak = 0;
  const dateSet = new Set(dates);
  const today = toBelgradeYmd(new Date());
  const yesterday = prevYmd(today);

  let cursor = null;
  if (dateSet.has(today)) {
    cursor = today;
  } else if (dateSet.has(yesterday)) {
    cursor = yesterday;
  }

  while (cursor && dateSet.has(cursor)) {
    currentStreak++;
    cursor = prevYmd(cursor);
  }

  let longestStreak = 1;
  let tempStreak = 1;
  for (let i = 1; i < dates.length; i++) {
    if (prevYmd(dates[i - 1]) === dates[i]) {
      tempStreak++;
      if (tempStreak > longestStreak) {
        longestStreak = tempStreak;
      }
    } else {
      tempStreak = 1;
    }
  }

  return {
    current_streak: currentStreak,
    longest_streak: longestStreak,
    total_training_days: dates.length,
  };
}

async function getPersonalRecords(userId) {
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
    [userId],
  );

  for (const row of rows) {
    row.estimated_1rm = Math.round(parseFloat(row.estimated_1rm) * 10) / 10;
  }

  return rows;
}

async function getSummary(userId) {
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
    [userId],
  );

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
    [userId],
  );

  return {
    ...stats[0],
    last_workout: lastWorkout[0] || null,
  };
}

module.exports = {
  getProgress,
  getPeriodStats,
  getWeekly,
  getMonthly,
  getStreak,
  getPersonalRecords,
  getSummary,
};
