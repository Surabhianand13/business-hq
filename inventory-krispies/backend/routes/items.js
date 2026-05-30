const express = require('express');
const router = express.Router();
const { query } = require('../db');

router.get('/', async (req, res) => {
  try {
    const { rows } = await query('SELECT * FROM items ORDER BY category, name');
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/', async (req, res) => {
  try {
    const { name, default_qty, default_unit, category } = req.body;
    if (!name) return res.status(400).json({ error: 'name is required' });
    const { rows } = await query(
      'INSERT INTO items (name, default_qty, default_unit, category) VALUES ($1, $2, $3, $4) RETURNING *',
      [name, default_qty || 1, default_unit || 'pcs', category || '']
    );
    res.status(201).json(rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put('/:id', async (req, res) => {
  try {
    const { name, default_qty, default_unit, category } = req.body;
    const { rows } = await query(
      'UPDATE items SET name=$1, default_qty=$2, default_unit=$3, category=$4 WHERE id=$5 RETURNING *',
      [name, default_qty, default_unit, category, req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Item not found' });
    res.json(rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete('/:id', async (req, res) => {
  try {
    await query('DELETE FROM items WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
