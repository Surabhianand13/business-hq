import { useState, useEffect } from 'react';
import { useApp } from '../App';
import api from '../api';
import Modal from '../components/Modal';

const PRIORITY_COLORS = {
  high: { bg: '#fef2f2', color: '#dc2626', label: 'High' },
  medium: { bg: '#fffbeb', color: '#d97706', label: 'Medium' },
  low: { bg: '#f0fdf4', color: '#16a34a', label: 'Low' }
};

function PriorityBadge({ priority }) {
  const c = PRIORITY_COLORS[priority] || PRIORITY_COLORS.medium;
  return (
    <span style={{
      padding: '2px 8px', borderRadius: '6px',
      background: c.bg, color: c.color,
      fontSize: '11px', fontWeight: '600'
    }}>
      {c.label}
    </span>
  );
}

function WorkspaceBadge({ task }) {
  if (!task.workspace_name) return null;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '4px',
      padding: '2px 8px', borderRadius: '6px',
      background: `${task.workspace_color || '#6c63ff'}18`,
      color: task.workspace_color || '#6c63ff',
      fontSize: '11px', fontWeight: '600', whiteSpace: 'nowrap'
    }}>
      {task.workspace_emoji} {task.workspace_name}
    </span>
  );
}

function TaskCard({ task, onEdit, onDelete, onStatusChange }) {
  const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'done';

  return (
    <div className="kanban-card" style={{
      background: 'white', borderRadius: '14px', padding: '14px',
      border: '1px solid #f0f0f5', boxShadow: '0 1px 6px rgba(0,0,0,0.04)',
      cursor: 'default'
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '8px' }}>
        <div style={{ fontSize: '13px', fontWeight: '600', color: '#1a1a2e', lineHeight: 1.4, flex: 1, paddingRight: '8px' }}>
          {task.title}
        </div>
        <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
          <button
            onClick={() => onEdit(task)}
            style={{
              background: '#f5f5f7', border: 'none', cursor: 'pointer',
              width: '26px', height: '26px', borderRadius: '6px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#9ca3af', transition: 'all 0.15s'
            }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
          </button>
          <button
            onClick={() => onDelete(task.id)}
            style={{
              background: '#fef2f2', border: 'none', cursor: 'pointer',
              width: '26px', height: '26px', borderRadius: '6px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#ef4444', transition: 'all 0.15s'
            }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
              <path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
            </svg>
          </button>
        </div>
      </div>

      {task.description && (
        <div style={{
          fontSize: '12px', color: '#6b7280', marginBottom: '10px',
          lineHeight: 1.5, overflow: 'hidden', display: '-webkit-box',
          WebkitLineClamp: 2, WebkitBoxOrient: 'vertical'
        }}>
          {task.description}
        </div>
      )}

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '10px' }}>
        <WorkspaceBadge task={task} />
        <PriorityBadge priority={task.priority} />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {task.assignee_name && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <div style={{
                width: '22px', height: '22px', borderRadius: '50%',
                background: task.assignee_color || '#6c63ff',
                color: 'white', fontSize: '10px', fontWeight: '700',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                {task.assignee_name[0]}
              </div>
              <span style={{ fontSize: '11px', color: '#6b7280' }}>{task.assignee_name}</span>
            </div>
          )}
        </div>
        {task.due_date && (
          <span style={{
            fontSize: '11px', fontWeight: '500',
            color: isOverdue ? '#ef4444' : '#9ca3af',
            background: isOverdue ? '#fef2f2' : 'transparent',
            padding: isOverdue ? '2px 6px' : '0',
            borderRadius: '5px'
          }}>
            {isOverdue && '⚠️ '}
            {new Date(task.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </span>
        )}
      </div>

      {/* Quick status change */}
      <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid #f9f9fb', display: 'flex', gap: '4px' }}>
        {['todo', 'inprogress', 'done'].map(s => (
          <button
            key={s}
            onClick={() => onStatusChange(task.id, s)}
            style={{
              flex: 1, padding: '4px', borderRadius: '6px', border: 'none', cursor: 'pointer',
              fontSize: '10px', fontWeight: '600',
              background: task.status === s
                ? (s === 'done' ? '#f0fdf4' : s === 'inprogress' ? '#eff6ff' : '#f3f4f6')
                : '#f9f9fb',
              color: task.status === s
                ? (s === 'done' ? '#16a34a' : s === 'inprogress' ? '#3b82f6' : '#6b7280')
                : '#d1d5db',
              transition: 'all 0.15s'
            }}
          >
            {s === 'todo' ? 'Todo' : s === 'inprogress' ? 'In Prog' : 'Done'}
          </button>
        ))}
      </div>
    </div>
  );
}

function TaskFormModal({ isOpen, onClose, task, workspaces, users, onSave }) {
  const [form, setForm] = useState({
    title: '', description: '', status: 'todo', priority: 'medium',
    workspace_id: '', assignee_id: '', due_date: ''
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (task) {
      setForm({
        title: task.title || '',
        description: task.description || '',
        status: task.status || 'todo',
        priority: task.priority || 'medium',
        workspace_id: task.workspace_id || '',
        assignee_id: task.assignee_id || '',
        due_date: task.due_date ? task.due_date.split('T')[0] : ''
      });
    } else {
      setForm({ title: '', description: '', status: 'todo', priority: 'medium', workspace_id: '', assignee_id: '', due_date: '' });
    }
  }, [task, isOpen]);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      const data = {
        ...form,
        workspace_id: parseInt(form.workspace_id),
        assignee_id: form.assignee_id ? parseInt(form.assignee_id) : null,
        due_date: form.due_date || null
      };
      await onSave(data);
      onClose();
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={task ? 'Edit Task' : 'Create Task'}>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>
            Title *
          </label>
          <input
            className="input-field"
            value={form.title}
            onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            placeholder="What needs to be done?"
            required
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>
            Description
          </label>
          <textarea
            className="input-field"
            value={form.description}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            placeholder="Add more details..."
            rows={3}
            style={{ resize: 'vertical' }}
          />
        </div>

        <div className="form-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>
              Workspace *
            </label>
            <select
              className="input-field"
              value={form.workspace_id}
              onChange={e => setForm(f => ({ ...f, workspace_id: e.target.value }))}
              required
            >
              <option value="">Select workspace</option>
              {workspaces.map(w => (
                <option key={w.id} value={w.id}>{w.emoji} {w.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>
              Assignee
            </label>
            <select
              className="input-field"
              value={form.assignee_id}
              onChange={e => setForm(f => ({ ...f, assignee_id: e.target.value }))}
            >
              <option value="">Unassigned</option>
              {users.map(u => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="form-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>
              Status
            </label>
            <select
              className="input-field"
              value={form.status}
              onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
            >
              <option value="todo">Todo</option>
              <option value="inprogress">In Progress</option>
              <option value="done">Done</option>
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>
              Priority
            </label>
            <select
              className="input-field"
              value={form.priority}
              onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}
            >
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>
              Due Date
            </label>
            <input
              type="date"
              className="input-field"
              value={form.due_date}
              onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))}
            />
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', paddingTop: '8px' }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '10px 20px', borderRadius: '10px',
              border: '1.5px solid #e8e8ed', background: 'white',
              cursor: 'pointer', fontSize: '14px', fontWeight: '500', color: '#6b7280'
            }}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="btn-primary"
            style={{
              padding: '10px 24px', borderRadius: '10px',
              fontSize: '14px', fontWeight: '600',
              opacity: loading ? 0.7 : 1
            }}
          >
            {loading ? 'Saving...' : task ? 'Update Task' : 'Create Task'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export default function TasksPage() {
  const { user, addToast } = useApp();
  const [tasks, setTasks] = useState([]);
  const [workspaces, setWorkspaces] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterWorkspace, setFilterWorkspace] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editTask, setEditTask] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [viewMode, setViewMode] = useState('kanban'); // 'kanban' | 'assignee'

  // Auto-open modal if ?new=1 in URL (from TopBar "+ New Task" button)
  // Also read ?workspace= param from sidebar workspace nav
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('new') === '1') {
      setModalOpen(true);
      window.history.replaceState({}, '', '/tasks');
    }
    const ws = params.get('workspace');
    if (ws) {
      // We'll match workspace name after workspaces load; store name temporarily
      setFilterWorkspace('__ws__' + ws);
      window.history.replaceState({}, '', '/tasks');
    }
  }, []);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [t, w, u] = await Promise.all([api.getTasks(), api.getWorkspaces(), api.getUsers()]);
      setTasks(t);
      setWorkspaces(w);
      setUsers(u);
      // Resolve workspace name filter once workspaces are loaded
      setFilterWorkspace(prev => {
        if (prev && prev.startsWith('__ws__')) {
          const wsName = prev.slice(6);
          const matched = w.find(ws => ws.name === wsName);
          return matched ? String(matched.id) : '';
        }
        return prev;
      });
    } catch (err) {
      addToast('Failed to load tasks', 'error');
    } finally {
      setLoading(false);
    }
  }

  async function handleSave(data) {
    try {
      if (editTask) {
        const updated = await api.updateTask(editTask.id, data);
        setTasks(prev => prev.map(t => t.id === updated.id ? updated : t));
        addToast('Task updated!');
      } else {
        const created = await api.createTask(data);
        setTasks(prev => [created, ...prev]);
        addToast('Task created!');
      }
    } catch (err) {
      addToast(err.message || 'Failed to save task', 'error');
      throw err;
    }
  }

  async function handleDelete(id) {
    try {
      await api.deleteTask(id);
      setTasks(prev => prev.filter(t => t.id !== id));
      setDeleteConfirm(null);
      addToast('Task deleted');
    } catch (err) {
      addToast('Failed to delete task', 'error');
    }
  }

  async function handleStatusChange(id, status) {
    try {
      const updated = await api.updateTask(id, { status });
      setTasks(prev => prev.map(t => t.id === updated.id ? updated : t));
      addToast(`Moved to ${status === 'inprogress' ? 'In Progress' : status === 'done' ? 'Done' : 'Todo'}`);
    } catch (err) {
      addToast('Failed to update task', 'error');
    }
  }

  const filteredTasks = filterWorkspace
    ? tasks.filter(t => t.workspace_id === parseInt(filterWorkspace))
    : tasks;

  const todoTasks = filteredTasks.filter(t => t.status === 'todo');
  const inProgressTasks = filteredTasks.filter(t => t.status === 'inprogress');
  const doneTasks = filteredTasks.filter(t => t.status === 'done');

  const columns = [
    { key: 'todo', title: 'To Do', tasks: todoTasks, color: '#6b7280', bgColor: '#f3f4f6' },
    { key: 'inprogress', title: 'In Progress', tasks: inProgressTasks, color: '#3b82f6', bgColor: '#eff6ff' },
    { key: 'done', title: 'Done', tasks: doneTasks, color: '#16a34a', bgColor: '#f0fdf4' },
  ];

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '300px' }}>
      <div style={{ color: '#9ca3af' }}>Loading tasks...</div>
    </div>
  );

  // Build assignee groups for "By Assignee" view
  const assigneeGroups = (() => {
    const groups = {};
    filteredTasks.forEach(task => {
      const key = task.assignee_name || 'Unassigned';
      if (!groups[key]) {
        groups[key] = { name: key, color: task.assignee_color || '#9ca3af', tasks: [] };
      }
      groups[key].tasks.push(task);
    });
    return Object.values(groups).sort((a, b) => a.name.localeCompare(b.name));
  })();

  return (
    <div className="fade-in">
      {/* Header */}
      <div className="tasks-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <select
            className="input-field"
            value={filterWorkspace}
            onChange={e => setFilterWorkspace(e.target.value)}
            style={{ width: 'auto', paddingRight: '30px' }}
          >
            <option value="">All Workspaces</option>
            {workspaces.map(w => (
              <option key={w.id} value={w.id}>{w.emoji} {w.name}</option>
            ))}
          </select>
          <div style={{ fontSize: '13px', color: '#9ca3af' }}>
            {filteredTasks.length} tasks
          </div>

          {/* View toggle */}
          <div style={{ display: 'flex', gap: '4px', background: '#f5f5f7', borderRadius: '9px', padding: '3px' }}>
            {[{ key: 'kanban', label: 'Kanban View' }, { key: 'assignee', label: 'By Assignee' }].map(v => (
              <button
                key={v.key}
                onClick={() => setViewMode(v.key)}
                style={{
                  padding: '5px 12px', borderRadius: '7px', border: 'none', cursor: 'pointer',
                  fontSize: '12px', fontWeight: '500',
                  background: viewMode === v.key ? 'white' : 'transparent',
                  color: viewMode === v.key ? '#1a1a2e' : '#9ca3af',
                  boxShadow: viewMode === v.key ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
                  transition: 'all 0.15s', fontFamily: 'inherit'
                }}
              >
                {v.label}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={() => { setEditTask(null); setModalOpen(true); }}
          className="btn-primary"
          style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            padding: '10px 18px', borderRadius: '10px',
            fontSize: '14px', fontWeight: '600'
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          New Task
        </button>
      </div>

      {/* By Assignee view */}
      {viewMode === 'assignee' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {assigneeGroups.length === 0 ? (
            <div style={{ background: 'white', borderRadius: '14px', border: '1.5px dashed #e8e8ed', padding: '40px', textAlign: 'center', color: '#d1d5db', fontSize: '14px' }}>
              No tasks
            </div>
          ) : assigneeGroups.map(group => (
            <div key={group.name} style={{ background: 'white', borderRadius: '16px', border: '1px solid #f0f0f5', boxShadow: '0 2px 8px rgba(0,0,0,0.03)', overflow: 'hidden' }}>
              {/* Group header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 20px', borderBottom: '1px solid #f5f5f7', background: '#fafafa' }}>
                <div style={{
                  width: '32px', height: '32px', borderRadius: '50%',
                  background: group.color, color: 'white', fontSize: '13px', fontWeight: '700',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                }}>
                  {group.name === 'Unassigned' ? '?' : group.name[0]}
                </div>
                <span style={{ fontWeight: '700', fontSize: '14px', color: '#1a1a2e', flex: 1 }}>{group.name}</span>
                <span style={{ background: '#f3f4f6', color: '#6b7280', borderRadius: '8px', padding: '2px 10px', fontSize: '12px', fontWeight: '700' }}>
                  {group.tasks.length} task{group.tasks.length !== 1 ? 's' : ''}
                </span>
              </div>
              {/* Tasks */}
              <div style={{ padding: '12px 16px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '10px' }}>
                {group.tasks.map(task => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onEdit={t => { setEditTask(t); setModalOpen(true); }}
                    onDelete={id => setDeleteConfirm(id)}
                    onStatusChange={handleStatusChange}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Kanban board */}
      {viewMode === 'kanban' && <div className="kanban-scroll grid-3" style={{ gap: '20px' }}>
        {columns.map(col => (
          <div key={col.key}>
            {/* Column header */}
            <div style={{
              background: 'white', borderRadius: '14px',
              border: '1px solid #f0f0f5', boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
              padding: '12px 16px', marginBottom: '12px',
              display: 'flex', alignItems: 'center', gap: '10px'
            }}>
              <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: col.color }} />
              <span style={{ fontSize: '14px', fontWeight: '700', color: '#1a1a2e', flex: 1 }}>{col.title}</span>
              <span style={{
                background: col.bgColor, color: col.color,
                borderRadius: '8px', padding: '2px 10px', fontSize: '13px', fontWeight: '700'
              }}>{col.tasks.length}</span>
            </div>

            {/* Tasks */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {col.tasks.map(task => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onEdit={t => { setEditTask(t); setModalOpen(true); }}
                  onDelete={id => setDeleteConfirm(id)}
                  onStatusChange={handleStatusChange}
                />
              ))}
              {col.tasks.length === 0 && (
                <div style={{
                  background: 'white', borderRadius: '14px', padding: '24px',
                  border: '1.5px dashed #e8e8ed', textAlign: 'center',
                  color: '#d1d5db', fontSize: '13px'
                }}>
                  No tasks here
                </div>
              )}
            </div>
          </div>
        ))}
      </div>}

      {/* Task form modal */}
      <TaskFormModal
        isOpen={modalOpen}
        onClose={() => { setModalOpen(false); setEditTask(null); }}
        task={editTask}
        workspaces={workspaces}
        users={users}
        onSave={handleSave}
      />

      {/* Delete confirm modal */}
      <Modal
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        title="Delete Task"
        maxWidth="380px"
      >
        <div style={{ textAlign: 'center', padding: '8px 0' }}>
          <div style={{ fontSize: '40px', marginBottom: '12px' }}>🗑️</div>
          <p style={{ color: '#6b7280', fontSize: '14px', margin: '0 0 20px' }}>
            Are you sure you want to delete this task? This action cannot be undone.
          </p>
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
            <button
              onClick={() => setDeleteConfirm(null)}
              style={{
                padding: '10px 20px', borderRadius: '10px',
                border: '1.5px solid #e8e8ed', background: 'white',
                cursor: 'pointer', fontSize: '14px', fontWeight: '500', color: '#6b7280'
              }}
            >
              Cancel
            </button>
            <button
              onClick={() => handleDelete(deleteConfirm)}
              style={{
                padding: '10px 20px', borderRadius: '10px',
                border: 'none', background: '#ef4444',
                cursor: 'pointer', fontSize: '14px', fontWeight: '600', color: 'white'
              }}
            >
              Delete
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
