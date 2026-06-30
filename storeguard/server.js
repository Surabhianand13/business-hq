require('dotenv').config({ override: true });

const express = require('express');
const multer = require('multer');
const Database = require('better-sqlite3');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { execFile, execFileSync } = require('child_process');

const PORT = process.env.PORT || 3000;
const API_KEY = process.env.ANTHROPIC_API_KEY;
const MODEL = 'claude-haiku-4-5-20251001';
const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;

const UPLOAD_DIR = path.join(__dirname, 'uploads');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

let ffmpegAvailable = false;
try {
  execFileSync('ffmpeg', ['-version'], { stdio: 'ignore' });
  ffmpegAvailable = true;
  console.log('[storeguard] ffmpeg detected — video frame extraction enabled');
} catch {
  console.log('[storeguard] ffmpeg not found — videos will be rejected');
}

const db = new Database(path.join(__dirname, 'storeguard.db'));
db.pragma('journal_mode = WAL');
db.exec(`
  CREATE TABLE IF NOT EXISTS incidents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    created_at INTEGER NOT NULL,
    store TEXT NOT NULL,
    camera TEXT,
    captured_at TEXT,
    media_path TEXT,
    media_type TEXT,
    flagged INTEGER,
    severity TEXT,
    confidence INTEGER,
    summary TEXT,
    flags_json TEXT,
    scene_description TEXT,
    recommendation TEXT,
    cash_retention TEXT DEFAULT '',
    personal_qr_check TEXT DEFAULT '',
    reviewer_status TEXT DEFAULT 'pending',
    reviewer_note TEXT DEFAULT ''
  );
`);

// Migration: add cash_retention column to existing DBs.
try {
  const cols = db.prepare("PRAGMA table_info(incidents)").all().map(c => c.name);
  if (!cols.includes('cash_retention')) {
    db.exec("ALTER TABLE incidents ADD COLUMN cash_retention TEXT DEFAULT ''");
  }
  if (!cols.includes('personal_qr_check')) {
    db.exec("ALTER TABLE incidents ADD COLUMN personal_qr_check TEXT DEFAULT ''");
  }
} catch (e) { console.warn('[storeguard] migration warn:', e.message); }

