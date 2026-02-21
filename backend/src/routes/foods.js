const express = require("express");
const router = express.Router();
const pool = require("../db/connection");
const { authenticate, authorize } = require("../middleware/auth");

const toNumber = (value) => {
  const parsed = parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const validateMacros = ({
  kcal_per_100g,
  protein_per_100g,
  carbs_per_100g,
  fat_per_100g,
}) => {
  const kcal = toNumber(kcal_per_100g);
  const protein = toNumber(protein_per_100g);
  const carbs = toNumber(carbs_per_100g);
  const fat = toNumber(fat_per_100g);

  if ([kcal, protein, carbs, fat].some((v) => v === null || v < 0)) {
    return null;
  }

  return {
    kcal_per_100g: kcal,
    protein_per_100g: protein,
    carbs_per_100g: carbs,
    fat_per_100g: fat,
  };
};

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

    if (q.trim()) {
      const like = `%${q.trim()}%`;
      filters.push(`
        (
          name LIKE ?
          OR item_type LIKE ?
          OR CAST(kcal_per_100g AS CHAR) LIKE ?
          OR CAST(protein_per_100g AS CHAR) LIKE ?
          OR CAST(carbs_per_100g AS CHAR) LIKE ?
          OR CAST(fat_per_100g AS CHAR) LIKE ?
          OR CASE WHEN is_active = 1 THEN 'aktivno' ELSE 'neaktivno' END LIKE ?
          OR CASE WHEN is_active = 1 THEN 'active' ELSE 'inactive' END LIKE ?
        )
      `);
      values.push(like, like, like, like, like, like, like, like);
    }

    const whereSql = filters.length ? `WHERE ${filters.join(" AND ")}` : "";

    const hasPagination = page !== undefined || pageSize !== undefined;
    const parsedPage = Math.max(1, parseInt(page, 10) || 1);
    const parsedPageSizeRaw = parseInt(pageSize, 10) || 10;
    const parsedPageSize = [10, 25, 50].includes(parsedPageSizeRaw)
      ? parsedPageSizeRaw
      : 10;

    if (hasPagination) {
      const [countRows] = await pool.query(
        `SELECT COUNT(*) AS total FROM food_items ${whereSql}`,
        values,
      );
      const total = countRows[0]?.total || 0;
      const offset = (parsedPage - 1) * parsedPageSize;

      const [rows] = await pool.query(
        `SELECT * FROM food_items ${whereSql}
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
      `SELECT * FROM food_items ${whereSql} ORDER BY is_active DESC, name ASC`,
      values,
    );

    res.json(rows);
  } catch (err) {
    next(err);
  }
});

router.get("/:id", authenticate, async (req, res, next) => {
  try {
    const [rows] = await pool.query("SELECT * FROM food_items WHERE id = ?", [
      req.params.id,
    ]);
    if (rows.length === 0) {
      return res.status(404).json({ error: "Namirnica nije pronađena" });
    }

    if (!rows[0].is_active && req.user.role !== "admin") {
      return res.status(404).json({ error: "Namirnica nije pronađena" });
    }

    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

router.post("/", authenticate, authorize("admin"), async (req, res, next) => {
  try {
    const {
      name,
      item_type = "food",
      kcal_per_100g,
      protein_per_100g,
      carbs_per_100g,
      fat_per_100g,
    } = req.body;

    if (!name || !String(name).trim()) {
      return res.status(400).json({ error: "Naziv je obavezan" });
    }

    if (!["food", "dish"].includes(item_type)) {
      return res
        .status(400)
        .json({ error: "item_type mora biti food ili dish" });
    }

    const macros = validateMacros({
      kcal_per_100g,
      protein_per_100g,
      carbs_per_100g,
      fat_per_100g,
    });
    if (!macros) {
      return res.status(400).json({
        error: "Kcal i makronutrijenti moraju biti validni brojevi >= 0",
      });
    }

    const [result] = await pool.query(
      `INSERT INTO food_items
      (name, item_type, kcal_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        String(name).trim(),
        item_type,
        macros.kcal_per_100g,
        macros.protein_per_100g,
        macros.carbs_per_100g,
        macros.fat_per_100g,
        req.user.id,
      ],
    );

    const [created] = await pool.query(
      "SELECT * FROM food_items WHERE id = ?",
      [result.insertId],
    );
    res.status(201).json(created[0]);
  } catch (err) {
    next(err);
  }
});

router.put("/:id", authenticate, authorize("admin"), async (req, res, next) => {
  try {
    const [existingRows] = await pool.query(
      "SELECT * FROM food_items WHERE id = ?",
      [req.params.id],
    );
    if (existingRows.length === 0) {
      return res.status(404).json({ error: "Namirnica nije pronađena" });
    }

    const updates = [];
    const values = [];
    const {
      name,
      item_type,
      kcal_per_100g,
      protein_per_100g,
      carbs_per_100g,
      fat_per_100g,
      is_active,
    } = req.body;

    if (name !== undefined) {
      if (!String(name).trim()) {
        return res.status(400).json({ error: "Naziv ne može biti prazan" });
      }
      updates.push("name = ?");
      values.push(String(name).trim());
    }

    if (item_type !== undefined) {
      if (!["food", "dish"].includes(item_type)) {
        return res
          .status(400)
          .json({ error: "item_type mora biti food ili dish" });
      }
      updates.push("item_type = ?");
      values.push(item_type);
    }

    const macroFieldsProvided =
      kcal_per_100g !== undefined ||
      protein_per_100g !== undefined ||
      carbs_per_100g !== undefined ||
      fat_per_100g !== undefined;

    if (macroFieldsProvided) {
      const source = {
        kcal_per_100g:
          kcal_per_100g !== undefined
            ? kcal_per_100g
            : existingRows[0].kcal_per_100g,
        protein_per_100g:
          protein_per_100g !== undefined
            ? protein_per_100g
            : existingRows[0].protein_per_100g,
        carbs_per_100g:
          carbs_per_100g !== undefined
            ? carbs_per_100g
            : existingRows[0].carbs_per_100g,
        fat_per_100g:
          fat_per_100g !== undefined
            ? fat_per_100g
            : existingRows[0].fat_per_100g,
      };

      const macros = validateMacros(source);
      if (!macros) {
        return res.status(400).json({
          error: "Kcal i makronutrijenti moraju biti validni brojevi >= 0",
        });
      }

      updates.push(
        "kcal_per_100g = ?",
        "protein_per_100g = ?",
        "carbs_per_100g = ?",
        "fat_per_100g = ?",
      );
      values.push(
        macros.kcal_per_100g,
        macros.protein_per_100g,
        macros.carbs_per_100g,
        macros.fat_per_100g,
      );
    }

    if (is_active !== undefined) {
      updates.push("is_active = ?");
      values.push(is_active ? 1 : 0);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: "Nema polja za ažuriranje" });
    }

    values.push(req.params.id);
    await pool.query(
      `UPDATE food_items SET ${updates.join(", ")} WHERE id = ?`,
      values,
    );

    const [rows] = await pool.query("SELECT * FROM food_items WHERE id = ?", [
      req.params.id,
    ]);
    res.json(rows[0]);
  } catch (err) {
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
        "UPDATE food_items SET is_active = 0 WHERE id = ?",
        [req.params.id],
      );
      if (result.affectedRows === 0) {
        return res.status(404).json({ error: "Namirnica nije pronađena" });
      }

      res.json({ message: "Namirnica deaktivirana" });
    } catch (err) {
      next(err);
    }
  },
);

module.exports = router;
