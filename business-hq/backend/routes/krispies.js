const express = require('express');
const router = express.Router();
const pool = require('../db');
const { fetchShilpaSales } = require('../services/googleSheets');

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
      SELECT s.*, s.cash_sales, s.online_sales, st.name AS store_name, st.location, st.manager, st.region
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

// ─── Google Sheets sync ───
// Header-driven parser for the "Shilpa" tab. See ./services/googleSheets.js.
// Parses a wide sheet where each store occupies a group of 3 columns
// (Cash Sales | Online Sales | Total) under a merged store-name header in row 2.

const SHEET_HEADERS = {
  cash: 'cash sales',
  online: 'online sales',
  total: 'total',
};

// Number parser: strips commas/currency, treats empty as 0.
const num = (v) => parseFloat(String(v == null ? '' : v).replace(/[^0-9.-]/g, '')) || 0;

// Build store groups by scanning row 2 (group names, merged) and row 3 (sub-headers).
// Returns array of { name, cashCol, onlineCol, totalCol }.
function buildGroups(rows) {
  const row2 = rows[1] || []; // merged store-group names; value only in first merged cell
  const row3 = rows[2] || []; // repeating Cash Sales | Online Sales | Total
  const groups = [];
  let current = null;

  // Determine how wide to scan (the longest of the two header rows).
  const width = Math.max(row2.length, row3.length);
  for (let col = 0; col < width; col++) {
    const groupName = (row2[col] != null ? String(row2[col]) : '').trim();
    if (groupName) {
      // A new non-empty group name starts a new group.
      current = { name: groupName, cashCol: null, onlineCol: null, totalCol: null, startCol: col };
      groups.push(current);
    }
    if (!current) continue; // columns before the first group (e.g. Date/Day) are ignored
    const header = (row3[col] != null ? String(row3[col]) : '').trim().toLowerCase();
    if (header === SHEET_HEADERS.cash) current.cashCol = col;
    else if (header === SHEET_HEADERS.online) current.onlineCol = col;
    else if (header === SHEET_HEADERS.total) current.totalCol = col;
  }

  // Fallback: a single-column store group (e.g. "Nacharam" with one "Sales"/"Total" column
  // that doesn't match the Cash/Online/Total trio) → use its first column as the total.
  for (const g of groups) {
    if (g.cashCol == null && g.onlineCol == null && g.totalCol == null) {
      g.totalCol = g.startCol;
    }
  }
  return groups;
}

// Parse the full sheet into upsert-ready records, given a name→store_id map.
function parseSheet(rows, storeMap) {
  const groups = buildGroups(rows);

  // Map matched groups (case-insensitive exact name match) to app stores.
  const lowerMap = {};
  for (const name in storeMap) lowerMap[name.toLowerCase()] = { id: storeMap[name], name };

  const matched = groups
    .map((g) => {
      const hit = lowerMap[g.name.trim().toLowerCase()];
      return hit ? { ...g, storeId: hit.id, storeName: hit.name } : null;
    })
    .filter(Boolean);

  const records = [];
  let skippedRows = 0;

  // Data rows start at index 3 (row 4 in the sheet).
  for (let i = 3; i < rows.length; i++) {
    const row = rows[i] || [];
    const rawDate = row[0] != null ? String(row[0]).trim() : '';
    if (!rawDate) { skippedRows++; continue; }
    const d = new Date(rawDate);
    if (isNaN(d.getTime())) { skippedRows++; continue; } // skips Total/summary rows
    const saleDate = d.toISOString().split('T')[0];

    for (const g of matched) {
      const cash = g.cashCol != null ? num(row[g.cashCol]) : 0;
      const online = g.onlineCol != null ? num(row[g.onlineCol]) : 0;
      const totalRaw = g.totalCol != null ? row[g.totalCol] : undefined;
      const hasTotal = totalRaw != null && String(totalRaw).trim() !== '';
      const total = hasTotal ? num(totalRaw) : cash + online;
      records.push({ storeId: g.storeId, storeName: g.storeName, saleDate, amount: total, cash, online });
    }
  }

  const matchedStoreNames = matched.map((g) => g.storeName);
  return { records, skippedRows, matchedStoreNames };
}

router.post('/sync-sheet', async (req, res) => {
  const preview = req.query.preview === '1' || req.query.preview === 'true';
  try {
    const rows = await fetchShilpaSales();

    const { rows: storeRows } = await pool.query('SELECT id, name FROM krispies_stores');
    const storeMap = {};
    for (const s of storeRows) storeMap[s.name] = s.id;

    const { records, skippedRows, matchedStoreNames } = parseSheet(rows, storeMap);

    const dates = records.map((r) => r.saleDate).sort();
    const dateRange = dates.length ? { from: dates[0], to: dates[dates.length - 1] } : null;

    if (!preview) {
      for (const r of records) {
        await pool.query(`
          INSERT INTO krispies_sales (store_id, sale_date, amount, cash_sales, online_sales, target)
          VALUES ($1,$2,$3,$4,$5,COALESCE((SELECT target FROM krispies_sales WHERE store_id=$1 AND sale_date=$2),0))
          ON CONFLICT (store_id, sale_date)
          DO UPDATE SET amount=$3, cash_sales=$4, online_sales=$5
        `, [r.storeId, r.saleDate, r.amount, r.cash, r.online]);
      }
    }

    const summary = {
      synced: preview ? 0 : records.length,
      parsed: records.length,
      stores: [...new Set(matchedStoreNames)],
      dateRange,
      skippedRows,
      preview,
    };
    if (preview) {
      summary.sample = records.slice(0, 10);
    }
    res.json(summary);
  } catch (e) {
    // Config/auth errors should surface as 400 so the frontend can show the message.
    res.status(400).json({ error: e.message });
  }
});

module.exports = router;
