const express = require('express');
const cors = require('cors');
const path = require('path');
const { init } = require('./db');
const authMiddleware = require('./middleware/authMiddleware');

const app = express();

// Restrict CORS to same origin in production, open in dev
const allowedOrigins = process.env.FRONTEND_URL
  ? [process.env.FRONTEND_URL]
  : ['http://localhost:5173', 'http://localhost:5174'];

app.use(cors({
  origin: (origin, cb) => {
    // Allow no-origin requests (mobile apps, curl in dev)
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    cb(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));
app.use(express.json());

// Auth route — public (no token needed to get a token)
const authRouter = require('./routes/auth');
app.use('/api/auth', authRouter);

// All other API routes — require valid token
const itemsRouter = require('./routes/items');
const sessionsRouter = require('./routes/sessions');
const entriesRouter = require('./routes/entries');
const destinationsRouter = require('./routes/destinations');

app.use('/api/items', authMiddleware, itemsRouter);
app.use('/api/sessions', authMiddleware, sessionsRouter);
app.use('/api/entries', authMiddleware, entriesRouter);
app.use('/api/destinations', authMiddleware, destinationsRouter);

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
