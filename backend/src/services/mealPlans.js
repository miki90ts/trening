const pool = require("../db/connection");
const { httpError } = require("../helpers/httpError");

const MEAL_TYPES = ["breakfast", "lunch", "dinner", "snack"];
const PAGE_SIZE_OPTIONS = [10, 20, 25, 50];

const PLAN_SORT_MAP = {
  updated_at: "mp.updated_at",
  created_at: "mp.created_at",
  name: "mp.name",
  meal_count: "meal_count",
};

const SESSION_SORT_MAP = {
  scheduled_date: "ms.scheduled_date",
  plan_name: "ms.plan_name",
  status: "ms.status",
  created_at: "ms.created_at",
  meal_count: "meal_count",
};

function toPositiveInt(value) {
  const parsed = parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }
  return parsed;
}

function parsePagination(query, defaultPageSize = 10) {
  const hasPagination =
    query.page !== undefined || query.pageSize !== undefined;

  if (!hasPagination) {
    return {
      hasPagination: false,
      page: 1,
      pageSize: defaultPageSize,
      offset: 0,
    };
  }

  const page = Math.max(1, toPositiveInt(query.page) || 1);
  const requestedPageSize = toPositiveInt(query.pageSize) || defaultPageSize;
  const pageSize = PAGE_SIZE_OPTIONS.includes(requestedPageSize)
    ? requestedPageSize
    : defaultPageSize;

  return {
    hasPagination: true,
    page,
    pageSize,
    offset: (page - 1) * pageSize,
  };
}

function getSortSql(sortMap, sort, order, fallback, tieBreakerColumn) {
  const sortColumn = sortMap[sort] || sortMap[fallback];
  const safeOrder = String(order).toLowerCase() === "asc" ? "ASC" : "DESC";
  return `${sortColumn} ${safeOrder}, ${tieBreakerColumn} DESC`;
}

const computeConsumed = (amountGrams, per100g) => {
  return (amountGrams / 100) * per100g;
};

