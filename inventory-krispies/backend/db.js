const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'bakery.db'));

// Enable WAL mode for better performance
db.pragma('journal_mode = WAL');

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    default_qty REAL,
    default_unit TEXT,
    category TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS dispatch_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_date DATE NOT NULL,
    supervisor_name TEXT,
    locked INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS dispatch_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id INTEGER NOT NULL,
    item_id INTEGER,
    item_name TEXT NOT NULL,
    qty REAL NOT NULL,
    unit TEXT,
    destination TEXT,
    note TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES dispatch_sessions(id)
  );

  CREATE TABLE IF NOT EXISTS destinations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// Seed items if empty
const itemCount = db.prepare('SELECT COUNT(*) as cnt FROM items').get();
if (itemCount.cnt === 0) {
  const insertItem = db.prepare('INSERT INTO items (name, default_qty, default_unit, category) VALUES (?, ?, ?, ?)');
  const seedItems = [
    ['Sourdough bread', 100, 'loaf', 'Bread'],
    ['White sandwich loaf', 80, 'loaf', 'Bread'],
    ['Whole wheat loaf', 60, 'loaf', 'Bread'],
    ['Croissant', 150, 'pcs', 'Pastry'],
    ['Pain au chocolat', 100, 'pcs', 'Pastry'],
    ['Cinnamon roll', 80, 'pcs', 'Pastry'],
    ['Bagel', 120, 'pcs', 'Bread'],
    ['Chocolate cake', 20, 'pcs', 'Cake'],
    ['Vanilla sponge', 20, 'pcs', 'Cake'],
    ['Cupcake', 100, 'pcs', 'Cake'],
    ['Brownie', 80, 'pcs', 'Cake'],
    ['Coca-Cola 250ml', 2, 'case', 'Beverages'],
    ['Mineral water 500ml', 2, 'case', 'Beverages'],
    ['Packaging bags', 5, 'box', 'Packaging'],
    ['Cake boxes', 3, 'box', 'Packaging'],
  ];
  const insertMany = db.transaction((items) => {
    for (const item of items) insertItem.run(...item);
  });
  insertMany(seedItems);
}

// Seed destinations if empty
const destCount = db.prepare('SELECT COUNT(*) as cnt FROM destinations').get();
if (destCount.cnt === 0) {
  const insertDest = db.prepare('INSERT INTO destinations (name) VALUES (?)');
  ['Tukkuguda', 'Suchitra', 'Boduppal', 'Lalbazar', 'Ramantapur', 'NSL'].forEach(name => insertDest.run(name));
}

module.exports = db;
