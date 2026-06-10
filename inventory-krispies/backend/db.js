const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

async function query(text, params) {
  const res = await pool.query(text, params);
  return res;
}

async function init() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS items (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      default_qty REAL,
      default_unit TEXT,
      category TEXT,
      barcode TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS dispatch_sessions (
      id SERIAL PRIMARY KEY,
      session_date DATE NOT NULL,
      supervisor_name TEXT,
      locked INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS dispatch_entries (
      id SERIAL PRIMARY KEY,
      session_id INTEGER NOT NULL,
      item_id INTEGER,
      item_name TEXT NOT NULL,
      qty REAL NOT NULL,
      unit TEXT,
      destination TEXT,
      note TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS destinations (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS store_prices (
      id SERIAL PRIMARY KEY,
      store_name TEXT NOT NULL,
      item_name TEXT NOT NULL,
      price REAL NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Add unit_price column to entries if missing
  await pool.query(`ALTER TABLE dispatch_entries ADD COLUMN IF NOT EXISTS unit_price REAL`).catch(() => {});

  // Seed NSL prices if empty
  const { rows: priceRows } = await pool.query("SELECT COUNT(*) as cnt FROM store_prices WHERE store_name='NSL'");
  if (parseInt(priceRows[0].cnt) === 0) {
    const nslPrices = [
      ['Veg Puff', 14], ['Egg Puff', 17], ['Chicken Puff', 27], ['Samosa', 12],
      ['Chicken Burger', 38], ['Chicken Pizza', 60], ['Chocohip Brownie', 60],
      ['Bread Small', 28], ['Osmania Biscuits', 50], ['Chocolate Donuts', 43],
      ['Choco chips Pastry Piece', 60], ['Chocolate Pastry Piece', 55],
      ['Dilkush', 10], ['Dilpasand', 55], ['Chocolate Cool Cake - half kg', 400],
      ['Cap', 50], ['Plain Cake', 75], ['Ghee Rava Cake', 75], ['Special Bun', 20],
      ['Paneer Puff', 27], ['Cream Bun', 15], ['Choco Lava', 43], ['Veg Burger', 35],
      ['Fresh Pineapple Pastry', 40], ['Rich Chocolate Pastry', 55], ['Moon Biscuits', 60],
      ['Cocount Biscuit', 60], ['Chocochips Biscuit', 70], ['Milk Rusk', 40], ['Khari', 40],
      ['Butter Scotch Pastry', 45], ['White forest Pastry', 40],
      ['Chocolate Butter Cream Piece', 25], ['Pineapple Butter Cream Piece', 20],
      ['Butter Scotch Butter Cream Piece', 25], ['Strawberry Butter Cream Piece', 20],
      ['Vanilla Butter Cream Piece', 20], ['Chocolate Roll Cake', 30], ['Vanilla Roll Cake', 25],
    ];
    for (const [name, price] of nslPrices) {
      await pool.query('INSERT INTO store_prices (store_name, item_name, price) VALUES ($1, $2, $3)', ['NSL', name, price]);
    }
    console.log('Seeded NSL prices');
  }

  // Add barcode column if it doesn't exist (migration for existing DBs)
  await pool.query(`
    ALTER TABLE items ADD COLUMN IF NOT EXISTS barcode TEXT;
  `).catch(() => {});

  // Seed items if empty
  const { rows: itemRows } = await pool.query('SELECT COUNT(*) as cnt FROM items');
  if (parseInt(itemRows[0].cnt) === 0) {
    const seedItems = [
      ['Veg Puff', 1, 'pcs', 'Snacks'],
      ['Egg Puff', 1, 'pcs', 'Snacks'],
      ['Chicken Puff', 1, 'pcs', 'Snacks'],
      ['Paneer Puff', 1, 'pcs', 'Snacks'],
      ['Aloo Samosa', 1, 'pcs', 'Snacks'],
      ['Egg Hot Dog', 1, 'pcs', 'Snacks'],
      ['Chicken Burger', 1, 'pcs', 'Snacks'],
      ['Veg Burger', 1, 'pcs', 'Snacks'],
      ['Egg Sandwich', 1, 'pcs', 'Snacks'],
      ['Veg Pizza', 1, 'pcs', 'Pizza'],
      ['Chicken Pizza', 1, 'pcs', 'Pizza'],
      ['Samoli Veg', 1, 'pcs', 'Snacks'],
      ['Samoli Chicken', 1, 'pcs', 'Snacks'],
      ['Salted Khari 200g', 1, 'pcs', 'Khari & Rusk'],
      ['Bombay Khari 200g', 1, 'pcs', 'Khari & Rusk'],
      ['Butter Croissant', 1, 'pcs', 'Croissant'],
      ['Nutella Croissant', 1, 'pcs', 'Croissant'],
      ['Almond Croissant', 1, 'pcs', 'Croissant'],
      ['Chocolate Croissant', 1, 'pcs', 'Croissant'],
      ['Milk Bread - Regular', 1, 'loaf', 'Bread'],
      ['Milk Bread - Large', 1, 'loaf', 'Bread'],
      ['Milk Bread - Jumbo', 1, 'loaf', 'Bread'],
      ['Fruit Bread', 1, 'loaf', 'Bread'],
      ['Oats Bread', 1, 'loaf', 'Bread'],
      ['Brown Bread', 1, 'loaf', 'Bread'],
      ['Sandwich Bread', 1, 'loaf', 'Bread'],
      ['Special Bun - 4 pcs', 1, 'pkt', 'Buns'],
      ['Pav Bun', 1, 'pcs', 'Buns'],
      ['Burger Bun', 1, 'pcs', 'Buns'],
      ['Pizza Base - 2 pc', 1, 'pkt', 'Pizza'],
      ['Dilpasand 1 Pc', 1, 'pcs', 'Snacks'],
      ['Dilkush 1 Pc', 1, 'pcs', 'Snacks'],
      ['Dilpasand 1 Round', 1, 'pcs', 'Snacks'],
      ['Dilkush 1 Round', 1, 'pcs', 'Snacks'],
      ['Korean Cheese Bun', 1, 'pcs', 'Buns'],
      ['Milk Rusk', 1, 'pcs', 'Khari & Rusk'],
      ['Special Rusk', 1, 'pcs', 'Khari & Rusk'],
      ['Wam Rusk', 1, 'pcs', 'Khari & Rusk'],
      ['Fruit Rusk', 1, 'pcs', 'Khari & Rusk'],
      ['Cream Bun - Vanilla', 1, 'pcs', 'Buns'],
      ['Cream Bun - Chocolate', 1, 'pcs', 'Buns'],
      ['Cream Bun - Blueberry', 1, 'pcs', 'Buns'],
      ['Jam Bun', 1, 'pcs', 'Buns'],
      ['Mustafa', 1, 'pcs', 'Snacks'],
      ['Chocolate Bun', 1, 'pcs', 'Buns'],
      ['Fruit Cake', 1, 'pcs', 'Cake'],
      ['Plain Cake', 1, 'pcs', 'Cake'],
      ['Plum Cake', 1, 'pcs', 'Cake'],
      ['Ghee Rava Cake', 1, 'pcs', 'Cake'],
    ];
    for (const [name, qty, unit, cat] of seedItems) {
      await pool.query(
        'INSERT INTO items (name, default_qty, default_unit, category) VALUES ($1, $2, $3, $4)',
        [name, qty, unit, cat]
      );
    }
    console.log('Seeded 49 items');
  }

  // Seed destinations if empty
  const { rows: destRows } = await pool.query('SELECT COUNT(*) as cnt FROM destinations');
  if (parseInt(destRows[0].cnt) === 0) {
    for (const name of ['Tukkuguda', 'Suchitra', 'Boduppal', 'Lalbazar', 'Ramantapur', 'NSL']) {
      await pool.query('INSERT INTO destinations (name) VALUES ($1)', [name]);
    }
    console.log('Seeded destinations');
  }

  console.log('Database ready');
}

module.exports = { query, init };
