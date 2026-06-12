require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const pool = require('./db');
const bcrypt = require('bcryptjs');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const taskRoutes = require('./routes/tasks');
const meetingRoutes = require('./routes/meetings');
const updateRoutes = require('./routes/updates');
const dashboardRoutes = require('./routes/dashboard');
const dealsRouter = require('./routes/deals');
const krispiesRouter = require('./routes/krispies');
const auth = require('./middleware/auth');

// Lightweight health check for uptime pingers (keeps Render instance warm)
app.get('/health', (req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/meetings', meetingRoutes);
app.use('/api/updates', updateRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/deals', auth, dealsRouter);
app.use('/api/krispies', auth, krispiesRouter);

// Serve frontend in production
if (process.env.NODE_ENV === 'production') {
  const frontendPath = path.join(__dirname, '../frontend/dist');
  app.use(express.static(frontendPath));
  app.get('*', (req, res) => {
    res.sendFile(path.join(frontendPath, 'index.html'));
  });
}

// DB Setup + Seed
async function initDB() {
  try {
    // Create tables
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(20) DEFAULT 'member',
        avatar_color VARCHAR(20) DEFAULT '#6c63ff',
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS workspaces (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        emoji VARCHAR(10) DEFAULT '📁',
        color VARCHAR(20) DEFAULT '#6c63ff'
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_workspaces (
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        workspace_id INTEGER REFERENCES workspaces(id) ON DELETE CASCADE,
        PRIMARY KEY (user_id, workspace_id)
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS tasks (
        id SERIAL PRIMARY KEY,
        title VARCHAR(500) NOT NULL,
        description TEXT,
        status VARCHAR(20) DEFAULT 'todo',
        priority VARCHAR(20) DEFAULT 'medium',
        workspace_id INTEGER REFERENCES workspaces(id) ON DELETE SET NULL,
        assignee_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
        due_date DATE,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS task_collaborators (
        task_id INTEGER REFERENCES tasks(id) ON DELETE CASCADE,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        PRIMARY KEY (task_id, user_id)
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS task_comments (
        id SERIAL PRIMARY KEY,
        task_id INTEGER REFERENCES tasks(id) ON DELETE CASCADE,
        user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        content TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS meetings (
        id SERIAL PRIMARY KEY,
        title VARCHAR(500) NOT NULL,
        workspace_id INTEGER REFERENCES workspaces(id) ON DELETE SET NULL,
        created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
        start_time TIMESTAMPTZ NOT NULL,
        duration_mins INTEGER DEFAULT 60,
        meeting_url TEXT,
        agenda TEXT,
        external_attendees TEXT DEFAULT '',
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // Migration: add external_attendees column if it doesn't exist yet
    await pool.query(`
      ALTER TABLE meetings ADD COLUMN IF NOT EXISTS external_attendees TEXT DEFAULT ''
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS meeting_attendees (
        meeting_id INTEGER REFERENCES meetings(id) ON DELETE CASCADE,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        PRIMARY KEY (meeting_id, user_id)
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS updates (
        id SERIAL PRIMARY KEY,
        content TEXT NOT NULL,
        user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        workspace_id INTEGER REFERENCES workspaces(id) ON DELETE SET NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS update_likes (
        update_id INTEGER REFERENCES updates(id) ON DELETE CASCADE,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        PRIMARY KEY (update_id, user_id)
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS update_comments (
        id SERIAL PRIMARY KEY,
        update_id INTEGER REFERENCES updates(id) ON DELETE CASCADE,
        user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        content TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS deals (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        company TEXT NOT NULL,
        contact_name TEXT,
        contact_email TEXT,
        contact_phone TEXT,
        value REAL DEFAULT 0,
        stage TEXT DEFAULT 'lead',
        probability INTEGER DEFAULT 10,
        assignee_id INTEGER REFERENCES users(id),
        notes TEXT,
        expected_close_date DATE,
        meeting_type TEXT DEFAULT '',
        meeting_date TIMESTAMP,
        meeting_link TEXT DEFAULT '',
        meeting_notes TEXT DEFAULT '',
        next_followup_date DATE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Migrations for existing DBs
    await pool.query(`ALTER TABLE deals ADD COLUMN IF NOT EXISTS meeting_type TEXT DEFAULT ''`).catch(() => {});
    await pool.query(`ALTER TABLE deals ADD COLUMN IF NOT EXISTS meeting_date TIMESTAMP`).catch(() => {});
    await pool.query(`ALTER TABLE deals ADD COLUMN IF NOT EXISTS meeting_link TEXT DEFAULT ''`).catch(() => {});
    await pool.query(`ALTER TABLE deals ADD COLUMN IF NOT EXISTS meeting_notes TEXT DEFAULT ''`).catch(() => {});
    await pool.query(`ALTER TABLE deals ADD COLUMN IF NOT EXISTS next_followup_date DATE`).catch(() => {});
    // Migrate removed 'qualified' stage to 'meeting_scheduled'
    await pool.query(`UPDATE deals SET stage='meeting_scheduled' WHERE stage='qualified'`).catch(() => {});

    // Migrate existing user emails @businesshq.com -> @solvvai.com and reset passwords
    try {
      const { rows: oldUsers } = await pool.query(`SELECT id FROM users WHERE email LIKE '%@businesshq.com'`);
      if (oldUsers.length > 0) {
        const newPass = await bcrypt.hash('solvvai123', 10);
        await pool.query(`UPDATE users SET email = REPLACE(email, '@businesshq.com', '@solvvai.com'), password_hash = $1 WHERE email LIKE '%@businesshq.com'`, [newPass]);
        console.log(`Migrated ${oldUsers.length} users to @solvvai.com`);
      }
    } catch (e) { console.error('Email migration error:', e.message); }

    await pool.query(`
      CREATE TABLE IF NOT EXISTS krispies_stores (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        location TEXT,
        manager TEXT,
        region TEXT DEFAULT 'TG',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await pool.query(`ALTER TABLE krispies_stores ADD COLUMN IF NOT EXISTS region TEXT DEFAULT 'TG'`).catch(() => {});

    await pool.query(`
      CREATE TABLE IF NOT EXISTS krispies_sales (
        id SERIAL PRIMARY KEY,
        store_id INTEGER REFERENCES krispies_stores(id) ON DELETE CASCADE,
        sale_date DATE NOT NULL,
        amount REAL DEFAULT 0,
        transactions INTEGER DEFAULT 0,
        target REAL DEFAULT 0,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(store_id, sale_date)
      )
    `);

    // Migrations: cash/online split columns for Google Sheets sync
    await pool.query(`ALTER TABLE krispies_sales ADD COLUMN IF NOT EXISTS cash_sales REAL DEFAULT 0`).catch(() => {});
    await pool.query(`ALTER TABLE krispies_sales ADD COLUMN IF NOT EXISTS online_sales REAL DEFAULT 0`).catch(() => {});

    await pool.query(`
      CREATE TABLE IF NOT EXISTS store_compliance (
        id SERIAL PRIMARY KEY,
        store_id INTEGER REFERENCES krispies_stores(id) ON DELETE CASCADE,
        check_date DATE NOT NULL,
        item_key TEXT NOT NULL,
        status TEXT DEFAULT 'pending',
        notes TEXT,
        checked_by INTEGER REFERENCES users(id),
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(store_id, check_date, item_key)
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS krispies_renewals (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        category TEXT DEFAULT 'licence',
        frequency TEXT DEFAULT 'annual',
        store_id INTEGER REFERENCES krispies_stores(id) ON DELETE CASCADE,
        due_date DATE,
        last_done DATE,
        responsible TEXT,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('Tables created/verified');

    // Seed data
    await seedData();
    // Krispies seed runs independently (idempotent) so it populates even on existing DBs
    await seedKrispies();
  } catch (err) {
    console.error('DB init error:', err);
    process.exit(1);
  }
}

async function seedKrispies() {
  const { rows: storeCount } = await pool.query('SELECT COUNT(*) as cnt FROM krispies_stores');
  if (parseInt(storeCount[0].cnt) === 0) {
    const stores = [
      ['Tukkuguda', 'Tukkuguda, Hyderabad', 'Ramesh'],
      ['Suchitra', 'Suchitra Circle, Hyderabad', 'Lakshmi'],
      ['Boduppal', 'Boduppal, Hyderabad', 'Venkat'],
      ['Lalbazar', 'Lalbazar, Secunderabad', 'Anil'],
      ['Ramantapur', 'Ramantapur, Hyderabad', 'Priya'],
      ['Nacharam', 'Nacharam, Hyderabad', 'Kiran'],
    ];
    for (const [name, location, manager] of stores) {
      await pool.query('INSERT INTO krispies_stores (name, location, manager) VALUES ($1,$2,$3)', [name, location, manager]);
    }
    console.log('Seeded Krispies stores');
  }

  const { rows: salesCount } = await pool.query('SELECT COUNT(*) as cnt FROM krispies_sales');
  if (parseInt(salesCount[0].cnt) === 0) {
    const { rows: stores } = await pool.query('SELECT id FROM krispies_stores');
    for (const store of stores) {
      for (let d = 13; d >= 0; d--) {
        const date = new Date();
        date.setDate(date.getDate() - d);
        const dateStr = date.toISOString().split('T')[0];
        const amount = Math.floor(15000 + Math.random() * 30000);
        const transactions = Math.floor(50 + Math.random() * 150);
        await pool.query(
          'INSERT INTO krispies_sales (store_id, sale_date, amount, transactions, target) VALUES ($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING',
          [store.id, dateStr, amount, transactions, 30000]
        );
      }
    }
    console.log('Seeded Krispies sales');
  }

  // Migration: old model stored licences as business-wide (store_id NULL).
  // New model = per-store matrix. If any NULL-store licence exists, wipe & reseed.
  const { rows: oldModel } = await pool.query(
    `SELECT COUNT(*) as cnt FROM krispies_renewals WHERE store_id IS NULL AND category='licence'`
  );
  if (parseInt(oldModel[0].cnt) > 0) {
    await pool.query('DELETE FROM krispies_renewals');
    console.log('Cleared old business-wide renewals for per-store reseed');
  }

  // Remove discontinued Shop & Establishment rows
  await pool.query(`DELETE FROM krispies_renewals WHERE title = 'Shop & Establishment'`).catch(() => {});

  // Rename NSL store -> Nacharam (NSL was a placeholder; Nacharam is a real outlet)
  await pool.query(`UPDATE krispies_stores SET name='Nacharam', location='Nacharam, Hyderabad' WHERE name='NSL'`).catch(() => {});

  // Assign regions: Hyderabad outlets = TG, Anakapalle outlets = AP
  await pool.query(`UPDATE krispies_stores SET region='TG' WHERE name IN ('Tukkuguda','Suchitra','Boduppal','Lalbazar','Ramantapur','Nacharam')`).catch(() => {});
  // Add the two Anakapalle (AP) stores if missing — names must match the sheet group headers exactly
  await pool.query(`INSERT INTO krispies_stores (name, location, manager, region) VALUES ('Surabhi Cake House', 'Anakapalle, AP', 'Manager', 'AP') ON CONFLICT (name) DO UPDATE SET region='AP'`).catch(() => {});
  await pool.query(`INSERT INTO krispies_stores (name, location, manager, region) VALUES ('Suruchi', 'Anakapalle, AP', 'Manager', 'AP') ON CONFLICT (name) DO UPDATE SET region='AP'`).catch(() => {});

  const { rows: renCount } = await pool.query('SELECT COUNT(*) as cnt FROM krispies_renewals');
  if (parseInt(renCount[0].cnt) === 0) {
    function daysFromNow(n) { const d = new Date(); d.setDate(d.getDate() + n); return d.toISOString().split('T')[0]; }
    const monthStr = (day) => { const d = new Date(); d.setDate(day); return d.toISOString().split('T')[0]; };

    const { rows: stores } = await pool.query('SELECT id FROM krispies_stores ORDER BY id');

    // Per-store renewal templates: [title, category, frequency, baseDayOffset]
    // Each store's date is staggered slightly so they don't all fall on the same day.
    const perStore = [
      ['FSSAI Licence',          'licence', 'annual',  -5],
      ['Trade Licence (GHMC)',   'licence', 'annual',  12],
      ['Fire Safety NOC',        'licence', 'annual',   8],
      ['Labour Licence',         'licence', 'annual',  40],
      ['Food Handler Medical',   'health',  'annual',  55],
      ['Weighing Scale Stamping','licence', 'annual', 150],
      ['Pest Control Service',   'service', 'monthly',  null], // monthly -> 25th
      ['Deep Cleaning',          'service', 'monthly',  null], // monthly -> 28th
    ];

    for (let si = 0; si < stores.length; si++) {
      const st = stores[si];
      for (const [title, category, frequency, baseOffset] of perStore) {
        let due;
        if (frequency === 'monthly') {
          due = monthStr(title === 'Pest Control Service' ? 25 : 28);
        } else {
          // stagger each store by si*4 days so dates differ across stores
          due = daysFromNow(baseOffset + si * 4);
        }
        await pool.query(
          'INSERT INTO krispies_renewals (title, category, frequency, store_id, due_date, responsible) VALUES ($1,$2,$3,$4,$5,$6)',
          [title, category, frequency, st.id, due, 'Surabhi']
        );
      }
    }

    // Business-wide items (one delivery vehicle) — store_id NULL, category 'vehicle'
    await pool.query(
      'INSERT INTO krispies_renewals (title, category, frequency, store_id, due_date, responsible) VALUES ($1,$2,$3,NULL,$4,$5)',
      ['Road Tax - Delivery Vehicle', 'vehicle', 'annual', daysFromNow(20), 'Surabhi']
    );
    await pool.query(
      'INSERT INTO krispies_renewals (title, category, frequency, store_id, due_date, responsible) VALUES ($1,$2,$3,NULL,$4,$5)',
      ['Vehicle Insurance', 'vehicle', 'annual', daysFromNow(110), 'Surabhi']
    );

    console.log('Seeded per-store Krispies renewals');
  }
}

async function seedData() {
  // Check if already seeded
  const existing = await pool.query('SELECT COUNT(*) FROM users');
  if (parseInt(existing.rows[0].count) > 0) {
    console.log('DB already seeded, skipping');
    return;
  }

  console.log('Seeding database...');

  const password = await bcrypt.hash('solvvai123', 10);

  // Users
  const usersData = [
    { name: 'Surabhi', email: 'surabhi@solvvai.com', role: 'admin', avatar_color: '#6c63ff' },
    { name: 'Shilpa', email: 'shilpa@solvvai.com', role: 'member', avatar_color: '#f59e0b' },
    { name: 'Tejas', email: 'tejas@solvvai.com', role: 'member', avatar_color: '#10b981' },
    { name: 'Ritesh', email: 'ritesh@solvvai.com', role: 'member', avatar_color: '#3b82f6' },
    { name: 'Sneha', email: 'sneha@solvvai.com', role: 'member', avatar_color: '#ec4899' }
  ];

  const userIds = {};
  for (const u of usersData) {
    const result = await pool.query(`
      INSERT INTO users (name, email, password_hash, role, avatar_color)
      VALUES ($1, $2, $3, $4, $5) RETURNING id
    `, [u.name, u.email, password, u.role, u.avatar_color]);
    userIds[u.name] = result.rows[0].id;
  }

  // Workspaces
  const workspacesData = [
    { name: 'Krispies', emoji: '🥐', color: '#f97316' },
    { name: 'Solvv AI', emoji: '🤖', color: '#8b5cf6' },
    { name: 'Krispies Content', emoji: '🎬', color: '#10b981' },
    { name: 'Solvv Content', emoji: '🤖', color: '#6366f1' },
    { name: "Surabhi's Channel", emoji: '📺', color: '#ec4899' }
  ];

  const wsIds = {};
  for (const w of workspacesData) {
    const result = await pool.query(`
      INSERT INTO workspaces (name, emoji, color) VALUES ($1, $2, $3) RETURNING id
    `, [w.name, w.emoji, w.color]);
    wsIds[w.name] = result.rows[0].id;
  }

  // User <-> Workspace mappings
  const mappings = [
    // Surabhi (admin) - all workspaces
    [userIds['Surabhi'], wsIds['Krispies']],
    [userIds['Surabhi'], wsIds['Solvv AI']],
    [userIds['Surabhi'], wsIds['Krispies Content']],
    [userIds['Surabhi'], wsIds['Solvv Content']],
    [userIds['Surabhi'], wsIds["Surabhi's Channel"]],
    // Shilpa - Krispies
    [userIds['Shilpa'], wsIds['Krispies']],
    // Tejas - Marketing, Ads, Content
    [userIds['Tejas'], wsIds['Krispies Content']],
    [userIds['Tejas'], wsIds['Solvv Content']],
    [userIds['Tejas'], wsIds["Surabhi's Channel"]],
    // Ritesh - Solvv AI
    [userIds['Ritesh'], wsIds['Solvv AI']],
    // Sneha - Solvv AI
    [userIds['Sneha'], wsIds['Solvv AI']]
  ];

  for (const [uid, wid] of mappings) {
    await pool.query(
      'INSERT INTO user_workspaces (user_id, workspace_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [uid, wid]
    );
  }

  // Sample Tasks
  const now = new Date();
  const tomorrow = new Date(now.getTime() + 86400000);
  const nextWeek = new Date(now.getTime() + 7 * 86400000);
  const yesterday = new Date(now.getTime() - 86400000);

  const tasksData = [
    {
      title: 'Design new bakery menu layout',
      description: 'Create a fresh seasonal menu design with updated pricing and new items.',
      status: 'inprogress',
      priority: 'high',
      workspace: 'Krispies',
      assignee: 'Shilpa',
      creator: 'Surabhi',
      due_date: tomorrow.toISOString().split('T')[0]
    },
    {
      title: 'Set up social media posting schedule',
      description: 'Plan and schedule posts for Instagram, Facebook, and Twitter for the next month.',
      status: 'todo',
      priority: 'medium',
      workspace: 'Krispies Content',
      assignee: 'Tejas',
      creator: 'Surabhi',
      due_date: nextWeek.toISOString().split('T')[0]
    },
    {
      title: 'Q2 Sales Pipeline Review',
      description: 'Review all active deals in the pipeline and update probability scores.',
      status: 'todo',
      priority: 'high',
      workspace: 'Solvv AI',
      assignee: 'Ritesh',
      creator: 'Surabhi',
      due_date: tomorrow.toISOString().split('T')[0]
    },
    {
      title: 'Customer onboarding flow documentation',
      description: 'Document the complete onboarding process for new Solvv AI customers.',
      status: 'inprogress',
      priority: 'medium',
      workspace: 'Solvv AI',
      assignee: 'Sneha',
      creator: 'Sneha',
      due_date: nextWeek.toISOString().split('T')[0]
    },
    {
      title: 'Shoot product photography',
      description: 'Take high-quality photos of new croissant varieties for the website.',
      status: 'done',
      priority: 'low',
      workspace: 'Krispies Content',
      assignee: 'Tejas',
      creator: 'Shilpa',
      due_date: yesterday.toISOString().split('T')[0]
    },
    {
      title: 'Write investor pitch deck',
      description: 'Prepare a compelling pitch deck for Series A funding round.',
      status: 'inprogress',
      priority: 'high',
      workspace: 'Solvv AI',
      assignee: 'Surabhi',
      creator: 'Surabhi',
      due_date: nextWeek.toISOString().split('T')[0]
    },
    {
      title: 'YouTube channel branding update',
      description: 'Refresh channel art, thumbnails, and intro animation.',
      status: 'todo',
      priority: 'medium',
      workspace: "Surabhi's Channel",
      assignee: 'Tejas',
      creator: 'Surabhi',
      due_date: nextWeek.toISOString().split('T')[0]
    },
    {
      title: 'Monthly newsletter content',
      description: 'Write and design the monthly customer newsletter.',
      status: 'todo',
      priority: 'low',
      workspace: 'Krispies',
      assignee: 'Shilpa',
      creator: 'Shilpa',
      due_date: nextWeek.toISOString().split('T')[0]
    },
    {
      title: 'CRM data cleanup',
      description: 'Remove duplicate entries and update contact information in the CRM.',
      status: 'done',
      priority: 'medium',
      workspace: 'Solvv AI',
      assignee: 'Ritesh',
      creator: 'Ritesh',
      due_date: yesterday.toISOString().split('T')[0]
    },
    {
      title: 'Create promo video for Solvv launch',
      description: '2-minute promotional video showcasing AI features.',
      status: 'inprogress',
      priority: 'high',
      workspace: 'Solvv Content',
      assignee: 'Tejas',
      creator: 'Surabhi',
      due_date: tomorrow.toISOString().split('T')[0]
    }
  ];

  for (const t of tasksData) {
    await pool.query(`
      INSERT INTO tasks (title, description, status, priority, workspace_id, assignee_id, created_by, due_date)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `, [
      t.title, t.description, t.status, t.priority,
      wsIds[t.workspace], userIds[t.assignee], userIds[t.creator], t.due_date
    ]);
  }

  // Sample Meetings
  const todayMeeting = new Date();
  todayMeeting.setHours(14, 0, 0, 0);

  const tomorrowMeeting = new Date(tomorrow);
  tomorrowMeeting.setHours(10, 0, 0, 0);

  const meetingsData = [
    {
      title: 'Weekly Team Standup',
      workspace: 'Krispies',
      creator: 'Surabhi',
      start_time: todayMeeting.toISOString(),
      duration_mins: 30,
      agenda: '1. Project updates\n2. Blockers\n3. This week\'s priorities',
      attendees: ['Surabhi', 'Shilpa', 'Tejas']
    },
    {
      title: 'Solvv AI Sales Review',
      workspace: 'Solvv AI',
      creator: 'Ritesh',
      start_time: tomorrowMeeting.toISOString(),
      duration_mins: 60,
      agenda: '1. Pipeline review\n2. Deal updates\n3. Next steps',
      attendees: ['Ritesh', 'Sneha', 'Surabhi']
    },
    {
      title: 'Content Planning Session',
      workspace: 'Krispies Content',
      creator: 'Tejas',
      start_time: new Date(now.getTime() + 2 * 86400000).toISOString(),
      duration_mins: 45,
      agenda: '1. Q3 content calendar\n2. Video scripts review\n3. Brand voice alignment',
      attendees: ['Tejas', 'Surabhi']
    }
  ];

  for (const m of meetingsData) {
    const mResult = await pool.query(`
      INSERT INTO meetings (title, workspace_id, created_by, start_time, duration_mins, agenda)
      VALUES ($1, $2, $3, $4, $5, $6) RETURNING id
    `, [m.title, wsIds[m.workspace], userIds[m.creator], m.start_time, m.duration_mins, m.agenda]);

    for (const attendeeName of m.attendees) {
      await pool.query(
        'INSERT INTO meeting_attendees (meeting_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [mResult.rows[0].id, userIds[attendeeName]]
      );
    }
  }

  // Sample Updates
  const updatesData = [
    {
      content: "Just finished the new croissant recipe! 🥐 The almond filling turned out amazing. Can't wait for everyone to try it at tomorrow's tasting session.",
      user: 'Shilpa',
      workspace: 'Krispies'
    },
    {
      content: "Solvv AI closed 3 new enterprise deals this week! 🎉 Pipeline looking really healthy. Team crushing it!",
      user: 'Ritesh',
      workspace: 'Solvv AI'
    },
    {
      content: "Posted 5 new recipe videos this month. Engagement is up 40% compared to last month. The behind-the-scenes content is really resonating.",
      user: 'Tejas',
      workspace: "Surabhi's Channel"
    },
    {
      content: "Customer success team onboarded 12 new clients this month. NPS score hit 72! Sneha has been doing incredible work.",
      user: 'Sneha',
      workspace: 'Solvv AI'
    },
    {
      content: "Excited to announce we're launching a new pastry line next month! Promo materials are in production.",
      user: 'Surabhi',
      workspace: 'Krispies Content'
    }
  ];

  const updateIds = [];
  for (const upd of updatesData) {
    const result = await pool.query(`
      INSERT INTO updates (content, user_id, workspace_id) VALUES ($1, $2, $3) RETURNING id
    `, [upd.content, userIds[upd.user], wsIds[upd.workspace]]);
    updateIds.push(result.rows[0].id);
  }

  // Some likes
  if (updateIds.length >= 3) {
    await pool.query('INSERT INTO update_likes (update_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [updateIds[0], userIds['Surabhi']]);
    await pool.query('INSERT INTO update_likes (update_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [updateIds[0], userIds['Tejas']]);
    await pool.query('INSERT INTO update_likes (update_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [updateIds[1], userIds['Surabhi']]);
    await pool.query('INSERT INTO update_likes (update_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [updateIds[1], userIds['Sneha']]);
    await pool.query('INSERT INTO update_likes (update_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [updateIds[2], userIds['Surabhi']]);
  }

  // Seed Deals
  const { rows: dealRows } = await pool.query("SELECT COUNT(*) as cnt FROM deals");
  if (parseInt(dealRows[0].cnt) === 0) {
    const { rows: dealUsers } = await pool.query("SELECT id, name FROM users WHERE name IN ('Ritesh', 'Sneha')");
    const ritesh = dealUsers.find(u => u.name === 'Ritesh');
    const sneha = dealUsers.find(u => u.name === 'Sneha');

    const seedDeals = [
      ['TechCorp Solutions', 'AI Automation Suite', 'lead', 85000, 10, 'John Smith', 'john@techcorp.com', '+91 98765 43210', ritesh?.id, 'Initial contact made via LinkedIn', '2026-07-15'],
      ['GreenLeaf Retail', 'E-commerce AI Assistant', 'meeting_scheduled', 45000, 30, 'Priya Patel', 'priya@greenleaf.com', '+91 87654 32109', sneha?.id, 'Demo scheduled for next week', '2026-06-30'],
      ['FinanceFirst Bank', 'Customer Service Bot', 'proposal', 120000, 60, 'Rajesh Kumar', 'rajesh@financefirst.com', '+91 76543 21098', ritesh?.id, 'Proposal sent, awaiting board approval', '2026-06-20'],
      ['MediCare Health', 'Patient Engagement AI', 'negotiation', 95000, 80, 'Dr. Anita Shah', 'anita@medicare.com', '+91 65432 10987', sneha?.id, 'Finalizing contract terms', '2026-06-15'],
      ['EduTech Global', 'Learning Assistant Bot', 'won', 65000, 100, 'Michael Chen', 'michael@edutech.com', '+91 54321 09876', ritesh?.id, 'Contract signed! Onboarding next Monday', '2026-06-10'],
      ['RetailMax Chain', 'Inventory AI System', 'won', 78000, 100, 'Sunita Verma', 'sunita@retailmax.com', '+91 43210 98765', sneha?.id, 'Deployment in progress', '2026-06-05'],
      ['LogiTrans Co', 'Route Optimization AI', 'lost', 55000, 0, 'Amit Joshi', 'amit@logitrans.com', '+91 32109 87654', ritesh?.id, 'Went with competitor pricing', '2026-05-30'],
      ['StartupHub Inc', 'CRM Automation', 'lead', 32000, 10, 'Ravi Sharma', 'ravi@startuphub.com', '+91 21098 76543', sneha?.id, 'Referred by existing client', '2026-07-30'],
      ['CloudServe Ltd', 'IT Helpdesk AI', 'meeting_scheduled', 88000, 40, 'Nina Reddy', 'nina@cloudserve.com', '+91 10987 65432', ritesh?.id, 'Technical evaluation underway', '2026-07-10'],
      ['FoodChain Pro', 'Supply Chain AI', 'proposal', 110000, 55, 'Kiran Nair', 'kiran@foodchain.com', '+91 09876 54321', sneha?.id, 'Customized proposal being prepared', '2026-06-25'],
    ];

    for (const [company, title, stage, value, probability, contact_name, contact_email, contact_phone, assignee_id, notes, expected_close_date] of seedDeals) {
      await pool.query(
        'INSERT INTO deals (company, title, stage, value, probability, contact_name, contact_email, contact_phone, assignee_id, notes, expected_close_date) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)',
        [company, title, stage, value, probability, contact_name, contact_email, contact_phone, assignee_id, notes, expected_close_date]
      );
    }
    console.log('Seeded 10 deals');
  }

  console.log('Seed data inserted successfully!');
}

// Start server
app.listen(PORT, async () => {
  console.log(`Business HQ backend running on port ${PORT}`);
  await initDB();
});
