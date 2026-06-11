const express = require('express');
const router = express.Router();
const pool = require('../db');
const auth = require('../middleware/auth');

// GET /api/dashboard
router.get('/', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const isAdmin = req.user.role === 'admin';
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const tomorrowStr = new Date(today.getTime() + 86400000).toISOString().split('T')[0];

    // Task stats
    let taskQuery, taskParams;
    if (isAdmin) {
      taskQuery = 'SELECT status, COUNT(*) as count FROM tasks GROUP BY status';
      taskParams = [];
    } else {
      taskQuery = 'SELECT status, COUNT(*) as count FROM tasks WHERE assignee_id = $1 OR created_by = $1 GROUP BY status';
      taskParams = [userId];
    }
    const taskStats = await pool.query(taskQuery, taskParams);
    const stats = { todo: 0, inprogress: 0, done: 0 };
    taskStats.rows.forEach(r => { stats[r.status] = parseInt(r.count); });

    // Tasks due today
    let dueTodayQuery, dueTodayParams;
    if (isAdmin) {
      dueTodayQuery = `SELECT COUNT(*) FROM tasks WHERE due_date >= $1 AND due_date < $2 AND status != 'done'`;
      dueTodayParams = [todayStr, tomorrowStr];
    } else {
      dueTodayQuery = `SELECT COUNT(*) FROM tasks WHERE due_date >= $1 AND due_date < $2 AND status != 'done' AND (assignee_id = $3 OR created_by = $3)`;
      dueTodayParams = [todayStr, tomorrowStr, userId];
    }
    const dueTodayResult = await pool.query(dueTodayQuery, dueTodayParams);
    const tasks_due_today = parseInt(dueTodayResult.rows[0].count);

    // Meetings today
    let meetingsQuery, meetingsParams;
    if (isAdmin) {
      meetingsQuery = `SELECT COUNT(*) FROM meetings WHERE start_time >= $1 AND start_time < $2`;
      meetingsParams = [todayStr, tomorrowStr];
    } else {
      meetingsQuery = `
        SELECT COUNT(DISTINCT m.id) FROM meetings m
        LEFT JOIN meeting_attendees ma ON m.id = ma.meeting_id
        WHERE (m.created_by = $1 OR ma.user_id = $1)
        AND m.start_time >= $2 AND m.start_time < $3
      `;
      meetingsParams = [userId, todayStr, tomorrowStr];
    }
    const meetingsTodayResult = await pool.query(meetingsQuery, meetingsParams);
    const meetings_today = parseInt(meetingsTodayResult.rows[0].count);

    // Today's meeting list
    let todayMeetingsQuery, todayMeetingsParams;
    if (isAdmin) {
      todayMeetingsQuery = `
        SELECT m.*, u.name AS creator_name, w.name AS workspace_name, w.emoji AS workspace_emoji, w.color AS workspace_color
        FROM meetings m
        LEFT JOIN users u ON m.created_by = u.id
        LEFT JOIN workspaces w ON m.workspace_id = w.id
        WHERE m.start_time >= $1 AND m.start_time < $2
        ORDER BY m.start_time ASC
      `;
      todayMeetingsParams = [todayStr, tomorrowStr];
    } else {
      todayMeetingsQuery = `
        SELECT DISTINCT m.*, u.name AS creator_name, w.name AS workspace_name, w.emoji AS workspace_emoji, w.color AS workspace_color
        FROM meetings m
        LEFT JOIN users u ON m.created_by = u.id
        LEFT JOIN workspaces w ON m.workspace_id = w.id
        LEFT JOIN meeting_attendees ma ON m.id = ma.meeting_id
        WHERE (m.created_by = $1 OR ma.user_id = $1)
        AND m.start_time >= $2 AND m.start_time < $3
        ORDER BY m.start_time ASC
      `;
      todayMeetingsParams = [userId, todayStr, tomorrowStr];
    }
    const todayMeetingsResult = await pool.query(todayMeetingsQuery, todayMeetingsParams);

    // Team members count
    const teamResult = await pool.query('SELECT COUNT(*) FROM users');
    const team_count = parseInt(teamResult.rows[0].count);

    // Recent activity (last 10 tasks created/updated)
    let activityQuery, activityParams;
    if (isAdmin) {
      activityQuery = `
        SELECT t.id, t.title, t.status, t.created_at, u.name AS user_name, u.avatar_color,
          w.name AS workspace_name, w.emoji AS workspace_emoji
        FROM tasks t
        JOIN users u ON t.created_by = u.id
        LEFT JOIN workspaces w ON t.workspace_id = w.id
        ORDER BY t.created_at DESC LIMIT 10
      `;
      activityParams = [];
    } else {
      activityQuery = `
        SELECT t.id, t.title, t.status, t.created_at, u.name AS user_name, u.avatar_color,
          w.name AS workspace_name, w.emoji AS workspace_emoji
        FROM tasks t
        JOIN users u ON t.created_by = u.id
        LEFT JOIN workspaces w ON t.workspace_id = w.id
        WHERE t.assignee_id = $1 OR t.created_by = $1
        ORDER BY t.created_at DESC LIMIT 10
      `;
      activityParams = [userId];
    }
    const activityResult = await pool.query(activityQuery, activityParams);

    // Recent updates feed (last 5)
    const updatesResult = await pool.query(`
      SELECT upd.id, upd.content, upd.created_at,
        u.name AS user_name, u.avatar_color,
        w.name AS workspace_name, w.emoji AS workspace_emoji, w.color AS workspace_color,
        (SELECT COUNT(*) FROM update_likes ul WHERE ul.update_id = upd.id) AS likes_count
      FROM updates upd
      LEFT JOIN users u ON upd.user_id = u.id
      LEFT JOIN workspaces w ON upd.workspace_id = w.id
      ORDER BY upd.created_at DESC LIMIT 5
    `);

    // Team members with task counts
    const teamResult = await pool.query(`
      SELECT u.id, u.name, u.avatar_color, u.role,
        COUNT(CASE WHEN t.status != 'done' THEN 1 END) AS task_count
      FROM users u
      LEFT JOIN tasks t ON t.assignee_id = u.id
      GROUP BY u.id, u.name, u.avatar_color, u.role
      ORDER BY u.name
    `);

    res.json({
      stats: {
        todo: stats.todo,
        inprogress: stats.inprogress,
        done: stats.done,
        total: stats.todo + stats.inprogress + stats.done,
        tasks_due_today,
        meetings_today,
        team_count
      },
      today_meetings: todayMeetingsResult.rows,
      recent_activity: activityResult.rows,
      recent_updates: updatesResult.rows,
      team_members: teamResult.rows
    });
  } catch (err) {
    console.error('Dashboard error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
