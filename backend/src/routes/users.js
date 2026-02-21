const express = require("express");
const router = express.Router();
const pool = require("../db/connection");
const bcrypt = require("bcryptjs");
const { authenticate, authorize, optionalAuth } = require("../middleware/auth");
const multer = require("multer");
const path = require("path");

const BCRYPT_ROUNDS = 12;

// Multer config for profile images
const storage = multer.diskStorage({
  destination: (req, file, cb) =>
    cb(null, path.join(__dirname, "../../uploads/users")),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `user-${Date.now()}${ext}`);
  },
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

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

// GET /api/users - Get all users
router.get("/", optionalAuth, async (req, res, next) => {
  try {
    const { q = "", role = "", page, pageSize } = req.query;

    const filters = ["is_approved = 1"];
    const values = [];

    const isAdmin = req.user?.role === "admin";
    if (!isAdmin) {
      if (req.user?.id) {
        filters.push("(show_in_users_list = 1 OR id = ?)");
        values.push(req.user.id);
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
      `SELECT id, first_name, last_name, nickname, email, role, is_approved, show_in_users_list, profile_image, created_at, updated_at
       FROM users
       ${whereSql}
       ORDER BY first_name ASC, last_name ASC`,
      values,
    );

    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// GET /api/users/:id - Get single user
router.get("/:id", optionalAuth, async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      "SELECT id, first_name, last_name, nickname, email, role, is_approved, show_in_users_list, profile_image, created_at, updated_at FROM users WHERE id = ?",
      [req.params.id],
    );
    if (rows.length === 0)
      return res.status(404).json({ error: "User not found" });

    const targetUser = rows[0];
    const isSelf = req.user && parseInt(req.params.id, 10) === req.user.id;
    const isAdmin = req.user?.role === "admin";
    if (!isAdmin && !isSelf && !targetUser.show_in_users_list) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

// POST /api/users - Create user (Admin only - korisnici se registruju kroz /api/auth/register)
router.post(
  "/",
  authenticate,
  authorize("admin"),
  upload.single("profile_image"),
  async (req, res, next) => {
    try {
      const {
        first_name,
        last_name,
        nickname,
        email,
        password,
        role = "user",
        show_in_users_list,
      } = req.body;

      if (!first_name)
        return res.status(400).json({ error: "first_name is required" });

      if (!email || !password) {
        return res.status(400).json({ error: "email i password su obavezni" });
      }

      if (!["user", "admin"].includes(role)) {
        return res.status(400).json({ error: "Nevalidna rola" });
      }

      const [existing] = await pool.query(
        "SELECT id FROM users WHERE email = ?",
        [String(email).toLowerCase()],
      );
      if (existing.length > 0) {
        return res.status(409).json({ error: "Email već postoji" });
      }

      const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

      const profile_image = req.file
        ? `/uploads/users/${req.file.filename}`
        : null;
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
      res.status(201).json(sanitizeUser(user[0]));
    } catch (err) {
      next(err);
    }
  },
);

// PUT /api/users/:id - Update user (samo svoj profil ili admin)
router.put(
  "/:id",
  authenticate,
  upload.single("profile_image"),
  async (req, res, next) => {
    try {
      // Korisnik može da menja samo svoj profil, admin može sve
      if (
        parseInt(req.params.id) !== req.user.id &&
        req.user.role !== "admin"
      ) {
        return res.status(403).json({ error: "Nemate dozvolu za ovu akciju." });
      }
      const { first_name, last_name, nickname } = req.body;
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
      if (req.body.show_in_users_list !== undefined) {
        updates.push("show_in_users_list = ?");
        values.push(toBoolean(req.body.show_in_users_list) ? 1 : 0);
      }

      if (req.body.email !== undefined) {
        if (req.user.role !== "admin") {
          return res
            .status(403)
            .json({ error: "Samo admin može menjati email." });
        }
        updates.push("email = ?");
        values.push(String(req.body.email).toLowerCase());
      }

      if (req.body.role !== undefined) {
        if (req.user.role !== "admin") {
          return res
            .status(403)
            .json({ error: "Samo admin može menjati rolu." });
        }
        if (!["user", "admin"].includes(req.body.role)) {
          return res.status(400).json({ error: "Nevalidna rola." });
        }
        if (
          parseInt(req.params.id, 10) === req.user.id &&
          req.body.role !== "admin"
        ) {
          return res
            .status(400)
            .json({ error: "Ne možete sami sebi ukloniti admin prava." });
        }
        updates.push("role = ?");
        values.push(req.body.role);
      }

      if (req.body.password !== undefined) {
        if (req.user.role !== "admin") {
          return res
            .status(403)
            .json({ error: "Samo admin može menjati lozinku ovde." });
        }
        const passwordHash = await bcrypt.hash(
          req.body.password,
          BCRYPT_ROUNDS,
        );
        updates.push("password_hash = ?");
        values.push(passwordHash);
      }

      if (req.body.is_approved !== undefined) {
        if (req.user.role !== "admin") {
          return res
            .status(403)
            .json({ error: "Samo admin može menjati approval status." });
        }
        updates.push("is_approved = ?");
        values.push(toBoolean(req.body.is_approved) ? 1 : 0);
      }
      if (req.file) {
        updates.push("profile_image = ?");
        values.push(`/uploads/users/${req.file.filename}`);
      }

      if (updates.length === 0)
        return res.status(400).json({ error: "No fields to update" });

      values.push(req.params.id);
      await pool.query(
        `UPDATE users SET ${updates.join(", ")} WHERE id = ?`,
        values,
      );
      const [user] = await pool.query("SELECT * FROM users WHERE id = ?", [
        req.params.id,
      ]);
      res.json(sanitizeUser(user[0]));
    } catch (err) {
      next(err);
    }
  },
);

// DELETE /api/users/:id - Delete user (Admin only)
router.delete(
  "/:id",
  authenticate,
  authorize("admin"),
  async (req, res, next) => {
    try {
      const [result] = await pool.query("DELETE FROM users WHERE id = ?", [
        req.params.id,
      ]);
      if (result.affectedRows === 0)
        return res.status(404).json({ error: "User not found" });
      res.json({ message: "User deleted" });
    } catch (err) {
      next(err);
    }
  },
);

// GET /api/users/:id/records - Get user's best workout per category
router.get("/:id/records", async (req, res, next) => {
  try {
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
      [req.params.id],
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
