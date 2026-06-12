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
  { key: 'complaints',     label: 'Customer Complaints (Online & Offline)', emoji: '💬', type: 'number' },
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

// ─── Renewals / periodic processes ───
const RENEWAL_SELECT = `
  SELECT r.*, st.name AS store_name
  FROM krispies_renewals r
  LEFT JOIN krispies_stores st ON r.store_id = st.id
`;

router.get('/renewals', async (req, res) => {
  try {
    const { rows } = await pool.query(`${RENEWAL_SELECT} ORDER BY r.due_date ASC NULLS LAST`);
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/renewals', async (req, res) => {
  try {
    const { title, category, frequency, store_id, due_date, responsible, notes } = req.body;
    const { rows } = await pool.query(
      `INSERT INTO krispies_renewals (title, category, frequency, store_id, due_date, responsible, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
      [title, category||'licence', frequency||'annual', store_id||null, due_date||null, responsible||null, notes||null]
    );
    const { rows: out } = await pool.query(`${RENEWAL_SELECT} WHERE r.id = $1`, [rows[0].id]);
    res.json(out[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put('/renewals/:id', async (req, res) => {
  try {
    const { title, category, frequency, store_id, due_date, last_done, responsible, notes } = req.body;
    await pool.query(
      `UPDATE krispies_renewals SET title=$1, category=$2, frequency=$3, store_id=$4, due_date=$5, last_done=$6, responsible=$7, notes=$8, updated_at=NOW() WHERE id=$9`,
      [title, category||'licence', frequency||'annual', store_id||null, due_date||null, last_done||null, responsible||null, notes||null, req.params.id]
    );
    const { rows: out } = await pool.query(`${RENEWAL_SELECT} WHERE r.id = $1`, [req.params.id]);
    res.json(out[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Mark done: sets last_done=today and rolls due_date forward by frequency
router.post('/renewals/:id/done', async (req, res) => {
  try {
    const { rows: cur } = await pool.query('SELECT * FROM krispies_renewals WHERE id=$1', [req.params.id]);
    if (!cur.length) return res.status(404).json({ error: 'Not found' });
    const r = cur[0];
    const base = r.due_date ? new Date(r.due_date) : new Date();
    const next = new Date(base);
    const add = { annual: 12, semiannual: 6, quarterly: 3, monthly: 1 }[r.frequency] || 12;
    next.setMonth(next.getMonth() + add);
    const today = new Date().toISOString().split('T')[0];
    await pool.query('UPDATE krispies_renewals SET last_done=$1, due_date=$2, updated_at=NOW() WHERE id=$3',
      [today, next.toISOString().split('T')[0], req.params.id]);
    const { rows: out } = await pool.query(`${RENEWAL_SELECT} WHERE r.id = $1`, [req.params.id]);
    res.json(out[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete('/renewals/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM krispies_renewals WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
