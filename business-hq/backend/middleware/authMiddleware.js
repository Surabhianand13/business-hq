const { makeToken } = require('../routes/auth');

module.exports = (req, res, next) => {
  const expected = process.env.ACCESS_KEY || 'krispies2026';
  const validToken = makeToken(expected);
  const token = req.headers['x-access-token'] || req.query.token;
  if (!token || token !== validToken) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
};
