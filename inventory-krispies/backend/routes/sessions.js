const express = require('express');
const router = express.Router();
const db = require('../db');

// GET /api/sessions/today
router.get('/today', (req, res) => {
  const today = new Date().toISOString().split('T')[0];
  let session = db.prepare('SELECT * FROM dispatch_sessions WHERE session_date = ?').get(today);
  if (!session) {
    const supervisor = req.query.supervisor || 'Unknown';
    const result = db.prepare(
      'INSERT INTO dispatch_sessions (session_date, supervisor_name) VALUES (?, ?)'
    ).run(today, supervisor);
    session = db.prepare('SELECT * FROM dispatch_sessions WHERE id = ?').get(result.lastInsertRowid);
  }
  const entryCount = db.prepare('SELECT COUNT(*) as cnt FROM dispatch_entries WHERE session_id = ?').get(session.id);
  res.json({ ...session, entry_count: entryCount.cnt });
});

// GET /api/sessions
router.get('/', (req, res) => {
  const sessions = db.prepare('SELECT * FROM dispatch_sessions ORDER BY session_date DESC, created_at DESC').all();
  const result = sessions.map(s => {
    const entryCount = db.prepare('SELECT COUNT(*) as cnt FROM dispatch_entries WHERE session_id = ?').get(s.id);
    return { ...s, entry_count: entryCount.cnt };
  });
  res.json(result);
});

// POST /api/sessions/:id/lock
router.post('/:id/lock', (req, res) => {
  const session = db.prepare('SELECT * FROM dispatch_sessions WHERE id = ?').get(req.params.id);
  if (!session) return res.status(404).json({ error: 'Session not found' });
  db.prepare('UPDATE dispatch_sessions SET locked = 1 WHERE id = ?').run(req.params.id);
  const updated = db.prepare('SELECT * FROM dispatch_sessions WHERE id = ?').get(req.params.id);
  res.json(updated);
});

// GET /api/sessions/:id/export
router.get('/:id/export', (req, res) => {
  const session = db.prepare('SELECT * FROM dispatch_sessions WHERE id = ?').get(req.params.id);
  if (!session) return res.status(404).json({ error: 'Session not found' });
  const entries = db.prepare(
    'SELECT * FROM dispatch_entries WHERE session_id = ? ORDER BY created_at ASC'
  ).all(req.params.id);

  const lines = ['Item Name,Quantity,Unit,Destination,Note,Time Added'];
  for (const e of entries) {
    const row = [
      `"${(e.item_name || '').replace(/"/g, '""')}"`,
      e.qty,
      `"${(e.unit || '').replace(/"/g, '""')}"`,
      `"${(e.destination || '').replace(/"/g, '""')}"`,
      `"${(e.note || '').replace(/"/g, '""')}"`,
      `"${e.created_at}"`,
    ];
    lines.push(row.join(','));
  }

  const filename = `dispatch-${session.session_date}.csv`;
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(lines.join('\n'));
});

module.exports = router;
