const express = require('express');
const router = express.Router();
const pool = require('../db');

// Daily store checklist — crucial items, ordered open → operate → close
const COMPLIANCE_ITEMS = [
  // Opening
  { key: 'login',          label: 'Employee Login Marked',          emoji: '🟢' },
  { key: 'grooming',       label: 'Gloves, Hair Cap, T-shirt Check', emoji: '🧤' },
  { key: 'opening_photo',  label: 'Opening Photo on WhatsApp',       emoji: '📸' },
  { key: 'cleanliness',    label: 'Store Cleanliness & Hygiene',     emoji: '🧹' },
  // Online
  { key: 'aggregators',    label: 'Swiggy/Zomato Menu Update',       emoji: '🛵' },
  // Cash & Billing
  { key: 'billing',        label: 'Billing / POS Working',           emoji: '🧾' },
  { key: 'complaints',     label: 'Customer Complaints (Online & Offline)', emoji: '💬' },
  { key: 'cash',           label: 'Cash Updates / Reconciliation',   emoji: '💵' },
  // Closing
  { key: 'closing_report', label: 'Closing Report Posted',           emoji: '📊' },
];

router.get('/items', (req, res) => res.json(COMPLIANCE_ITEMS));

// Stores
router.get('/stores', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM krispies_stores ORDER BY name');
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Sales — all sales with store names, optionally filtered by date
router.get('/sales', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT s.*, st.name AS store_name, st.location, st.manager
      FROM krispies_sales s
      JOIN krispies_stores st ON s.store_id = st.id
      ORDER BY s.sale_date DESC, st.name
    `);
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Upsert a sale entry
router.post('/sales', async (req, res) => {
  try {
    const { store_id, sale_date, amount, transactions, target, notes } = req.body;
    const { rows } = await pool.query(`
      INSERT INTO krispies_sales (store_id, sale_date, amount, transactions, target, notes)
      VALUES ($1,$2,$3,$4,$5,$6)
      ON CONFLICT (store_id, sale_date)
      DO UPDATE SET amount=$3, transactions=$4, target=$5, notes=$6
      RETURNING *
    `, [store_id, sale_date, amount || 0, transactions || 0, target || 0, notes || null]);
    res.json(rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Compliance — get for a given date (default today)
router.get('/compliance', async (req, res) => {
  try {
    const date = req.query.date || new Date().toISOString().split('T')[0];
    const { rows } = await pool.query(`
      SELECT c.*, st.name AS store_name, u.name AS checked_by_name
      FROM store_compliance c
      JOIN krispies_stores st ON c.store_id = st.id
      LEFT JOIN users u ON c.checked_by = u.id
      WHERE c.check_date = $1
    `, [date]);
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Upsert a compliance check
router.post('/compliance', async (req, res) => {
  try {
    const { store_id, check_date, item_key, status, notes } = req.body;
    const { rows } = await pool.query(`
      INSERT INTO store_compliance (store_id, check_date, item_key, status, notes, checked_by, updated_at)
      VALUES ($1,$2,$3,$4,$5,$6,NOW())
      ON CONFLICT (store_id, check_date, item_key)
      DO UPDATE SET status=$4, notes=$5, checked_by=$6, updated_at=NOW()
      RETURNING *
    `, [store_id, check_date, item_key, status, notes || null, req.user.id]);
    res.json(rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