const STORES = [
  'Store 1 MG Road',
  'Store 2 Koramangala',
  'Store 3 Indiranagar',
  'Store 4 Jayanagar',
  'Store 5 HSR Layout',
  'Store 6 Banashankari',
  'Store 7 Whitefield',
  'Store 8 Electronic City',
];

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '';
    cb(null, `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ext}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 },
});

const MAX_VIDEO_FRAMES = 8;

function extractVideoFrame(videoPath, outputPath, seconds) {
  return new Promise((resolve, reject) => {
    execFile(
      'ffmpeg',
      ['-y', '-ss', String(seconds), '-i', videoPath, '-frames:v', '1', '-q:v', '3', outputPath],
      (err) => (err ? reject(err) : resolve()),
    );
  });
}

function probeDuration(videoPath) {
  return new Promise((resolve) => {
    execFile(
      'ffprobe',
      ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=noprint_wrappers=1:nokey=1', videoPath],
      (err, stdout) => {
        if (err) return resolve(null);
        const d = parseFloat(String(stdout).trim());
        resolve(Number.isFinite(d) && d > 0 ? d : null);
      },
    );
  });
}

async function encodeJpegBase64(imagePath) {
  const buf = await sharp(imagePath)
    .rotate()
    .resize({ width: 1280, withoutEnlargement: true })
    .jpeg({ quality: 82 })
    .toBuffer();
  return buf.toString('base64');
}

async function prepareImages(filePath, mimeType) {
  const isVideo = mimeType && mimeType.startsWith('video/');

  if (!isVideo) {
    return [await encodeJpegBase64(filePath)];
  }

  if (!ffmpegAvailable) {
    throw new Error('Video uploaded but ffmpeg is not installed on this machine.');
  }

  const duration = await probeDuration(filePath);
  const frameCount = duration ? Math.min(MAX_VIDEO_FRAMES, Math.max(2, Math.ceil(duration / 30))) : 1;

  const timestamps = [];
  if (duration && frameCount > 1) {
    const step = duration / (frameCount + 1);
    for (let i = 1; i <= frameCount; i++) timestamps.push(+(step * i).toFixed(2));
  } else {
    timestamps.push(duration ? Math.min(2, duration / 2) : 0);
  }

  const framePaths = [];
  const images = [];
  try {
    for (let i = 0; i < timestamps.length; i++) {
      const framePath = `${filePath}.frame-${i}.jpg`;
      try {
        await extractVideoFrame(filePath, framePath, timestamps[i]);
        framePaths.push(framePath);
        images.push(await encodeJpegBase64(framePath));
      } catch (e) {
        console.warn(`[storeguard] frame extract failed at ${timestamps[i]}s:`, e.message);
      }
    }
    if (!images.length) throw new Error('Could not extract any frames from video.');
    console.log(`[storeguard] sampled ${images.length} frames from ${duration ? duration.toFixed(1) + 's' : 'video'}`);
    return images;
  } finally {
    for (const p of framePaths) { try { fs.unlinkSync(p); } catch {} }
  }
}

const VISION_PROMPT = `You are a retail loss-prevention auditor reviewing CCTV from a Krispie's bakery outlet in Hyderabad, India.

GROUND TRUTH ABOUT THIS STORE (do not second-guess this — treat it as fact):
- This is a BAKERY / café store. Products on display are baked goods, pastries, breads, cakes, savouries, packaged snacks, soft drinks. Glass display cases hold bakery items, NOT jewellery, mobile phones, or apparel. Do not call this a jewellery store.
- Employees stand BEHIND the counter, usually in uniform / apron / cap. Customers stand on the opposite side of the counter.
- Employees pick items from the display, pack them, ring them up, and hand them across the counter to the customer.
- Payment is taken in TWO legitimate ways only:
  1. CASH — should be entered into the POS / billing terminal and the cash placed in the cash drawer. A printed bill / receipt should be generated.
  2. UPI / digital — customer scans the QR / barcode scanner mounted on TOP of the counter (the scanner is fixed to the counter, not handheld). A bill should still be generated on the POS.
- Anything outside these two paths is suspicious.

The images below are SEQUENTIAL frames from one short CCTV clip (or a single screenshot). They are ordered earliest → latest and labelled "Frame N of M".

Work in this exact order. Do not skip steps.

STEP 1 — OBSERVE (do not judge yet)
- Confirm what you actually see in the frames: which side is the employee side (behind counter), where is the POS / billing terminal, where is the counter-top scanner, where is the cash drawer. If you cannot see one of these, say so — do not invent it.
- Identify each person visible: employee (behind counter, uniform) vs customer (in front of counter).
- Note what items are being handled (bakery products, packaging, cash notes, phone for UPI).

STEP 2 — TRACK MOTION ACROSS FRAMES
- Compare consecutive frames. Describe concrete changes you actually see, tied to frame numbers. Examples of what to look for:
  - Customer hands over cash → does the employee then interact with the POS and cash drawer, or does the cash go elsewhere (pocket, under counter, side shelf)?
  - Customer scans QR on the counter-top scanner → does the employee then ring it on the POS and hand over a printed bill?
  - Items handed across the counter → was there a corresponding POS / scanner interaction first?
  - Cash drawer opening or closing without a visible transaction.
  - Employee using a personal phone instead of the fixed counter scanner / POS.
  - Employee pocketing cash, notes, or bakery items.
- Be specific about WHICH frames show the change (e.g. "frame 4→6: employee accepts ₹100 note from customer, no POS interaction visible, drawer does not open"). If the gap between frames is too long to tell what happened in between, say so explicitly — do not invent motion.

STEP 2A — PERSONAL QR / UPI CHECK (HIGHEST PRIORITY — REVENUE THEFT)
The store's only legitimate UPI path is the FIXED counter-top scanner / QR (mounted on top of the counter, visible to the customer, not held by anyone). If you see EITHER of these patterns, flag it as HIGH severity:
- Employee pulls out their OWN MOBILE PHONE and SHOWS THE SCREEN (QR code) to the customer for the customer to scan. The phone is in the employee's hand, screen turned toward the customer. This is personal-account UPI theft — money goes to the employee, not the store.
- Employee shows a PRINTED PERSONAL QR CODE / sticker / card to the customer that is NOT the fixed counter-top scanner.
- Customer holds up their phone and scans something the employee is holding (phone, paper, card) instead of the counter-top scanner.
- Employee takes the customer's phone, taps on it, and hands it back — without any interaction with the fixed scanner or POS.

Specifically distinguish:
- LEGITIMATE: customer's phone points DOWN AT the fixed counter-top scanner (scanner is stationary, customer's phone moves to it).
- SUSPICIOUS: employee's phone is RAISED UP showing the screen, customer's phone points at the employee's phone.

Tie each observation to specific frame numbers (e.g. "frame 4→6: employee pulls phone from pocket, shows screen to customer, customer scans employee's phone — counter-top scanner not used").

If you cannot tell whether the phone shown belonged to the employee or whether it was a personal QR, lower confidence — do not assume.

STEP 2B — CASH RETENTION CHECK (HIGHEST PRIORITY)
After tracking cash across frames, explicitly answer: did every cash note the employee touched end up inside the POS cash drawer, or did some end up retained on the employee's person / in a non-drawer location?

