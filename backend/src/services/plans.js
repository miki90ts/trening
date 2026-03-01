const pool = require("../db/connection");
const { httpError } = require("../helpers/httpError");

const SCORE_SQL = `
  CASE 
    WHEN c.has_weight = 1 THEN COALESCE(SUM(ws.reps * ws.weight), 0)
    ELSE COALESCE(SUM(ws.reps), 0)
  END
`;

async function getPlans(userId) {
  const [plans] = await pool.query(
    `
    SELECT wp.*, 
           COUNT(DISTINCT wpe.id) as exercise_count
    FROM workout_plans wp
    LEFT JOIN workout_plan_exercises wpe ON wpe.plan_id = wp.id
    WHERE wp.user_id = ?
    GROUP BY wp.id
    ORDER BY wp.updated_at DESC
  `,
    [userId],
  );

  return plans;
}

async function getPlanById(planId, userId) {
  const [plans] = await pool.query(
    "SELECT * FROM workout_plans WHERE id = ? AND user_id = ?",
    [planId, userId],
  );
  if (plans.length === 0) throw httpError(404, "Plan nije pronađen");

  const plan = plans[0];

  const [exercises] = await pool.query(
    `
    SELECT wpe.id, wpe.category_id, wpe.order_index, wpe.notes,
           c.name as category_name, c.value_type, c.has_weight,
           e.id as exercise_id, e.name as exercise_name, e.icon as exercise_icon
    FROM workout_plan_exercises wpe
    JOIN categories c ON wpe.category_id = c.id
    JOIN exercises e ON c.exercise_id = e.id
    WHERE wpe.plan_id = ?
    ORDER BY wpe.order_index ASC
  `,
    [plan.id],
  );

  for (const ex of exercises) {
    const [sets] = await pool.query(
      "SELECT id, set_number, target_reps, target_weight FROM workout_plan_sets WHERE plan_exercise_id = ? ORDER BY set_number",
      [ex.id],
    );
    ex.sets = sets;
  }

  plan.exercises = exercises;
  return plan;
}

async function createPlan(userId, data) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const { name, description, color, exercises } = data;

    if (!name || !name.trim()) {
      throw httpError(400, "Naziv plana je obavezan");
    }
    if (!exercises || !Array.isArray(exercises) || exercises.length === 0) {
      throw httpError(400, "Plan mora imati bar jednu vežbu");
    }

    const [insertPlan] = await conn.query(
      "INSERT INTO workout_plans (user_id, name, description, color) VALUES (?, ?, ?, ?)",
      [userId, name.trim(), description || null, color || "#6366f1"],
    );
    const planId = insertPlan.insertId;

    for (let i = 0; i < exercises.length; i++) {
      const ex = exercises[i];
      if (!ex.category_id) continue;

      const [insertEx] = await conn.query(
        "INSERT INTO workout_plan_exercises (plan_id, category_id, order_index, notes) VALUES (?, ?, ?, ?)",
        [planId, ex.category_id, i, ex.notes || null],
      );
      const planExId = insertEx.insertId;

      if (ex.sets && Array.isArray(ex.sets)) {
        for (let j = 0; j < ex.sets.length; j++) {
          const s = ex.sets[j];
          await conn.query(
            "INSERT INTO workout_plan_sets (plan_exercise_id, set_number, target_reps, target_weight) VALUES (?, ?, ?, ?)",
            [
              planExId,
              j + 1,
              parseFloat(s.target_reps) || 0,
              s.target_weight ? parseFloat(s.target_weight) : null,
            ],
          );
        }
      }
    }

    await conn.commit();
    return { id: planId, message: "Plan kreiran" };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

