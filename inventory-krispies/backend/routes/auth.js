const express = require('express');
const router = express.Router();
const crypto = require('crypto');

function makeToken(key) {
  const salt = process.env.TOKEN_SALT || 'krispies-dispatch-salt-default';
  return crypto.createHmac('sha256', salt).update(key).digest('hex');
}

router.post('/', (req, res) => {
  const { key } = req.body;
  const expected = process.env.ACCESS_KEY || 'krispies2026';
  if (!process.env.ACCESS_KEY) console.warn('WARNING: ACCESS_KEY env var not set, using insecure default');
  if (!process.env.TOKEN_SALT)  console.warn('WARNING: TOKEN_SALT env var not set, using insecure default');
  if (!key || key !== expected) {
    return res.status(401).json({ error: 'Invalid access key' });
  }
  res.json({ token: makeToken(key) });
});

module.exports = router;
module.exports.makeToken = makeToken;
