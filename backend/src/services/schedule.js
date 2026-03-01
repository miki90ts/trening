const pool = require("../db/connection");
const { httpError } = require("../helpers/httpError");

async function getSchedule(user, query) {
  const { month, date } = query;
  const userId = user.id;

  let whereClause = "WHERE sw.user_id = ?";
  const values = [userId];

  if (month) {
    whereClause += ' AND DATE_FORMAT(sw.scheduled_date, "%Y-%m") = ?';
    values.push(month);
  }
  if (date) {
    whereClause += " AND sw.scheduled_date = ?";
    values.push(date);
  }

  const [rows] = await pool.query(
    `
      SELECT sw.*, 
             c.name AS category_name, c.value_type, c.has_weight, c.color AS category_color,
             e.name AS exercise_name, e.icon AS exercise_icon
      FROM scheduled_workouts sw
      JOIN categories c ON sw.category_id = c.id
      JOIN exercises e ON c.exercise_id = e.id
      ${whereClause}
      ORDER BY sw.scheduled_date ASC, sw.scheduled_time ASC
    `,
    values,
  );

  return rows;
}

async function getToday(user) {
  const [rows] = await pool.query(
    `
      SELECT sw.*, 
             c.name AS category_name, c.value_type, c.has_weight, c.color AS category_color,
             e.name AS exercise_name, e.icon AS exercise_icon
      FROM scheduled_workouts sw
      JOIN categories c ON sw.category_id = c.id
      JOIN exercises e ON c.exercise_id = e.id
      WHERE sw.user_id = ? AND sw.scheduled_date = CURDATE()
      ORDER BY sw.scheduled_time ASC
    `,
    [user.id],
  );

  return rows;
}

async function getScheduleById(id, user) {
  const [rows] = await pool.query(
    `
      SELECT sw.*, 
             c.name AS category_name, c.value_type, c.has_weight, c.color AS category_color,
             e.name AS exercise_name, e.icon AS exercise_icon
      FROM scheduled_workouts sw
      JOIN categories c ON sw.category_id = c.id
      JOIN exercises e ON c.exercise_id = e.id
      WHERE sw.id = ? AND sw.user_id = ?
    `,
    [id, user.id],
  );

  if (rows.length === 0) {
    throw httpError(404, "Zakazani trening nije pronađen");
  }

  return rows[0];
}

async function createSchedule(user, body) {
  const { category_id, scheduled_date, scheduled_time, title, notes } = body;

  if (!category_id || !scheduled_date) {
    throw httpError(400, "category_id i scheduled_date su obavezni");
  }

  const [catRows] = await pool.query("SELECT id FROM categories WHERE id = ?", [
    category_id,
  ]);
  if (catRows.length === 0) {
    throw httpError(404, "Kategorija nije pronađena");
  }

  const [result] = await pool.query(
    `INSERT INTO scheduled_workouts (user_id, category_id, scheduled_date, scheduled_time, title, notes) 
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      user.id,
      category_id,
      scheduled_date,
      scheduled_time || null,
      title || null,
      notes || null,
    ],
  );

  const [rows] = await pool.query(
    `
      SELECT sw.*, 
             c.name AS category_name, c.value_type, c.has_weight, c.color AS category_color,
             e.name AS exercise_name, e.icon AS exercise_icon
      FROM scheduled_workouts sw
      JOIN categories c ON sw.category_id = c.id
      JOIN exercises e ON c.exercise_id = e.id
      WHERE sw.id = ?
    `,
    [result.insertId],
  );

  return rows[0];
}

async function updateSchedule(id, user, body) {
  const [existing] = await pool.query(
    "SELECT * FROM scheduled_workouts WHERE id = ?",
    [id],
  );
  if (existing.length === 0) {
    throw httpError(404, "Zakazani trening nije pronađen");
  }

  if (existing[0].user_id !== user.id && user.role !== "admin") {
    throw httpError(403, "Nemate dozvolu za ovu akciju");
  }

  const {
    category_id,
    scheduled_date,
    scheduled_time,
    title,
    notes,
    is_completed,
  } = body;
  const updates = [];
  const values = [];

  if (category_id !== undefined) {
    updates.push("category_id = ?");
    values.push(category_id);
  }
  if (scheduled_date !== undefined) {
    updates.push("scheduled_date = ?");
    values.push(scheduled_date);
  }
  if (scheduled_time !== undefined) {
    updates.push("scheduled_time = ?");
    values.push(scheduled_time || null);
  }
  if (title !== undefined) {
    updates.push("title = ?");
    values.push(title);
  }
  if (notes !== undefined) {
    updates.push("notes = ?");
    values.push(notes);
  }
  if (is_completed !== undefined) {
    updates.push("is_completed = ?");
    values.push(is_completed ? 1 : 0);
  }

  if (updates.length === 0) {
    throw httpError(400, "Nema polja za ažuriranje");
  }

  values.push(id);
  await pool.query(
    `UPDATE scheduled_workouts SET ${updates.join(", ")} WHERE id = ?`,
    values,
  );

  const [rows] = await pool.query(
    `
      SELECT sw.*, 
             c.name AS category_name, c.value_type, c.has_weight, c.color AS category_color,
             e.name AS exercise_name, e.icon AS exercise_icon
      FROM scheduled_workouts sw
      JOIN categories c ON sw.category_id = c.id
      JOIN exercises e ON c.exercise_id = e.id
      WHERE sw.id = ?
    `,
    [id],
  );

  return rows[0];
}

async function completeSchedule(id, user) {
  const [existing] = await pool.query(
    "SELECT * FROM scheduled_workouts WHERE id = ?",
    [id],
  );
  if (existing.length === 0) {
    throw httpError(404, "Zakazani trening nije pronađen");
  }

  if (existing[0].user_id !== user.id && user.role !== "admin") {
    throw httpError(403, "Nemate dozvolu za ovu akciju");
  }

  await pool.query(
    "UPDATE scheduled_workouts SET is_completed = 1 WHERE id = ?",
    [id],
  );

  const [rows] = await pool.query(
    `
      SELECT sw.*, 
             c.name AS category_name, c.value_type, c.has_weight, c.color AS category_color,
             e.name AS exercise_name, e.icon AS exercise_icon
      FROM scheduled_workouts sw
      JOIN categories c ON sw.category_id = c.id
      JOIN exercises e ON c.exercise_id = e.id
      WHERE sw.id = ?
    `,
    [id],
  );

  return rows[0];
}

async function deleteSchedule(id, user) {
  const [existing] = await pool.query(
    "SELECT * FROM scheduled_workouts WHERE id = ?",
    [id],
  );
  if (existing.length === 0) {
    throw httpError(404, "Zakazani trening nije pronađen");
  }

  if (existing[0].user_id !== user.id && user.role !== "admin") {
    throw httpError(403, "Nemate dozvolu za ovu akciju");
  }

  await pool.query("DELETE FROM scheduled_workouts WHERE id = ?", [id]);
  return { message: "Zakazani trening obrisan" };
}

module.exports = {
  getSchedule,
  getToday,
  getScheduleById,
  createSchedule,
  updateSchedule,
  completeSchedule,
  deleteSchedule,
};