async function getMealPlans(userId, query = {}) {
  const { q = "", sort = "updated_at", order = "desc" } = query;
  const pagination = parsePagination(query, 10);
  const filters = ["mp.user_id = ?"];
  const values = [userId];

  const normalizedQuery = String(q).trim();
  if (normalizedQuery) {
    const like = `%${normalizedQuery}%`;
    filters.push(`(
      mp.name LIKE ?
      OR COALESCE(mp.description, '') LIKE ?
      OR EXISTS (
        SELECT 1
        FROM meal_plan_meals mpm_search
        LEFT JOIN meal_plan_items mpi_search ON mpi_search.plan_meal_id = mpm_search.id
        LEFT JOIN food_items fi_search ON fi_search.id = mpi_search.food_item_id
        WHERE mpm_search.plan_id = mp.id
          AND (
            mpm_search.meal_type LIKE ?
            OR COALESCE(mpm_search.notes, '') LIKE ?
            OR COALESCE(mpi_search.custom_name, '') LIKE ?
            OR COALESCE(fi_search.name, '') LIKE ?
          )
      )
    )`);
    values.push(like, like, like, like, like, like);
  }

  const whereSql = `WHERE ${filters.join(" AND ")}`;
  const orderSql = getSortSql(
    PLAN_SORT_MAP,
    sort,
    order,
    "updated_at",
    "mp.id",
  );

  if (pagination.hasPagination) {
    const [countRows] = await pool.query(
      `SELECT COUNT(*) AS total
       FROM meal_plans mp
       ${whereSql}`,
      values,
    );

    const total = countRows[0]?.total || 0;
    const [plans] = await pool.query(
      `
        SELECT mp.*, 
               COUNT(DISTINCT mpm.id) AS meal_count
        FROM meal_plans mp
        LEFT JOIN meal_plan_meals mpm ON mpm.plan_id = mp.id
        ${whereSql}
        GROUP BY mp.id
        ORDER BY ${orderSql}
        LIMIT ? OFFSET ?
      `,
      [...values, pagination.pageSize, pagination.offset],
    );

    return {
      data: plans,
      pagination: {
        page: pagination.page,
        pageSize: pagination.pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / pagination.pageSize)),
      },
    };
  }

  const [plans] = await pool.query(
    `
      SELECT mp.*, 
             COUNT(DISTINCT mpm.id) AS meal_count
      FROM meal_plans mp
      LEFT JOIN meal_plan_meals mpm ON mpm.plan_id = mp.id
      ${whereSql}
      GROUP BY mp.id
      ORDER BY ${orderSql}
    `,
    values,
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
      "INSERT INTO meal_sessions (user_id, scheduled_by, plan_id, plan_name, scheduled_date, status) VALUES (?, ?, ?, ?, ?, ?)",
      [
        targetUserId,
        user.id,
        planId,
        plans[0].name,
        scheduled_date,
        "scheduled",
      ],
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

async function getMealSessionsList(user, query) {
  const {
    status,
    from,
    to,
    q = "",
    scope = "sessions",
    sort = "scheduled_date",
    order = "desc",
  } = query;
  const userId = user.id;
  const role = user.role || "user";
  const pagination = parsePagination(query, 10);

  if (!["sessions", "sent"].includes(scope)) {
    throw httpError(400, "scope nije validan");
  }

  if (scope === "sent" && role !== "admin") {
    throw httpError(403, "Nemate dozvolu za ovu akciju");
  }

  let where = "WHERE 1 = 1";
  const values = [];

  if (scope === "sent") {
    where += " AND ms.scheduled_by = ? AND ms.user_id <> ?";
    values.push(userId, userId);
  } else {
    where += " AND ms.user_id = ?";
    values.push(userId);
  }

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

  const normalizedQuery = String(q).trim();
  if (normalizedQuery) {
    const like = `%${normalizedQuery}%`;
    where += ` AND (
      ms.plan_name LIKE ?
      OR COALESCE(mp.description, '') LIKE ?
      OR ms.status LIKE ?
      OR COALESCE(assigned.nickname, '') LIKE ?
      OR COALESCE(assigned.first_name, '') LIKE ?
      OR COALESCE(assigned.last_name, '') LIKE ?
      OR COALESCE(sender.nickname, '') LIKE ?
      OR COALESCE(sender.first_name, '') LIKE ?
      OR COALESCE(sender.last_name, '') LIKE ?
      OR EXISTS (
        SELECT 1
        FROM meal_session_meals msm_search
        LEFT JOIN meal_session_items msi_search ON msi_search.session_meal_id = msm_search.id
        LEFT JOIN food_items fi_search ON fi_search.id = msi_search.food_item_id
        WHERE msm_search.session_id = ms.id
          AND (
            msm_search.meal_type LIKE ?
            OR COALESCE(msm_search.notes, '') LIKE ?
            OR COALESCE(msi_search.custom_name, '') LIKE ?
            OR COALESCE(fi_search.name, '') LIKE ?
          )
      )
    )`;
    values.push(
      like,
      like,
      like,
      like,
      like,
      like,
      like,
      like,
      like,
      like,
      like,
      like,
      like,
    );
  }

  const sessionTypeCase = `
    CASE
      WHEN ms.scheduled_by = ? AND ms.user_id <> ? THEN 'sent_to_other'
      WHEN ms.user_id = ? AND ms.scheduled_by IS NOT NULL AND ms.scheduled_by <> ? THEN 'sent_to_me'
      WHEN ms.user_id = ? THEN 'my_plan'
      ELSE 'other'
    END
  `;
  const orderSql = getSortSql(
    SESSION_SORT_MAP,
    sort,
    order,
    "scheduled_date",
    "ms.id",
  );

  if (pagination.hasPagination) {
    const [countRows] = await pool.query(
      `
        SELECT COUNT(*) AS total
        FROM meal_sessions ms
        LEFT JOIN users assigned ON assigned.id = ms.user_id
        LEFT JOIN users sender ON sender.id = ms.scheduled_by
        LEFT JOIN meal_plans mp ON mp.id = ms.plan_id
        ${where}
      `,
      values,
    );

    const total = countRows[0]?.total || 0;
    const [sessions] = await pool.query(
      `
        SELECT ms.*, 
               ms.user_id AS assigned_user_id,
               assigned.first_name AS assigned_first_name,
               assigned.last_name AS assigned_last_name,
               assigned.nickname AS assigned_nickname,
               sender.first_name AS scheduled_by_first_name,
               sender.last_name AS scheduled_by_last_name,
               sender.nickname AS scheduled_by_nickname,
               ${sessionTypeCase} AS session_type,
               COUNT(DISTINCT msm.id) AS meal_count,
               COALESCE(SUM(CASE WHEN msm.is_completed = 1 THEN 1 ELSE 0 END), 0) AS completed_meals,
               COUNT(DISTINCT msm.id) AS total_meals
        FROM meal_sessions ms
        LEFT JOIN users assigned ON assigned.id = ms.user_id
        LEFT JOIN users sender ON sender.id = ms.scheduled_by
        LEFT JOIN meal_plans mp ON mp.id = ms.plan_id
        LEFT JOIN meal_session_meals msm ON msm.session_id = ms.id
        ${where}
        GROUP BY ms.id
        ORDER BY ${orderSql}
        LIMIT ? OFFSET ?
      `,
      [
        userId,
        userId,
        userId,
        userId,
        userId,
        ...values,
        pagination.pageSize,
        pagination.offset,
      ],
    );

    return {
      data: sessions,
      pagination: {
        page: pagination.page,
        pageSize: pagination.pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / pagination.pageSize)),
      },
    };
  }

  const [sessions] = await pool.query(
    `
      SELECT ms.*,
             ms.user_id AS assigned_user_id,
             assigned.first_name AS assigned_first_name,
             assigned.last_name AS assigned_last_name,
             assigned.nickname AS assigned_nickname,
             sender.first_name AS scheduled_by_first_name,
             sender.last_name AS scheduled_by_last_name,
             sender.nickname AS scheduled_by_nickname,
             ${sessionTypeCase} AS session_type,
             COUNT(DISTINCT msm.id) AS meal_count,
             COALESCE(SUM(CASE WHEN msm.is_completed = 1 THEN 1 ELSE 0 END), 0) AS completed_meals,
             COUNT(DISTINCT msm.id) AS total_meals
      FROM meal_sessions ms
      LEFT JOIN users assigned ON assigned.id = ms.user_id
      LEFT JOIN users sender ON sender.id = ms.scheduled_by
      LEFT JOIN meal_plans mp ON mp.id = ms.plan_id
      LEFT JOIN meal_session_meals msm ON msm.session_id = ms.id
      ${where}
      GROUP BY ms.id
      ORDER BY ${orderSql}
    `,
    [userId, userId, userId, userId, userId, ...values],
  );

  return sessions;
}

async function getMealSessionById(sessionId, userId) {
  const [sessions] = await pool.query(
    `SELECT ms.*, 
            ms.user_id AS assigned_user_id,
            assigned.first_name AS assigned_first_name,
            assigned.last_name AS assigned_last_name,
            assigned.nickname AS assigned_nickname,
            sender.first_name AS scheduled_by_first_name,
            sender.last_name AS scheduled_by_last_name,
            sender.nickname AS scheduled_by_nickname,
            CASE
              WHEN ms.scheduled_by = ? AND ms.user_id <> ? THEN 'sent_to_other'
              WHEN ms.user_id = ? AND ms.scheduled_by IS NOT NULL AND ms.scheduled_by <> ? THEN 'sent_to_me'
              WHEN ms.user_id = ? THEN 'my_plan'
              ELSE 'other'
            END AS session_type
     FROM meal_sessions ms
     LEFT JOIN users assigned ON assigned.id = ms.user_id
     LEFT JOIN users sender ON sender.id = ms.scheduled_by
     WHERE ms.id = ?
       AND (ms.user_id = ? OR ms.scheduled_by = ?)`,
    [userId, userId, userId, userId, userId, sessionId, userId, userId],
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
