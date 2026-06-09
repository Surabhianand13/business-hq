const express = require('express');
const router = express.Router();
const { query } = require('../db');

// GET /api/items
router.get('/', async (req, res) => {
  try {
    const { rows } = await query('SELECT * FROM items ORDER BY category, name');
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/items/barcode/:code — look up item by barcode
router.get('/barcode/:code', async (req, res) => {
  try {
    const { rows } = await query('SELECT * FROM items WHERE barcode=$1 LIMIT 1', [req.params.code]);
    if (!rows.length) return res.status(404).json({ error: 'No item found for this barcode' });
    res.json(rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/items
router.post('/', async (req, res) => {
  try {
    const { name, default_qty, default_unit, category, barcode } = req.body;
    if (!name) return res.status(400).json({ error: 'name is required' });
    const { rows } = await query(
      'INSERT INTO items (name, default_qty, default_unit, category, barcode) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [name, default_qty || 1, default_unit || 'pcs', category || '', barcode || null]
    );
    res.status(201).json(rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// PUT /api/items/:id
router.put('/:id', async (req, res) => {
  try {
    const { name, default_qty, default_unit, category, barcode } = req.body;
    const { rows } = await query(
      'UPDATE items SET name=$1, default_qty=$2, default_unit=$3, category=$4, barcode=$5 WHERE id=$6 RETURNING *',
      [name, default_qty, default_unit, category, barcode || null, req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Item not found' });
    res.json(rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/items/bulk — insert multiple items from CSV upload
router.post('/bulk', async (req, res) => {
  try {
    const { items } = req.body;
    if (!Array.isArray(items) || items.length === 0)
      return res.status(400).json({ error: 'items array is required' });

    let inserted = 0;
    let skipped = 0;
    const errors = [];

    for (const item of items) {
      const name = (item.name || '').trim();
      if (!name) { skipped++; continue; }
      try {
        await query(
          'INSERT INTO items (name, default_qty, default_unit, category, barcode) VALUES ($1, $2, $3, $4, $5)',
          [name, parseFloat(item.default_qty) || 1, item.default_unit || 'pcs', item.category || '', item.barcode || null]
        );
        inserted++;
      } catch (e) {
        errors.push(`"${name}": ${e.message}`);
      }
    }

    res.json({ inserted, skipped, errors });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// DELETE /api/items/:id
router.delete('/:id', async (req, res) => {
  try {
    await query('DELETE FROM items WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
