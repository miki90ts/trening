const express = require('express');
const router = express.Router();
const pool = require('../db/connection');
const { authenticate, authorize } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');

// Multer config for profile images
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '../../uploads/users')),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `user-${Date.now()}${ext}`);
  }
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

// GET /api/users - Get all users
router.get('/', async (req, res, next) => {
  try {
    const [rows] = await pool.query('SELECT id, first_name, last_name, nickname, email, role, is_approved, profile_image, created_at, updated_at FROM users WHERE is_approved = 1 ORDER BY first_name');
    res.json(rows);
  } catch (err) { next(err); }
});

// GET /api/users/:id - Get single user
router.get('/:id', async (req, res, next) => {
  try {
    const [rows] = await pool.query('SELECT id, first_name, last_name, nickname, email, role, is_approved, profile_image, created_at, updated_at FROM users WHERE id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'User not found' });
    res.json(rows[0]);
  } catch (err) { next(err); }
});

// POST /api/users - Create user (Admin only - korisnici se registruju kroz /api/auth/register)
router.post('/', authenticate, authorize('admin'), upload.single('profile_image'), async (req, res, next) => {
  try {
    const { first_name, last_name, nickname } = req.body;
    if (!first_name) return res.status(400).json({ error: 'first_name is required' });
    const profile_image = req.file ? `/uploads/users/${req.file.filename}` : null;
    const [result] = await pool.query(
      'INSERT INTO users (first_name, last_name, nickname, profile_image) VALUES (?, ?, ?, ?)',
      [first_name, last_name || null, nickname || null, profile_image]
    );
    const [user] = await pool.query('SELECT * FROM users WHERE id = ?', [result.insertId]);
    res.status(201).json(user[0]);
  } catch (err) { next(err); }
});

// PUT /api/users/:id - Update user (samo svoj profil ili admin)
router.put('/:id', authenticate, upload.single('profile_image'), async (req, res, next) => {
  try {
    // Korisnik može da menja samo svoj profil, admin može sve
    if (parseInt(req.params.id) !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Nemate dozvolu za ovu akciju.' });
    }
    const { first_name, last_name, nickname } = req.body;
    const updates = [];
    const values = [];

    if (first_name) { updates.push('first_name = ?'); values.push(first_name); }
    if (last_name !== undefined) { updates.push('last_name = ?'); values.push(last_name || null); }
    if (nickname !== undefined) { updates.push('nickname = ?'); values.push(nickname || null); }
    if (req.file) { updates.push('profile_image = ?'); values.push(`/uploads/users/${req.file.filename}`); }

    if (updates.length === 0) return res.status(400).json({ error: 'No fields to update' });

    values.push(req.params.id);
    await pool.query(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, values);
    const [user] = await pool.query('SELECT * FROM users WHERE id = ?', [req.params.id]);
    res.json(user[0]);
  } catch (err) { next(err); }
});

// DELETE /api/users/:id - Delete user (Admin only)
router.delete('/:id', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    const [result] = await pool.query('DELETE FROM users WHERE id = ?', [req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'User not found' });
    res.json({ message: 'User deleted' });
  } catch (err) { next(err); }
});

// GET /api/users/:id/records - Get user's best workout per category
router.get('/:id/records', async (req, res, next) => {
  try {
    const [rows] = await pool.query(`
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
    `, [req.params.id]);
    res.json(rows);
  } catch (err) { next(err); }
});

module.exports = router;
