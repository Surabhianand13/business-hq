const { google } = require('googleapis');

// Minimal CSV parser: handles quoted fields, escaped quotes ("") and
// commas/newlines inside quotes. Returns a 2D array of strings.
function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else {
        field += c;
      }
    } else {
      if (c === '"') inQuotes = true;
      else if (c === ',') { row.push(field); field = ''; }
      else if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
      else if (c === '\r') { /* ignore */ }
      else field += c;
    }
  }
  // last field/row
  if (field.length > 0 || row.length > 0) { row.push(field); rows.push(row); }
  return rows;
}

// Reads the sheet via a published-to-web CSV link (no credentials needed).
async function fetchViaCsv() {
  const url = process.env.KRISPIES_SHEET_CSV_URL;
  if (!url) return null;
  const res = await fetch(url, { redirect: 'follow' });
  if (!res.ok) {
    throw new Error(`Failed to fetch published CSV (HTTP ${res.status}). Check the published-to-web link.`);
  }
  const text = await res.text();
  return parseCsv(text);
}

// Reads the private "Shilpa" tab using a service account (requires JSON key).
async function fetchViaServiceAccount() {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  const sheetId = process.env.KRISPIES_SHEET_ID;
  if (!raw || !sheetId) return null;

  let credentials;
  try {
    credentials = JSON.parse(raw);
  } catch (e) {
    throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON is not valid JSON');
  }
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });
  const sheets = google.sheets({ version: 'v4', auth });
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: 'Shilpa!A1:Z2000',
  });
  return res.data.values || [];
}

// Returns the raw 2D array of cell values. Prefers the published CSV link if
// set (KRISPIES_SHEET_CSV_URL); otherwise uses the service account.
async function fetchShilpaSales() {
  const csv = await fetchViaCsv();
  if (csv) return csv;

  const sa = await fetchViaServiceAccount();
  if (sa) return sa;

  throw new Error('Google Sheets not configured. Set KRISPIES_SHEET_CSV_URL (published CSV link) OR GOOGLE_SERVICE_ACCOUNT_JSON + KRISPIES_SHEET_ID.');
}

module.exports = { fetchShilpaSales, parseCsv };
