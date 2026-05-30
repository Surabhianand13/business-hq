const express = require('express');
const router = express.Router();
const crypto = require('crypto');

function makeToken(key) {
  const salt = process.env.TOKEN_SALT;
  if (!salt) throw new Error('TOKEN_SALT env var is not set');
  return crypto.createHmac('sha256', salt).update(key).digest('hex');
}

// POST /api/auth  { key: "..." }  → { token: "..." }
router.post('/', (req, res) => {
  const { key } = req.body;
  const expected = process.env.ACCESS_KEY;
  if (!expected) return res.status(500).json({ error: 'Server misconfigured' });
  if (!key || key !== expected) {
    return res.status(401).json({ error: 'Invalid access key' });
  }
  try {
    res.json({ token: makeToken(key) });
  } catch (e) {
    res.status(500).json({ error: 'Server misconfigured' });
  }
});

module.exports = router;
module.exports.makeToken = makeToken;
