const express = require('express');
const router = express.Router();
const db = require('../db');

router.get('/', (req, res) => {
  const dests = db.prepare('SELECT * FROM destinations ORDER BY name').all();
  res.json(dests);
});

router.post('/', (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'name is required' });
  const result = db.prepare('INSERT INTO destinations (name) VALUES (?)').run(name);
  const dest = db.prepare('SELECT * FROM destinations WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(dest);
});

router.delete('/:id', (req, res) => {
  const dest = db.prepare('SELECT * FROM destinations WHERE id = ?').get(req.params.id);
  if (!dest) return res.status(404).json({ error: 'Destination not found' });
  db.prepare('DELETE FROM destinations WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

module.exports = router;
