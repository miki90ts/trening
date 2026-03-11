const pool = require("../db/connection");
const { toYmd } = require("../helpers/date");
const { httpError } = require("../helpers/httpError");

const SCORE_SQL = `
  CASE
    WHEN c.has_weight = 1 THEN COALESCE(SUM(ws.reps * ws.weight), 0)
    ELSE COALESCE(SUM(ws.reps), 0)
  END
`;

function ensureDayBucket(byDate, dateKey) {
  if (!byDate[dateKey]) {
    byDate[dateKey] = {
      workouts: [],
      activities: [],
      sessions: [],
      mealSessions: [],
      activitySessions: [],
    };
  }
}

async function getCalendarMonth(user, query) {
  const { month } = query;
  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    throw httpError(400, "month parametar je obavezan (format: YYYY-MM)");
  }

  const userId = user.id;

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

  const [activities] = await pool.query(
    `
      SELECT a.id, a.name, a.performed_at,
             DATE_FORMAT(a.performed_at, '%Y-%m-%d') AS performed_date,
             a.distance_meters, a.duration_seconds, a.avg_pace_seconds_per_km,
             a.ascent_meters,
             t.name AS activity_type_name
      FROM activities a
      JOIN activity_types t ON t.id = a.activity_type_id
      WHERE a.user_id = ?
        AND t.is_active = 1
        AND DATE_FORMAT(a.performed_at, '%Y-%m') = ?
      ORDER BY a.performed_at ASC
    `,
    [userId, month],
  );

  const [planSessions] = await pool.query(
    `
      SELECT ws.id, ws.plan_id, ws.plan_name, ws.scheduled_date, ws.status,
             ws.started_at, ws.completed_at,
             COUNT(DISTINCT wse.id) as exercise_count
      FROM workout_sessions ws
      LEFT JOIN workout_session_exercises wse ON wse.session_id = ws.id
      WHERE ws.user_id = ? AND DATE_FORMAT(ws.scheduled_date, '%Y-%m') = ?
      GROUP BY ws.id
      ORDER BY ws.scheduled_date ASC
    `,
    [userId, month],
  );

  const [mealSessions] = await pool.query(
    `
      SELECT ms.id, ms.plan_id, ms.plan_name, ms.scheduled_date, ms.status,
             ms.started_at, ms.completed_at,
             COUNT(DISTINCT msm.id) as meal_count
      FROM meal_sessions ms
      LEFT JOIN meal_session_meals msm ON msm.session_id = ms.id
      WHERE ms.user_id = ? AND DATE_FORMAT(ms.scheduled_date, '%Y-%m') = ?
      GROUP BY ms.id
      ORDER BY ms.scheduled_date ASC
    `,
    [userId, month],
  );

  const [activitySessions] = await pool.query(
    `
      SELECT s.id, s.plan_id, s.plan_name, s.scheduled_date, s.status,
             s.started_at, s.completed_at, s.activity_id,
             COUNT(DISTINCT ss.id) AS segment_count,
             at.name AS activity_type_name
      FROM activity_sessions s
      JOIN activity_types at ON at.id = s.activity_type_id
      LEFT JOIN activity_session_segments ss ON ss.session_id = s.id
      WHERE s.user_id = ? AND DATE_FORMAT(s.scheduled_date, '%Y-%m') = ?
      GROUP BY s.id
      ORDER BY s.scheduled_date ASC
    `,
    [userId, month],
  );

  const byDate = {};

  for (const workout of workouts) {
    const dateKey = new Date(workout.attempt_date).toISOString().slice(0, 10);
    ensureDayBucket(byDate, dateKey);
    byDate[dateKey].workouts.push(workout);
  }

  for (const activity of activities) {
    const dateKey = activity.performed_date;
    ensureDayBucket(byDate, dateKey);
    byDate[dateKey].activities.push(activity);
  }

  for (const planSession of planSessions) {
    const dateKey = toYmd(planSession.scheduled_date);
    ensureDayBucket(byDate, dateKey);
    byDate[dateKey].sessions.push(planSession);
  }

  for (const mealSession of mealSessions) {
    const dateKey = toYmd(mealSession.scheduled_date);
    ensureDayBucket(byDate, dateKey);
    byDate[dateKey].mealSessions.push(mealSession);
  }

  for (const activitySession of activitySessions) {
    const dateKey = toYmd(activitySession.scheduled_date);
    ensureDayBucket(byDate, dateKey);
    byDate[dateKey].activitySessions.push(activitySession);
  }

  return byDate;
}

module.exports = {
  getCalendarMonth,
};
