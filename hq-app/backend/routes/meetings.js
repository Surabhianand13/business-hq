const express = require('express');
const router = express.Router();
const pool = require('../db');
const auth = require('../middleware/auth');

// GET /api/meetings
router.get('/', auth, async (req, res) => {
  try {
    let query;
    let params;

    if (req.user.role === 'admin') {
      query = `
        SELECT m.*,
          u.name AS creator_name,
          w.name AS workspace_name, w.emoji AS workspace_emoji, w.color AS workspace_color
        FROM meetings m
        LEFT JOIN users u ON m.created_by = u.id
        LEFT JOIN workspaces w ON m.workspace_id = w.id
        ORDER BY m.start_time DESC
      `;
      params = [];
    } else {
      query = `
        SELECT DISTINCT m.*,
          u.name AS creator_name,
          w.name AS workspace_name, w.emoji AS workspace_emoji, w.color AS workspace_color
        FROM meetings m
        LEFT JOIN users u ON m.created_by = u.id
        LEFT JOIN workspaces w ON m.workspace_id = w.id
        LEFT JOIN meeting_attendees ma ON m.id = ma.meeting_id
        WHERE m.created_by = $1 OR ma.user_id = $1
        ORDER BY m.start_time DESC
      `;
      params = [req.user.id];
    }

    const result = await pool.query(query, params);
    const meetings = result.rows;

    for (const meeting of meetings) {
      const attendeesResult = await pool.query(`
        SELECT u.id, u.name, u.avatar_color
        FROM users u
        JOIN meeting_attendees ma ON u.id = ma.user_id
        WHERE ma.meeting_id = $1
      `, [meeting.id]);
      meeting.attendees = attendeesResult.rows;
    }

    res.json(meetings);
  } catch (err) {
    console.error('Get meetings error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/meetings
router.post('/', auth, async (req, res) => {
  const { title, workspace_id, start_time, duration_mins, meeting_url, agenda, attendee_ids } = req.body;

  if (!title || !workspace_id || !start_time) {
    return res.status(400).json({ error: 'Title, workspace, and start time are required' });
  }

  try {
    const result = await pool.query(`
      INSERT INTO meetings (title, workspace_id, created_by, start_time, duration_mins, meeting_url, agenda)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [title, workspace_id, req.user.id, start_time, duration_mins || 60, meeting_url || null, agenda || null]);

    const meeting = result.rows[0];

    // Add attendees
    const allAttendees = new Set([req.user.id]);
    if (attendee_ids && Array.isArray(attendee_ids)) {
      attendee_ids.forEach(id => allAttendees.add(id));
    }

    for (const userId of allAttendees) {
      await pool.query(`
        INSERT INTO meeting_attendees (meeting_id, user_id) VALUES ($1, $2)
        ON CONFLICT DO NOTHING
      `, [meeting.id, userId]);
    }

    // Return enriched
    const enriched = await pool.query(`
      SELECT m.*,
        u.name AS creator_name,
        w.name AS workspace_name, w.emoji AS workspace_emoji, w.color AS workspace_color
      FROM meetings m
      LEFT JOIN users u ON m.created_by = u.id
      LEFT JOIN workspaces w ON m.workspace_id = w.id
      WHERE m.id = $1
    `, [meeting.id]);

    const attendeesResult = await pool.query(`
      SELECT u.id, u.name, u.avatar_color
      FROM users u
      JOIN meeting_attendees ma ON u.id = ma.user_id
      WHERE ma.meeting_id = $1
    `, [meeting.id]);

    const finalMeeting = enriched.rows[0];
    finalMeeting.attendees = attendeesResult.rows;

    res.status(201).json(finalMeeting);
  } catch (err) {
    console.error('Create meeting error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/meetings/:id
router.put('/:id', auth, async (req, res) => {
  const { id } = req.params;
  const { title, workspace_id, start_time, duration_mins, meeting_url, agenda, attendee_ids } = req.body;

  try {
    const existing = await pool.query('SELECT * FROM meetings WHERE id = $1', [id]);
    if (existing.rows.length === 0) return res.status(404).json({ error: 'Meeting not found' });

    if (req.user.role !== 'admin' && existing.rows[0].created_by !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    await pool.query(`
      UPDATE meetings SET
        title = COALESCE($1, title),
        workspace_id = COALESCE($2, workspace_id),
        start_time = COALESCE($3, start_time),
        duration_mins = COALESCE($4, duration_mins),
        meeting_url = $5,
        agenda = $6
      WHERE id = $7
    `, [title, workspace_id, start_time, duration_mins, meeting_url || null, agenda || null, id]);

    if (attendee_ids) {
      await pool.query('DELETE FROM meeting_attendees WHERE meeting_id = $1', [id]);
      const allAttendees = new Set([req.user.id]);
      attendee_ids.forEach(uid => allAttendees.add(uid));
      for (const userId of allAttendees) {
        await pool.query(`
          INSERT INTO meeting_attendees (meeting_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING
        `, [id, userId]);
      }
    }

    const enriched = await pool.query(`
      SELECT m.*,
        u.name AS creator_name,
        w.name AS workspace_name, w.emoji AS workspace_emoji, w.color AS workspace_color
      FROM meetings m
      LEFT JOIN users u ON m.created_by = u.id
      LEFT JOIN workspaces w ON m.workspace_id = w.id
      WHERE m.id = $1
    `, [id]);

    const attendeesResult = await pool.query(`
      SELECT u.id, u.name, u.avatar_color
      FROM users u
      JOIN meeting_attendees ma ON u.id = ma.user_id
      WHERE ma.meeting_id = $1
    `, [id]);

    const finalMeeting = enriched.rows[0];
    finalMeeting.attendees = attendeesResult.rows;

    res.json(finalMeeting);
  } catch (err) {
    console.error('Update meeting error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/meetings/:id
router.delete('/:id', auth, async (req, res) => {
  const { id } = req.params;

  try {
    const existing = await pool.query('SELECT * FROM meetings WHERE id = $1', [id]);
    if (existing.rows.length === 0) return res.status(404).json({ error: 'Meeting not found' });

    if (req.user.role !== 'admin' && existing.rows[0].created_by !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    await pool.query('DELETE FROM meeting_attendees WHERE meeting_id = $1', [id]);
    await pool.query('DELETE FROM meetings WHERE id = $1', [id]);

    res.json({ message: 'Meeting deleted' });
  } catch (err) {
    console.error('Delete meeting error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