async function updatePlan(planId, userId, data) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [existing] = await conn.query(
      "SELECT * FROM workout_plans WHERE id = ? AND user_id = ?",
      [planId, userId],
    );
    if (existing.length === 0) {
      throw httpError(404, "Plan nije pronađen");
    }

    const { name, description, color, exercises } = data;

    await conn.query(
      "UPDATE workout_plans SET name = ?, description = ?, color = ?, updated_at = NOW() WHERE id = ?",
      [
        name?.trim() || existing[0].name,
        description !== undefined ? description : existing[0].description,
        color || existing[0].color,
        planId,
      ],
    );

    if (exercises && Array.isArray(exercises)) {
      await conn.query("DELETE FROM workout_plan_exercises WHERE plan_id = ?", [
        planId,
      ]);

      for (let i = 0; i < exercises.length; i++) {
        const ex = exercises[i];
        if (!ex.category_id) continue;

        const [insertEx] = await conn.query(
          "INSERT INTO workout_plan_exercises (plan_id, category_id, order_index, notes) VALUES (?, ?, ?, ?)",
          [planId, ex.category_id, i, ex.notes || null],
        );
        const planExId = insertEx.insertId;

        if (ex.sets && Array.isArray(ex.sets)) {
          for (let j = 0; j < ex.sets.length; j++) {
            const s = ex.sets[j];
            await conn.query(
              "INSERT INTO workout_plan_sets (plan_exercise_id, set_number, target_reps, target_weight) VALUES (?, ?, ?, ?)",
              [
                planExId,
                j + 1,
                parseFloat(s.target_reps) || 0,
                s.target_weight ? parseFloat(s.target_weight) : null,
              ],
            );
          }
        }
      }
    }

    await conn.commit();
    return { message: "Plan ažuriran" };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

async function deletePlan(planId, userId) {
  const [existing] = await pool.query(
    "SELECT * FROM workout_plans WHERE id = ? AND user_id = ?",
    [planId, userId],
  );
  if (existing.length === 0) throw httpError(404, "Plan nije pronađen");

  await pool.query("DELETE FROM workout_plans WHERE id = ?", [planId]);
  return { message: "Plan obrisan" };
}

async function schedulePlan(planId, user, payload) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const { scheduled_date, user_id } = payload;

    if (!scheduled_date) {
      throw httpError(400, "Datum je obavezan");
    }

    let targetUserId;
    let targetUser = null;
    if (user.role === "admin" && user_id) {
      targetUserId = user_id;
      const [users] = await conn.query(
        "SELECT id, first_name, last_name, nickname, email FROM users WHERE id = ? AND is_approved = 1",
        [user_id],
      );
      if (users.length === 0) {
        throw httpError(404, "Korisnik nije pronađen");
      }
      targetUser = users[0];
    } else {
      targetUserId = user.id;
    }

    const [plans] = await conn.query(
      "SELECT * FROM workout_plans WHERE id = ? AND user_id = ?",
      [planId, user.id],
    );
    if (plans.length === 0) {
      throw httpError(404, "Plan nije pronađen");
    }

    const [planExercises] = await conn.query(
      "SELECT * FROM workout_plan_exercises WHERE plan_id = ? ORDER BY order_index",
      [planId],
    );

    const [insertSession] = await conn.query(
      "INSERT INTO workout_sessions (user_id, plan_id, plan_name, scheduled_date, status) VALUES (?, ?, ?, ?, ?)",
      [targetUserId, planId, plans[0].name, scheduled_date, "scheduled"],
    );
    const sessionId = insertSession.insertId;

    for (const pe of planExercises) {
      const [insertSE] = await conn.query(
        "INSERT INTO workout_session_exercises (session_id, category_id, order_index, notes) VALUES (?, ?, ?, ?)",
        [sessionId, pe.category_id, pe.order_index, pe.notes],
      );
      const seId = insertSE.insertId;

      const [planSets] = await conn.query(
        "SELECT * FROM workout_plan_sets WHERE plan_exercise_id = ? ORDER BY set_number",
        [pe.id],
      );

      for (const ps of planSets) {
        await conn.query(
          "INSERT INTO workout_session_sets (session_exercise_id, set_number, target_reps, target_weight) VALUES (?, ?, ?, ?)",
          [seId, ps.set_number, ps.target_reps, ps.target_weight],
        );
      }
    }

    await conn.commit();

    const msg =
      targetUser && targetUserId !== user.id
        ? `Trening zakazan za ${targetUser.nickname || targetUser.first_name || "korisnika"}`
        : "Trening zakazan";

    const shouldPrepareEmail = Boolean(targetUser && targetUserId !== user.id);
    let emailPayload = null;

    if (shouldPrepareEmail) {
      const exercisesForEmail = [];
      for (const pe of planExercises) {
        const [exInfo] = await pool.query(
          `
          SELECT c.name as category_name, c.has_weight, e.icon as exercise_icon
          FROM categories c
          JOIN exercises e ON c.exercise_id = e.id
          WHERE c.id = ?
        `,
          [pe.category_id],
        );

        const [sets] = await pool.query(
          "SELECT set_number, target_reps, target_weight FROM workout_plan_sets WHERE plan_exercise_id = ? ORDER BY set_number",
          [pe.id],
        );

        exercisesForEmail.push({
          category_name: exInfo[0]?.category_name || "Nepoznata vežba",
          has_weight: exInfo[0]?.has_weight || 0,
          exercise_icon: exInfo[0]?.exercise_icon || "",
          sets,
        });
      }

      emailPayload = {
        targetUser,
        planName: plans[0].name,
        planColor: plans[0].color,
        scheduledDate: scheduled_date,
        exercisesWithSets: exercisesForEmail,
      };
    }

    return { id: sessionId, message: msg, emailPayload };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

