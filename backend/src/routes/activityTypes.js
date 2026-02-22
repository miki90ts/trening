const express = require("express");
const router = express.Router();
const pool = require("../db/connection");
const { authenticate, authorize } = require("../middleware/auth");

const toCode = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 60);

router.get("/", authenticate, async (req, res, next) => {
  try {
    const { q = "", include_inactive, page, pageSize } = req.query;

    const canSeeInactive =
      req.user.role === "admin" && include_inactive === "1";

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

      return res.json({
        data: rows,
        pagination: {
          page: parsedPage,
          pageSize: parsedPageSize,
          total,
          totalPages: Math.ceil(total / parsedPageSize),
        },
      });
    }

    const [rows] = await pool.query(
      `SELECT * FROM activity_types ${whereSql} ORDER BY is_active DESC, name ASC`,
      values,
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

router.post("/", authenticate, authorize("admin"), async (req, res, next) => {
  try {
    const { name, code, description } = req.body;
    if (!name || !String(name).trim()) {
      return res
        .status(400)
        .json({ error: "Naziv tipa aktivnosti je obavezan" });
    }

    const safeCode = toCode(code || name);
    if (!safeCode) {
      return res
        .status(400)
        .json({ error: "Code mora sadržati bar jedno slovo ili broj" });
    }

    const [insertResult] = await pool.query(
      `INSERT INTO activity_types (name, code, description, created_by)
       VALUES (?, ?, ?, ?)`,
      [String(name).trim(), safeCode, description || null, req.user.id],
    );

    const [rows] = await pool.query(
      "SELECT * FROM activity_types WHERE id = ?",
      [insertResult.insertId],
    );

    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ error: "Activity type code već postoji" });
    }
    next(err);
  }
});

router.put("/:id", authenticate, authorize("admin"), async (req, res, next) => {
  try {
    const [existingRows] = await pool.query(
      "SELECT * FROM activity_types WHERE id = ?",
      [req.params.id],
    );

    if (existingRows.length === 0) {
      return res.status(404).json({ error: "Tip aktivnosti nije pronađen" });
    }

    const updates = [];
    const values = [];

    if (req.body.name !== undefined) {
      if (!String(req.body.name).trim()) {
        return res.status(400).json({ error: "Naziv ne može biti prazan" });
      }
      updates.push("name = ?");
      values.push(String(req.body.name).trim());
    }

    if (req.body.code !== undefined) {
      const safeCode = toCode(req.body.code);
      if (!safeCode) {
        return res
          .status(400)
          .json({ error: "Code mora sadržati bar jedno slovo ili broj" });
      }
      updates.push("code = ?");
      values.push(safeCode);
    }

    if (req.body.description !== undefined) {
      updates.push("description = ?");
      values.push(req.body.description || null);
    }

    if (req.body.is_active !== undefined) {
      updates.push("is_active = ?");
      values.push(req.body.is_active ? 1 : 0);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: "Nema polja za ažuriranje" });
    }

    values.push(req.params.id);
    await pool.query(
      `UPDATE activity_types SET ${updates.join(", ")} WHERE id = ?`,
      values,
    );

    const [rows] = await pool.query(
      "SELECT * FROM activity_types WHERE id = ?",
      [req.params.id],
    );

    res.json(rows[0]);
  } catch (err) {
    if (err.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ error: "Activity type code već postoji" });
    }
    next(err);
  }
});

router.delete(
  "/:id",
  authenticate,
  authorize("admin"),
  async (req, res, next) => {
    try {
      const [result] = await pool.query(
        "UPDATE activity_types SET is_active = 0 WHERE id = ?",
        [req.params.id],
      );

      if (result.affectedRows === 0) {
        return res.status(404).json({ error: "Tip aktivnosti nije pronađen" });
      }

      res.json({ success: true });
    } catch (err) {
      next(err);
    }
  },
);

module.exports = router;
