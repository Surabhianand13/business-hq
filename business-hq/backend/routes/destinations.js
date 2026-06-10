const express = require('express');
const router = express.Router();
const { query } = require('../db');

router.get('/', async (req, res) => {
  try {
    const { rows } = await query('SELECT * FROM destinations ORDER BY name');
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/', async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'name is required' });
    const { rows } = await query('INSERT INTO destinations (name) VALUES ($1) RETURNING *', [name]);
    res.status(201).json(rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete('/:id', async (req, res) => {
  try {
    await query('DELETE FROM destinations WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
