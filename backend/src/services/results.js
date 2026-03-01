const pool = require("../db/connection");
const { httpError } = require("../helpers/httpError");

const SCORE_SQL = `
  CASE 
    WHEN c.has_weight = 1 THEN COALESCE(SUM(ws.reps * ws.weight), 0)
    ELSE COALESCE(SUM(ws.reps), 0)
  END
`;

async function attachSets(rows) {
  for (const row of rows) {
    const [sets] = await pool.query(
      "SELECT id, set_number, reps, weight FROM workout_sets WHERE workout_id = ? ORDER BY set_number",
      [row.id],
    );
    row.sets = sets;
  }
}

async function getResults(user, query) {
  const { category_id, exercise_id, date, limit, page, pageSize } = query;
  const user_id = user.id;

  let whereClause = " WHERE w.user_id = ?";
  const values = [user_id];

  if (category_id) {
    whereClause += " AND w.category_id = ?";
    values.push(category_id);
  }
  if (exercise_id) {
    whereClause += " AND c.exercise_id = ?";
    values.push(exercise_id);
  }
  if (date) {
    whereClause += " AND DATE(w.attempt_date) = ?";
    values.push(date);
  }

  if (page && pageSize) {
    const countQuery = `
      SELECT COUNT(DISTINCT w.id) as total
      FROM workouts w
      JOIN categories c ON w.category_id = c.id
      ${whereClause}
    `;
    const [countRows] = await pool.query(countQuery, values);
    const total = countRows[0].total;

    const offset = (parseInt(page, 10) - 1) * parseInt(pageSize, 10);
    const dataQuery = `
      SELECT w.id, w.user_id, w.category_id, w.attempt_date, w.notes, w.created_at,
             u.first_name, u.last_name, u.nickname, u.profile_image,
             c.name as category_name, c.value_type, c.has_weight,
             e.name as exercise_name, e.icon as exercise_icon,
             COUNT(ws.id) as total_sets,
             ${SCORE_SQL} as score,
             COALESCE(SUM(ws.reps), 0) as total_reps,
             COALESCE(MAX(ws.weight), 0) as max_weight
      FROM workouts w
      JOIN users u ON w.user_id = u.id
      JOIN categories c ON w.category_id = c.id
      JOIN exercises e ON c.exercise_id = e.id
      LEFT JOIN workout_sets ws ON ws.workout_id = w.id
      ${whereClause}
      GROUP BY w.id
      ORDER BY w.attempt_date DESC
      LIMIT ? OFFSET ?
    `;
    const paginatedValues = [...values, parseInt(pageSize, 10), offset];
    const [rows] = await pool.query(dataQuery, paginatedValues);

    await attachSets(rows);

    return {
      data: rows,
      pagination: {
        page: parseInt(page, 10),
        pageSize: parseInt(pageSize, 10),
        total,
        totalPages: Math.ceil(total / parseInt(pageSize, 10)),
      },
    };
  }

  let sql = `
    SELECT w.id, w.user_id, w.category_id, w.attempt_date, w.notes, w.created_at,
           u.first_name, u.last_name, u.nickname, u.profile_image,
           c.name as category_name, c.value_type, c.has_weight,
           e.name as exercise_name, e.icon as exercise_icon,
           COUNT(ws.id) as total_sets,
           ${SCORE_SQL} as score,
           COALESCE(SUM(ws.reps), 0) as total_reps,
           COALESCE(MAX(ws.weight), 0) as max_weight
    FROM workouts w
    JOIN users u ON w.user_id = u.id
    JOIN categories c ON w.category_id = c.id
    JOIN exercises e ON c.exercise_id = e.id
    LEFT JOIN workout_sets ws ON ws.workout_id = w.id
    ${whereClause}
    GROUP BY w.id
    ORDER BY w.attempt_date DESC
  `;

  if (limit) {
    sql += " LIMIT ?";
    values.push(parseInt(limit, 10));
  }

  const [rows] = await pool.query(sql, values);
  await attachSets(rows);
  return rows;
}

