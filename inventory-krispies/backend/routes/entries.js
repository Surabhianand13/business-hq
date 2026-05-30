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
    const { rows } = await query(
      'INSERT INTO dispatch_entries (session_id, item_id, item_name, qty, unit, destination, note) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *',
      [session_id, item_id || null, item_name, qty, unit || null, destination || null, note || null]
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
