const pool = require("../db/connection");
const { httpError } = require("../helpers/httpError");

function validateHexColor(color) {
  if (color === undefined) return;
  if (color && !/^#[0-9A-Fa-f]{6}$/.test(color)) {
    throw httpError(400, "color must be a valid hex color (e.g. #6366f1)");
  }
}

async function getCategories(query) {
  const { exercise_id } = query;
  let sql = `
    SELECT c.*, e.name as exercise_name, e.icon as exercise_icon
    FROM categories c
    JOIN exercises e ON c.exercise_id = e.id
  `;
  const values = [];
  if (exercise_id) {
    sql += " WHERE c.exercise_id = ?";
    values.push(exercise_id);
  }
  sql += " ORDER BY e.name, c.name";

  const [rows] = await pool.query(sql, values);
  return rows;
}

async function getCategoryById(id) {
  const [rows] = await pool.query(
    `
      SELECT c.*, e.name as exercise_name, e.icon as exercise_icon
      FROM categories c
      JOIN exercises e ON c.exercise_id = e.id
      WHERE c.id = ?
    `,
    [id],
  );
  if (rows.length === 0) {
    throw httpError(404, "Category not found");
  }
  return rows[0];
}

async function createCategory(body) {
  const { exercise_id, name, value_type, has_weight, description, color } =
    body;

  if (!exercise_id || !name) {
    throw httpError(400, "exercise_id and name are required");
  }

  validateHexColor(color);

  const [result] = await pool.query(
    "INSERT INTO categories (exercise_id, name, value_type, has_weight, description, color) VALUES (?, ?, ?, ?, ?, ?)",
    [
      exercise_id,
      name,
      value_type || "reps",
      has_weight ? 1 : 0,
      description || null,
      color || "#6366f1",
    ],
  );

  const [cat] = await pool.query("SELECT * FROM categories WHERE id = ?", [
    result.insertId,
  ]);
  return cat[0];
}

async function updateCategory(id, body) {
  const { name, value_type, has_weight, description, color } = body;
  const updates = [];
  const values = [];

  if (name) {
    updates.push("name = ?");
    values.push(name);
  }
  if (value_type) {
    updates.push("value_type = ?");
    values.push(value_type);
  }
  if (has_weight !== undefined) {
    updates.push("has_weight = ?");
    values.push(has_weight ? 1 : 0);
  }
  if (description !== undefined) {
    updates.push("description = ?");
    values.push(description);
  }
  if (color !== undefined) {
    validateHexColor(color);
    updates.push("color = ?");
    values.push(color);
  }

  if (updates.length === 0) {
    throw httpError(400, "No fields to update");
  }

  values.push(id);
  await pool.query(
    `UPDATE categories SET ${updates.join(", ")} WHERE id = ?`,
    values,
  );

  const [cat] = await pool.query("SELECT * FROM categories WHERE id = ?", [id]);
  return cat[0];
}

async function deleteCategory(id) {
  const [usageRows] = await pool.query(
    "SELECT COUNT(*) AS total FROM workouts WHERE category_id = ?",
    [id],
  );
  const linkedWorkouts = usageRows[0]?.total || 0;

  if (linkedWorkouts > 0) {
    throw httpError(
      409,
      "Kategorija ne može da se obriše jer je vezana za postojeće workout unose.",
    );
  }

  const [result] = await pool.query("DELETE FROM categories WHERE id = ?", [
    id,
  ]);
  if (result.affectedRows === 0) {
    throw httpError(404, "Category not found");
  }

  return { message: "Category deleted" };
}

module.exports = {
  getCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
};
