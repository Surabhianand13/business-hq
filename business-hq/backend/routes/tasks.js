const express = require('express');
const router = express.Router();
const pool = require('../db');
const auth = require('../middleware/auth');

// Shared SELECT that aggregates collaborators as a JSON array
const TASK_SELECT = `
  SELECT t.*,
    u_assignee.name AS assignee_name, u_assignee.avatar_color AS assignee_color,
    u_creator.name AS creator_name,
    w.name AS workspace_name, w.emoji AS workspace_emoji, w.color AS workspace_color,
    COALESCE(
      (SELECT json_agg(json_build_object('id', cu.id, 'name', cu.name, 'avatar_color', cu.avatar_color))
       FROM task_collaborators tc
       JOIN users cu ON tc.user_id = cu.id
       WHERE tc.task_id = t.id),
      '[]'
    ) AS collaborators
  FROM tasks t
  LEFT JOIN users u_assignee ON t.assignee_id = u_assignee.id
  LEFT JOIN users u_creator ON t.created_by = u_creator.id
  LEFT JOIN workspaces w ON t.workspace_id = w.id
`;

// Replace collaborators for a task
async function setCollaborators(taskId, collaboratorIds) {
  await pool.query('DELETE FROM task_collaborators WHERE task_id = $1', [taskId]);
  if (Array.isArray(collaboratorIds) && collaboratorIds.length > 0) {
    const values = collaboratorIds.map((_, i) => `($1, $${i + 2})`).join(', ');
    await pool.query(
      `INSERT INTO task_collaborators (task_id, user_id) VALUES ${values} ON CONFLICT DO NOTHING`,
      [taskId, ...collaboratorIds]
    );
  }
}

// GET /api/tasks
router.get('/', auth, async (req, res) => {
  try {
    let query, params;
    if (req.user.role === 'admin') {
      query = `${TASK_SELECT} ORDER BY t.created_at DESC`;
      params = [];
    } else {
      // Member sees: tasks they created, are assigned to, OR collaborate on
      query = `${TASK_SELECT}
        WHERE t.assignee_id = $1
           OR t.created_by = $1
           OR EXISTS (SELECT 1 FROM task_collaborators tc WHERE tc.task_id = t.id AND tc.user_id = $1)
        ORDER BY t.created_at DESC`;
      params = [req.user.id];
    }
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('Get tasks error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/tasks
router.post('/', auth, async (req, res) => {
  const { title, description, status, priority, workspace_id, assignee_id, due_date, collaborator_ids } = req.body;
  if (!title || !workspace_id) {
    return res.status(400).json({ error: 'Title and workspace are required' });
  }
  try {
    const result = await pool.query(`
      INSERT INTO tasks (title, description, status, priority, workspace_id, assignee_id, created_by, due_date)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id
    `, [
      title, description || null, status || 'todo', priority || 'medium',
      workspace_id, assignee_id || null, req.user.id, due_date || null
    ]);
    const taskId = result.rows[0].id;
    await setCollaborators(taskId, collaborator_ids);

    const enriched = await pool.query(`${TASK_SELECT} WHERE t.id = $1`, [taskId]);
    res.status(201).json(enriched.rows[0]);
  } catch (err) {
    console.error('Create task error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/tasks/:id
router.put('/:id', auth, async (req, res) => {
  const { id } = req.params;
  const { title, description, status, priority, workspace_id, assignee_id, due_date, collaborator_ids } = req.body;
  try {
    const existing = await pool.query('SELECT * FROM tasks WHERE id = $1', [id]);
    if (existing.rows.length === 0) return res.status(404).json({ error: 'Task not found' });

    const task = existing.rows[0];
    if (req.user.role !== 'admin' && task.created_by !== req.user.id && task.assignee_id !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    await pool.query(`
      UPDATE tasks SET
        title = COALESCE($1, title),
        description = COALESCE($2, description),
        status = COALESCE($3, status),
        priority = COALESCE($4, priority),
        workspace_id = COALESCE($5, workspace_id),
        assignee_id = $6,
        due_date = $7
      WHERE id = $8
    `, [title, description, status, priority, workspace_id, assignee_id || null, due_date || null, id]);

    // Only update collaborators if the field was provided
    if (collaborator_ids !== undefined) {
      await setCollaborators(id, collaborator_ids);
    }

    const enriched = await pool.query(`${TASK_SELECT} WHERE t.id = $1`, [id]);
    res.json(enriched.rows[0]);
  } catch (err) {
    console.error('Update task error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/tasks/:id
router.delete('/:id', auth, async (req, res) => {
  const { id } = req.params;
  try {
    const existing = await pool.query('SELECT * FROM tasks WHERE id = $1', [id]);
    if (existing.rows.length === 0) return res.status(404).json({ error: 'Task not found' });

    const task = existing.rows[0];
    if (req.user.role !== 'admin' && task.created_by !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    await pool.query('DELETE FROM task_collaborators WHERE task_id = $1', [id]);
    await pool.query('DELETE FROM task_comments WHERE task_id = $1', [id]);
    await pool.query('DELETE FROM tasks WHERE id = $1', [id]);
    res.json({ message: 'Task deleted' });
  } catch (err) {
    console.error('Delete task error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/tasks/:id/comments
router.get('/:id/comments', auth, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT tc.*, u.name AS user_name, u.avatar_color
      FROM task_comments tc
      JOIN users u ON tc.user_id = u.id
      WHERE tc.task_id = $1
      ORDER BY tc.created_at ASC
    `, [req.params.id]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/tasks/:id/comments
router.post('/:id/comments', auth, async (req, res) => {
  const { content } = req.body;
  if (!content) return res.status(400).json({ error: 'Content required' });
  try {
    const result = await pool.query(`
      INSERT INTO task_comments (task_id, user_id, content)
      VALUES ($1, $2, $3) RETURNING *
    `, [req.params.id, req.user.id, content]);

    const enriched = await pool.query(`
      SELECT tc.*, u.name AS user_name, u.avatar_color
      FROM task_comments tc
      JOIN users u ON tc.user_id = u.id
      WHERE tc.id = $1
    `, [result.rows[0].id]);
    res.status(201).json(enriched.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
