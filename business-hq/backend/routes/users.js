const express = require('express');
const router = express.Router();
const pool = require('../db');
const auth = require('../middleware/auth');

// GET /api/users - all users with workspace info
router.get('/', auth, async (req, res) => {
  try {
    const usersResult = await pool.query(`
      SELECT u.id, u.name, u.email, u.role, u.avatar_color, u.created_at
      FROM users u
      ORDER BY u.role DESC, u.name ASC
    `);

    const users = usersResult.rows;

    // For each user, get their workspaces and task count
    for (const user of users) {
      const wsResult = await pool.query(`
        SELECT w.id, w.name, w.emoji, w.color
        FROM workspaces w
        JOIN user_workspaces uw ON w.id = uw.workspace_id
        WHERE uw.user_id = $1
      `, [user.id]);
      user.workspaces = wsResult.rows;

      const taskResult = await pool.query(`
        SELECT COUNT(*) FROM tasks WHERE assignee_id = $1
      `, [user.id]);
      user.task_count = parseInt(taskResult.rows[0].count);

      const activeTaskResult = await pool.query(`
        SELECT COUNT(*) FROM tasks WHERE assignee_id = $1 AND status != 'done'
      `, [user.id]);
      user.active_task_count = parseInt(activeTaskResult.rows[0].count);
    }

    res.json(users);
  } catch (err) {
    console.error('Get users error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/workspaces
router.get('/workspaces', auth, async (req, res) => {
  try {
    let result;
    if (req.user.role === 'admin') {
      result = await pool.query('SELECT * FROM workspaces ORDER BY name');
    } else {
      result = await pool.query(`
        SELECT w.* FROM workspaces w
        JOIN user_workspaces uw ON w.id = uw.workspace_id
        WHERE uw.user_id = $1
        ORDER BY w.name
      `, [req.user.id]);
    }
    res.json(result.rows);
  } catch (err) {
    console.error('Get workspaces error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
