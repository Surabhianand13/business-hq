const express = require('express');
const router = express.Router();
const crypto = require('crypto');

function makeToken(key) {
  return crypto.createHmac('sha256', 'krispies-dispatch-salt').update(key).digest('hex');
}

// POST /api/auth  { key: "..." }  → { token: "..." }
router.post('/', (req, res) => {
  const { key } = req.body;
  const expected = process.env.ACCESS_KEY || 'krispies2026';
  if (!key || key !== expected) {
    return res.status(401).json({ error: 'Invalid access key' });
  }
  res.json({ token: makeToken(key) });
});

// Export so middleware can use same logic
module.exports = router;
module.exports.makeToken = makeToken;
