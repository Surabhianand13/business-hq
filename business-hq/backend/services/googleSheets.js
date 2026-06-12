const { google } = require('googleapis');

// Reads the private "Shilpa" tab from the Krispies Google Sheet using a
// service account and returns the raw 2D array of cell values (FORMATTED_VALUE,
// so dates come back as readable strings like "1 Apr 2026").
async function fetchShilpaSales() {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  const sheetId = process.env.KRISPIES_SHEET_ID;
  if (!raw || !sheetId) {
    throw new Error('Google Sheets not configured (set GOOGLE_SERVICE_ACCOUNT_JSON and KRISPIES_SHEET_ID)');
  }

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

module.exports = { fetchShilpaSales };