async function getResultById(id) {
  const [rows] = await pool.query(
    `
      SELECT w.id, w.user_id, w.category_id, w.attempt_date, w.notes, w.created_at,
             u.first_name, u.last_name, u.nickname, u.profile_image,
             c.name as category_name, c.value_type, c.has_weight,
             e.id as exercise_id, e.name as exercise_name, e.icon as exercise_icon, e.description as exercise_description,
             ${SCORE_SQL} as score,
             COUNT(ws.id) as total_sets,
             COALESCE(SUM(ws.reps), 0) as total_reps,
             COALESCE(MAX(ws.weight), 0) as max_weight
      FROM workouts w
      JOIN users u ON w.user_id = u.id
      JOIN categories c ON w.category_id = c.id
      JOIN exercises e ON c.exercise_id = e.id
      LEFT JOIN workout_sets ws ON ws.workout_id = w.id
      WHERE w.id = ?
      GROUP BY w.id
    `,
    [id],
  );

  if (rows.length === 0) {
    throw httpError(404, "Workout not found");
  }

  const [sets] = await pool.query(
    "SELECT id, set_number, reps, weight FROM workout_sets WHERE workout_id = ? ORDER BY set_number",
    [id],
  );
  rows[0].sets = sets;

  return rows[0];
}

async function createResult(user, body) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const { category_id, sets, attempt_date, notes } = body;

    let user_id;
    if (user.role === "admin" && body.user_id) {
      user_id = body.user_id;
    } else {
      user_id = user.id;
    }

    if (!category_id || !sets || !Array.isArray(sets) || sets.length === 0) {
      throw httpError(400, "category_id i sets (niz) su obavezni");
    }

    for (const s of sets) {
      if (s.reps === undefined || s.reps === null || s.reps === "") {
        throw httpError(400, "Svaki set mora imati reps vrednost");
      }
    }

    const attemptDate =
      attempt_date || new Date().toISOString().slice(0, 19).replace("T", " ");

    const [catRows] = await conn.query(
      "SELECT * FROM categories WHERE id = ?",
      [category_id],
    );
    if (catRows.length === 0) {
      throw httpError(404, "Kategorija nije pronađena");
    }
    const category = catRows[0];

    const [insertWorkout] = await conn.query(
      "INSERT INTO workouts (user_id, category_id, attempt_date, notes) VALUES (?, ?, ?, ?)",
      [user_id, category_id, attemptDate, notes || null],
    );
    const workoutId = insertWorkout.insertId;

    for (let index = 0; index < sets.length; index += 1) {
      const s = sets[index];
      await conn.query(
        "INSERT INTO workout_sets (workout_id, set_number, reps, weight) VALUES (?, ?, ?, ?)",
        [
          workoutId,
          index + 1,
          parseFloat(s.reps),
          s.weight ? parseFloat(s.weight) : null,
        ],
      );
    }

    let newScore;
    if (category.has_weight) {
      newScore = sets.reduce(
        (sum, s) => sum + parseFloat(s.reps) * (parseFloat(s.weight) || 0),
        0,
      );
    } else {
      newScore = sets.reduce((sum, s) => sum + parseFloat(s.reps), 0);
    }

    let isRecord = false;
    let previousRecord = null;

    const scoreExpr = category.has_weight
      ? "COALESCE(SUM(ws.reps * ws.weight), 0)"
      : "COALESCE(SUM(ws.reps), 0)";

    const [bestRows] = await conn.query(
      `
        SELECT w.id, ${scoreExpr} as best_score
        FROM workouts w
        LEFT JOIN workout_sets ws ON ws.workout_id = w.id
        WHERE w.user_id = ? AND w.category_id = ? AND w.id != ?
        GROUP BY w.id
        ORDER BY best_score DESC
        LIMIT 1
      `,
      [user_id, category_id, workoutId],
    );

    if (
      bestRows.length === 0 ||
      newScore > parseFloat(bestRows[0].best_score)
    ) {
      isRecord = true;
      if (bestRows.length > 0) {
        previousRecord = parseFloat(bestRows[0].best_score);
      }
    }

    await conn.commit();

    const [fullResult] = await conn.query(
      `
        SELECT w.id, w.user_id, w.category_id, w.attempt_date, w.notes, w.created_at,
               u.first_name, u.last_name, u.nickname,
               c.name as category_name, c.value_type, c.has_weight,
               e.name as exercise_name, e.icon as exercise_icon
        FROM workouts w
        JOIN users u ON w.user_id = u.id
        JOIN categories c ON w.category_id = c.id
        JOIN exercises e ON c.exercise_id = e.id
        WHERE w.id = ?
      `,
      [workoutId],
    );

    const [resultSets] = await conn.query(
      "SELECT id, set_number, reps, weight FROM workout_sets WHERE workout_id = ? ORDER BY set_number",
      [workoutId],
    );

    return {
      ...fullResult[0],
      sets: resultSets,
      score: newScore,
      total_sets: resultSets.length,
      total_reps: resultSets.reduce((s, r) => s + parseFloat(r.reps), 0),
      max_weight: Math.max(
        0,
        ...resultSets.map((r) => parseFloat(r.weight) || 0),
      ),
      is_new_record: isRecord,
      previous_record: previousRecord,
    };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

