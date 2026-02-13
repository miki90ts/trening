const express = require('express');
const router = express.Router();
const pool = require('../db/connection');
const { authenticate, authorize } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '../../uploads/exercises')),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `exercise-${Date.now()}${ext}`);
  }
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

// GET /api/exercises - Get all exercises with categories
router.get('/', async (req, res, next) => {
  try {
    const [exercises] = await pool.query('SELECT * FROM exercises ORDER BY name');
    const [categories] = await pool.query('SELECT * FROM categories ORDER BY exercise_id, name');
    
    const result = exercises.map(ex => ({
      ...ex,
      categories: categories.filter(cat => cat.exercise_id === ex.id)
    }));
    res.json(result);
  } catch (err) { next(err); }
});

// GET /api/exercises/:id
router.get('/:id', async (req, res, next) => {
  try {
    const [rows] = await pool.query('SELECT * FROM exercises WHERE id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Exercise not found' });
    const [categories] = await pool.query('SELECT * FROM categories WHERE exercise_id = ?', [req.params.id]);
    res.json({ ...rows[0], categories });
  } catch (err) { next(err); }
});

// POST /api/exercises - Admin only
router.post('/', authenticate, authorize('admin'), upload.single('image'), async (req, res, next) => {
  try {
    const { name, description, icon } = req.body;
    if (!name) return res.status(400).json({ error: 'name is required' });
    const image_url = req.file ? `/uploads/exercises/${req.file.filename}` : null;
    const [result] = await pool.query(
      'INSERT INTO exercises (name, description, image_url, icon) VALUES (?, ?, ?, ?)',
      [name, description || null, image_url, icon || '💪']
    );
    const [exercise] = await pool.query('SELECT * FROM exercises WHERE id = ?', [result.insertId]);
    res.status(201).json(exercise[0]);
  } catch (err) { next(err); }
});

// PUT /api/exercises/:id - Admin only
router.put('/:id', authenticate, authorize('admin'), upload.single('image'), async (req, res, next) => {
  try {
    const { name, description, icon } = req.body;
    const updates = [];
    const values = [];

    if (name) { updates.push('name = ?'); values.push(name); }
    if (description !== undefined) { updates.push('description = ?'); values.push(description); }
    if (icon) { updates.push('icon = ?'); values.push(icon); }
    if (req.file) { updates.push('image_url = ?'); values.push(`/uploads/exercises/${req.file.filename}`); }

    if (updates.length === 0) return res.status(400).json({ error: 'No fields to update' });

    values.push(req.params.id);
    await pool.query(`UPDATE exercises SET ${updates.join(', ')} WHERE id = ?`, values);
    const [exercise] = await pool.query('SELECT * FROM exercises WHERE id = ?', [req.params.id]);
    res.json(exercise[0]);
  } catch (err) { next(err); }
});

// DELETE /api/exercises/:id - Admin only
router.delete('/:id', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    const [result] = await pool.query('DELETE FROM exercises WHERE id = ?', [req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Exercise not found' });
    res.json({ message: 'Exercise deleted' });
  } catch (err) { next(err); }
});

module.exports = router;
