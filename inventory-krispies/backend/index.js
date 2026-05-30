const express = require('express');
const cors = require('cors');
const path = require('path');
const { init } = require('./db');

const app = express();
app.use(cors());
app.use(express.json());

const itemsRouter = require('./routes/items');
const sessionsRouter = require('./routes/sessions');
const entriesRouter = require('./routes/entries');
const destinationsRouter = require('./routes/destinations');

app.use('/api/items', itemsRouter);
app.use('/api/sessions', sessionsRouter);
app.use('/api/entries', entriesRouter);
app.use('/api/destinations', destinationsRouter);

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