async function getSessionsList(userId, query) {
  const { status, from, to } = query;
  let where = "WHERE ws.user_id = ?";
  const values = [userId];

  if (status) {
    where += " AND ws.status = ?";
    values.push(status);
  }
  if (from) {
    where += " AND ws.scheduled_date >= ?";
    values.push(from);
  }
  if (to) {
    where += " AND ws.scheduled_date <= ?";
    values.push(to);
  }

  const [sessions] = await pool.query(
    `
    SELECT ws.*,
           COUNT(DISTINCT wse.id) as exercise_count,
           SUM(wse.is_completed) as completed_exercises,
           COUNT(DISTINCT wse.id) as total_exercises
    FROM workout_sessions ws
    LEFT JOIN workout_session_exercises wse ON wse.session_id = ws.id
    ${where}
    GROUP BY ws.id
    ORDER BY ws.scheduled_date DESC
  `,
    values,
  );

  return sessions;
}

async function getSessionById(sessionId, userId) {
  const [sessions] = await pool.query(
    "SELECT * FROM workout_sessions WHERE id = ? AND user_id = ?",
    [sessionId, userId],
  );
  if (sessions.length === 0) throw httpError(404, "Sesija nije pronađena");

  const session = sessions[0];

  const [exercises] = await pool.query(
    `
    SELECT wse.id, wse.category_id, wse.order_index, wse.notes, wse.is_completed,
           c.name as category_name, c.value_type, c.has_weight,
           e.id as exercise_id, e.name as exercise_name, e.icon as exercise_icon
    FROM workout_session_exercises wse
    JOIN categories c ON wse.category_id = c.id
    JOIN exercises e ON c.exercise_id = e.id
    WHERE wse.session_id = ?
    ORDER BY wse.order_index ASC
  `,
    [session.id],
  );

  for (const ex of exercises) {
    const [sets] = await pool.query(
      "SELECT * FROM workout_session_sets WHERE session_exercise_id = ? ORDER BY set_number",
      [ex.id],
    );
    ex.sets = sets;
  }

  session.exercises = exercises;
  return session;
}

async function startSession(sessionId, userId) {
  const [sessions] = await pool.query(
    "SELECT * FROM workout_sessions WHERE id = ? AND user_id = ?",
    [sessionId, userId],
  );
  if (sessions.length === 0) throw httpError(404, "Sesija nije pronađena");

  if (sessions[0].status === "completed") {
    throw httpError(400, "Sesija je već završena");
  }

  await pool.query(
    "UPDATE workout_sessions SET status = ?, started_at = NOW() WHERE id = ?",
    ["in_progress", sessionId],
  );

  return { message: "Trening započet" };
}

