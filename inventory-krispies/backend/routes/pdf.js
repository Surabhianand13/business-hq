const express = require('express');
const router = express.Router();
const PDFDocument = require('pdfkit');
const { query } = require('../db');

router.get('/:id/pdf', async (req, res) => {
  try {
    const { rows: sessions } = await query('SELECT * FROM dispatch_sessions WHERE id=$1', [req.params.id]);
    if (!sessions.length) return res.status(404).json({ error: 'Session not found' });
    const session = sessions[0];

    const store = req.query.store;
    let entriesQuery = 'SELECT * FROM dispatch_entries WHERE session_id=$1 ORDER BY item_name ASC';
    let params = [req.params.id];
    if (store) {
      entriesQuery = 'SELECT * FROM dispatch_entries WHERE session_id=$1 AND destination=$2 ORDER BY item_name ASC';
      params = [req.params.id, store];
    }

    const { rows: entries } = await query(entriesQuery, params);
    if (!entries.length) return res.status(404).json({ error: 'No entries found' });

    const date = new Date(session.session_date).toLocaleDateString('en-IN', {
      day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'Asia/Kolkata'
    });
    const storeName = store || 'All Stores';
    const isInvoice = store && entries.some(e => e.unit_price != null);
    const filename = `${isInvoice ? 'invoice' : 'dispatch'}-${date.replace(/\//g, '-')}-${storeName.replace(/\s/g, '_')}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    doc.pipe(res);

    // ── Header ──
    doc.fontSize(20).font('Helvetica-Bold').fillColor('#92400e').text('KRISPIES BAKERY', { align: 'center' });
    doc.fontSize(12).font('Helvetica').fillColor('#555')
      .text(isInvoice ? 'Invoice / Delivery Challan' : 'Dispatch Delivery Note', { align: 'center' });
    doc.moveDown(0.5);

    // ── Meta box ──
    const metaTop = doc.y;
    doc.roundedRect(50, metaTop, 495, 70, 6).fillAndStroke('#fffbeb', '#f59e0b');
    doc.fillColor('#1c1917').fontSize(11).font('Helvetica-Bold');
    doc.text('Date:',       65, metaTop + 10);
    doc.text('Store:',      65, metaTop + 28);
    doc.text('Supervisor:', 65, metaTop + 46);
    doc.font('Helvetica');
    doc.text(date,                        160, metaTop + 10);
    doc.text(storeName,                   160, metaTop + 28);
    doc.text(session.supervisor_name || '—', 160, metaTop + 46);
    doc.moveDown(4.5);

    const tableTop = doc.y + 4;

    if (isInvoice) {
      // ── INVOICE TABLE ──
      const cols = { no: 50, item: 78, qty: 330, unit: 372, rate: 412, amount: 460 };

      // Header row
      doc.rect(50, tableTop, 495, 22).fill('#92400e');
      doc.fillColor('white').fontSize(9).font('Helvetica-Bold');
      doc.text('#',          cols.no,     tableTop + 7);
      doc.text('Item',       cols.item,   tableTop + 7);
      doc.text('Qty',        cols.qty,    tableTop + 7, { width: 38, align: 'right' });
      doc.text('Unit',       cols.unit,   tableTop + 7);
      doc.text('Rate (₹)',   cols.rate,   tableTop + 7, { width: 44, align: 'right' });
      doc.text('Amount (₹)', cols.amount, tableTop + 7, { width: 55, align: 'right' });

      let y = tableTop + 22;
      let grandTotal = 0;
      let unpriced = [];

      entries.forEach((e, i) => {
        const bg = i % 2 === 0 ? '#ffffff' : '#fef9f0';
        doc.rect(50, y, 495, 20).fill(bg);
        doc.fillColor('#1c1917').fontSize(9).font('Helvetica');
        doc.text(String(i + 1),       cols.no,   y + 5);
        doc.text(e.item_name || '',   cols.item,  y + 5, { width: 248 });
        doc.text(String(e.qty || ''), cols.qty,   y + 5, { width: 38, align: 'right' });
        doc.text(e.unit || '',        cols.unit,  y + 5);

        if (e.unit_price != null) {
          const amount = (e.qty || 0) * e.unit_price;
          grandTotal += amount;
          doc.text(`${e.unit_price.toFixed(2)}`,  cols.rate,   y + 5, { width: 44, align: 'right' });
          doc.text(`${amount.toFixed(2)}`,        cols.amount, y + 5, { width: 55, align: 'right' });
        } else {
          doc.fillColor('#9ca3af').font('Helvetica-Oblique')
            .text('—', cols.rate,   y + 5, { width: 44, align: 'right' })
            .text('—', cols.amount, y + 5, { width: 55, align: 'right' });
          unpriced.push(e.item_name);
        }
        y += 20;
      });

      // Border
      doc.rect(50, tableTop, 495, y - tableTop).stroke('#e5e7eb');

      // Grand total row
      y += 4;
      doc.rect(50, y, 495, 26).fill('#fef3c7').stroke('#f59e0b');
      doc.fillColor('#92400e').fontSize(11).font('Helvetica-Bold');
      doc.text('GRAND TOTAL', 60, y + 7);
      doc.text(`₹ ${grandTotal.toFixed(2)}`, cols.amount - 10, y + 7, { width: 75, align: 'right' });
      y += 30;

      if (unpriced.length > 0) {
        doc.moveDown(0.5);
        doc.fontSize(8).font('Helvetica').fillColor('#9ca3af')
          .text(`* Price not available for: ${unpriced.join(', ')}`, 50, y + 5);
        y += 18;
      }

      // ── Signature block ──
      const sigY = y + 20;
      doc.moveTo(60,  sigY + 30).lineTo(220, sigY + 30).stroke('#374151');
      doc.fontSize(10).font('Helvetica').fillColor('#374151').text('Dispatched by (Factory)', 60, sigY + 35);
      doc.fontSize(9).fillColor('#9ca3af').text('Signature & Date', 60, sigY + 47);
      doc.moveTo(330, sigY + 30).lineTo(530, sigY + 30).stroke('#374151');
      doc.fontSize(10).font('Helvetica').fillColor('#374151').text('Received by (Store)', 330, sigY + 35);
      doc.fontSize(9).fillColor('#9ca3af').text('Signature & Date', 330, sigY + 47);

    } else {
      // ── DISPATCH NOTE TABLE (no pricing) ──
      const cols = { no: 50, item: 80, qty: 360, unit: 410, note: 460 };
      doc.rect(50, tableTop, 495, 22).fill('#f59e0b');
      doc.fillColor('white').fontSize(10).font('Helvetica-Bold');
      doc.text('#',         cols.no,   tableTop + 6);
      doc.text('Item Name', cols.item, tableTop + 6);
      doc.text('Qty',       cols.qty,  tableTop + 6, { width: 45, align: 'right' });
      doc.text('Unit',      cols.unit, tableTop + 6);
      doc.text('Note',      cols.note, tableTop + 6);

      let y = tableTop + 22;
      entries.forEach((e, i) => {
        const bg = i % 2 === 0 ? '#ffffff' : '#fef3c7';
        doc.rect(50, y, 495, 20).fill(bg);
        doc.fillColor('#1c1917').fontSize(10).font('Helvetica');
        doc.text(String(i + 1),       cols.no,   y + 5);
        doc.text(e.item_name || '',   cols.item,  y + 5, { width: 270 });
        doc.text(String(e.qty || ''), cols.qty,   y + 5, { width: 45, align: 'right' });
        doc.text(e.unit || '',        cols.unit,  y + 5);
        doc.text(e.note || '',        cols.note,  y + 5, { width: 80 });
        y += 20;
      });
      doc.rect(50, tableTop, 495, y - tableTop).stroke('#e5e7eb');

      doc.moveDown(1.5);
      doc.fontSize(11).font('Helvetica-Bold').fillColor('#92400e')
        .text(`Total items dispatched: ${entries.length}`, { align: 'right' });

      doc.moveDown(3);
      const sigY = doc.y;
      doc.moveTo(60,  sigY + 30).lineTo(220, sigY + 30).stroke('#374151');
      doc.fontSize(10).font('Helvetica').fillColor('#374151').text('Dispatched by (Factory)', 60, sigY + 35);
      doc.fontSize(9).fillColor('#9ca3af').text('Signature & Date', 60, sigY + 47);
      doc.moveTo(330, sigY + 30).lineTo(530, sigY + 30).stroke('#374151');
      doc.fontSize(10).font('Helvetica').fillColor('#374151').text('Received by (Store)', 330, sigY + 35);
      doc.fontSize(9).fillColor('#9ca3af').text('Signature & Date', 330, sigY + 47);
    }

    // ── Footer ──
    doc.moveDown(4);
    doc.fontSize(8).fillColor('#9ca3af').font('Helvetica')
      .text(`Generated by Krispies Dispatch System · ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`, { align: 'center' });

    doc.end();
  } catch (e) {
    console.error(e);
    if (!res.headersSent) res.status(500).json({ error: e.message });
  }
});

module.exports = router;
