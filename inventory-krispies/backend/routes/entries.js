const express = require('express');
const router = express.Router();
const db = require('../db');

// GET /api/entries?session_id=X
router.get('/', (req, res) => {
  const { session_id } = req.query;
  if (!session_id) return res.status(400).json({ error: 'session_id is required' });
  const entries = db.prepare(
    'SELECT * FROM dispatch_entries WHERE session_id = ? ORDER BY created_at DESC'
  ).all(session_id);
  res.json(entries);
});

// POST /api/entries
router.post('/', (req, res) => {
  const { session_id, item_id, item_name, qty, unit, destination, note } = req.body;
  if (!session_id || !item_name || qty == null) {
    return res.status(400).json({ error: 'session_id, item_name, qty are required' });
  }
  const session = db.prepare('SELECT * FROM dispatch_sessions WHERE id = ?').get(session_id);
  if (!session) return res.status(404).json({ error: 'Session not found' });
  if (session.locked) return res.status(403).json({ error: 'Session is locked' });

  const result = db.prepare(
    'INSERT INTO dispatch_entries (session_id, item_id, item_name, qty, unit, destination, note) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).run(session_id, item_id || null, item_name, qty, unit || null, destination || null, note || null);
  const entry = db.prepare('SELECT * FROM dispatch_entries WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(entry);
});

// PUT /api/entries/:id
router.put('/:id', (req, res) => {
  const entry = db.prepare('SELECT * FROM dispatch_entries WHERE id = ?').get(req.params.id);
  if (!entry) return res.status(404).json({ error: 'Entry not found' });
  const session = db.prepare('SELECT * FROM dispatch_sessions WHERE id = ?').get(entry.session_id);
  if (session && session.locked) return res.status(403).json({ error: 'Session is locked' });

  const { item_name, qty, unit, destination, note } = req.body;
  db.prepare(
    'UPDATE dispatch_entries SET item_name = ?, qty = ?, unit = ?, destination = ?, note = ? WHERE id = ?'
  ).run(
    item_name ?? entry.item_name,
    qty ?? entry.qty,
    unit ?? entry.unit,
    destination ?? entry.destination,
    note ?? entry.note,
    req.params.id
  );
  const updated = db.prepare('SELECT * FROM dispatch_entries WHERE id = ?').get(req.params.id);
  res.json(updated);
});

// DELETE /api/entries/:id
router.delete('/:id', (req, res) => {
  const entry = db.prepare('SELECT * FROM dispatch_entries WHERE id = ?').get(req.params.id);
  if (!entry) return res.status(404).json({ error: 'Entry not found' });
  const session = db.prepare('SELECT * FROM dispatch_sessions WHERE id = ?').get(entry.session_id);
  if (session && session.locked) return res.status(403).json({ error: 'Session is locked' });
  db.prepare('DELETE FROM dispatch_entries WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// GET /api/destinations
router.get('/destinations', (req, res) => {
  const dests = db.prepare('SELECT * FROM destinations ORDER BY name').all();
  res.json(dests);
});

// POST /api/destinations
router.post('/destinations', (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'name is required' });
  const result = db.prepare('INSERT INTO destinations (name) VALUES (?)').run(name);
  const dest = db.prepare('SELECT * FROM destinations WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(dest);
});

// DELETE /api/destinations/:id
router.delete('/destinations/:id', (req, res) => {
  const dest = db.prepare('SELECT * FROM destinations WHERE id = ?').get(req.params.id);
  if (!dest) return res.status(404).json({ error: 'Destination not found' });
  db.prepare('DELETE FROM destinations WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

module.exports = router;