async function updateSession(sessionId, userId, payload) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [sessions] = await conn.query(
      "SELECT * FROM workout_sessions WHERE id = ? AND user_id = ?",
      [sessionId, userId],
    );
    if (sessions.length === 0) {
      throw httpError(404, "Sesija nije pronađena");
    }

    if (sessions[0].status === "completed") {
      throw httpError(400, "Sesija je već završena, ne može se menjati.");
    }

    const { exercises, notes } = payload;

    if (notes !== undefined) {
      await conn.query("UPDATE workout_sessions SET notes = ? WHERE id = ?", [
        notes,
        sessionId,
      ]);
    }

    if (exercises && Array.isArray(exercises)) {
      for (const ex of exercises) {
        if (ex.id) {
          await conn.query(
            "UPDATE workout_session_exercises SET is_completed = ?, notes = ? WHERE id = ? AND session_id = ?",
            [ex.is_completed ? 1 : 0, ex.notes || null, ex.id, sessionId],
          );

          if (ex.sets && Array.isArray(ex.sets)) {
            for (const s of ex.sets) {
              if (s.id) {
                await conn.query(
                  "UPDATE workout_session_sets SET actual_reps = ?, actual_weight = ?, is_completed = ? WHERE id = ? AND session_exercise_id = ?",
                  [
                    s.actual_reps != null ? parseFloat(s.actual_reps) : null,
                    s.actual_weight != null
                      ? parseFloat(s.actual_weight)
                      : null,
                    s.is_completed ? 1 : 0,
                    s.id,
                    ex.id,
                  ],
                );
              } else {
                const [maxSetRows] = await conn.query(
                  "SELECT COALESCE(MAX(set_number), 0) as max_set FROM workout_session_sets WHERE session_exercise_id = ?",
                  [ex.id],
                );
                const nextSetNum = maxSetRows[0].max_set + 1;
                await conn.query(
                  "INSERT INTO workout_session_sets (session_exercise_id, set_number, target_reps, target_weight, actual_reps, actual_weight, is_completed) VALUES (?, ?, ?, ?, ?, ?, ?)",
                  [
                    ex.id,
                    nextSetNum,
                    s.target_reps || null,
                    s.target_weight || null,
                    s.actual_reps != null ? parseFloat(s.actual_reps) : null,
                    s.actual_weight != null
                      ? parseFloat(s.actual_weight)
                      : null,
                    s.is_completed ? 1 : 0,
                  ],
                );
              }
            }
          }
        } else {
          const [maxOrderRows] = await conn.query(
            "SELECT COALESCE(MAX(order_index), -1) as max_idx FROM workout_session_exercises WHERE session_id = ?",
            [sessionId],
          );
          const nextOrder = maxOrderRows[0].max_idx + 1;

          const [insertSE] = await conn.query(
            "INSERT INTO workout_session_exercises (session_id, category_id, order_index, notes) VALUES (?, ?, ?, ?)",
            [sessionId, ex.category_id, nextOrder, ex.notes || null],
          );
          const seId = insertSE.insertId;

          if (ex.sets && Array.isArray(ex.sets)) {
            for (let j = 0; j < ex.sets.length; j++) {
              const s = ex.sets[j];
              await conn.query(
                "INSERT INTO workout_session_sets (session_exercise_id, set_number, target_reps, target_weight, actual_reps, actual_weight, is_completed) VALUES (?, ?, ?, ?, ?, ?, ?)",
                [
                  seId,
                  j + 1,
                  s.target_reps || null,
                  s.target_weight || null,
                  s.actual_reps != null ? parseFloat(s.actual_reps) : null,
                  s.actual_weight != null ? parseFloat(s.actual_weight) : null,
                  s.is_completed ? 1 : 0,
                ],
              );
            }
          }
        }
      }
    }

    await conn.commit();
    return { message: "Sesija ažurirana" };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

