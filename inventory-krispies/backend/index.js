const express = require('express');
const cors = require('cors');
const path = require('path');
const { init } = require('./db');
const authMiddleware = require('./middleware/authMiddleware');

const app = express();
app.use(express.json());

// CORS only on /api routes — never on static files
// (crossorigin attribute on Vite scripts sends Origin header which would
//  block static asset loading if CORS runs globally)
const apiCors = cors({ origin: true, credentials: true });

// Auth route — public (no token needed to get a token)
const authRouter = require('./routes/auth');
app.use('/api/auth', apiCors, authRouter);

// All other API routes — require valid token
const itemsRouter = require('./routes/items');
const sessionsRouter = require('./routes/sessions');
const entriesRouter = require('./routes/entries');
const destinationsRouter = require('./routes/destinations');
const pdfRouter = require('./routes/pdf');

app.use('/api/items',        apiCors, authMiddleware, itemsRouter);
app.use('/api/sessions',     apiCors, authMiddleware, sessionsRouter);
app.use('/api/entries',      apiCors, authMiddleware, entriesRouter);
app.use('/api/destinations', apiCors, authMiddleware, destinationsRouter);
app.use('/api/sessions',     apiCors, authMiddleware, pdfRouter);

// Serve built frontend in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'public')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
  });
}

const PORT = process.env.PORT || 3001;

init().then(() => {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Bakery dispatch running on port ${PORT}`);
  });
}).catch(err => {
  console.error('Failed to init DB:', err);
  process.exit(1);
});
