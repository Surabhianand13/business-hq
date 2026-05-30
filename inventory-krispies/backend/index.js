const express = require('express');
const cors = require('cors');
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

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Bakery dispatch backend running on http://localhost:${PORT}`);
});