async function updateResult(id, user, body) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const workoutId = id;

    const [existing] = await conn.query("SELECT * FROM workouts WHERE id = ?", [
      workoutId,
    ]);
    if (existing.length === 0) {
      throw httpError(404, "Workout not found");
    }
    if (existing[0].user_id !== user.id && user.role !== "admin") {
      throw httpError(403, "Nemate dozvolu za ovu akciju.");
    }

    const { sets, attempt_date, notes, category_id } = body;

    const updates = [];
    const vals = [];
    if (attempt_date !== undefined) {
      updates.push("attempt_date = ?");
      vals.push(attempt_date);
    }
    if (notes !== undefined) {
      updates.push("notes = ?");
      vals.push(notes || null);
    }
    if (category_id !== undefined) {
      updates.push("category_id = ?");
      vals.push(category_id);
    }

    if (updates.length > 0) {
      vals.push(workoutId);
      await conn.query(
        `UPDATE workouts SET ${updates.join(", ")} WHERE id = ?`,
        vals,
      );
    }

    if (sets && Array.isArray(sets) && sets.length > 0) {
      for (const s of sets) {
        if (s.reps === undefined || s.reps === null || s.reps === "") {
          throw httpError(400, "Svaki set mora imati reps vrednost");
        }
      }

      await conn.query("DELETE FROM workout_sets WHERE workout_id = ?", [
        workoutId,
      ]);

      for (let index = 0; index < sets.length; index += 1) {
        const s = sets[index];
        await conn.query(
          "INSERT INTO workout_sets (workout_id, set_number, reps, weight) VALUES (?, ?, ?, ?)",
          [
            workoutId,
            index + 1,
            parseFloat(s.reps),
            s.weight ? parseFloat(s.weight) : null,
          ],
        );
      }
    }

    await conn.commit();

    const [fullResult] = await conn.query(
      `
        SELECT w.id, w.user_id, w.category_id, w.attempt_date, w.notes, w.created_at,
               u.first_name, u.last_name, u.nickname, u.profile_image,
               c.name as category_name, c.value_type, c.has_weight,
               e.name as exercise_name, e.icon as exercise_icon,
               COUNT(ws.id) as total_sets,
               ${SCORE_SQL} as score,
               COALESCE(SUM(ws.reps), 0) as total_reps,
               COALESCE(MAX(ws.weight), 0) as max_weight
        FROM workouts w
        JOIN users u ON w.user_id = u.id
        JOIN categories c ON w.category_id = c.id
        JOIN exercises e ON c.exercise_id = e.id
        LEFT JOIN workout_sets ws ON ws.workout_id = w.id
        WHERE w.id = ?
        GROUP BY w.id
      `,
      [workoutId],
    );

    const [resultSets] = await conn.query(
      "SELECT id, set_number, reps, weight FROM workout_sets WHERE workout_id = ? ORDER BY set_number",
      [workoutId],
    );

    return { ...fullResult[0], sets: resultSets };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

async function deleteResult(id, user) {
  const [rows] = await pool.query("SELECT user_id FROM workouts WHERE id = ?", [
    id,
  ]);
  if (rows.length === 0) {
    throw httpError(404, "Workout not found");
  }

  if (rows[0].user_id !== user.id && user.role !== "admin") {
    throw httpError(403, "Nemate dozvolu da obrišete ovaj rezultat.");
  }

  await pool.query("DELETE FROM workouts WHERE id = ?", [id]);
  return { message: "Workout deleted" };
}

module.exports = {
  getResults,
  getResultById,
  createResult,
  updateResult,
  deleteResult,
};
