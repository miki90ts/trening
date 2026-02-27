const pool = require("../db/connection");

const MEAL_TYPES = ["breakfast", "lunch", "dinner", "snack"];

const computeConsumed = (amountGrams, per100g) => {
  return (amountGrams / 100) * per100g;
};

function httpError(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

async function getMealPlans(userId) {
  const [plans] = await pool.query(
    `
      SELECT mp.*, 
             COUNT(DISTINCT mpm.id) as meal_count
      FROM meal_plans mp
      LEFT JOIN meal_plan_meals mpm ON mpm.plan_id = mp.id
      GROUP BY mp.id
      HAVING mp.user_id = ?
      ORDER BY mp.updated_at DESC
    `,
    [userId],
  );
  return plans;
}

async function getMealPlanById(planId, userId) {
  const [plans] = await pool.query(
    "SELECT * FROM meal_plans WHERE id = ? AND user_id = ?",
    [planId, userId],
  );
  if (plans.length === 0) throw httpError(404, "Plan nije pronađen");

  const plan = plans[0];

  const [meals] = await pool.query(
    `
      SELECT mpm.*
      FROM meal_plan_meals mpm
      WHERE mpm.plan_id = ?
      ORDER BY mpm.order_index ASC
    `,
    [plan.id],
  );

  for (const meal of meals) {
    const [items] = await pool.query(
      `
        SELECT mpi.*, fi.name as food_item_name
        FROM meal_plan_items mpi
        LEFT JOIN food_items fi ON fi.id = mpi.food_item_id
        WHERE mpi.plan_meal_id = ?
        ORDER BY mpi.id ASC
      `,
      [meal.id],
    );
    meal.items = items;
  }

  plan.meals = meals;
  return plan;
}

async function createMealPlan(userId, data) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const { name, description, color, meals } = data;

    if (!name || !name.trim()) {
      throw httpError(400, "Naziv plana je obavezan");
    }
    if (!meals || !Array.isArray(meals) || meals.length === 0) {
      throw httpError(400, "Plan mora imati bar jedan obrok");
    }

    const [insertPlan] = await conn.query(
      "INSERT INTO meal_plans (user_id, name, description, color) VALUES (?, ?, ?, ?)",
      [userId, name.trim(), description || null, color || "#10b981"],
    );
    const planId = insertPlan.insertId;

    for (let i = 0; i < meals.length; i++) {
      const meal = meals[i];
      if (!MEAL_TYPES.includes(meal.meal_type)) continue;

      const [insertMeal] = await conn.query(
        "INSERT INTO meal_plan_meals (plan_id, meal_type, order_index, notes) VALUES (?, ?, ?, ?)",
        [planId, meal.meal_type, i, meal.notes || null],
      );
      const mealId = insertMeal.insertId;

      if (meal.items && Array.isArray(meal.items)) {
        for (const item of meal.items) {
          const foodItemId = item.food_item_id
            ? parseInt(item.food_item_id, 10)
            : null;
          let macros = {
            kcal_per_100g: parseFloat(item.kcal_per_100g) || 0,
            protein_per_100g: parseFloat(item.protein_per_100g) || 0,
            carbs_per_100g: parseFloat(item.carbs_per_100g) || 0,
            fat_per_100g: parseFloat(item.fat_per_100g) || 0,
          };

          if (foodItemId) {
            const [foodRows] = await conn.query(
              "SELECT * FROM food_items WHERE id = ? AND is_active = 1",
              [foodItemId],
            );
            if (foodRows.length > 0) {
              macros = {
                kcal_per_100g: parseFloat(foodRows[0].kcal_per_100g),
                protein_per_100g: parseFloat(foodRows[0].protein_per_100g),
                carbs_per_100g: parseFloat(foodRows[0].carbs_per_100g),
                fat_per_100g: parseFloat(foodRows[0].fat_per_100g),
              };
            }
          }

          await conn.query(
            `INSERT INTO meal_plan_items (plan_meal_id, food_item_id, custom_name, amount_grams, kcal_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              mealId,
              foodItemId,
              item.custom_name || null,
              parseFloat(item.amount_grams) || 100,
              macros.kcal_per_100g,
              macros.protein_per_100g,
              macros.carbs_per_100g,
              macros.fat_per_100g,
            ],
          );
        }
      }
    }

    await conn.commit();
    return { id: planId, message: "Plan ishrane kreiran" };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

async function updateMealPlan(planId, userId, data) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [existing] = await conn.query(
      "SELECT * FROM meal_plans WHERE id = ? AND user_id = ?",
      [planId, userId],
    );
    if (existing.length === 0) {
      throw httpError(404, "Plan nije pronađen");
    }

    const { name, description, color, meals } = data;

    await conn.query(
      "UPDATE meal_plans SET name = ?, description = ?, color = ?, updated_at = NOW() WHERE id = ?",
      [
        name?.trim() || existing[0].name,
        description !== undefined ? description : existing[0].description,
        color || existing[0].color,
        planId,
      ],
    );

    if (meals && Array.isArray(meals)) {
      await conn.query("DELETE FROM meal_plan_meals WHERE plan_id = ?", [
        planId,
      ]);

      for (let i = 0; i < meals.length; i++) {
        const meal = meals[i];
        if (!MEAL_TYPES.includes(meal.meal_type)) continue;

        const [insertMeal] = await conn.query(
          "INSERT INTO meal_plan_meals (plan_id, meal_type, order_index, notes) VALUES (?, ?, ?, ?)",
          [planId, meal.meal_type, i, meal.notes || null],
        );
        const mealId = insertMeal.insertId;

        if (meal.items && Array.isArray(meal.items)) {
          for (const item of meal.items) {
            const foodItemId = item.food_item_id
              ? parseInt(item.food_item_id, 10)
              : null;
            let macros = {
              kcal_per_100g: parseFloat(item.kcal_per_100g) || 0,
              protein_per_100g: parseFloat(item.protein_per_100g) || 0,
              carbs_per_100g: parseFloat(item.carbs_per_100g) || 0,
              fat_per_100g: parseFloat(item.fat_per_100g) || 0,
            };

            if (foodItemId) {
              const [foodRows] = await conn.query(
                "SELECT * FROM food_items WHERE id = ? AND is_active = 1",
                [foodItemId],
              );
              if (foodRows.length > 0) {
                macros = {
                  kcal_per_100g: parseFloat(foodRows[0].kcal_per_100g),
                  protein_per_100g: parseFloat(foodRows[0].protein_per_100g),
                  carbs_per_100g: parseFloat(foodRows[0].carbs_per_100g),
                  fat_per_100g: parseFloat(foodRows[0].fat_per_100g),
                };
              }
            }

            await conn.query(
              `INSERT INTO meal_plan_items (plan_meal_id, food_item_id, custom_name, amount_grams, kcal_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                mealId,
                foodItemId,
                item.custom_name || null,
                parseFloat(item.amount_grams) || 100,
                macros.kcal_per_100g,
                macros.protein_per_100g,
                macros.carbs_per_100g,
                macros.fat_per_100g,
              ],
            );
          }
        }
      }
    }

    await conn.commit();
    return { message: "Plan ishrane ažuriran" };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

