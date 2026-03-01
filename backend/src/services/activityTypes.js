const pool = require("../db/connection");
const { toCode } = require("../helpers/activityTypes");
const { httpError } = require("../helpers/httpError");

async function getActivityTypes(user, query) {
  const { q = "", include_inactive, page, pageSize } = query;

  const canSeeInactive = user.role === "admin" && include_inactive === "1";

  const filters = [];
  const values = [];

  if (!canSeeInactive) {
    filters.push("is_active = 1");
  }

  if (String(q).trim()) {
    const like = `%${String(q).trim()}%`;
    filters.push(
      "(name LIKE ? OR code LIKE ? OR COALESCE(description, '') LIKE ?)",
    );
    values.push(like, like, like);
  }

  const whereSql = filters.length ? `WHERE ${filters.join(" AND ")}` : "";
  const hasPagination = page !== undefined || pageSize !== undefined;

  if (hasPagination) {
    const parsedPage = Math.max(1, parseInt(page, 10) || 1);
    const parsedPageSizeRaw = parseInt(pageSize, 10) || 10;
    const parsedPageSize = [10, 25, 50].includes(parsedPageSizeRaw)
      ? parsedPageSizeRaw
      : 10;

    const [countRows] = await pool.query(
      `SELECT COUNT(*) as total FROM activity_types ${whereSql}`,
      values,
    );
    const total = countRows[0]?.total || 0;
    const offset = (parsedPage - 1) * parsedPageSize;

    const [rows] = await pool.query(
      `SELECT * FROM activity_types ${whereSql}
       ORDER BY is_active DESC, name ASC
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
    `SELECT * FROM activity_types ${whereSql} ORDER BY is_active DESC, name ASC`,
    values,
  );

  return rows;
}

async function createActivityType(userId, body) {
  const { name, code, description } = body;
  if (!name || !String(name).trim()) {
    throw httpError(400, "Naziv tipa aktivnosti je obavezan");
  }

  const safeCode = toCode(code || name);
  if (!safeCode) {
    throw httpError(400, "Code mora sadržati bar jedno slovo ili broj");
  }

  try {
    const [insertResult] = await pool.query(
      `INSERT INTO activity_types (name, code, description, created_by)
       VALUES (?, ?, ?, ?)`,
      [String(name).trim(), safeCode, description || null, userId],
    );

    const [rows] = await pool.query(
      "SELECT * FROM activity_types WHERE id = ?",
      [insertResult.insertId],
    );

    return rows[0];
  } catch (err) {
    if (err.code === "ER_DUP_ENTRY") {
      throw httpError(409, "Activity type code već postoji");
    }
    throw err;
  }
}

async function updateActivityType(id, body) {
  const [existingRows] = await pool.query(
    "SELECT * FROM activity_types WHERE id = ?",
    [id],
  );

  if (existingRows.length === 0) {
    throw httpError(404, "Tip aktivnosti nije pronađen");
  }

  const updates = [];
  const values = [];

  if (body.name !== undefined) {
    if (!String(body.name).trim()) {
      throw httpError(400, "Naziv ne može biti prazan");
    }
    updates.push("name = ?");
    values.push(String(body.name).trim());
  }

  if (body.code !== undefined) {
    const safeCode = toCode(body.code);
    if (!safeCode) {
      throw httpError(400, "Code mora sadržati bar jedno slovo ili broj");
    }
    updates.push("code = ?");
    values.push(safeCode);
  }

  if (body.description !== undefined) {
    updates.push("description = ?");
    values.push(body.description || null);
  }

  if (body.is_active !== undefined) {
    updates.push("is_active = ?");
    values.push(body.is_active ? 1 : 0);
  }

  if (updates.length === 0) {
    throw httpError(400, "Nema polja za ažuriranje");
  }

  try {
    values.push(id);
    await pool.query(
      `UPDATE activity_types SET ${updates.join(", ")} WHERE id = ?`,
      values,
    );

    const [rows] = await pool.query(
      "SELECT * FROM activity_types WHERE id = ?",
      [id],
    );

    return rows[0];
  } catch (err) {
    if (err.code === "ER_DUP_ENTRY") {
      throw httpError(409, "Activity type code već postoji");
    }
    throw err;
  }
}

async function deleteActivityType(id) {
  const [result] = await pool.query(
    "UPDATE activity_types SET is_active = 0 WHERE id = ?",
    [id],
  );

  if (result.affectedRows === 0) {
    throw httpError(404, "Tip aktivnosti nije pronađen");
  }

  return { success: true };
}

module.exports = {
  getActivityTypes,
  createActivityType,
  updateActivityType,
  deleteActivityType,
};
