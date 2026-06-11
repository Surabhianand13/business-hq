import { useState, useEffect } from 'react';
import { useApp } from '../App';
import api from '../api';
import Modal from '../components/Modal';

function WorkspaceBadge({ meeting }) {
  if (!meeting.workspace_name) return null;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '4px',
      padding: '3px 9px', borderRadius: '7px',
      background: `${meeting.workspace_color || '#6c63ff'}15`,
      color: meeting.workspace_color || '#6c63ff',
      fontSize: '12px', fontWeight: '600'
    }}>
      {meeting.workspace_emoji} {meeting.workspace_name}
    </span>
  );
}

function MeetingCard({ meeting, onEdit, onDelete }) {
  const [expanded, setExpanded] = useState(false);
  const startTime = new Date(meeting.start_time);
  const isPast = startTime < new Date();
  const isToday = startTime.toDateString() === new Date().toDateString();

  return (
    <div style={{
      background: 'white', borderRadius: '16px',
      border: `1px solid ${isToday ? '#3b82f620' : '#f0f0f5'}`,
      boxShadow: isToday ? '0 2px 16px rgba(59,130,246,0.08)' : '0 2px 8px rgba(0,0,0,0.03)',
      padding: '20px', transition: 'all 0.2s ease',
      borderLeft: `4px solid ${meeting.workspace_color || '#6c63ff'}`
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '12px' }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            {isToday && (
              <span style={{
                background: '#eff6ff', color: '#3b82f6', borderRadius: '6px',
                padding: '2px 8px', fontSize: '11px', fontWeight: '700'
              }}>
                Today
              </span>
            )}
            {isPast && !isToday && (
              <span style={{
                background: '#f3f4f6', color: '#9ca3af', borderRadius: '6px',
                padding: '2px 8px', fontSize: '11px', fontWeight: '600'
              }}>
                Past
              </span>
            )}
            <WorkspaceBadge meeting={meeting} />
          </div>
          <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '700', color: '#1a1a2e' }}>
            {meeting.title}
          </h3>
        </div>
        <div style={{ display: 'flex', gap: '6px', flexShrink: 0, marginLeft: '12px' }}>
          <button
            onClick={() => onEdit(meeting)}
            style={{
              background: '#f5f5f7', border: 'none', cursor: 'pointer',
              width: '30px', height: '30px', borderRadius: '8px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#6b7280'
            }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
          </button>
          <button
            onClick={() => onDelete(meeting.id)}
            style={{
              background: '#fef2f2', border: 'none', cursor: 'pointer',
              width: '30px', height: '30px', borderRadius: '8px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#ef4444'
            }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
            </svg>
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginBottom: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#6b7280', fontSize: '13px' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
          </svg>
          <span>{startTime.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#6b7280', fontSize: '13px' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
          </svg>
          <span>{startTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })} · {meeting.duration_mins} min</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#6b7280', fontSize: '13px' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/>
          </svg>
          <span>{(meeting.attendees || []).length} attendees</span>
        </div>
      </div>

      {/* Attendees */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '-6px', marginBottom: '10px' }}>
        {(meeting.attendees || []).map((att, i) => (
          <div
            key={att.id}
            title={att.name}
            style={{
              width: '28px', height: '28px', borderRadius: '50%',
              background: att.avatar_color || '#6c63ff',
              color: 'white', fontSize: '11px', fontWeight: '700',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: '2px solid white', marginLeft: i > 0 ? '-8px' : '0',
              zIndex: 10 - i
            }}
          >
            {att.name[0]}
          </div>
        ))}
        {(meeting.attendees || []).length > 0 && (
          <span style={{ fontSize: '12px', color: '#9ca3af', marginLeft: '8px' }}>
            {(meeting.attendees || []).map(a => a.name).join(', ')}
          </span>
        )}
      </div>

      {meeting.agenda && (
        <button
          onClick={() => setExpanded(!expanded)}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: '#6c63ff', fontSize: '12px', fontWeight: '500',
            padding: '0', display: 'flex', alignItems: 'center', gap: '4px'
          }}
        >
          {expanded ? 'Hide' : 'Show'} agenda
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
            style={{ transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}>
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </button>
      )}

      {expanded && meeting.agenda && (
        <div style={{
          marginTop: '10px', padding: '12px', background: '#f9f9fb',
          borderRadius: '10px', fontSize: '13px', color: '#4b5563',
          lineHeight: 1.6, whiteSpace: 'pre-line'
        }}>
          {meeting.agenda}
        </div>
      )}

      {meeting.meeting_url && (
        <a
          href={meeting.meeting_url}
          target="_blank"
          rel="noreferrer"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '6px',
            marginTop: '10px', padding: '6px 12px', borderRadius: '8px',
            background: 'linear-gradient(135deg, #6c63ff, #3b82f6)',
            color: 'white', fontSize: '12px', fontWeight: '600', textDecoration: 'none'
          }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M15 10l5-5m0 0l-5 0m5 0v5"/><path d="M9 14l-5 5m0 0l5 0m-5 0v-5"/>
          </svg>
          Join Meeting
        </a>
      )}
    </div>
  );
}

