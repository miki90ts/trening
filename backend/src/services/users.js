const pool = require("../db/connection");
const bcrypt = require("bcryptjs");
const { httpError } = require("../helpers/httpError");

const BCRYPT_ROUNDS = 12;

const toBoolean = (value, defaultValue = false) => {
  if (value === undefined || value === null) return defaultValue;
  if (typeof value === "boolean") return value;
  const normalized = String(value).trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes";
};

const sanitizeUser = (user) => ({
  id: user.id,
  first_name: user.first_name,
  last_name: user.last_name,
  nickname: user.nickname,
  email: user.email,
  role: user.role,
  is_approved: user.is_approved,
  show_in_users_list: user.show_in_users_list,
  profile_image: user.profile_image,
  created_at: user.created_at,
  updated_at: user.updated_at,
});

async function getUsers(authUser, query) {
  const { q = "", role = "", page, pageSize } = query;

  const filters = ["is_approved = 1"];
  const values = [];

  const isAdmin = authUser?.role === "admin";
  if (!isAdmin) {
    if (authUser?.id) {
      filters.push("(show_in_users_list = 1 OR id = ?)");
      values.push(authUser.id);
    } else {
      filters.push("show_in_users_list = 1");
    }
  }

  if (q.trim()) {
    const like = `%${q.trim()}%`;
    filters.push(`(
      first_name LIKE ?
      OR last_name LIKE ?
      OR nickname LIKE ?
      OR email LIKE ?
      OR role LIKE ?
    )`);
    values.push(like, like, like, like, like);
  }

  if (role && role !== "all") {
    filters.push("role = ?");
    values.push(role);
  }

  const whereSql = `WHERE ${filters.join(" AND ")}`;

  const hasPagination = page !== undefined || pageSize !== undefined;
  const parsedPage = Math.max(1, parseInt(page, 10) || 1);
  const parsedPageSizeRaw = parseInt(pageSize, 10) || 10;
  const parsedPageSize = [10, 25, 50].includes(parsedPageSizeRaw)
    ? parsedPageSizeRaw
    : 10;

  if (hasPagination) {
    const [countRows] = await pool.query(
      `SELECT COUNT(*) AS total FROM users ${whereSql}`,
      values,
    );
    const total = countRows[0]?.total || 0;
    const offset = (parsedPage - 1) * parsedPageSize;

    const [rows] = await pool.query(
      `SELECT id, first_name, last_name, nickname, email, role, is_approved, show_in_users_list, profile_image, created_at, updated_at
       FROM users
       ${whereSql}
       ORDER BY first_name ASC, last_name ASC
       LIMIT ? OFFSET ?`,
      [...values, parsedPageSize, offset],
    );

    return {
      data: rows,
      pagination: {
        page: parsedPage,
        pageSize: parsedPageSize,
        total,
        totalPages: Math.ceil(total / parsedPageSize),
      },
    };
  }

  const [rows] = await pool.query(
    `SELECT id, first_name, last_name, nickname, email, role, is_approved, show_in_users_list, profile_image, created_at, updated_at
     FROM users
     ${whereSql}
     ORDER BY first_name ASC, last_name ASC`,
    values,
  );

  return rows;
}

async function getUserById(id, authUser) {
  const [rows] = await pool.query(
    "SELECT id, first_name, last_name, nickname, email, role, is_approved, show_in_users_list, profile_image, created_at, updated_at FROM users WHERE id = ?",
    [id],
  );
  if (rows.length === 0) throw httpError(404, "User not found");

  const targetUser = rows[0];
  const isSelf = authUser && parseInt(id, 10) === authUser.id;
  const isAdmin = authUser?.role === "admin";
  if (!isAdmin && !isSelf && !targetUser.show_in_users_list) {
    throw httpError(404, "User not found");
  }

  return rows[0];
}