async function deleteMealPlan(planId, userId) {
  const [existing] = await pool.query(
    "SELECT * FROM meal_plans WHERE id = ? AND user_id = ?",
    [planId, userId],
  );
  if (existing.length === 0) throw httpError(404, "Plan nije pronađen");

  await pool.query("DELETE FROM meal_plans WHERE id = ?", [planId]);
  return { message: "Plan ishrane obrisan" };
}

async function scheduleMealPlan(planId, user, payload) {
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
      "SELECT * FROM meal_plans WHERE id = ? AND user_id = ?",
      [planId, user.id],
    );
    if (plans.length === 0) {
      throw httpError(404, "Plan nije pronađen");
    }

    const [planMeals] = await conn.query(
      "SELECT * FROM meal_plan_meals WHERE plan_id = ? ORDER BY order_index",
      [planId],
    );

    const [insertSession] = await conn.query(
      "INSERT INTO meal_sessions (user_id, plan_id, plan_name, scheduled_date, status) VALUES (?, ?, ?, ?, ?)",
      [targetUserId, planId, plans[0].name, scheduled_date, "scheduled"],
    );
    const sessionId = insertSession.insertId;

    const mealsForEmail = [];

    for (const pm of planMeals) {
      const [insertSM] = await conn.query(
        "INSERT INTO meal_session_meals (session_id, meal_type, order_index, notes) VALUES (?, ?, ?, ?)",
        [sessionId, pm.meal_type, pm.order_index, pm.notes],
      );
      const smId = insertSM.insertId;

      const [planItems] = await conn.query(
        `SELECT mpi.*, fi.name as food_item_name
         FROM meal_plan_items mpi
         LEFT JOIN food_items fi ON fi.id = mpi.food_item_id
         WHERE mpi.plan_meal_id = ?
         ORDER BY mpi.id`,
        [pm.id],
      );

      for (const pi of planItems) {
        await conn.query(
          `INSERT INTO meal_session_items (session_meal_id, food_item_id, custom_name, amount_grams, kcal_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            smId,
            pi.food_item_id,
            pi.custom_name,
            pi.amount_grams,
            pi.kcal_per_100g,
            pi.protein_per_100g,
            pi.carbs_per_100g,
            pi.fat_per_100g,
          ],
        );
      }

      mealsForEmail.push({
        meal_type: pm.meal_type,
        items: planItems,
      });
    }

    await conn.commit();

    const msg =
      targetUser && targetUserId !== user.id
        ? `Plan ishrane zakazan za ${targetUser.nickname || targetUser.first_name || "korisnika"}`
        : "Plan ishrane zakazan";

    let emailPayload = null;
    if (targetUser && targetUserId !== user.id && targetUser.email) {
      emailPayload = {
        targetUser,
        planName: plans[0].name,
        planColor: plans[0].color,
        scheduledDate: scheduled_date,
        mealsWithItems: mealsForEmail,
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

async function getMealSessionsList(userId, query) {
  const { status, from, to } = query;
  let where = "WHERE ms.user_id = ?";
  const values = [userId];

  if (status) {
    where += " AND ms.status = ?";
    values.push(status);
  }
  if (from) {
    where += " AND ms.scheduled_date >= ?";
    values.push(from);
  }
  if (to) {
    where += " AND ms.scheduled_date <= ?";
    values.push(to);
  }

  const [sessions] = await pool.query(
    `
      SELECT ms.*,
             COUNT(DISTINCT msm.id) as meal_count,
             SUM(msm.is_completed) as completed_meals,
             COUNT(DISTINCT msm.id) as total_meals
      FROM meal_sessions ms
      LEFT JOIN meal_session_meals msm ON msm.session_id = ms.id
      ${where}
      GROUP BY ms.id
      ORDER BY ms.scheduled_date DESC
    `,
    values,
  );

  return sessions;
}

async function getMealSessionById(sessionId, userId) {
  const [sessions] = await pool.query(
    "SELECT * FROM meal_sessions WHERE id = ? AND user_id = ?",
    [sessionId, userId],
  );
  if (sessions.length === 0) throw httpError(404, "Sesija nije pronađena");

  const session = sessions[0];

  const [meals] = await pool.query(
    `
      SELECT msm.*
      FROM meal_session_meals msm
      WHERE msm.session_id = ?
      ORDER BY msm.order_index ASC
    `,
    [session.id],
  );

  for (const meal of meals) {
    const [items] = await pool.query(
      `
        SELECT msi.*, fi.name as food_item_name
        FROM meal_session_items msi
        LEFT JOIN food_items fi ON fi.id = msi.food_item_id
        WHERE msi.session_meal_id = ?
        ORDER BY msi.id ASC
      `,
      [meal.id],
    );
    meal.items = items;
  }

  session.meals = meals;
  return session;
}

async function startMealSession(sessionId, userId) {
  const [sessions] = await pool.query(
    "SELECT * FROM meal_sessions WHERE id = ? AND user_id = ?",
    [sessionId, userId],
  );
  if (sessions.length === 0) throw httpError(404, "Sesija nije pronađena");

  if (sessions[0].status === "completed") {
    throw httpError(400, "Sesija je već završena");
  }

  await pool.query(
    "UPDATE meal_sessions SET status = ?, started_at = NOW() WHERE id = ?",
    ["in_progress", sessionId],
  );

  return { message: "Praćenje ishrane započeto" };
}

async function updateMealSession(sessionId, userId, payload) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [sessions] = await conn.query(
      "SELECT * FROM meal_sessions WHERE id = ? AND user_id = ?",
      [sessionId, userId],
    );
    if (sessions.length === 0) {
      throw httpError(404, "Sesija nije pronađena");
    }

    if (sessions[0].status === "completed") {
      throw httpError(400, "Sesija je već završena, ne može se menjati.");
    }

    const { meals, notes } = payload;

    if (notes !== undefined) {
      await conn.query("UPDATE meal_sessions SET notes = ? WHERE id = ?", [
        notes,
        sessionId,
      ]);
    }

    if (meals && Array.isArray(meals)) {
      for (const meal of meals) {
        if (meal.id) {
          await conn.query(
            "UPDATE meal_session_meals SET is_completed = ?, notes = ? WHERE id = ? AND session_id = ?",
            [meal.is_completed ? 1 : 0, meal.notes || null, meal.id, sessionId],
          );

          if (meal.items && Array.isArray(meal.items)) {
            for (const item of meal.items) {
              if (item.id) {
                await conn.query(
                  `UPDATE meal_session_items 
                   SET actual_amount_grams = ?, is_completed = ?, is_removed = ?
                   WHERE id = ? AND session_meal_id = ?`,
                  [
                    item.actual_amount_grams != null
                      ? parseFloat(item.actual_amount_grams)
                      : null,
                    item.is_completed ? 1 : 0,
                    item.is_removed ? 1 : 0,
                    item.id,
                    meal.id,
                  ],
                );
              } else {
                const foodItemId = item.food_item_id
                  ? parseInt(item.food_item_id, 10)
                  : null;
                let macros = {
                  kcal_per_100g: parseFloat(item.kcal_per_100g) || 0,
                  protein_per_100g: parseFloat(item.protein_per_100g) || 0,
                  carbs_per_100g: parseFloat(item.carbs_per_100g) || 0,
                  fat_per_100g: parseFloat(item.fat_per_100g) || 0,
                };

                if (foodItemId) {
                  const [foodRows] = await conn.query(
                    "SELECT * FROM food_items WHERE id = ? AND is_active = 1",
                    [foodItemId],
                  );
                  if (foodRows.length > 0) {
                    macros = {
                      kcal_per_100g: parseFloat(foodRows[0].kcal_per_100g),
                      protein_per_100g: parseFloat(
                        foodRows[0].protein_per_100g,
                      ),
                      carbs_per_100g: parseFloat(foodRows[0].carbs_per_100g),
                      fat_per_100g: parseFloat(foodRows[0].fat_per_100g),
                    };
                  }
                }

                await conn.query(
                  `INSERT INTO meal_session_items (session_meal_id, food_item_id, custom_name, amount_grams, actual_amount_grams, kcal_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, is_completed, is_removed)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                  [
                    meal.id,
                    foodItemId,
                    item.custom_name || null,
                    parseFloat(item.amount_grams) || 100,
                    item.actual_amount_grams != null
                      ? parseFloat(item.actual_amount_grams)
                      : null,
                    macros.kcal_per_100g,
                    macros.protein_per_100g,
                    macros.carbs_per_100g,
                    macros.fat_per_100g,
                    item.is_completed ? 1 : 0,
                    item.is_removed ? 1 : 0,
                  ],
                );
              }
            }
          }
        } else {
          const [maxOrderRows] = await conn.query(
            "SELECT COALESCE(MAX(order_index), -1) as max_idx FROM meal_session_meals WHERE session_id = ?",
            [sessionId],
          );
          const nextOrder = maxOrderRows[0].max_idx + 1;

          const [insertSM] = await conn.query(
            "INSERT INTO meal_session_meals (session_id, meal_type, order_index, notes) VALUES (?, ?, ?, ?)",
            [
              sessionId,
              meal.meal_type || "snack",
              nextOrder,
              meal.notes || null,
            ],
          );
          const smId = insertSM.insertId;

          if (meal.items && Array.isArray(meal.items)) {
            for (const item of meal.items) {
              const foodItemId = item.food_item_id
                ? parseInt(item.food_item_id, 10)
                : null;
              let macros = {
                kcal_per_100g: parseFloat(item.kcal_per_100g) || 0,
                protein_per_100g: parseFloat(item.protein_per_100g) || 0,
                carbs_per_100g: parseFloat(item.carbs_per_100g) || 0,
                fat_per_100g: parseFloat(item.fat_per_100g) || 0,
              };

              if (foodItemId) {
                const [foodRows] = await conn.query(
                  "SELECT * FROM food_items WHERE id = ? AND is_active = 1",
                  [foodItemId],
                );
                if (foodRows.length > 0) {
                  macros = {
                    kcal_per_100g: parseFloat(foodRows[0].kcal_per_100g),
                    protein_per_100g: parseFloat(foodRows[0].protein_per_100g),
                    carbs_per_100g: parseFloat(foodRows[0].carbs_per_100g),
                    fat_per_100g: parseFloat(foodRows[0].fat_per_100g),
                  };
                }
              }

              await conn.query(
                `INSERT INTO meal_session_items (session_meal_id, food_item_id, custom_name, amount_grams, actual_amount_grams, kcal_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, is_completed, is_removed)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                  smId,
                  foodItemId,
                  item.custom_name || null,
                  parseFloat(item.amount_grams) || 100,
                  item.actual_amount_grams != null
                    ? parseFloat(item.actual_amount_grams)
                    : null,
                  macros.kcal_per_100g,
                  macros.protein_per_100g,
                  macros.carbs_per_100g,
                  macros.fat_per_100g,
                  item.is_completed ? 1 : 0,
                  item.is_removed ? 1 : 0,
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

async function completeMealSession(sessionId, userId) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [sessions] = await conn.query(
      "SELECT * FROM meal_sessions WHERE id = ? AND user_id = ?",
      [sessionId, userId],
    );
    if (sessions.length === 0) {
      throw httpError(404, "Sesija nije pronađena");
    }
    if (sessions[0].status === "completed") {
      throw httpError(400, "Sesija je već završena");
    }

    const session = sessions[0];
    const entryDate = new Date(session.scheduled_date)
      .toISOString()
      .slice(0, 10);

    const [sessionMeals] = await conn.query(
      "SELECT * FROM meal_session_meals WHERE session_id = ? ORDER BY order_index",
      [session.id],
    );

    let totalItemsWritten = 0;

    for (const sm of sessionMeals) {
      const [sessionItems] = await conn.query(
        "SELECT * FROM meal_session_items WHERE session_meal_id = ? AND is_completed = 1 AND is_removed = 0",
        [sm.id],
      );

      if (sessionItems.length === 0) continue;

      const [existingEntry] = await conn.query(
        "SELECT * FROM food_entries WHERE user_id = ? AND entry_date = ? AND meal_type = ?",
        [userId, entryDate, sm.meal_type],
      );

      let entryId;
      if (existingEntry.length > 0) {
        entryId = existingEntry[0].id;
        await conn.query("UPDATE food_entries SET notes = ? WHERE id = ?", [
          sm.notes || null,
          entryId,
        ]);
        await conn.query("DELETE FROM food_entry_items WHERE entry_id = ?", [
          entryId,
        ]);
      } else {
        const [insertEntry] = await conn.query(
          "INSERT INTO food_entries (user_id, entry_date, meal_type, notes) VALUES (?, ?, ?, ?)",
          [userId, entryDate, sm.meal_type, sm.notes || null],
        );
        entryId = insertEntry.insertId;
      }

      for (const si of sessionItems) {
        const amountGrams =
          si.actual_amount_grams != null
            ? parseFloat(si.actual_amount_grams)
            : parseFloat(si.amount_grams);
        const consumedKcal = computeConsumed(
          amountGrams,
          parseFloat(si.kcal_per_100g),
        );
        const consumedProtein = computeConsumed(
          amountGrams,
          parseFloat(si.protein_per_100g),
        );
        const consumedCarbs = computeConsumed(
          amountGrams,
          parseFloat(si.carbs_per_100g),
        );
        const consumedFat = computeConsumed(
          amountGrams,
          parseFloat(si.fat_per_100g),
        );

        await conn.query(
          `INSERT INTO food_entry_items (entry_id, food_item_id, custom_name, amount_grams, kcal_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, consumed_kcal, consumed_protein, consumed_carbs, consumed_fat)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            entryId,
            si.food_item_id,
            si.custom_name,
            amountGrams,
            si.kcal_per_100g,
            si.protein_per_100g,
            si.carbs_per_100g,
            si.fat_per_100g,
            consumedKcal,
            consumedProtein,
            consumedCarbs,
            consumedFat,
          ],
        );
        totalItemsWritten++;
      }

      await conn.query(
        "UPDATE meal_session_meals SET is_completed = 1 WHERE id = ?",
        [sm.id],
      );
    }

    const [totalsRows] = await conn.query(
      `SELECT
        COALESCE(SUM(fei.consumed_kcal), 0) AS total_kcal,
        COALESCE(SUM(fei.consumed_protein), 0) AS total_protein,
        COALESCE(SUM(fei.consumed_carbs), 0) AS total_carbs,
        COALESCE(SUM(fei.consumed_fat), 0) AS total_fat,
        COUNT(fei.id) AS total_items
      FROM food_entries fe
      LEFT JOIN food_entry_items fei ON fei.entry_id = fe.id
      WHERE fe.user_id = ? AND fe.entry_date = ?`,
      [userId, entryDate],
    );

    const totals = totalsRows[0] || {
      total_kcal: 0,
      total_protein: 0,
      total_carbs: 0,
      total_fat: 0,
      total_items: 0,
    };

    await conn.query(
      `INSERT INTO food_daily_totals (user_id, entry_date, total_kcal, total_protein, total_carbs, total_fat, total_items)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
        total_kcal = VALUES(total_kcal),
        total_protein = VALUES(total_protein),
        total_carbs = VALUES(total_carbs),
        total_fat = VALUES(total_fat),
        total_items = VALUES(total_items)`,
      [
        userId,
        entryDate,
        totals.total_kcal,
        totals.total_protein,
        totals.total_carbs,
        totals.total_fat,
        totals.total_items,
      ],
    );

    await conn.query(
      "UPDATE meal_sessions SET status = ?, completed_at = NOW() WHERE id = ?",
      ["completed", session.id],
    );

    await conn.commit();

    return {
      message: "Dan ishrane završen!",
      items_written: totalItemsWritten,
      daily_totals: totals,
    };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

async function deleteMealSession(sessionId, userId) {
  const [sessions] = await pool.query(
    "SELECT * FROM meal_sessions WHERE id = ? AND user_id = ?",
    [sessionId, userId],
  );
  if (sessions.length === 0) throw httpError(404, "Sesija nije pronađena");

  await pool.query("DELETE FROM meal_sessions WHERE id = ?", [sessionId]);
  return { message: "Sesija obrisana" };
}

module.exports = {
  getPlans: getMealPlans,
  getPlanById: getMealPlanById,
  createPlan: createMealPlan,
  updatePlan: updateMealPlan,
  deletePlan: deleteMealPlan,
  schedulePlan: scheduleMealPlan,
  getSessionsList: getMealSessionsList,
  getSessionById: getMealSessionById,
  startSession: startMealSession,
  updateSession: updateMealSession,
  completeSession: completeMealSession,
  deleteSession: deleteMealSession,
  getMealPlans,
  getMealPlanById,
  createMealPlan,
  updateMealPlan,
  deleteMealPlan,
  scheduleMealPlan,
  getMealSessionsList,
  getMealSessionById,
  startMealSession,
  updateMealSession,
  completeMealSession,
  deleteMealSession,
};
