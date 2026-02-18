const express = require("express");
const router = express.Router();
const pool = require("../db/connection");
const { authenticate } = require("../middleware/auth");

// ======== HELPER: Score SQL ========
const SCORE_SQL = `
  CASE 
    WHEN c.has_weight = 1 THEN COALESCE(SUM(ws.reps * ws.weight), 0)
    ELSE COALESCE(SUM(ws.reps), 0)
  END
`;

// GET /api/calendar/month?month=YYYY-MM
// Vraća sve urađene i zakazane treninge za mesec, grupisane po datumu
router.get("/month", authenticate, async (req, res, next) => {
  try {
    const { month } = req.query;
    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      return res
        .status(400)
        .json({ error: "month parametar je obavezan (format: YYYY-MM)" });
    }

    const userId = req.user.id;

    // 1. Urađeni treninzi za mesec
    const [workouts] = await pool.query(
      `
      SELECT w.id, w.category_id, w.attempt_date, w.notes,
             c.name AS category_name, c.value_type, c.has_weight, c.color AS category_color,
             e.name AS exercise_name, e.icon AS exercise_icon,
             COUNT(ws.id) AS total_sets,
             ${SCORE_SQL} AS score
      FROM workouts w
      JOIN categories c ON w.category_id = c.id
      JOIN exercises e ON c.exercise_id = e.id
      LEFT JOIN workout_sets ws ON ws.workout_id = w.id
      WHERE w.user_id = ? AND DATE_FORMAT(w.attempt_date, '%Y-%m') = ?
      GROUP BY w.id
      ORDER BY w.attempt_date ASC
    `,
      [userId, month],
    );

    // 2. Zakazani treninzi za mesec
    const [scheduled] = await pool.query(
      `
      SELECT sw.*, 
             c.name AS category_name, c.value_type, c.has_weight, c.color AS category_color,
             e.name AS exercise_name, e.icon AS exercise_icon
      FROM scheduled_workouts sw
      JOIN categories c ON sw.category_id = c.id
      JOIN exercises e ON c.exercise_id = e.id
      WHERE sw.user_id = ? AND DATE_FORMAT(sw.scheduled_date, '%Y-%m') = ?
      ORDER BY sw.scheduled_date ASC, sw.scheduled_time ASC
    `,
      [userId, month],
    );

    // 3. Grupisanje po datumu
    const byDate = {};

    for (const w of workouts) {
      const dateKey = new Date(w.attempt_date).toISOString().slice(0, 10);
      if (!byDate[dateKey]) byDate[dateKey] = { workouts: [], scheduled: [] };
      byDate[dateKey].workouts.push(w);
    }

    for (const s of scheduled) {
      const d = s.scheduled_date;
      const dateKey = [
        d.getFullYear(),
        String(d.getMonth() + 1).padStart(2, "0"),
        String(d.getDate()).padStart(2, "0"),
      ].join("-");

      if (!byDate[dateKey]) byDate[dateKey] = { workouts: [], scheduled: [] };
      byDate[dateKey].scheduled.push(s);
    }

    res.json(byDate);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
