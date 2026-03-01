const pool = require("../db/connection");
const { httpError } = require("../helpers/httpError");

const MEAL_TYPES = ["breakfast", "lunch", "dinner", "snack"];

const parseDateOnly = (value) => {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return null;
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

const toPositiveNumber = (value) => {
  const parsed = parseFloat(value);
  if (!Number.isFinite(parsed)) return null;
  return parsed;
};

const computeConsumed = (amountGrams, per100g) => {
  return (amountGrams / 100) * per100g;
};

const recalculateDailyTotals = async (conn, userId, entryDate) => {
  const [rows] = await conn.query(
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

  const totals = rows[0] || {
    total_kcal: 0,
    total_protein: 0,
    total_carbs: 0,
    total_fat: 0,
    total_items: 0,
  };

  await conn.query(
    `INSERT INTO food_daily_totals
      (user_id, entry_date, total_kcal, total_protein, total_carbs, total_fat, total_items)
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

  return totals;
};

const getDayPayload = async (conn, userId, entryDate) => {
  const [entries] = await conn.query(
    `SELECT * FROM food_entries
     WHERE user_id = ? AND entry_date = ?
     ORDER BY FIELD(meal_type, 'breakfast', 'lunch', 'dinner', 'snack')`,
    [userId, entryDate],
  );

  const entryIds = entries.map((e) => e.id);
  let items = [];

  if (entryIds.length > 0) {
    const [itemRows] = await conn.query(
      `SELECT
        fei.*,
        fi.name AS food_item_name,
        fi.item_type AS food_item_type
       FROM food_entry_items fei
       LEFT JOIN food_items fi ON fi.id = fei.food_item_id
       WHERE fei.entry_id IN (?)
       ORDER BY fei.id ASC`,
      [entryIds],
    );
    items = itemRows;
  }

  const itemsByEntry = new Map();
  for (const item of items) {
    if (!itemsByEntry.has(item.entry_id)) {
      itemsByEntry.set(item.entry_id, []);
    }
    itemsByEntry.get(item.entry_id).push(item);
  }

  const meals = MEAL_TYPES.map((mealType) => {
    const entry = entries.find((e) => e.meal_type === mealType);
    if (!entry) {
      return {
        meal_type: mealType,
        entry_id: null,
        notes: "",
        items: [],
        totals: {
          kcal: 0,
          protein: 0,
          carbs: 0,
          fat: 0,
        },
      };
    }

    const mealItems = itemsByEntry.get(entry.id) || [];
    const totals = mealItems.reduce(
      (acc, item) => {
        acc.kcal += parseFloat(item.consumed_kcal || 0);
        acc.protein += parseFloat(item.consumed_protein || 0);
        acc.carbs += parseFloat(item.consumed_carbs || 0);
        acc.fat += parseFloat(item.consumed_fat || 0);
        return acc;
      },
      { kcal: 0, protein: 0, carbs: 0, fat: 0 },
    );

    return {
      meal_type: mealType,
      entry_id: entry.id,
      notes: entry.notes || "",
      items: mealItems,
      totals,
    };
  });

  const [dailyRows] = await conn.query(
    `SELECT total_kcal, total_protein, total_carbs, total_fat, total_items
     FROM food_daily_totals
     WHERE user_id = ? AND entry_date = ?`,
    [userId, entryDate],
  );

  const dailyTotals = dailyRows[0] || {
    total_kcal: 0,
    total_protein: 0,
    total_carbs: 0,
    total_fat: 0,
    total_items: 0,
  };

  return {
    date: entryDate,
    meals,
    dailyTotals,
  };
};

async function getDay(user, query) {
  const entryDate = parseDateOnly(query.date);
  if (!entryDate) {
    throw httpError(400, "Nevalidan datum");
  }

  const conn = await pool.getConnection();
  try {
    return await getDayPayload(conn, user.id, entryDate);
  } finally {
    conn.release();
  }
}

async function createEntry(user, body) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const { entry_date, meal_type, notes, items } = body;
    const entryDate = parseDateOnly(entry_date);

    if (!entryDate) {
      throw httpError(400, "entry_date je obavezan i mora biti validan datum");
    }

    if (!MEAL_TYPES.includes(meal_type)) {
      throw httpError(
        400,
        "meal_type mora biti breakfast, lunch, dinner ili snack",
      );
    }

    if (!Array.isArray(items) || items.length === 0) {
      throw httpError(400, "Potrebna je barem jedna stavka obroka");
    }

    const [existingEntryRows] = await conn.query(
      "SELECT * FROM food_entries WHERE user_id = ? AND entry_date = ? AND meal_type = ?",
      [user.id, entryDate, meal_type],
    );

    let entryId;

    if (existingEntryRows.length > 0) {
      entryId = existingEntryRows[0].id;
      await conn.query("UPDATE food_entries SET notes = ? WHERE id = ?", [
        notes || null,
        entryId,
      ]);
      await conn.query("DELETE FROM food_entry_items WHERE entry_id = ?", [
        entryId,
      ]);
    } else {
      const [insertEntry] = await conn.query(
        "INSERT INTO food_entries (user_id, entry_date, meal_type, notes) VALUES (?, ?, ?, ?)",
        [user.id, entryDate, meal_type, notes || null],
      );
      entryId = insertEntry.insertId;
    }

    for (const rawItem of items) {
      const amountGrams = toPositiveNumber(rawItem.amount_grams);
      if (amountGrams === null || amountGrams <= 0) {
        throw httpError(400, "amount_grams mora biti broj > 0");
      }

      const foodItemId = rawItem.food_item_id
        ? parseInt(rawItem.food_item_id, 10)
        : null;

      let itemName = null;
      let macrosPer100g;

      if (foodItemId) {
        const [foodRows] = await conn.query(
          "SELECT * FROM food_items WHERE id = ? AND is_active = 1",
          [foodItemId],
        );

        if (foodRows.length === 0) {
          throw httpError(404, `Namirnica ID ${foodItemId} nije pronađena`);
        }

        const food = foodRows[0];
        macrosPer100g = {
          kcal_per_100g: parseFloat(food.kcal_per_100g),
          protein_per_100g: parseFloat(food.protein_per_100g),
          carbs_per_100g: parseFloat(food.carbs_per_100g),
          fat_per_100g: parseFloat(food.fat_per_100g),
        };
      } else {
        itemName = rawItem.custom_name
          ? String(rawItem.custom_name).trim()
          : "";
        if (!itemName) {
          throw httpError(400, "Za ručni unos obavezan je custom_name");
        }

        const kcal = toPositiveNumber(rawItem.kcal_per_100g);
        const protein = toPositiveNumber(rawItem.protein_per_100g);
        const carbs = toPositiveNumber(rawItem.carbs_per_100g);
        const fat = toPositiveNumber(rawItem.fat_per_100g);

        if ([kcal, protein, carbs, fat].some((v) => v === null || v < 0)) {
          throw httpError(
            400,
            "Za ručni unos obavezni su kcal/protein/carbs/fat >= 0",
          );
        }

        macrosPer100g = {
          kcal_per_100g: kcal,
          protein_per_100g: protein,
          carbs_per_100g: carbs,
          fat_per_100g: fat,
        };
      }

      const consumedKcal = computeConsumed(
        amountGrams,
        macrosPer100g.kcal_per_100g,
      );
      const consumedProtein = computeConsumed(
        amountGrams,
        macrosPer100g.protein_per_100g,
      );
      const consumedCarbs = computeConsumed(
        amountGrams,
        macrosPer100g.carbs_per_100g,
      );
      const consumedFat = computeConsumed(
        amountGrams,
        macrosPer100g.fat_per_100g,
      );

      await conn.query(
        `INSERT INTO food_entry_items (
          entry_id,
          food_item_id,
          custom_name,
          amount_grams,
          kcal_per_100g,
          protein_per_100g,
          carbs_per_100g,
          fat_per_100g,
          consumed_kcal,
          consumed_protein,
          consumed_carbs,
          consumed_fat
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          entryId,
          foodItemId,
          itemName,
          amountGrams,
          macrosPer100g.kcal_per_100g,
          macrosPer100g.protein_per_100g,
          macrosPer100g.carbs_per_100g,
          macrosPer100g.fat_per_100g,
          consumedKcal,
          consumedProtein,
          consumedCarbs,
          consumedFat,
        ],
      );
    }

    await recalculateDailyTotals(conn, user.id, entryDate);
    const payload = await getDayPayload(conn, user.id, entryDate);

    await conn.commit();
    return payload;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

async function deleteEntry(id, user) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [entryRows] = await conn.query(
      "SELECT * FROM food_entries WHERE id = ?",
      [id],
    );
    if (entryRows.length === 0) {
      throw httpError(404, "Obrok nije pronađen");
    }

    const entry = entryRows[0];
    if (entry.user_id !== user.id && user.role !== "admin") {
      throw httpError(403, "Nemate dozvolu za ovu akciju");
    }

    await conn.query("DELETE FROM food_entries WHERE id = ?", [id]);

    await recalculateDailyTotals(
      conn,
      entry.user_id,
      parseDateOnly(entry.entry_date),
    );
    const payload = await getDayPayload(
      conn,
      entry.user_id,
      parseDateOnly(entry.entry_date),
    );

    await conn.commit();
    return payload;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

async function getHistory(user, query) {
  const {
    start_date,
    end_date,
    meal_type,
    food_query = "",
    limit = 200,
  } = query;

  let whereSql = "WHERE fe.user_id = ?";
  const values = [user.id];

  if (start_date) {
    whereSql += " AND fe.entry_date >= ?";
    values.push(start_date);
  }

  if (end_date) {
    whereSql += " AND fe.entry_date <= ?";
    values.push(end_date);
  }

  if (meal_type && MEAL_TYPES.includes(meal_type)) {
    whereSql += " AND fe.meal_type = ?";
    values.push(meal_type);
  }

  if (food_query.trim()) {
    whereSql += " AND (fi.name LIKE ? OR fei.custom_name LIKE ?)";
    values.push(`%${food_query.trim()}%`, `%${food_query.trim()}%`);
  }

  const safeLimit = Math.max(1, Math.min(parseInt(limit, 10) || 200, 1000));
  values.push(safeLimit);

  const [rows] = await pool.query(
    `SELECT
      fe.id AS entry_id,
      fe.entry_date,
      fe.meal_type,
      fe.notes,
      fei.id AS entry_item_id,
      fei.food_item_id,
      COALESCE(fi.name, fei.custom_name) AS item_name,
      fei.custom_name,
      fei.amount_grams,
      fei.kcal_per_100g,
      fei.protein_per_100g,
      fei.carbs_per_100g,
      fei.fat_per_100g,
      fei.consumed_kcal,
      fei.consumed_protein,
      fei.consumed_carbs,
      fei.consumed_fat
    FROM food_entries fe
    JOIN food_entry_items fei ON fei.entry_id = fe.id
    LEFT JOIN food_items fi ON fi.id = fei.food_item_id
    ${whereSql}
    ORDER BY fe.entry_date DESC, FIELD(fe.meal_type, 'breakfast', 'lunch', 'dinner', 'snack'), fei.id DESC
    LIMIT ?`,
    values,
  );

  return rows;
}

module.exports = {
  getDay,
  createEntry,
  deleteEntry,
  getHistory,
};
