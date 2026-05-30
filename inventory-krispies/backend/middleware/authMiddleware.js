const { makeToken } = require('../routes/auth');

module.exports = (req, res, next) => {
  const expected = process.env.ACCESS_KEY || 'krispies2026';
  const validToken = makeToken(expected);

  // Accept token from header OR query param (for CSV export window.open links)
  const token = req.headers['x-access-token'] || req.query.token;

  if (!token || token !== validToken) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
};
