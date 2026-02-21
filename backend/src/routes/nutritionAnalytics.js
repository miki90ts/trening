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
  const day = copy.getDay();
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

router.get("/period-stats", authenticate, async (req, res, next) => {
  try {
    const { granularity = "week", anchor } = req.query;
    const period = getPeriodRange(granularity, anchor);

    if (!period) {
      return res.status(400).json({ error: "Invalid anchor date format" });
    }

    const userId = req.user.id;
    let rows;

    if (period.granularity === "year") {
      const [yearRows] = await pool.query(
        `SELECT
           DATE_FORMAT(entry_date, '%Y-%m') AS bucket_key,
           COALESCE(SUM(total_kcal), 0) AS total_kcal,
           COALESCE(SUM(total_protein), 0) AS total_protein,
           COALESCE(SUM(total_carbs), 0) AS total_carbs,
           COALESCE(SUM(total_fat), 0) AS total_fat,
           COALESCE(SUM(total_items), 0) AS total_items,
           COUNT(*) AS days_logged
         FROM food_daily_totals
         WHERE user_id = ?
           AND entry_date BETWEEN ? AND ?
         GROUP BY DATE_FORMAT(entry_date, '%Y-%m')
         ORDER BY bucket_key ASC`,
        [userId, period.startDate, period.endDate],
      );

      const index = new Map(yearRows.map((row) => [row.bucket_key, row]));
      rows = [];

      for (let month = 0; month < 12; month++) {
        const current = new Date(
          new Date(period.startDate).getFullYear(),
          month,
          1,
        );
        const key = `${current.getFullYear()}-${String(month + 1).padStart(2, "0")}`;
        const source = index.get(key) || {};

        rows.push({
          bucket_key: key,
          label: key,
          total_kcal: source.total_kcal || 0,
          total_protein: source.total_protein || 0,
          total_carbs: source.total_carbs || 0,
          total_fat: source.total_fat || 0,
          total_items: source.total_items || 0,
          days_logged: source.days_logged || 0,
        });
      }
    } else {
      const [periodRows] = await pool.query(
        `SELECT
          entry_date AS bucket_key,
          total_kcal,
          total_protein,
          total_carbs,
          total_fat,
          total_items
        FROM food_daily_totals
        WHERE user_id = ?
          AND entry_date BETWEEN ? AND ?
        ORDER BY bucket_key ASC`,
        [userId, period.startDate, period.endDate],
      );

      const index = new Map(
        periodRows.map((row) => [toYmd(new Date(row.bucket_key)), row]),
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
          total_kcal: source.total_kcal || 0,
          total_protein: source.total_protein || 0,
          total_carbs: source.total_carbs || 0,
          total_fat: source.total_fat || 0,
          total_items: source.total_items || 0,
          days_logged: source.total_items ? 1 : 0,
        });
      }
    }

    res.json({ period, data: rows });
  } catch (err) {
    next(err);
  }
});

router.get("/summary", authenticate, async (req, res, next) => {
  try {
    const userId = req.user.id;

    const [totalsRows] = await pool.query(
      `SELECT
         COALESCE(SUM(total_kcal), 0) AS total_kcal,
         COALESCE(SUM(total_protein), 0) AS total_protein,
         COALESCE(SUM(total_carbs), 0) AS total_carbs,
         COALESCE(SUM(total_fat), 0) AS total_fat,
         COALESCE(SUM(total_items), 0) AS total_items,
         COUNT(*) AS logged_days
       FROM food_daily_totals
       WHERE user_id = ?`,
      [userId],
    );

    const [todayRows] = await pool.query(
      `SELECT total_kcal, total_protein, total_carbs, total_fat, total_items
       FROM food_daily_totals
       WHERE user_id = ? AND entry_date = CURDATE()`,
      [userId],
    );

    const [avg7Rows] = await pool.query(
      `SELECT
         COALESCE(AVG(total_kcal), 0) AS avg_kcal,
         COALESCE(AVG(total_protein), 0) AS avg_protein,
         COALESCE(AVG(total_carbs), 0) AS avg_carbs,
         COALESCE(AVG(total_fat), 0) AS avg_fat
       FROM food_daily_totals
       WHERE user_id = ?
         AND entry_date >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)`,
      [userId],
    );

    res.json({
      totals: totalsRows[0],
      today: todayRows[0] || {
        total_kcal: 0,
        total_protein: 0,
        total_carbs: 0,
        total_fat: 0,
        total_items: 0,
      },
      avg7: avg7Rows[0],
    });
  } catch (err) {
    next(err);
  }
});

router.get("/top-foods", authenticate, async (req, res, next) => {
  try {
    const { granularity = "month", anchor } = req.query;
    const period = getPeriodRange(granularity, anchor);

    if (!period) {
      return res.status(400).json({ error: "Invalid anchor date format" });
    }

    const [rows] = await pool.query(
      `SELECT
         COALESCE(fi.name, fei.custom_name) AS item_name,
         COUNT(*) AS occurrences,
         COALESCE(SUM(fei.consumed_kcal), 0) AS total_kcal,
         COALESCE(SUM(fei.consumed_protein), 0) AS total_protein,
         COALESCE(SUM(fei.consumed_carbs), 0) AS total_carbs,
         COALESCE(SUM(fei.consumed_fat), 0) AS total_fat
       FROM food_entries fe
       JOIN food_entry_items fei ON fei.entry_id = fe.id
       LEFT JOIN food_items fi ON fi.id = fei.food_item_id
       WHERE fe.user_id = ?
         AND fe.entry_date BETWEEN ? AND ?
       GROUP BY COALESCE(fi.name, fei.custom_name)
       ORDER BY total_kcal DESC
       LIMIT 20`,
      [req.user.id, period.startDate, period.endDate],
    );

    res.json({ period, data: rows });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
