const express = require('express');
const router = express.Router();
const pool = require('../db/connection');
const { authenticate, authorize } = require('../middleware/auth');

// GET /api/categories
router.get('/', async (req, res, next) => {
  try {
    const { exercise_id } = req.query;
    let query = `
      SELECT c.*, e.name as exercise_name, e.icon as exercise_icon 
      FROM categories c 
      JOIN exercises e ON c.exercise_id = e.id
    `;
    const values = [];
    if (exercise_id) {
      query += ' WHERE c.exercise_id = ?';
      values.push(exercise_id);
    }
    query += ' ORDER BY e.name, c.name';
    const [rows] = await pool.query(query, values);
    res.json(rows);
  } catch (err) { next(err); }
});

// GET /api/categories/:id
router.get('/:id', async (req, res, next) => {
  try {
    const [rows] = await pool.query(`
      SELECT c.*, e.name as exercise_name, e.icon as exercise_icon 
      FROM categories c 
      JOIN exercises e ON c.exercise_id = e.id 
      WHERE c.id = ?
    `, [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Category not found' });
    res.json(rows[0]);
  } catch (err) { next(err); }
});

// POST /api/categories - Admin only
router.post('/', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    const { exercise_id, name, value_type, has_weight, description } = req.body;
    if (!exercise_id || !name) return res.status(400).json({ error: 'exercise_id and name are required' });
    
    const [result] = await pool.query(
      'INSERT INTO categories (exercise_id, name, value_type, has_weight, description) VALUES (?, ?, ?, ?, ?)',
      [exercise_id, name, value_type || 'reps', has_weight ? 1 : 0, description || null]
    );
    const [cat] = await pool.query('SELECT * FROM categories WHERE id = ?', [result.insertId]);
    res.status(201).json(cat[0]);
  } catch (err) { next(err); }
});

// PUT /api/categories/:id - Admin only
router.put('/:id', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    const { name, value_type, has_weight, description } = req.body;
    const updates = [];
    const values = [];

    if (name) { updates.push('name = ?'); values.push(name); }
    if (value_type) { updates.push('value_type = ?'); values.push(value_type); }
    if (has_weight !== undefined) { updates.push('has_weight = ?'); values.push(has_weight ? 1 : 0); }
    if (description !== undefined) { updates.push('description = ?'); values.push(description); }

    if (updates.length === 0) return res.status(400).json({ error: 'No fields to update' });

    values.push(req.params.id);
    await pool.query(`UPDATE categories SET ${updates.join(', ')} WHERE id = ?`, values);
    const [cat] = await pool.query('SELECT * FROM categories WHERE id = ?', [req.params.id]);
    res.json(cat[0]);
  } catch (err) { next(err); }
});

// DELETE /api/categories/:id - Admin only
router.delete('/:id', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    const [result] = await pool.query('DELETE FROM categories WHERE id = ?', [req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Category not found' });
    res.json({ message: 'Category deleted' });
  } catch (err) { next(err); }
});

module.exports = router;
