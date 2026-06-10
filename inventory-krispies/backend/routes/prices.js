const express = require('express');
const router = express.Router();
const { query } = require('../db');

// GET /api/prices/:store
router.get('/:store', async (req, res) => {
  try {
    const { rows } = await query(
      'SELECT * FROM store_prices WHERE store_name=$1 ORDER BY item_name',
      [req.params.store]
    );
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/prices/:store — upsert a price
router.post('/:store', async (req, res) => {
  try {
    const { item_name, price } = req.body;
    if (!item_name || price == null) return res.status(400).json({ error: 'item_name and price required' });
    // Upsert
    await query(
      `INSERT INTO store_prices (store_name, item_name, price) VALUES ($1, $2, $3)
       ON CONFLICT DO NOTHING`,
      [req.params.store, item_name, price]
    );
    await query(
      `UPDATE store_prices SET price=$3 WHERE store_name=$1 AND LOWER(item_name)=LOWER($2)`,
      [req.params.store, item_name, price]
    );
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// DELETE /api/prices/:store/:id
router.delete('/:store/:id', async (req, res) => {
  try {
    await query('DELETE FROM store_prices WHERE id=$1 AND store_name=$2', [req.params.id, req.params.store]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
