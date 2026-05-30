const express = require('express');
const router = express.Router();
const db = require('../db');

// GET /api/items
router.get('/', (req, res) => {
  const items = db.prepare('SELECT * FROM items ORDER BY category, name').all();
  res.json(items);
});

// POST /api/items
router.post('/', (req, res) => {
  const { name, default_qty, default_unit, category } = req.body;
  if (!name) return res.status(400).json({ error: 'name is required' });
  const result = db.prepare(
    'INSERT INTO items (name, default_qty, default_unit, category) VALUES (?, ?, ?, ?)'
  ).run(name, default_qty || null, default_unit || null, category || null);
  const item = db.prepare('SELECT * FROM items WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(item);
});

// PUT /api/items/:id
router.put('/:id', (req, res) => {
  const { name, default_qty, default_unit, category } = req.body;
  const item = db.prepare('SELECT * FROM items WHERE id = ?').get(req.params.id);
  if (!item) return res.status(404).json({ error: 'Item not found' });
  db.prepare(
    'UPDATE items SET name = ?, default_qty = ?, default_unit = ?, category = ? WHERE id = ?'
  ).run(
    name ?? item.name,
    default_qty ?? item.default_qty,
    default_unit ?? item.default_unit,
    category ?? item.category,
    req.params.id
  );
  const updated = db.prepare('SELECT * FROM items WHERE id = ?').get(req.params.id);
  res.json(updated);
});

// DELETE /api/items/:id
router.delete('/:id', (req, res) => {
  const item = db.prepare('SELECT * FROM items WHERE id = ?').get(req.params.id);
  if (!item) return res.status(404).json({ error: 'Item not found' });
  db.prepare('DELETE FROM items WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

module.exports = router;
