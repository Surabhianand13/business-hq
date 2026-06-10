const express = require('express');
const router = express.Router();
const { query } = require('../db');

router.get('/', async (req, res) => {
  try {
    const { session_id } = req.query;
    if (!session_id) return res.status(400).json({ error: 'session_id is required' });
    const { rows } = await query(
      'SELECT * FROM dispatch_entries WHERE session_id=$1 ORDER BY created_at DESC',
      [session_id]
    );
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/', async (req, res) => {
  try {
    const { session_id, item_id, item_name, qty, unit, destination, note } = req.body;
    if (!session_id || !item_name || qty == null)
      return res.status(400).json({ error: 'session_id, item_name, qty are required' });
    const { rows: sess } = await query('SELECT * FROM dispatch_sessions WHERE id=$1', [session_id]);
    if (!sess.length) return res.status(404).json({ error: 'Session not found' });
    if (sess[0].locked) return res.status(403).json({ error: 'Session is locked' });

    // Auto-lookup price for stores that have a price list
    let unit_price = null;
    if (destination) {
      const { rows: priceRows } = await query(
        `SELECT price FROM store_prices
         WHERE store_name = $1 AND LOWER(item_name) = LOWER($2) LIMIT 1`,
        [destination, item_name]
      );
      if (priceRows.length) {
        unit_price = priceRows[0].price;
      } else {
        // Fuzzy match — check if item_name contains or is contained in the price list name
        const { rows: fuzzy } = await query(
          `SELECT price, item_name FROM store_prices
           WHERE store_name = $1 AND (LOWER($2) LIKE '%' || LOWER(item_name) || '%' OR LOWER(item_name) LIKE '%' || LOWER($2) || '%')
           ORDER BY LENGTH(item_name) DESC LIMIT 1`,
          [destination, item_name]
        );
        if (fuzzy.length) unit_price = fuzzy[0].price;
      }
    }

    const { rows } = await query(
      'INSERT INTO dispatch_entries (session_id, item_id, item_name, qty, unit, destination, note, unit_price) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *',
      [session_id, item_id || null, item_name, qty, unit || null, destination || null, note || null, unit_price]
    );
    res.status(201).json(rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put('/:id', async (req, res) => {
  try {
    const { rows: existing } = await query('SELECT * FROM dispatch_entries WHERE id=$1', [req.params.id]);
    if (!existing.length) return res.status(404).json({ error: 'Entry not found' });
    const { rows: sess } = await query('SELECT * FROM dispatch_sessions WHERE id=$1', [existing[0].session_id]);
    if (sess[0]?.locked) return res.status(403).json({ error: 'Session is locked' });
    const e = existing[0];
    const { item_name, qty, unit, destination, note } = req.body;
    const { rows } = await query(
      'UPDATE dispatch_entries SET item_name=$1, qty=$2, unit=$3, destination=$4, note=$5 WHERE id=$6 RETURNING *',
      [item_name ?? e.item_name, qty ?? e.qty, unit ?? e.unit, destination ?? e.destination, note ?? e.note, req.params.id]
    );
    res.json(rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete('/:id', async (req, res) => {
  try {
    const { rows: existing } = await query('SELECT * FROM dispatch_entries WHERE id=$1', [req.params.id]);
    if (!existing.length) return res.status(404).json({ error: 'Entry not found' });
    const { rows: sess } = await query('SELECT * FROM dispatch_sessions WHERE id=$1', [existing[0].session_id]);
    if (sess[0]?.locked) return res.status(403).json({ error: 'Session is locked' });
    await query('DELETE FROM dispatch_entries WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