Specifically look for and call out:
- Cash going into an APRON POCKET, PANTS POCKET, SHIRT POCKET, or any clothing pocket — even briefly. Watch the employee's hands going to their waist / apron / hip area after receiving cash. A hand that goes from cash → pocket is a HIGH severity flag.
- Cash being PALMED or CONCEALED in the employee's closed hand while they continue to serve other customers (instead of being placed in the drawer immediately).
- Cash placed UNDER the counter, UNDER a tray / mat, BEHIND the POS, in a personal bag / wallet / lunch box, or on a side shelf that is NOT the cash drawer.
- Cash going into a DIFFERENT drawer or tin that is not the POS cash drawer.
- Employee turning their back to the camera right after receiving cash (possible concealment) — note it, and lower confidence if the moment is occluded.
- Cash that enters frame in the employee's hand but is no longer visible by a later frame AND the POS cash drawer never opened in between — explicitly state this as "cash not accounted for between frame X and frame Y".

If you see ANY of the above, set flagged=true and severity="high" (or "medium" if it's plausible but partly occluded). Tie each observation to specific frame numbers in the "flags" array.

If no cash is visible at all in any frame, do NOT invent any of the above — say cash retention is "not observable" in the summary.

STEP 3 — JUDGE
Decide flagged / severity / confidence ONLY from what you observed above. Do not flag generic "looks normal" behavior, and do not flag based on guesses. The specific risks for this bakery format, in order of priority:
1. ★ EMPLOYEE SHOWING PERSONAL MOBILE QR / PRIVATE UPI (see Step 2A) — revenue theft, HIGH severity
2. ★ EMPLOYEE POCKETING / RETAINING CASH (see Step 2B) — HIGH severity
3. Cash accepted but no POS / billing interaction and no receipt
4. Cash drawer opened without a transaction
5. Bakery items handed over with no POS / scanner interaction
6. Items passed over / around the counter to someone without billing

Calibrate confidence honestly:
- 80+ only if multiple frames clearly show the behavior
- 50–79 if it is plausible but partly occluded or ambiguous
- Below 50 if it is mostly a guess — in that case flagged MUST be false

Output ONLY this exact JSON (no markdown, no backticks, no commentary). Include dedicated "personal_qr_check" and "cash_retention" fields summarising the checks from Step 2A and Step 2B.
{"flagged": true|false, "severity": "high"|"medium"|"low"|"none", "confidence": 0-100, "summary": "2-3 sentence plain-English summary grounded in what you actually saw at this bakery counter", "personal_qr_check": "explicitly state: was any phone-based UPI happening? was it via the fixed counter-top scanner (legitimate) or via the employee's own phone / personal QR (suspicious)? OR 'not observable'", "cash_retention": "explicitly state: was cash visible? did every note reach the POS cash drawer? did any note end up in an employee pocket / hand / non-drawer location? OR 'not observable'", "flags": ["specific observations tied to frame numbers, e.g. 'frame 3→5: employee accepts ₹500 note from customer, hand moves to apron pocket in frame 5, cash drawer never opens — likely pocketed'"], "scene_description": "concrete description of the bakery counter scene — products on display, position of POS / counter-top scanner / cash drawer, employees and customers visible", "recommendation": "what the reviewer should do next"}`;

async function callClaude(base64Images) {
  if (!API_KEY) throw new Error('ANTHROPIC_API_KEY not set in .env');

  const imageBlocks = base64Images.map((data, idx) => ([
    { type: 'text', text: `Frame ${idx + 1} of ${base64Images.length}:` },
    { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data } },
  ])).flat();

  const body = {
    model: MODEL,
    max_tokens: 2000,
    messages: [
      {
        role: 'user',
        content: [
          ...imageBlocks,
          { type: 'text', text: VISION_PROMPT },
        ],
      },
      {
        role: 'assistant',
        content: [{ type: 'text', text: '{' }],
      },
    ],
  };

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': API_KEY,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Claude API ${res.status}: ${text}`);
  }
  const json = await res.json();
  const text = json.content?.[0]?.text || '';
  // Assistant was prefilled with "{" so the response continues from after it.
  const candidate = '{' + text;
  const cleaned = candidate.replace(/```(?:json)?/gi, '').trim();
  // Find the outermost JSON object by brace-matching.
  let depth = 0, start = -1, end = -1, inStr = false, esc = false;
  for (let i = 0; i < cleaned.length; i++) {
    const c = cleaned[i];
    if (inStr) {
      if (esc) esc = false;
      else if (c === '\\') esc = true;
      else if (c === '"') inStr = false;
      continue;
    }
    if (c === '"') inStr = true;
    else if (c === '{') { if (depth === 0) start = i; depth++; }
    else if (c === '}') { depth--; if (depth === 0) { end = i; break; } }
  }
  if (start < 0 || end < 0) throw new Error(`Could not parse JSON from Claude: ${candidate.slice(0, 500)}`);
  return JSON.parse(cleaned.slice(start, end + 1));
}

function rowToIncident(row) {
  let flags = [];
  try { flags = JSON.parse(row.flags_json || '[]'); } catch {}
  return {
    id: row.id,
    created_at: row.created_at,
    store: row.store,
    camera: row.camera,
    captured_at: row.captured_at,
    media_url: row.media_path ? `/uploads/${path.basename(row.media_path)}` : null,
    media_type: row.media_type,
    flagged: !!row.flagged,
    severity: row.severity,
    confidence: row.confidence,
    summary: row.summary,
    flags,
    scene_description: row.scene_description,
    recommendation: row.recommendation,
    cash_retention: row.cash_retention || '',
    personal_qr_check: row.personal_qr_check || '',
    reviewer_status: row.reviewer_status,
    reviewer_note: row.reviewer_note,
  };
}

function cleanup() {
  const cutoff = Date.now() - THREE_DAYS_MS;
  const stale = db.prepare('SELECT id, media_path FROM incidents WHERE created_at < ?').all(cutoff);
  if (!stale.length) return;
  const del = db.prepare('DELETE FROM incidents WHERE id = ?');
  for (const row of stale) {
    if (row.media_path) {
      try { fs.unlinkSync(row.media_path); } catch {}
    }
    del.run(row.id);
  }
  console.log(`[storeguard] cleanup removed ${stale.length} incident(s) older than 3 days`);
}
cleanup();
setInterval(cleanup, 60 * 60 * 1000);

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(UPLOAD_DIR));

app.get('/api/stores', (req, res) => res.json(STORES));

app.get('/api/incidents', (req, res) => {
  const cutoff = Date.now() - THREE_DAYS_MS;
  const rows = db
    .prepare('SELECT * FROM incidents WHERE created_at >= ? ORDER BY created_at DESC')
    .all(cutoff);
  res.json(rows.map(rowToIncident));
});

app.post('/api/analyse', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  const filePath = req.file.path;
  try {
    const { store, camera, datetime } = req.body;
    if (!store) {
      fs.unlinkSync(filePath);
      return res.status(400).json({ error: 'Store is required' });
    }
    const images = await prepareImages(filePath, req.file.mimetype);
    const result = await callClaude(images);

    const stmt = db.prepare(`
      INSERT INTO incidents
      (created_at, store, camera, captured_at, media_path, media_type,
       flagged, severity, confidence, summary, flags_json, scene_description, recommendation, cash_retention, personal_qr_check)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const info = stmt.run(
      Date.now(),
      store,
      camera || '',
      datetime || '',
      filePath,
      req.file.mimetype,
      result.flagged ? 1 : 0,
      result.severity || 'none',
      Math.round(Number(result.confidence) || 0),
      result.summary || '',
      JSON.stringify(result.flags || []),
      result.scene_description || '',
      result.recommendation || '',
      result.cash_retention || '',
      result.personal_qr_check || '',
    );
    const row = db.prepare('SELECT * FROM incidents WHERE id = ?').get(info.lastInsertRowid);
    res.json(rowToIncident(row));
  } catch (err) {
    console.error('[analyse] error:', err);
    try { fs.unlinkSync(filePath); } catch {}
    res.status(500).json({ error: err.message });
  }
});

