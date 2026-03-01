const pool = require("../db/connection");
const { httpError } = require("../helpers/httpError");

async function getExercises() {
  const [exercises] = await pool.query("SELECT * FROM exercises ORDER BY name");
  const [categories] = await pool.query(
    "SELECT * FROM categories ORDER BY exercise_id, name",
  );

  return exercises.map((exercise) => ({
    ...exercise,
    categories: categories.filter((cat) => cat.exercise_id === exercise.id),
  }));
}

async function getExerciseById(id) {
  const [rows] = await pool.query("SELECT * FROM exercises WHERE id = ?", [id]);
  if (rows.length === 0) {
    throw httpError(404, "Exercise not found");
  }

  const [categories] = await pool.query(
    "SELECT * FROM categories WHERE exercise_id = ?",
    [id],
  );

  return { ...rows[0], categories };
}

async function createExercise(body, file) {
  const { name, description, icon } = body;
  if (!name) {
    throw httpError(400, "name is required");
  }

  const image_url = file ? `/uploads/exercises/${file.filename}` : null;

  const [result] = await pool.query(
    "INSERT INTO exercises (name, description, image_url, icon) VALUES (?, ?, ?, ?)",
    [name, description || null, image_url, icon || "💪"],
  );

  const [exercise] = await pool.query("SELECT * FROM exercises WHERE id = ?", [
    result.insertId,
  ]);
  return exercise[0];
}

async function updateExercise(id, body, file) {
  const { name, description, icon } = body;
  const updates = [];
  const values = [];

  if (name) {
    updates.push("name = ?");
    values.push(name);
  }
  if (description !== undefined) {
    updates.push("description = ?");
    values.push(description);
  }
  if (icon) {
    updates.push("icon = ?");
    values.push(icon);
  }
  if (file) {
    updates.push("image_url = ?");
    values.push(`/uploads/exercises/${file.filename}`);
  }

  if (updates.length === 0) {
    throw httpError(400, "No fields to update");
  }

  values.push(id);
  await pool.query(
    `UPDATE exercises SET ${updates.join(", ")} WHERE id = ?`,
    values,
  );

  const [exercise] = await pool.query("SELECT * FROM exercises WHERE id = ?", [
    id,
  ]);
  return exercise[0];
}

async function deleteExercise(id) {
  const [result] = await pool.query("DELETE FROM exercises WHERE id = ?", [id]);
  if (result.affectedRows === 0) {
    throw httpError(404, "Exercise not found");
  }
  return { message: "Exercise deleted" };
}

module.exports = {
  getExercises,
  getExerciseById,
  createExercise,
  updateExercise,
  deleteExercise,
};
