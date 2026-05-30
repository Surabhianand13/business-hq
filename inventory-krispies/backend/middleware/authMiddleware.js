const { makeToken } = require('../routes/auth');

module.exports = (req, res, next) => {
  const expected = process.env.ACCESS_KEY;
  if (!expected) return res.status(500).json({ error: 'Server misconfigured' });

  let validToken;
  try {
    validToken = makeToken(expected);
  } catch (e) {
    return res.status(500).json({ error: 'Server misconfigured' });
  }

  const token = req.headers['x-access-token'] || req.query.token;
  if (!token || token !== validToken) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
};