async function completeSession(sessionId, userId) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [sessions] = await conn.query(
      "SELECT * FROM workout_sessions WHERE id = ? AND user_id = ?",
      [sessionId, userId],
    );
    if (sessions.length === 0) {
      throw httpError(404, "Sesija nije pronađena");
    }
    if (sessions[0].status === "completed") {
      throw httpError(400, "Sesija je već završena");
    }

    const session = sessions[0];
    const attemptDate =
      session.started_at ||
      new Date().toISOString().slice(0, 19).replace("T", " ");

    const [sessionExercises] = await conn.query(
      "SELECT * FROM workout_session_exercises WHERE session_id = ? ORDER BY order_index",
      [session.id],
    );

    const newRecords = [];

    for (const se of sessionExercises) {
      const [sessionSets] = await conn.query(
        "SELECT * FROM workout_session_sets WHERE session_exercise_id = ? ORDER BY set_number",
        [se.id],
      );

      const completedSets = sessionSets.filter(
        (s) => s.is_completed && s.actual_reps != null,
      );

      if (completedSets.length === 0) continue;

      await conn.query(
        "UPDATE workout_session_exercises SET is_completed = 1 WHERE id = ?",
        [se.id],
      );

      const [insertWorkout] = await conn.query(
        "INSERT INTO workouts (user_id, category_id, attempt_date, notes) VALUES (?, ?, ?, ?)",
        [userId, se.category_id, attemptDate, se.notes || null],
      );
      const workoutId = insertWorkout.insertId;

      for (let i = 0; i < completedSets.length; i++) {
        const s = completedSets[i];
        await conn.query(
          "INSERT INTO workout_sets (workout_id, set_number, reps, weight) VALUES (?, ?, ?, ?)",
          [
            workoutId,
            i + 1,
            parseFloat(s.actual_reps),
            s.actual_weight ? parseFloat(s.actual_weight) : null,
          ],
        );
      }

      const [catRows] = await conn.query(
        "SELECT * FROM categories WHERE id = ?",
        [se.category_id],
      );
      if (catRows.length > 0) {
        const category = catRows[0];
        let newScore;
        if (category.has_weight) {
          newScore = completedSets.reduce(
            (sum, s) =>
              sum +
              parseFloat(s.actual_reps) * (parseFloat(s.actual_weight) || 0),
            0,
          );
        } else {
          newScore = completedSets.reduce(
            (sum, s) => sum + parseFloat(s.actual_reps),
            0,
          );
        }

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
          [userId, se.category_id, workoutId],
        );

        if (
          bestRows.length === 0 ||
          newScore > parseFloat(bestRows[0].best_score)
        ) {
          const [exInfo] = await conn.query(
            `
            SELECT e.name as exercise_name, e.icon as exercise_icon, c.name as category_name
            FROM categories c JOIN exercises e ON c.exercise_id = e.id WHERE c.id = ?
          `,
            [se.category_id],
          );
          newRecords.push({
            category_id: se.category_id,
            exercise_name: exInfo[0]?.exercise_name,
            exercise_icon: exInfo[0]?.exercise_icon,
            category_name: exInfo[0]?.category_name,
            new_score: newScore,
            previous_record:
              bestRows.length > 0 ? parseFloat(bestRows[0].best_score) : null,
          });
        }
      }
    }

    await conn.query(
      "UPDATE workout_sessions SET status = ?, completed_at = NOW() WHERE id = ?",
      ["completed", session.id],
    );

    await conn.commit();

    return {
      message: "Trening završen!",
      new_records: newRecords,
    };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

async function deleteSession(sessionId, userId) {
  const [sessions] = await pool.query(
    "SELECT * FROM workout_sessions WHERE id = ? AND user_id = ?",
    [sessionId, userId],
  );
  if (sessions.length === 0) throw httpError(404, "Sesija nije pronađena");

  await pool.query("DELETE FROM workout_sessions WHERE id = ?", [sessionId]);
  return { message: "Sesija obrisana" };
}

module.exports = {
  SCORE_SQL,
  getPlans,
  getPlanById,
  createPlan,
  updatePlan,
  deletePlan,
  schedulePlan,
  getSessionsList,
  getSessionById,
  startSession,
  updateSession,
  completeSession,
  deleteSession,
};