function MeetingFormModal({ isOpen, onClose, meeting, workspaces, users, onSave }) {
  const [form, setForm] = useState({
    title: '', workspace_id: '', start_date: '', start_time: '10:00',
    duration_mins: 60, meeting_url: '', agenda: '', attendee_ids: []
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (meeting) {
      const st = new Date(meeting.start_time);
      setForm({
        title: meeting.title || '',
        workspace_id: meeting.workspace_id || '',
        start_date: st.toISOString().split('T')[0],
        start_time: st.toTimeString().slice(0, 5),
        duration_mins: meeting.duration_mins || 60,
        meeting_url: meeting.meeting_url || '',
        agenda: meeting.agenda || '',
        attendee_ids: (meeting.attendees || []).map(a => a.id)
      });
    } else {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      setForm({
        title: '', workspace_id: '', start_date: tomorrow.toISOString().split('T')[0],
        start_time: '10:00', duration_mins: 60, meeting_url: '', agenda: '', attendee_ids: []
      });
    }
  }, [meeting, isOpen]);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      const startDateTime = new Date(`${form.start_date}T${form.start_time}`);
      const data = {
        title: form.title,
        workspace_id: parseInt(form.workspace_id),
        start_time: startDateTime.toISOString(),
        duration_mins: parseInt(form.duration_mins),
        meeting_url: form.meeting_url || null,
        agenda: form.agenda || null,
        attendee_ids: form.attendee_ids
      };
      await onSave(data);
      onClose();
    } finally {
      setLoading(false);
    }
  }

  function toggleAttendee(userId) {
    setForm(f => ({
      ...f,
      attendee_ids: f.attendee_ids.includes(userId)
        ? f.attendee_ids.filter(id => id !== userId)
        : [...f.attendee_ids, userId]
    }));
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={meeting ? 'Edit Meeting' : 'Schedule Meeting'} maxWidth="560px">
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>Title *</label>
          <input className="input-field" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Meeting title" required />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>Workspace *</label>
          <select className="input-field" value={form.workspace_id} onChange={e => setForm(f => ({ ...f, workspace_id: e.target.value }))} required>
            <option value="">Select workspace</option>
            {workspaces.map(w => <option key={w.id} value={w.id}>{w.emoji} {w.name}</option>)}
          </select>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>Date *</label>
            <input type="date" className="input-field" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} required />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>Time *</label>
            <input type="time" className="input-field" value={form.start_time} onChange={e => setForm(f => ({ ...f, start_time: e.target.value }))} required />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>Duration (min)</label>
            <input type="number" className="input-field" value={form.duration_mins} onChange={e => setForm(f => ({ ...f, duration_mins: e.target.value }))} min="15" step="15" />
          </div>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>Meeting URL</label>
          <input className="input-field" value={form.meeting_url} onChange={e => setForm(f => ({ ...f, meeting_url: e.target.value }))} placeholder="https://meet.google.com/..." />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '8px' }}>Attendees</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {users.map(u => (
              <button
                key={u.id}
                type="button"
                onClick={() => toggleAttendee(u.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  padding: '6px 12px', borderRadius: '8px', cursor: 'pointer',
                  border: form.attendee_ids.includes(u.id) ? `1.5px solid ${u.avatar_color || '#6c63ff'}` : '1.5px solid #e8e8ed',
                  background: form.attendee_ids.includes(u.id) ? `${u.avatar_color || '#6c63ff'}15` : 'white',
                  fontSize: '13px', fontWeight: '500', color: '#374151', transition: 'all 0.15s'
                }}
              >
                <div style={{
                  width: '20px', height: '20px', borderRadius: '50%',
                  background: u.avatar_color || '#6c63ff', color: 'white',
                  fontSize: '10px', fontWeight: '700',
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  {u.name[0]}
                </div>
                {u.name}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>Agenda</label>
          <textarea className="input-field" value={form.agenda} onChange={e => setForm(f => ({ ...f, agenda: e.target.value }))} placeholder="1. Topic 1&#10;2. Topic 2" rows={3} style={{ resize: 'vertical' }} />
        </div>

        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', paddingTop: '8px' }}>
          <button type="button" onClick={onClose} style={{ padding: '10px 20px', borderRadius: '10px', border: '1.5px solid #e8e8ed', background: 'white', cursor: 'pointer', fontSize: '14px', fontWeight: '500', color: '#6b7280' }}>
            Cancel
          </button>
          <button type="submit" disabled={loading} className="btn-primary" style={{ padding: '10px 24px', borderRadius: '10px', fontSize: '14px', fontWeight: '600', opacity: loading ? 0.7 : 1 }}>
            {loading ? 'Saving...' : meeting ? 'Update Meeting' : 'Schedule Meeting'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export default function MeetingsPage() {
  const { addToast } = useApp();
  const [meetings, setMeetings] = useState([]);
  const [workspaces, setWorkspaces] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editMeeting, setEditMeeting] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [filter, setFilter] = useState('upcoming');

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [m, w, u] = await Promise.all([api.getMeetings(), api.getWorkspaces(), api.getUsers()]);
      setMeetings(m);
      setWorkspaces(w);
      setUsers(u);
    } catch (err) {
      addToast('Failed to load meetings', 'error');
    } finally {
      setLoading(false);
    }
  }

  async function handleSave(data) {
    try {
      if (editMeeting) {
        const updated = await api.updateMeeting(editMeeting.id, data);
        setMeetings(prev => prev.map(m => m.id === updated.id ? updated : m));
        addToast('Meeting updated!');
      } else {
        const created = await api.createMeeting(data);
        setMeetings(prev => [created, ...prev]);
        addToast('Meeting scheduled!');
      }
    } catch (err) {
      addToast(err.message || 'Failed to save meeting', 'error');
      throw err;
    }
  }

  async function handleDelete(id) {
    try {
      await api.deleteMeeting(id);
      setMeetings(prev => prev.filter(m => m.id !== id));
      setDeleteConfirm(null);
      addToast('Meeting deleted');
    } catch (err) {
      addToast('Failed to delete meeting', 'error');
    }
  }

  const now = new Date();
  const filteredMeetings = meetings.filter(m => {
    const t = new Date(m.start_time);
    if (filter === 'upcoming') return t >= now;
    if (filter === 'past') return t < now;
    return true;
  });

  const todayMeetings = meetings.filter(m => new Date(m.start_time).toDateString() === now.toDateString());

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '300px' }}>
      <div style={{ color: '#9ca3af' }}>Loading meetings...</div>
    </div>
  );

  return (
    <div className="fade-in">
      {/* Stats strip */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px'
      }}>
        {[
          { label: 'Today', value: todayMeetings.length, color: '#3b82f6', icon: '📅' },
          { label: 'Upcoming', value: meetings.filter(m => new Date(m.start_time) >= now).length, color: '#6c63ff', icon: '🗓️' },
          { label: 'Total', value: meetings.length, color: '#10b981', icon: '📊' }
        ].map((s, i) => (
          <div key={i} style={{ background: 'white', borderRadius: '14px', border: '1px solid #f0f0f5', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ fontSize: '24px' }}>{s.icon}</div>
            <div>
              <div style={{ fontSize: '24px', fontWeight: '800', color: '#1a1a2e', lineHeight: 1 }}>{s.value}</div>
              <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '2px' }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <div style={{ display: 'flex', gap: '6px', background: '#f5f5f7', borderRadius: '10px', padding: '4px' }}>
          {['all', 'upcoming', 'past'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                padding: '6px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer',
                fontSize: '13px', fontWeight: '500',
                background: filter === f ? 'white' : 'transparent',
                color: filter === f ? '#1a1a2e' : '#9ca3af',
                boxShadow: filter === f ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
                transition: 'all 0.15s', textTransform: 'capitalize'
              }}
            >
              {f}
            </button>
          ))}
        </div>

        <button
          onClick={() => { setEditMeeting(null); setModalOpen(true); }}
          className="btn-primary"
          style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 18px', borderRadius: '10px', fontSize: '14px', fontWeight: '600' }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Schedule Meeting
        </button>
      </div>

      {/* Meetings list */}
      {filteredMeetings.length === 0 ? (
        <div style={{
          background: 'white', borderRadius: '16px', border: '1px solid #f0f0f5',
          padding: '60px', textAlign: 'center'
        }}>
          <div style={{ fontSize: '40px', marginBottom: '12px' }}>📅</div>
          <div style={{ color: '#9ca3af', fontSize: '15px' }}>No {filter} meetings</div>
          <button onClick={() => setModalOpen(true)} style={{ marginTop: '16px', padding: '10px 20px', borderRadius: '10px', border: 'none', background: 'linear-gradient(135deg, #6c63ff, #3b82f6)', color: 'white', cursor: 'pointer', fontSize: '14px', fontWeight: '600' }}>
            Schedule your first meeting
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '14px' }}>
          {filteredMeetings.map(m => (
            <MeetingCard
              key={m.id}
              meeting={m}
              onEdit={m => { setEditMeeting(m); setModalOpen(true); }}
              onDelete={id => setDeleteConfirm(id)}
            />
          ))}
        </div>
      )}

      <MeetingFormModal
        isOpen={modalOpen}
        onClose={() => { setModalOpen(false); setEditMeeting(null); }}
        meeting={editMeeting}
        workspaces={workspaces}
        users={users}
        onSave={handleSave}
      />

      <Modal isOpen={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} title="Delete Meeting" maxWidth="380px">
        <div style={{ textAlign: 'center', padding: '8px 0' }}>
          <div style={{ fontSize: '40px', marginBottom: '12px' }}>🗑️</div>
          <p style={{ color: '#6b7280', fontSize: '14px', margin: '0 0 20px' }}>Delete this meeting? This cannot be undone.</p>
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
            <button onClick={() => setDeleteConfirm(null)} style={{ padding: '10px 20px', borderRadius: '10px', border: '1.5px solid #e8e8ed', background: 'white', cursor: 'pointer', fontSize: '14px', fontWeight: '500', color: '#6b7280' }}>Cancel</button>
            <button onClick={() => handleDelete(deleteConfirm)} style={{ padding: '10px 20px', borderRadius: '10px', border: 'none', background: '#ef4444', cursor: 'pointer', fontSize: '14px', fontWeight: '600', color: 'white' }}>Delete</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
