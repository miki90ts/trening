const pool = require("../db/connection");
const {
  toYmd,
  getSimplePeriodRange,
  prevYmd,
  nextYmd,
  toBelgradeYmd,
} = require("../helpers/date");
const { httpError } = require("../helpers/httpError");

const VALID_DRINK_TYPES = ["water", "tea", "coffee", "other"];

async function getEntries(user, query) {
  const { start_date, end_date, date, drink_type, limit } = query;
  let where = "WHERE user_id = ?";
  const params = [user.id];

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

  const lim = Math.min(parseInt(limit, 10) || 500, 2000);
  const [rows] = await pool.query(
    `SELECT * FROM hydration_entries ${where} ORDER BY entry_date DESC, created_at DESC LIMIT ?`,
    [...params, lim],
  );
  return rows;
}

async function createEntry(user, body) {
  const { entry_date, amount_ml, drink_type, goal_ml, notes } = body;

  if (!entry_date) throw httpError(400, "Datum je obavezan.");
  if (amount_ml == null || amount_ml < 0) {
    throw httpError(400, "Količina mora biti >= 0.");
  }
  if (drink_type && !VALID_DRINK_TYPES.includes(drink_type)) {
    throw httpError(400, "Nevažeći tip pića.");
  }

  const [result] = await pool.query(
    `INSERT INTO hydration_entries (user_id, entry_date, amount_ml, drink_type, goal_ml, notes)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      user.id,
      entry_date,
      parseInt(amount_ml, 10),
      drink_type || "water",
      goal_ml ? parseInt(goal_ml, 10) : 2500,
      notes || null,
    ],
  );
  const [created] = await pool.query(
    "SELECT * FROM hydration_entries WHERE id = ?",
    [result.insertId],
  );
  return created[0];
}

async function updateEntry(id, user, body) {
  const [rows] = await pool.query(
    "SELECT * FROM hydration_entries WHERE id = ?",
    [id],
  );
  if (rows.length === 0) throw httpError(404, "Unos nije pronađen.");
  if (rows[0].user_id !== user.id && user.role !== "admin") {
    throw httpError(403, "Nemate dozvolu.");
  }

  const { entry_date, amount_ml, drink_type, goal_ml, notes } = body;
  const updates = [];
  const values = [];
  if (entry_date !== undefined) {
    updates.push("entry_date = ?");
    values.push(entry_date);
  }
  if (amount_ml !== undefined) {
    updates.push("amount_ml = ?");
    values.push(parseInt(amount_ml, 10));
  }
  if (drink_type !== undefined) {
    if (!VALID_DRINK_TYPES.includes(drink_type)) {
      throw httpError(400, "Nevažeći tip pića.");
    }
    updates.push("drink_type = ?");
    values.push(drink_type);
  }
  if (goal_ml !== undefined) {
    updates.push("goal_ml = ?");
    values.push(parseInt(goal_ml, 10));
  }
  if (notes !== undefined) {
    updates.push("notes = ?");
    values.push(notes);
  }

  if (updates.length === 0) throw httpError(400, "Nema podataka za izmenu.");

  values.push(id);
  await pool.query(
    `UPDATE hydration_entries SET ${updates.join(", ")} WHERE id = ?`,
    values,
  );
  const [updated] = await pool.query(
    "SELECT * FROM hydration_entries WHERE id = ?",
    [id],
  );
  return updated[0];
}

async function deleteEntry(id, user) {
  const [rows] = await pool.query(
    "SELECT * FROM hydration_entries WHERE id = ?",
    [id],
  );
  if (rows.length === 0) throw httpError(404, "Unos nije pronađen.");
  if (rows[0].user_id !== user.id && user.role !== "admin") {
    throw httpError(403, "Nemate dozvolu.");
  }
  await pool.query("DELETE FROM hydration_entries WHERE id = ?", [id]);
  return { success: true, id: parseInt(id, 10) };
}

async function getPeriodStats(user, query) {
  const { granularity = "7d", anchor } = query;
  const range = getSimplePeriodRange(granularity, anchor);
  if (!range) throw httpError(400, "Neispravan anchor datum.");

  if (granularity === "year") {
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
      [user.id, range.start, range.end],
    );
    return { period: range, data: rows, bucket_type: "month" };
  }

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
    [user.id, range.start, range.end],
  );

  return { period: range, data: rows, bucket_type: "day" };
}

async function getSummary(user, query) {
  const { granularity = "7d", anchor } = query;
  const range = getSimplePeriodRange(granularity, anchor);
  if (!range) throw httpError(400, "Neispravan anchor datum.");

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
    [user.id, range.start, range.end],
  );

  const totalDays = dailyAgg.length;
  const totalMl = dailyAgg.reduce((s, r) => s + parseInt(r.day_total, 10), 0);
  const avgMl = totalDays > 0 ? Math.round(totalMl / totalDays) : 0;
  const maxDay =
    totalDays > 0
      ? Math.max(...dailyAgg.map((r) => parseInt(r.day_total, 10)))
      : 0;
  const minDay =
    totalDays > 0
      ? Math.min(...dailyAgg.map((r) => parseInt(r.day_total, 10)))
      : 0;
  const daysGoalMet = dailyAgg.filter(
    (r) => parseInt(r.day_total, 10) >= parseInt(r.goal_ml, 10),
  ).length;

  const today = toYmd(new Date());
  const [todayRows] = await pool.query(
    "SELECT * FROM hydration_entries WHERE user_id = ? AND entry_date = ? ORDER BY created_at DESC",
    [user.id, today],
  );
  const todayTotal = todayRows.reduce(
    (s, r) => s + parseInt(r.amount_ml, 10),
    0,
  );
  const todayGoal =
    todayRows.length > 0 ? parseInt(todayRows[0].goal_ml, 10) : null;

  const [lastGoalRow] = await pool.query(
    "SELECT goal_ml FROM hydration_entries WHERE user_id = ? AND goal_ml IS NOT NULL ORDER BY entry_date DESC, created_at DESC LIMIT 1",
    [user.id],
  );
  const currentGoal = lastGoalRow[0]?.goal_ml || 2500;

  const [typeBreakdown] = await pool.query(
    `
      SELECT drink_type, SUM(amount_ml) AS total_ml, COUNT(*) AS count
      FROM hydration_entries
      WHERE user_id = ? AND entry_date >= ? AND entry_date <= ?
      GROUP BY drink_type
      ORDER BY total_ml DESC
    `,
    [user.id, range.start, range.end],
  );

  return {
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
  };
}

async function getRecords(user) {
  const [dayRecord] = await pool.query(
    `
      SELECT entry_date, SUM(amount_ml) AS total_ml
      FROM hydration_entries WHERE user_id = ?
      GROUP BY entry_date
      ORDER BY total_ml DESC LIMIT 1
    `,
    [user.id],
  );

  const [avgAll] = await pool.query(
    `
      SELECT COALESCE(AVG(day_total), 0) AS avg_daily FROM (
        SELECT SUM(amount_ml) AS day_total
        FROM hydration_entries WHERE user_id = ?
        GROUP BY entry_date
      ) AS daily
    `,
    [user.id],
  );

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
    [user.id],
  );

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
    [user.id],
  );

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
    [user.id],
  );

  const [totals] = await pool.query(
    `
      SELECT 
        COALESCE(SUM(amount_ml), 0) AS total_ml,
        COUNT(DISTINCT entry_date) AS total_days
      FROM hydration_entries WHERE user_id = ?
    `,
    [user.id],
  );

  return {
    daily: dayRecord[0] || null,
    weekly: weekRecord[0] || null,
    monthly: monthRecord[0] || null,
    yearly: yearRecord[0] || null,
    avg_daily: Math.round(parseFloat(avgAll[0]?.avg_daily || 0)),
    total_ml_alltime: parseInt(totals[0]?.total_ml || 0, 10),
    total_days_tracked: parseInt(totals[0]?.total_days || 0, 10),
  };
}

async function getStreak(user) {
  const [goalMetDays] = await pool.query(
    `
      SELECT DATE_FORMAT(entry_date, '%Y-%m-%d') AS day_key, SUM(amount_ml) AS day_total, MAX(goal_ml) AS goal_ml
      FROM hydration_entries
      WHERE user_id = ?
      GROUP BY entry_date
      HAVING day_total >= goal_ml
      ORDER BY entry_date DESC
    `,
    [user.id],
  );

  if (goalMetDays.length === 0) {
    return {
      current_streak: 0,
      longest_streak: 0,
      total_goal_days: 0,
    };
  }

  const dayKeysDesc = goalMetDays.map((r) => r.day_key);
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
    total_goal_days: goalMetDays.length,
  };
}

async function getGoal(user) {
  const [rows] = await pool.query(
    "SELECT goal_ml FROM hydration_entries WHERE user_id = ? AND goal_ml IS NOT NULL ORDER BY entry_date DESC, created_at DESC LIMIT 1",
    [user.id],
  );
  return { goal: rows[0]?.goal_ml || 2500 };
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
