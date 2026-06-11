const express = require('express');
const router = express.Router();
const pool = require('../db');

const DEAL_SELECT = `
  SELECT d.*,
    u.name AS assignee_name, u.avatar_color AS assignee_color
  FROM deals d
  LEFT JOIN users u ON d.assignee_id = u.id
`;

// GET all deals
router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query(`${DEAL_SELECT} ORDER BY d.created_at DESC`);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST create deal
router.post('/', async (req, res) => {
  try {
    const { title, company, contact_name, contact_email, contact_phone, value, stage, probability, assignee_id, notes, expected_close_date } = req.body;
    const { rows } = await pool.query(
      `INSERT INTO deals (title, company, contact_name, contact_email, contact_phone, value, stage, probability, assignee_id, notes, expected_close_date)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING id`,
      [title, company, contact_name || null, contact_email || null, contact_phone || null, value || 0, stage || 'lead', probability || 10, assignee_id || null, notes || null, expected_close_date || null]
    );
    const { rows: newDeal } = await pool.query(`${DEAL_SELECT} WHERE d.id = $1`, [rows[0].id]);
    res.json(newDeal[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT update deal
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, company, contact_name, contact_email, contact_phone, value, stage, probability, assignee_id, notes, expected_close_date } = req.body;
    await pool.query(
      `UPDATE deals SET title=$1, company=$2, contact_name=$3, contact_email=$4, contact_phone=$5, value=$6, stage=$7, probability=$8, assignee_id=$9, notes=$10, expected_close_date=$11, updated_at=NOW() WHERE id=$12`,
      [title, company, contact_name || null, contact_email || null, contact_phone || null, value || 0, stage || 'lead', probability || 10, assignee_id || null, notes || null, expected_close_date || null, id]
    );
    const { rows } = await pool.query(`${DEAL_SELECT} WHERE d.id = $1`, [id]);
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE deal
router.delete('/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM deals WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
