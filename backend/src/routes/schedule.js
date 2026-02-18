const express = require("express");
const router = express.Router();
const pool = require("../db/connection");
const { authenticate, authorize } = require("../middleware/auth");

// GET /api/schedule - Svi zakazani treninzi korisnika
router.get("/", authenticate, async (req, res, next) => {
  try {
    const { month, date } = req.query;
    const userId = req.user.id;

    let whereClause = "WHERE sw.user_id = ?";
    const values = [userId];

    if (month) {
      // Format: YYYY-MM
      whereClause += ' AND DATE_FORMAT(sw.scheduled_date, "%Y-%m") = ?';
      values.push(month);
    }
    if (date) {
      // Format: YYYY-MM-DD
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

    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// GET /api/schedule/today - Zakazani za danas (za notifikacije)
router.get("/today", authenticate, async (req, res, next) => {
  try {
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
      [req.user.id],
    );

    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// GET /api/schedule/:id - Detalj zakazanog
router.get("/:id", authenticate, async (req, res, next) => {
  try {
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
      [req.params.id, req.user.id],
    );

    if (rows.length === 0)
      return res.status(404).json({ error: "Zakazani trening nije pronađen" });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

// POST /api/schedule - Zakaži trening
router.post("/", authenticate, async (req, res, next) => {
  try {
    const { category_id, scheduled_date, scheduled_time, title, notes } =
      req.body;

    if (!category_id || !scheduled_date) {
      return res
        .status(400)
        .json({ error: "category_id i scheduled_date su obavezni" });
    }

    // Proveri da kategorija postoji
    const [catRows] = await pool.query(
      "SELECT id FROM categories WHERE id = ?",
      [category_id],
    );
    if (catRows.length === 0) {
      return res.status(404).json({ error: "Kategorija nije pronađena" });
    }

    const [result] = await pool.query(
      `INSERT INTO scheduled_workouts (user_id, category_id, scheduled_date, scheduled_time, title, notes) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        req.user.id,
        category_id,
        scheduled_date,
        scheduled_time || null,
        title || null,
        notes || null,
      ],
    );

    // Vrati kreirani zapis sa join podacima
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

    res.status(201).json(rows[0]);
  } catch (err) {
    next(err);
  }
});

// PUT /api/schedule/:id - Ažuriraj zakazani
router.put("/:id", authenticate, async (req, res, next) => {
  try {
    const [existing] = await pool.query(
      "SELECT * FROM scheduled_workouts WHERE id = ?",
      [req.params.id],
    );
    if (existing.length === 0)
      return res.status(404).json({ error: "Zakazani trening nije pronađen" });

    if (existing[0].user_id !== req.user.id && req.user.role !== "admin") {
      return res.status(403).json({ error: "Nemate dozvolu za ovu akciju" });
    }

    const {
      category_id,
      scheduled_date,
      scheduled_time,
      title,
      notes,
      is_completed,
    } = req.body;
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

    if (updates.length === 0)
      return res.status(400).json({ error: "Nema polja za ažuriranje" });

    values.push(req.params.id);
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
      [req.params.id],
    );

    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

// PUT /api/schedule/:id/complete - Označi kao završen
router.put("/:id/complete", authenticate, async (req, res, next) => {
  try {
    const [existing] = await pool.query(
      "SELECT * FROM scheduled_workouts WHERE id = ?",
      [req.params.id],
    );
    if (existing.length === 0)
      return res.status(404).json({ error: "Zakazani trening nije pronađen" });

    if (existing[0].user_id !== req.user.id && req.user.role !== "admin") {
      return res.status(403).json({ error: "Nemate dozvolu za ovu akciju" });
    }

    await pool.query(
      "UPDATE scheduled_workouts SET is_completed = 1 WHERE id = ?",
      [req.params.id],
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
      [req.params.id],
    );

    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/schedule/:id - Obriši zakazani
router.delete("/:id", authenticate, async (req, res, next) => {
  try {
    const [existing] = await pool.query(
      "SELECT * FROM scheduled_workouts WHERE id = ?",
      [req.params.id],
    );
    if (existing.length === 0)
      return res.status(404).json({ error: "Zakazani trening nije pronađen" });

    if (existing[0].user_id !== req.user.id && req.user.role !== "admin") {
      return res.status(403).json({ error: "Nemate dozvolu za ovu akciju" });
    }

    await pool.query("DELETE FROM scheduled_workouts WHERE id = ?", [
      req.params.id,
    ]);
    res.json({ message: "Zakazani trening obrisan" });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
