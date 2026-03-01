const pool = require("../db/connection");
const { httpError } = require("../helpers/httpError");

const SCORE_EXPR = `
  CASE 
    WHEN c.has_weight = 1 THEN COALESCE(SUM(ws.reps * ws.weight), 0)
    ELSE COALESCE(SUM(ws.reps), 0)
  END
`;

async function getLeaderboard(query) {
  const { category_id } = query;
  if (!category_id) {
    throw httpError(400, "category_id is required");
  }

  const [rows] = await pool.query(
    `
      SELECT 
        w.id,
        w.user_id,
        ${SCORE_EXPR} as score,
        u.first_name, u.last_name, u.nickname, u.profile_image,
        c.name as category_name, c.value_type, c.has_weight,
        e.name as exercise_name, e.icon as exercise_icon
      FROM workouts w
      JOIN users u ON w.user_id = u.id
      JOIN categories c ON w.category_id = c.id
      JOIN exercises e ON c.exercise_id = e.id
      LEFT JOIN workout_sets ws ON ws.workout_id = w.id
      WHERE w.category_id = ?
      GROUP BY w.id
      ORDER BY score DESC
    `,
    [category_id],
  );

  return rows.map((row, index) => ({ ...row, rank: index + 1 }));
}

async function getExerciseLeaderboard(exerciseId) {
  const [categories] = await pool.query(
    "SELECT * FROM categories WHERE exercise_id = ?",
    [exerciseId],
  );

  const result = [];
  for (const cat of categories) {
    const scoreExpr = cat.has_weight
      ? "COALESCE(SUM(ws.reps * ws.weight), 0)"
      : "COALESCE(SUM(ws.reps), 0)";

    const [records] = await pool.query(
      `
        SELECT 
          w.id, w.user_id,
          ${scoreExpr} as score,
          u.first_name, u.last_name, u.nickname, u.profile_image
        FROM workouts w
        JOIN users u ON w.user_id = u.id
        LEFT JOIN workout_sets ws ON ws.workout_id = w.id
        WHERE w.category_id = ?
        GROUP BY w.id
        ORDER BY score DESC
        LIMIT 10
      `,
      [cat.id],
    );

    result.push({
      category: cat,
      records: records.map((r, i) => ({ ...r, rank: i + 1 })),
    });
  }

  return result;
}

async function getUserLeaderboard(userId) {
  const [user] = await pool.query(
    "SELECT id, first_name, last_name, nickname, email, role, profile_image, created_at FROM users WHERE id = ?",
    [userId],
  );
  if (user.length === 0) {
    throw httpError(404, "User not found");
  }

  const [records] = await pool.query(
    `
      SELECT 
        ranked.id,
        ranked.score,
        ranked.category_name,
        ranked.value_type,
        ranked.has_weight,
        ranked.exercise_name,
        ranked.exercise_icon
      FROM (
        SELECT 
          w.id,
          w.category_id,
          CASE 
            WHEN c.has_weight = 1 THEN COALESCE(SUM(ws.reps * ws.weight), 0)
            ELSE COALESCE(SUM(ws.reps), 0)
          END as score,
          c.name as category_name, c.value_type, c.has_weight,
          e.name as exercise_name, e.icon as exercise_icon,
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
        GROUP BY w.id, w.category_id, c.name, c.value_type, c.has_weight, e.name, e.icon
      ) ranked
      WHERE ranked.rn = 1
      ORDER BY ranked.exercise_name, ranked.category_name
    `,
    [userId],
  );

  const [totalResults] = await pool.query(
    "SELECT COUNT(*) as total FROM workouts WHERE user_id = ?",
    [userId],
  );

  return {
    user: user[0],
    records,
    total_attempts: totalResults[0].total,
  };
}

async function getSummary() {
  const [topUsers] = await pool.query(
    `
      SELECT 
        u.id,
        u.first_name,
        u.last_name,
        u.nickname,
        u.profile_image,
        COUNT(DISTINCT best.category_id) AS total_records
      FROM users u
      JOIN (
        SELECT w.user_id, w.category_id,
          CASE 
            WHEN c.has_weight = 1 THEN COALESCE(SUM(ws.reps * ws.weight), 0)
            ELSE COALESCE(SUM(ws.reps), 0)
          END as score
        FROM workouts w
        JOIN categories c ON w.category_id = c.id
        LEFT JOIN workout_sets ws ON ws.workout_id = w.id
        GROUP BY w.id, w.user_id, w.category_id, c.has_weight
      ) scores ON u.id = scores.user_id
      JOIN (
        SELECT category_id, MAX(score) as max_score
        FROM (
          SELECT w.category_id,
            CASE 
              WHEN c.has_weight = 1 THEN COALESCE(SUM(ws.reps * ws.weight), 0)
              ELSE COALESCE(SUM(ws.reps), 0)
            END as score
          FROM workouts w
          JOIN categories c ON w.category_id = c.id
          LEFT JOIN workout_sets ws ON ws.workout_id = w.id
          GROUP BY w.id, w.category_id, c.has_weight
        ) all_scores
        GROUP BY category_id
      ) best ON scores.category_id = best.category_id AND scores.score = best.max_score
      WHERE u.is_approved = 1
      GROUP BY u.id, u.first_name, u.last_name, u.nickname, u.profile_image
      ORDER BY total_records DESC
      LIMIT 10
    `,
  );

  const [recentRecords] = await pool.query(
    `
      WITH scored_workouts AS (
      SELECT 
          w.id AS workout_id,
          w.user_id,
          w.category_id,
          w.attempt_date,
          CASE 
              WHEN c.has_weight = 1 THEN COALESCE(SUM(ws.reps * ws.weight), 0)
              ELSE COALESCE(SUM(ws.reps), 0)
          END AS score
      FROM workouts w
      JOIN categories c 
          ON w.category_id = c.id
      LEFT JOIN workout_sets ws 
          ON ws.workout_id = w.id
      GROUP BY 
          w.id, w.user_id, w.category_id, w.attempt_date, c.has_weight
      ),
      ranked_workouts AS (
        SELECT
            sw.*,
            ROW_NUMBER() OVER (PARTITION BY sw.category_id ORDER BY sw.score DESC) AS rn
        FROM scored_workouts sw
      )
      SELECT 
          u.id,
          u.first_name,
          u.last_name,
          u.nickname,
          u.profile_image,
          c.id AS category_id,
          c.name AS category_name,
          c.value_type,
          c.has_weight,
          e.name AS exercise_name,
          e.icon AS exercise_icon,
          rw.workout_id,
          rw.attempt_date,
          rw.score
      FROM ranked_workouts rw
      JOIN users u 
          ON u.id = rw.user_id
      JOIN categories c 
          ON c.id = rw.category_id
      JOIN exercises e 
          ON e.id = c.exercise_id
      JOIN workouts w
          ON w.id = rw.workout_id
      WHERE rw.rn = 1
        AND u.is_approved = 1
      ORDER BY rw.attempt_date DESC
      LIMIT 10;
    `,
  );

  const [stats] = await pool.query(
    `
      SELECT 
        (SELECT COUNT(*) FROM users WHERE is_approved = 1) as total_users,
        (SELECT COUNT(*) FROM exercises) as total_exercises,
        (SELECT COUNT(*) FROM workouts) as total_attempts,
        (SELECT COUNT(DISTINCT category_id) FROM workouts) as total_records
    `,
  );

  return {
    stats: stats[0],
    top_users: topUsers,
    recent_records: recentRecords,
  };
}

module.exports = {
  getLeaderboard,
  getExerciseLeaderboard,
  getUserLeaderboard,
  getSummary,
};
