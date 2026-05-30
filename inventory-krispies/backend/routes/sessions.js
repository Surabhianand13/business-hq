const express = require('express');
const router = express.Router();
const { https } = require('follow-redirects');
const { query } = require('../db');

const SHEETS_WEBHOOK = 'https://script.google.com/macros/s/AKfycbzAy4Z2EARiXjAhQ_bn5SeDK4z5t3X4CoPazVpcDopyMhFSJwIWFAZANjFjUq5XAyR7/exec';

function postToSheets(rows) {
  return new Promise((resolve) => {
    const body = JSON.stringify(rows);
    const url = new URL(SHEETS_WEBHOOK);
    const req = https.request({
      hostname: url.hostname, path: url.pathname + url.search,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
      maxRedirects: 10,
    }, (res) => {
      let d = ''; res.on('data', c => d += c);
      res.on('end', () => { console.log('Sheets:', res.statusCode, d.slice(0, 100)); resolve({ ok: true }); });
    });
    req.on('error', (err) => { console.error('Sheets error:', err.message); resolve({ ok: false }); });
    req.write(body); req.end();
  });
}

// GET /api/sessions/today
router.get('/today', async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const supervisor = req.query.supervisor || 'Unknown';
    let { rows } = await query(
      'SELECT * FROM dispatch_sessions WHERE session_date=$1 AND locked=0 ORDER BY created_at DESC LIMIT 1',
      [today]
    );
    let session = rows[0];
    if (!session) {
      const ins = await query(
        'INSERT INTO dispatch_sessions (session_date, supervisor_name) VALUES ($1, $2) RETURNING *',
        [today, supervisor]
      );
      session = ins.rows[0];
    }
    const cnt = await query('SELECT COUNT(*) as cnt FROM dispatch_entries WHERE session_id=$1', [session.id]);
    res.json({ ...session, entry_count: parseInt(cnt.rows[0].cnt) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/sessions/new
router.post('/new', async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const supervisor = req.body.supervisor || 'Unknown';
    const { rows } = await query(
      'INSERT INTO dispatch_sessions (session_date, supervisor_name) VALUES ($1, $2) RETURNING *',
      [today, supervisor]
    );
    res.status(201).json({ ...rows[0], entry_count: 0 });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/sessions
router.get('/', async (req, res) => {
  try {
    const { rows: sessions } = await query('SELECT * FROM dispatch_sessions ORDER BY created_at DESC');
    const result = await Promise.all(sessions.map(async s => {
      const cnt = await query('SELECT COUNT(*) as cnt FROM dispatch_entries WHERE session_id=$1', [s.id]);
      return { ...s, entry_count: parseInt(cnt.rows[0].cnt) };
    }));
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/sessions/:id/lock
router.post('/:id/lock', async (req, res) => {
  try {
    const { rows } = await query('SELECT * FROM dispatch_sessions WHERE id=$1', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Session not found' });
    if (rows[0].locked) return res.json(rows[0]);

    await query('UPDATE dispatch_sessions SET locked=1 WHERE id=$1', [req.params.id]);

    const { rows: entries } = await query(
      'SELECT * FROM dispatch_entries WHERE session_id=$1 ORDER BY created_at ASC',
      [req.params.id]
    );
    const now = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
    const sheetRows = entries.map(e => ({
      submitted_at: now,
      date: rows[0].session_date,
      supervisor: rows[0].supervisor_name,
      item_name: e.item_name,
      qty: e.qty,
      unit: e.unit || '',
      destination: e.destination || '',
      note: e.note || '',
      session_id: rows[0].id,
    }));
    if (sheetRows.length > 0) postToSheets(sheetRows);

    const updated = await query('SELECT * FROM dispatch_sessions WHERE id=$1', [req.params.id]);
    res.json(updated.rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/sessions/:id/export
router.get('/:id/export', async (req, res) => {
  try {
    const { rows: sess } = await query('SELECT * FROM dispatch_sessions WHERE id=$1', [req.params.id]);
    if (!sess.length) return res.status(404).json({ error: 'Session not found' });
    const { rows: entries } = await query(
      'SELECT * FROM dispatch_entries WHERE session_id=$1 ORDER BY created_at ASC',
      [req.params.id]
    );
    const lines = ['Item Name,Quantity,Unit,Destination,Note,Time Added'];
    for (const e of entries) {
      lines.push([
        `"${(e.item_name || '').replace(/"/g, '""')}"`,
        e.qty,
        `"${(e.unit || '').replace(/"/g, '""')}"`,
        `"${(e.destination || '').replace(/"/g, '""')}"`,
        `"${(e.note || '').replace(/"/g, '""')}"`,
        `"${e.created_at}"`,
      ].join(','));
    }
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="dispatch-${sess[0].session_date}-${sess[0].id}.csv"`);
    res.send(lines.join('\n'));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