async function createUser(authUser, body, file) {
  const {
    first_name,
    last_name,
    nickname,
    email,
    password,
    role = "user",
    show_in_users_list,
  } = body;

  if (!first_name) throw httpError(400, "first_name is required");

  if (!email || !password) {
    throw httpError(400, "email i password su obavezni");
  }

  if (!["user", "admin"].includes(role)) {
    throw httpError(400, "Nevalidna rola");
  }

  const [existing] = await pool.query("SELECT id FROM users WHERE email = ?", [
    String(email).toLowerCase(),
  ]);
  if (existing.length > 0) {
    throw httpError(409, "Email već postoji");
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

  const profile_image = file ? `/uploads/users/${file.filename}` : null;
  const [result] = await pool.query(
    `INSERT INTO users 
      (first_name, last_name, nickname, email, password_hash, role, is_approved, show_in_users_list, profile_image)
      VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)`,
    [
      first_name,
      last_name || null,
      nickname || null,
      String(email).toLowerCase(),
      passwordHash,
      role,
      show_in_users_list === undefined
        ? 1
        : toBoolean(show_in_users_list)
          ? 1
          : 0,
      profile_image,
    ],
  );
  const [user] = await pool.query("SELECT * FROM users WHERE id = ?", [
    result.insertId,
  ]);
  return sanitizeUser(user[0]);
}

async function updateUser(id, authUser, body, file) {
  if (parseInt(id, 10) !== authUser.id && authUser.role !== "admin") {
    throw httpError(403, "Nemate dozvolu za ovu akciju.");
  }

  const { first_name, last_name, nickname } = body;
  const updates = [];
  const values = [];

  if (first_name) {
    updates.push("first_name = ?");
    values.push(first_name);
  }
  if (last_name !== undefined) {
    updates.push("last_name = ?");
    values.push(last_name || null);
  }
  if (nickname !== undefined) {
    updates.push("nickname = ?");
    values.push(nickname || null);
  }
  if (body.show_in_users_list !== undefined) {
    updates.push("show_in_users_list = ?");
    values.push(toBoolean(body.show_in_users_list) ? 1 : 0);
  }

  if (body.email !== undefined) {
    if (authUser.role !== "admin") {
      throw httpError(403, "Samo admin može menjati email.");
    }
    updates.push("email = ?");
    values.push(String(body.email).toLowerCase());
  }

  if (body.role !== undefined) {
    if (authUser.role !== "admin") {
      throw httpError(403, "Samo admin može menjati rolu.");
    }
    if (!["user", "admin"].includes(body.role)) {
      throw httpError(400, "Nevalidna rola.");
    }
    if (parseInt(id, 10) === authUser.id && body.role !== "admin") {
      throw httpError(400, "Ne možete sami sebi ukloniti admin prava.");
    }
    updates.push("role = ?");
    values.push(body.role);
  }

  if (body.password !== undefined) {
    if (authUser.role !== "admin") {
      throw httpError(403, "Samo admin može menjati lozinku ovde.");
    }
    const passwordHash = await bcrypt.hash(body.password, BCRYPT_ROUNDS);
    updates.push("password_hash = ?");
    values.push(passwordHash);
  }

  if (body.is_approved !== undefined) {
    if (authUser.role !== "admin") {
      throw httpError(403, "Samo admin može menjati approval status.");
    }
    updates.push("is_approved = ?");
    values.push(toBoolean(body.is_approved) ? 1 : 0);
  }

  if (file) {
    updates.push("profile_image = ?");
    values.push(`/uploads/users/${file.filename}`);
  }

  if (updates.length === 0) throw httpError(400, "No fields to update");

  values.push(id);
  await pool.query(
    `UPDATE users SET ${updates.join(", ")} WHERE id = ?`,
    values,
  );
  const [user] = await pool.query("SELECT * FROM users WHERE id = ?", [id]);
  return sanitizeUser(user[0]);
}

async function deleteUser(id) {
  const [result] = await pool.query("DELETE FROM users WHERE id = ?", [id]);
  if (result.affectedRows === 0) throw httpError(404, "User not found");
  return { message: "User deleted" };
}

async function getUserRecords(id) {
  const [rows] = await pool.query(
    `
      SELECT 
        ranked.id,
        ranked.score,
        ranked.total_sets,
        ranked.category_name, 
        ranked.value_type,
        ranked.has_weight,
        ranked.exercise_name, 
        ranked.exercise_icon,
        ranked.attempt_date
      FROM (
        SELECT 
          w.id,
          w.category_id,
          w.attempt_date,
          COUNT(ws.id) as total_sets,
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
        GROUP BY w.id, w.category_id, w.attempt_date, c.name, c.value_type, c.has_weight, e.name, e.icon
      ) ranked
      WHERE ranked.rn = 1
      ORDER BY ranked.exercise_name, ranked.category_name
    `,
    [id],
  );
  return rows;
}

module.exports = {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  getUserRecords,
};