app.patch('/api/incidents/:id', (req, res) => {
  const id = Number(req.params.id);
  const { reviewer_status, reviewer_note } = req.body;
  const row = db.prepare('SELECT * FROM incidents WHERE id = ?').get(id);
  if (!row) return res.status(404).json({ error: 'Not found' });
  db.prepare(
    'UPDATE incidents SET reviewer_status = COALESCE(?, reviewer_status), reviewer_note = COALESCE(?, reviewer_note) WHERE id = ?',
  ).run(reviewer_status, reviewer_note, id);
  const updated = db.prepare('SELECT * FROM incidents WHERE id = ?').get(id);
  res.json(rowToIncident(updated));
});

app.delete('/api/incidents/:id', (req, res) => {
  const id = Number(req.params.id);
  const row = db.prepare('SELECT * FROM incidents WHERE id = ?').get(id);
  if (!row) return res.status(404).json({ error: 'Not found' });
  if (row.media_path) {
    try { fs.unlinkSync(row.media_path); } catch {}
  }
  db.prepare('DELETE FROM incidents WHERE id = ?').run(id);
  res.json({ ok: true });
});

app.listen(PORT, () => {
  console.log(`[storeguard] http://localhost:${PORT}`);
  if (!API_KEY) console.warn('[storeguard] WARNING: ANTHROPIC_API_KEY not set in .env');
});
