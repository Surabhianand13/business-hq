const express = require('express');
const router = express.Router();
const pool = require('../db');
const auth = require('../middleware/auth');

// GET /api/updates
router.get('/', auth, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT upd.*,
        u.name AS user_name, u.avatar_color,
        w.name AS workspace_name, w.emoji AS workspace_emoji, w.color AS workspace_color,
        COUNT(DISTINCT ul.user_id) AS like_count,
        COUNT(DISTINCT uc.id) AS comment_count
      FROM updates upd
      LEFT JOIN users u ON upd.user_id = u.id
      LEFT JOIN workspaces w ON upd.workspace_id = w.id
      LEFT JOIN update_likes ul ON upd.id = ul.update_id
      LEFT JOIN update_comments uc ON upd.id = uc.update_id
      GROUP BY upd.id, u.name, u.avatar_color, w.name, w.emoji, w.color
      ORDER BY upd.created_at DESC
      LIMIT 50
    `);

    const updates = result.rows;

    // Get liked_by_me
    for (const upd of updates) {
      const likedResult = await pool.query(`
        SELECT 1 FROM update_likes WHERE update_id = $1 AND user_id = $2
      `, [upd.id, req.user.id]);
      upd.liked_by_me = likedResult.rows.length > 0;

      const commentsResult = await pool.query(`
        SELECT uc.*, u.name AS user_name, u.avatar_color
        FROM update_comments uc
        JOIN users u ON uc.user_id = u.id
        WHERE uc.update_id = $1
        ORDER BY uc.created_at ASC
      `, [upd.id]);
      upd.comments = commentsResult.rows;
    }

    res.json(updates);
  } catch (err) {
    console.error('Get updates error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/updates
router.post('/', auth, async (req, res) => {
  const { content, workspace_id } = req.body;
  if (!content || !workspace_id) {
    return res.status(400).json({ error: 'Content and workspace are required' });
  }

  try {
    const result = await pool.query(`
      INSERT INTO updates (content, user_id, workspace_id)
      VALUES ($1, $2, $3)
      RETURNING *
    `, [content, req.user.id, workspace_id]);

    const enriched = await pool.query(`
      SELECT upd.*,
        u.name AS user_name, u.avatar_color,
        w.name AS workspace_name, w.emoji AS workspace_emoji, w.color AS workspace_color,
        0 AS like_count, 0 AS comment_count
      FROM updates upd
      LEFT JOIN users u ON upd.user_id = u.id
      LEFT JOIN workspaces w ON upd.workspace_id = w.id
      WHERE upd.id = $1
    `, [result.rows[0].id]);

    const upd = enriched.rows[0];
    upd.liked_by_me = false;
    upd.comments = [];

    res.status(201).json(upd);
  } catch (err) {
    console.error('Create update error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/updates/:id/like
router.post('/:id/like', auth, async (req, res) => {
  const { id } = req.params;

  try {
    const existing = await pool.query(
      'SELECT 1 FROM update_likes WHERE update_id = $1 AND user_id = $2',
      [id, req.user.id]
    );

    if (existing.rows.length > 0) {
      await pool.query(
        'DELETE FROM update_likes WHERE update_id = $1 AND user_id = $2',
        [id, req.user.id]
      );
      const countResult = await pool.query('SELECT COUNT(*) FROM update_likes WHERE update_id = $1', [id]);
      return res.json({ liked: false, count: parseInt(countResult.rows[0].count) });
    } else {
      await pool.query(
        'INSERT INTO update_likes (update_id, user_id) VALUES ($1, $2)',
        [id, req.user.id]
      );
      const countResult = await pool.query('SELECT COUNT(*) FROM update_likes WHERE update_id = $1', [id]);
      return res.json({ liked: true, count: parseInt(countResult.rows[0].count) });
    }
  } catch (err) {
    console.error('Like update error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/updates/:id/comment
router.post('/:id/comment', auth, async (req, res) => {
  const { content } = req.body;
  if (!content) return res.status(400).json({ error: 'Content required' });

  try {
    const result = await pool.query(`
      INSERT INTO update_comments (update_id, user_id, content)
      VALUES ($1, $2, $3)
      RETURNING *
    `, [req.params.id, req.user.id, content]);

    const enriched = await pool.query(`
      SELECT uc.*, u.name AS user_name, u.avatar_color
      FROM update_comments uc
      JOIN users u ON uc.user_id = u.id
      WHERE uc.id = $1
    `, [result.rows[0].id]);

    res.status(201).json(enriched.rows[0]);
  } catch (err) {
    console.error('Comment update error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
