import { useState, useEffect } from 'react';
import { useApp } from '../App';
import api from '../api';
import Modal from '../components/Modal';

const FOCUS_COLOR = '#8b5cf6';
const DAY_START_HOUR = 7;
const DAY_END_HOUR = 22;
const HOUR_HEIGHT = 56;

const RECURRENCE_OPTIONS = [
  { value: 'none', label: 'Does not repeat' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekdays', label: 'Weekdays (Mon–Fri)' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
];

const RECURRENCE_LABEL = {
  daily: 'Daily', weekdays: 'Weekdays', weekly: 'Weekly', monthly: 'Monthly',
};

function isFocus(m) {
  return m.block_type === 'focus';
}

function meetingColor(m) {
  return isFocus(m) ? FOCUS_COLOR : (m.workspace_color || '#6c63ff');
}

// ---- Date helpers ----
function startOfDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
function addDays(d, n) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}
function sameDay(a, b) {
  return a.toDateString() === b.toDateString();
}
function startOfWeek(d) {
  // Monday-based
  const x = startOfDay(d);
  const day = (x.getDay() + 6) % 7; // 0 = Monday
  return addDays(x, -day);
}
function fmtTime(d) {
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

/**
 * Expand a meeting into occurrences within [rangeStart, rangeEnd] (Date objects).
 * Returns array of { ...meeting, occStart, occEnd }.
 */
function expandOccurrences(meeting, rangeStart, rangeEnd) {
  const base = new Date(meeting.start_time);
  if (isNaN(base.getTime())) return [];
  const duration = meeting.duration_mins || 60;
  const recurrence = meeting.recurrence || 'none';
  const hardEnd = meeting.recurrence_end ? startOfDay(new Date(meeting.recurrence_end + 'T23:59:59')) : null;

  const makeOcc = (occStart) => ({
    ...meeting,
    occStart,
    occEnd: new Date(occStart.getTime() + duration * 60000),
  });

  const inRange = (occStart) => {
    const occEnd = new Date(occStart.getTime() + duration * 60000);
    return occEnd >= rangeStart && occStart <= rangeEnd;
  };

  if (recurrence === 'none') {
    return inRange(base) ? [makeOcc(base)] : [];
  }

  const hours = base.getHours();
  const minutes = base.getMinutes();
  const results = [];
  const MAX_ITER = 400;

  // Effective upper bound: min of rangeEnd and hardEnd (if set)
  const upper = hardEnd && hardEnd < rangeEnd ? hardEnd : rangeEnd;

  if (recurrence === 'daily' || recurrence === 'weekdays') {
    // Walk day by day from max(base day, rangeStart day) up to upper
    let cursor = startOfDay(base);
    if (cursor < startOfDay(rangeStart)) cursor = startOfDay(rangeStart);
    let iter = 0;
    while (cursor <= upper && iter < MAX_ITER) {
      const dow = cursor.getDay();
      const isWeekday = dow >= 1 && dow <= 5;
      if (recurrence === 'daily' || isWeekday) {
        const occStart = new Date(cursor);
        occStart.setHours(hours, minutes, 0, 0);
        if (occStart >= base && inRange(occStart)) results.push(makeOcc(occStart));
      }
      cursor = addDays(cursor, 1);
      iter++;
    }
    return results;
  }

  if (recurrence === 'weekly') {
    let cursor = new Date(base);
    // fast-forward to near rangeStart
    let iter = 0;
    while (cursor < startOfDay(rangeStart) && iter < MAX_ITER) {
      cursor = addDays(cursor, 7);
      iter++;
    }
    iter = 0;
    while (cursor <= upper && iter < MAX_ITER) {
      if (cursor >= base && inRange(cursor)) results.push(makeOcc(new Date(cursor)));
      cursor = addDays(cursor, 7);
      iter++;
    }
    return results;
  }

  if (recurrence === 'monthly') {
    const dom = base.getDate();
    let year = base.getFullYear();
    let month = base.getMonth();
    let iter = 0;
    while (iter < MAX_ITER) {
      const occStart = new Date(year, month, dom, hours, minutes, 0, 0);
      // Skip months where the day rolled over (e.g. Feb 30)
      if (occStart.getDate() === dom) {
        if (occStart > upper) break;
        if (occStart >= base && inRange(occStart)) results.push(makeOcc(occStart));
      }
      month++;
      if (month > 11) { month = 0; year++; }
      iter++;
    }
    return results;
  }

  return [];
}

function nextOccurrence(meeting, from = new Date()) {
  // For sorting/display: find the next occurrence at or after `from`, within ~2 years.
  const horizon = addDays(from, 730);
  const occs = expandOccurrences(meeting, from, horizon);
  if (occs.length) return occs[0].occStart;
  return new Date(meeting.start_time);
}

function RecurrenceChip({ meeting }) {
  if (!meeting.recurrence || meeting.recurrence === 'none') return null;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '4px',
      padding: '3px 9px', borderRadius: '7px',
      background: '#eef2ff', color: '#6c63ff', fontSize: '12px', fontWeight: '600'
    }}>
      🔁 {RECURRENCE_LABEL[meeting.recurrence] || meeting.recurrence}
    </span>
  );
}

function FocusChip() {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '4px',
      padding: '3px 9px', borderRadius: '7px',
      background: '#f5f3ff', color: FOCUS_COLOR, fontSize: '12px', fontWeight: '600'
    }}>
      🎯 Focus
    </span>
  );
}

function WorkspaceBadge({ meeting }) {
  if (isFocus(meeting)) return <FocusChip />;
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
  const focus = isFocus(meeting);
  const startTime = new Date(meeting.start_time);
  const isPast = startTime < new Date();
  const isToday = startTime.toDateString() === new Date().toDateString();
  const accent = meetingColor(meeting);

  return (
    <div style={{
      background: focus ? '#faf9ff' : 'white', borderRadius: '16px',
      border: `1px solid ${isToday ? '#3b82f620' : '#f0f0f5'}`,
      boxShadow: isToday ? '0 2px 16px rgba(59,130,246,0.08)' : '0 2px 8px rgba(0,0,0,0.03)',
      padding: '20px', transition: 'all 0.2s ease',
      borderLeft: `4px solid ${accent}`
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '12px' }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', flexWrap: 'wrap' }}>
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
            <RecurrenceChip meeting={meeting} />
          </div>
          <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '700', color: '#1a1a2e' }}>
            {focus && <span style={{ marginRight: '6px' }}>🎯</span>}
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
        {!focus && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#6b7280', fontSize: '13px' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/>
            </svg>
            <span>{(meeting.attendees || []).length} attendees</span>
          </div>
        )}
      </div>

      {/* Attendees */}
      {!focus && (
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
      )}

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

function MeetingFormModal({ isOpen, onClose, meeting, mode, workspaces, users, onSave }) {
  const focusMode = mode === 'focus';
  const [form, setForm] = useState({
    title: '', workspace_id: '', start_date: '', start_time: '10:00',
    duration_mins: 60, meeting_url: '', agenda: '', attendee_ids: [],
    recurrence: 'none', recurrence_end: ''
  });
  const [externalAttendees, setExternalAttendees] = useState([]);
  const [externalInput, setExternalInput] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (meeting) {
      const st = new Date(meeting.start_time);
      setForm({
        title: meeting.title || '',
        workspace_id: meeting.workspace_id || '',
        start_date: `${st.getFullYear()}-${String(st.getMonth() + 1).padStart(2, '0')}-${String(st.getDate()).padStart(2, '0')}`,
        start_time: st.toTimeString().slice(0, 5),
        duration_mins: meeting.duration_mins || 60,
        meeting_url: meeting.meeting_url || '',
        agenda: meeting.agenda || '',
        attendee_ids: (meeting.attendees || []).map(a => a.id),
        recurrence: meeting.recurrence || 'none',
        recurrence_end: meeting.recurrence_end || ''
      });
      try {
        const ext = meeting.external_attendees ? JSON.parse(meeting.external_attendees) : [];
        setExternalAttendees(Array.isArray(ext) ? ext : []);
      } catch {
        setExternalAttendees([]);
      }
    } else {
      const base = new Date();
      if (!focusMode) base.setDate(base.getDate() + 1);
      const ds = `${base.getFullYear()}-${String(base.getMonth() + 1).padStart(2, '0')}-${String(base.getDate()).padStart(2, '0')}`;
      setForm({
        title: focusMode ? 'Focus time' : '', workspace_id: '', start_date: ds,
        start_time: '10:00', duration_mins: focusMode ? 90 : 60, meeting_url: '', agenda: '',
        attendee_ids: [], recurrence: 'none', recurrence_end: ''
      });
      setExternalAttendees([]);
    }
    setExternalInput('');
  }, [meeting, isOpen, focusMode]);

  // When editing, derive focus from the meeting itself
  const editingFocus = meeting ? isFocus(meeting) : focusMode;
  const isFocusForm = editingFocus;

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      const startDateTime = new Date(`${form.start_date}T${form.start_time}`);
      const data = {
        title: form.title,
        start_time: startDateTime.toISOString(),
        duration_mins: parseInt(form.duration_mins),
        recurrence: form.recurrence,
        recurrence_end: form.recurrence !== 'none' && form.recurrence_end ? form.recurrence_end : null,
      };
      if (isFocusForm) {
        data.block_type = 'focus';
        data.workspace_id = null;
        data.meeting_url = null;
        data.agenda = form.agenda || null;
        data.attendee_ids = [];
        data.external_attendees = JSON.stringify([]);
      } else {
        data.block_type = 'meeting';
        data.workspace_id = parseInt(form.workspace_id);
        data.meeting_url = form.meeting_url || null;
        data.agenda = form.agenda || null;
        data.attendee_ids = form.attendee_ids;
        data.external_attendees = JSON.stringify(externalAttendees);
      }
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

  function addExternal() {
    const name = externalInput.trim();
    if (name && !externalAttendees.includes(name)) {
      setExternalAttendees(prev => [...prev, name]);
    }
    setExternalInput('');
  }

  function removeExternal(name) {
    setExternalAttendees(prev => prev.filter(n => n !== name));
  }

  const labelStyle = { display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '6px' };
  const title = meeting
    ? (isFocusForm ? 'Edit Focus Block' : 'Edit Meeting')
    : (isFocusForm ? 'Block Focus Time' : 'Schedule Meeting');

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} maxWidth="560px">
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div>
          <label style={labelStyle}>{isFocusForm ? 'What are you focusing on?' : 'Title *'}</label>
          <input className="input-field" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder={isFocusForm ? 'Focus time' : 'Meeting title'} required />
        </div>

        {!isFocusForm && (
          <div>
            <label style={labelStyle}>Workspace *</label>
            <select className="input-field" value={form.workspace_id} onChange={e => setForm(f => ({ ...f, workspace_id: e.target.value }))} required>
              <option value="">Select workspace</option>
              {workspaces.map(w => <option key={w.id} value={w.id}>{w.emoji} {w.name}</option>)}
            </select>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
          <div>
            <label style={labelStyle}>Date *</label>
            <input type="date" className="input-field" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} required />
          </div>
          <div>
            <label style={labelStyle}>Time *</label>
            <input type="time" className="input-field" value={form.start_time} onChange={e => setForm(f => ({ ...f, start_time: e.target.value }))} required />
          </div>
          <div>
            <label style={labelStyle}>Duration (min)</label>
            <input type="number" className="input-field" value={form.duration_mins} onChange={e => setForm(f => ({ ...f, duration_mins: e.target.value }))} min="15" step="15" />
          </div>
        </div>

        {/* Recurrence */}
        <div style={{ display: 'grid', gridTemplateColumns: form.recurrence !== 'none' ? '1fr 1fr' : '1fr', gap: '12px' }}>
          <div>
            <label style={labelStyle}>Repeat</label>
            <select className="input-field" value={form.recurrence} onChange={e => setForm(f => ({ ...f, recurrence: e.target.value }))}>
              {RECURRENCE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          {form.recurrence !== 'none' && (
            <div>
              <label style={labelStyle}>Repeat until (optional)</label>
              <input type="date" className="input-field" value={form.recurrence_end || ''} onChange={e => setForm(f => ({ ...f, recurrence_end: e.target.value }))} min={form.start_date} />
            </div>
          )}
        </div>

        {!isFocusForm && (
          <>
            <div>
              <label style={labelStyle}>Meeting URL</label>
              <input className="input-field" value={form.meeting_url} onChange={e => setForm(f => ({ ...f, meeting_url: e.target.value }))} placeholder="https://meet.google.com/..." />
              {form.recurrence !== 'none' && (
                <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '5px' }}>
                  The same link is reused for every occurrence.
                </div>
              )}
            </div>

            <div>
              <label style={{ ...labelStyle, marginBottom: '8px' }}>Attendees</label>
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

              <div style={{ marginTop: '10px' }}>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                  <input
                    type="text"
                    className="input-field"
                    value={externalInput}
                    onChange={e => setExternalInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addExternal(); } }}
                    placeholder="Add external attendee (name)"
                    style={{ flex: 1 }}
                  />
                  <button
                    type="button"
                    onClick={addExternal}
                    style={{
                      padding: '0 14px', borderRadius: '8px', border: '1.5px solid #e8e8ed',
                      background: 'white', cursor: 'pointer', fontSize: '18px', color: '#6c63ff',
                      fontWeight: '700', flexShrink: 0, fontFamily: 'inherit', lineHeight: 1
                    }}
                  >
                    +
                  </button>
                </div>
                {externalAttendees.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {externalAttendees.map(name => (
                      <span key={name} style={{
                        display: 'inline-flex', alignItems: 'center', gap: '5px',
                        padding: '4px 10px', borderRadius: '8px',
                        background: '#f3f4f6', color: '#374151', fontSize: '13px', fontWeight: '500'
                      }}>
                        {name}
                        <button
                          type="button"
                          onClick={() => removeExternal(name)}
                          style={{
                            background: 'none', border: 'none', cursor: 'pointer',
                            color: '#9ca3af', padding: '0', lineHeight: 1, fontSize: '14px',
                            fontFamily: 'inherit'
                          }}
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        <div>
          <label style={labelStyle}>{isFocusForm ? 'Notes' : 'Agenda'}</label>
          <textarea className="input-field" value={form.agenda} onChange={e => setForm(f => ({ ...f, agenda: e.target.value }))} placeholder={isFocusForm ? 'Optional notes' : '1. Topic 1\n2. Topic 2'} rows={3} style={{ resize: 'vertical' }} />
        </div>

        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', paddingTop: '8px' }}>
          <button type="button" onClick={onClose} style={{ padding: '10px 20px', borderRadius: '10px', border: '1.5px solid #e8e8ed', background: 'white', cursor: 'pointer', fontSize: '14px', fontWeight: '500', color: '#6b7280' }}>
            Cancel
          </button>
          <button type="submit" disabled={loading} className="btn-primary" style={{ padding: '10px 24px', borderRadius: '10px', fontSize: '14px', fontWeight: '600', opacity: loading ? 0.7 : 1 }}>
            {loading ? 'Saving...' : meeting ? 'Save' : (isFocusForm ? 'Block Time' : 'Schedule Meeting')}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ---- Navigator ----
function Navigator({ label, onPrev, onNext, onToday }) {
  const ghost = {
    width: '36px', height: '36px', borderRadius: '10px', border: '1.5px solid #e8e8ed',
    background: 'white', cursor: 'pointer', color: '#374151', fontSize: '16px',
    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
  };
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <button onClick={onPrev} style={ghost}>‹</button>
      <div style={{ fontSize: '15px', fontWeight: '700', color: '#1a1a2e', minWidth: '160px', textAlign: 'center' }}>{label}</div>
      <button onClick={onNext} style={ghost}>›</button>
      <button onClick={onToday} style={{
        marginLeft: '4px', padding: '8px 16px', borderRadius: '10px', border: 'none', cursor: 'pointer',
        background: 'linear-gradient(135deg, #6c63ff, #3b82f6)', color: 'white', fontSize: '13px', fontWeight: '600'
      }}>Today</button>
    </div>
  );
}

// ---- DAY VIEW ----
function DayView({ allMeetings, cursorDate, setCursorDate, onEdit, onNewAt }) {
  const dayStart = startOfDay(cursorDate);
  const dayEnd = addDays(dayStart, 1);
  const occs = [];
  for (const m of allMeetings) {
    for (const o of expandOccurrences(m, dayStart, dayEnd)) {
      if (o.occStart < dayEnd && o.occEnd > dayStart) occs.push(o);
    }
  }
  occs.sort((a, b) => a.occStart - b.occStart);

  // Simple overlap-column layout
  const positioned = layoutOverlaps(occs);

  const hours = [];
  for (let h = DAY_START_HOUR; h <= DAY_END_HOUR; h++) hours.push(h);
  const gridHeight = (DAY_END_HOUR - DAY_START_HOUR) * HOUR_HEIGHT;

  const isToday = sameDay(cursorDate, new Date());
  const now = new Date();
  const nowOffset = ((now.getHours() - DAY_START_HOUR) + now.getMinutes() / 60) * HOUR_HEIGHT;
  const showNowLine = isToday && now.getHours() >= DAY_START_HOUR && now.getHours() < DAY_END_HOUR;

  return (
    <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #f0f0f5', padding: '16px', overflow: 'hidden' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
        <Navigator
          label={cursorDate.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
          onPrev={() => setCursorDate(addDays(cursorDate, -1))}
          onNext={() => setCursorDate(addDays(cursorDate, 1))}
          onToday={() => setCursorDate(new Date())}
        />
        <span style={{ fontSize: '13px', color: '#9ca3af' }}>{occs.length} item{occs.length === 1 ? '' : 's'}</span>
      </div>

      <div style={{ display: 'flex' }}>
        {/* Hour labels */}
        <div style={{ width: '56px', flexShrink: 0, position: 'relative', height: `${gridHeight}px` }}>
          {hours.map((h, i) => (
            <div key={h} style={{ position: 'absolute', top: `${i * HOUR_HEIGHT - 7}px`, right: '8px', fontSize: '11px', color: '#9ca3af' }}>
              {h === 12 ? '12 PM' : h > 12 ? `${h - 12} PM` : `${h} AM`}
            </div>
          ))}
        </div>

        {/* Grid */}
        <div style={{ flex: 1, position: 'relative', height: `${gridHeight}px`, borderLeft: '1px solid #f0f0f5' }}>
          {hours.map((h, i) => (
            <div
              key={h}
              onClick={() => onNewAt(setHour(cursorDate, h))}
              style={{
                position: 'absolute', top: `${i * HOUR_HEIGHT}px`, left: 0, right: 0,
                height: `${HOUR_HEIGHT}px`, borderTop: '1px solid #f0f0f5', cursor: 'pointer'
              }}
            />
          ))}

          {showNowLine && (
            <div style={{ position: 'absolute', top: `${nowOffset}px`, left: 0, right: 0, height: '0', zIndex: 5, pointerEvents: 'none' }}>
              <div style={{ height: '2px', background: '#ef4444' }} />
              <div style={{ position: 'absolute', left: '-4px', top: '-3px', width: '8px', height: '8px', borderRadius: '50%', background: '#ef4444' }} />
            </div>
          )}

          {positioned.map((o, idx) => {
            const startMins = (o.occStart - dayStart) / 60000;
            const top = ((startMins / 60) - DAY_START_HOUR) * HOUR_HEIGHT;
            const rawHeight = (o.duration_mins / 60) * HOUR_HEIGHT;
            const height = Math.max(rawHeight, 28);
            const focus = isFocus(o);
            const color = meetingColor(o);
            const widthPct = 100 / o._cols;
            const leftPct = widthPct * o._col;
            return (
              <div
                key={`${o.id}-${idx}`}
                onClick={(e) => { e.stopPropagation(); onEdit(o); }}
                style={{
                  position: 'absolute',
                  top: `${Math.max(top, 0)}px`,
                  left: `calc(${leftPct}% + 4px)`,
                  width: `calc(${widthPct}% - 8px)`,
                  height: `${height}px`,
                  background: focus ? '#f5f3ff' : `${color}14`,
                  borderLeft: `3px solid ${color}`,
                  borderRadius: '8px', padding: '5px 7px', cursor: 'pointer',
                  overflow: 'hidden', zIndex: 2, boxSizing: 'border-box'
                }}
              >
                <div style={{ fontSize: '11px', fontWeight: '700', color: focus ? FOCUS_COLOR : '#1a1a2e', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {focus && '🎯 '}{o.title}
                </div>
                <div style={{ fontSize: '10px', color: '#6b7280', marginTop: '1px' }}>
                  {fmtTime(o.occStart)}{height > 40 ? ` · ${o.duration_mins}m` : ''}
                </div>
                {height > 54 && !focus && o.workspace_name && (
                  <div style={{ fontSize: '10px', color, marginTop: '2px', fontWeight: 600 }}>
                    {o.workspace_emoji} {o.workspace_name}
                  </div>
                )}
                {height > 54 && o.meeting_url && (
                  <a href={o.meeting_url} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()}
                    style={{ display: 'inline-block', marginTop: '4px', fontSize: '10px', fontWeight: 700, color: '#6c63ff', textDecoration: 'none' }}>
                    Join →
                  </a>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function setHour(date, h) {
  const x = new Date(date);
  x.setHours(h, 0, 0, 0);
  return x;
}

// Greedy overlap columns: assign each occ a column index and a column count for its cluster.
function layoutOverlaps(occs) {
  const items = occs.map(o => ({ ...o }));
  let i = 0;
  while (i < items.length) {
    // build a cluster of overlapping items
    let clusterEnd = items[i].occEnd.getTime();
    let j = i;
    const cluster = [];
    while (j < items.length && items[j].occStart.getTime() < clusterEnd) {
      cluster.push(items[j]);
      clusterEnd = Math.max(clusterEnd, items[j].occEnd.getTime());
      j++;
    }
    // assign columns within the cluster
    const colEnds = []; // end time per column
    for (const it of cluster) {
      let placed = false;
      for (let c = 0; c < colEnds.length; c++) {
        if (it.occStart.getTime() >= colEnds[c]) {
          it._col = c;
          colEnds[c] = it.occEnd.getTime();
          placed = true;
          break;
        }
      }
      if (!placed) {
        it._col = colEnds.length;
        colEnds.push(it.occEnd.getTime());
      }
    }
    const cols = colEnds.length;
    for (const it of cluster) it._cols = cols;
    i = j;
  }
  return items;
}

// ---- WEEK VIEW ----
function WeekView({ allMeetings, cursorDate, setCursorDate, onEdit }) {
  const weekStart = startOfWeek(cursorDate);
  const weekEnd = addDays(weekStart, 7);
  const today = new Date();

  const days = [];
  for (let i = 0; i < 7; i++) {
    const dStart = addDays(weekStart, i);
    const dEnd = addDays(dStart, 1);
    const dayOccs = [];
    for (const m of allMeetings) {
      for (const o of expandOccurrences(m, dStart, dEnd)) {
        if (o.occStart < dEnd && o.occStart >= dStart) dayOccs.push(o);
      }
    }
    dayOccs.sort((a, b) => a.occStart - b.occStart);
    days.push({ date: dStart, occs: dayOccs });
  }

  const weekLabel = `Week of ${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
  const MAX_SHOWN = 6;

  return (
    <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #f0f0f5', padding: '16px' }}>
      <div style={{ marginBottom: '16px' }}>
        <Navigator
          label={weekLabel}
          onPrev={() => setCursorDate(addDays(cursorDate, -7))}
          onNext={() => setCursorDate(addDays(cursorDate, 7))}
          onToday={() => setCursorDate(new Date())}
        />
      </div>

      <div style={{ overflowX: 'auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(150px, 1fr))', gap: '8px', minWidth: '700px' }}>
          {days.map(({ date, occs }) => {
            const isToday = sameDay(date, today);
            const shown = occs.slice(0, MAX_SHOWN);
            const more = occs.length - shown.length;
            return (
              <div key={date.toISOString()} style={{
                border: `1px solid ${isToday ? '#3b82f640' : '#f0f0f5'}`,
                borderRadius: '12px', overflow: 'hidden', minHeight: '160px',
                display: 'flex', flexDirection: 'column'
              }}>
                <div style={{
                  padding: '8px 10px', textAlign: 'center',
                  background: isToday ? 'linear-gradient(135deg, #6c63ff, #3b82f6)' : '#fafafc',
                  color: isToday ? 'white' : '#374151'
                }}>
                  <div style={{ fontSize: '11px', fontWeight: 600, opacity: isToday ? 0.9 : 0.6 }}>
                    {date.toLocaleDateString('en-US', { weekday: 'short' })}
                  </div>
                  <div style={{ fontSize: '17px', fontWeight: 800, lineHeight: 1.1 }}>
                    {date.getDate()}
                  </div>
                </div>
                <div style={{ padding: '8px', display: 'flex', flexDirection: 'column', gap: '5px', flex: 1 }}>
                  {occs.length === 0 && (
                    <div style={{ color: '#d1d5db', fontSize: '20px', textAlign: 'center', marginTop: '20px' }}>—</div>
                  )}
                  {shown.map((o, idx) => {
                    const focus = isFocus(o);
                    const color = meetingColor(o);
                    return (
                      <div
                        key={`${o.id}-${idx}`}
                        onClick={() => onEdit(o)}
                        title={o.title}
                        style={{
                          display: 'flex', alignItems: 'flex-start', gap: '6px',
                          padding: '5px 7px', borderRadius: '8px', cursor: 'pointer',
                          background: focus ? '#f5f3ff' : `${color}10`,
                        }}
                      >
                        <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: color, flexShrink: 0, marginTop: '4px' }} />
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: '11px', color: '#6b7280', fontWeight: 600 }}>{fmtTime(o.occStart)}</div>
                          <div style={{ fontSize: '12px', fontWeight: 600, color: focus ? FOCUS_COLOR : '#1a1a2e', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {focus && '🎯 '}{o.title}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {more > 0 && (
                    <div style={{ fontSize: '11px', color: '#9ca3af', fontWeight: 600, textAlign: 'center', paddingTop: '2px' }}>
                      +{more} more
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function MeetingsPage() {
  const { addToast } = useApp();
  const [meetings, setMeetings] = useState([]);
  const [workspaces, setWorkspaces] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('meeting'); // 'meeting' | 'focus'
  const [editMeeting, setEditMeeting] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [filter, setFilter] = useState('upcoming');
  const [calView, setCalView] = useState('list'); // list | day | week
  const [cursorDate, setCursorDate] = useState(new Date());

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
        addToast('Saved!');
      } else {
        const created = await api.createMeeting(data);
        setMeetings(prev => [created, ...prev]);
        addToast(data.block_type === 'focus' ? 'Focus time blocked!' : 'Meeting scheduled!');
      }
    } catch (err) {
      addToast(err.message || 'Failed to save', 'error');
      throw err;
    }
  }

  async function handleDelete(id) {
    try {
      await api.deleteMeeting(id);
      setMeetings(prev => prev.filter(m => m.id !== id));
      setDeleteConfirm(null);
      addToast('Deleted');
    } catch (err) {
      addToast('Failed to delete', 'error');
    }
  }

  function openNewMeeting() {
    setEditMeeting(null);
    setModalMode('meeting');
    setModalOpen(true);
  }
  function openNewFocus() {
    setEditMeeting(null);
    setModalMode('focus');
    setModalOpen(true);
  }
  function openEdit(m) {
    // m may be an occurrence; strip occ fields by editing the underlying meeting
    setEditMeeting(m);
    setModalMode(isFocus(m) ? 'focus' : 'meeting');
    setModalOpen(true);
  }
  function openNewAt(dateTime) {
    setEditMeeting(null);
    setModalMode('meeting');
    setModalOpen(true);
    // pre-fill is best-effort; the modal resets based on `new Date()`,
    // so we keep it simple and just open a fresh meeting form.
  }

  const now = new Date();
  const filteredMeetings = meetings
    .map(m => ({ ...m, _next: nextOccurrence(m, m.recurrence && m.recurrence !== 'none' ? now : new Date(m.start_time)) }))
    .filter(m => {
      const t = (m.recurrence && m.recurrence !== 'none') ? m._next : new Date(m.start_time);
      if (filter === 'upcoming') return t >= now;
      if (filter === 'past') return t < now;
      return true;
    })
    .sort((a, b) => {
      const ta = (a.recurrence && a.recurrence !== 'none') ? a._next : new Date(a.start_time);
      const tb = (b.recurrence && b.recurrence !== 'none') ? b._next : new Date(b.start_time);
      return ta - tb;
    });

  const todayCount = (() => {
    const ds = startOfDay(now), de = addDays(ds, 1);
    let c = 0;
    for (const m of meetings) c += expandOccurrences(m, ds, de).length;
    return c;
  })();
  const upcomingCount = meetings.filter(m => nextOccurrence(m, m.recurrence && m.recurrence !== 'none' ? now : new Date(m.start_time)) >= now).length;

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '300px' }}>
      <div style={{ color: '#9ca3af' }}>Loading meetings...</div>
    </div>
  );

  return (
    <div className="fade-in">
      {/* Stats strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' }}>
        {[
          { label: 'Today', value: todayCount, color: '#3b82f6', icon: '📅' },
          { label: 'Upcoming', value: upcomingCount, color: '#6c63ff', icon: '🗓️' },
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

      {/* Header: view toggle + actions */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', gap: '6px', background: '#f5f5f7', borderRadius: '10px', padding: '4px' }}>
          {[['list', 'List'], ['day', 'Day'], ['week', 'Week']].map(([v, label]) => (
            <button
              key={v}
              onClick={() => setCalView(v)}
              style={{
                padding: '6px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer',
                fontSize: '13px', fontWeight: '500',
                background: calView === v ? 'white' : 'transparent',
                color: calView === v ? '#1a1a2e' : '#9ca3af',
                boxShadow: calView === v ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
                transition: 'all 0.15s'
              }}
            >
              {label}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={openNewFocus}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 16px', borderRadius: '10px',
              border: `1.5px solid ${FOCUS_COLOR}40`, background: '#f5f3ff', color: FOCUS_COLOR,
              cursor: 'pointer', fontSize: '14px', fontWeight: '600'
            }}
          >
            🎯 Block Focus Time
          </button>
          <button
            onClick={openNewMeeting}
            className="btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 18px', borderRadius: '10px', fontSize: '14px', fontWeight: '600' }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Schedule Meeting
          </button>
        </div>
      </div>

      {/* LIST VIEW */}
      {calView === 'list' && (
        <>
          <div style={{ display: 'flex', gap: '6px', background: '#f5f5f7', borderRadius: '10px', padding: '4px', marginBottom: '16px', width: 'fit-content' }}>
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

          {filteredMeetings.length === 0 ? (
            <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #f0f0f5', padding: '60px', textAlign: 'center' }}>
              <div style={{ fontSize: '40px', marginBottom: '12px' }}>📅</div>
              <div style={{ color: '#9ca3af', fontSize: '15px' }}>No {filter} meetings</div>
              <button onClick={openNewMeeting} style={{ marginTop: '16px', padding: '10px 20px', borderRadius: '10px', border: 'none', background: 'linear-gradient(135deg, #6c63ff, #3b82f6)', color: 'white', cursor: 'pointer', fontSize: '14px', fontWeight: '600' }}>
                Schedule your first meeting
              </button>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '14px' }}>
              {filteredMeetings.map(m => (
                <MeetingCard
                  key={m.id}
                  meeting={m}
                  onEdit={openEdit}
                  onDelete={id => setDeleteConfirm(id)}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* DAY VIEW */}
      {calView === 'day' && (
        <DayView
          allMeetings={meetings}
          cursorDate={cursorDate}
          setCursorDate={setCursorDate}
          onEdit={openEdit}
          onNewAt={openNewAt}
        />
      )}

      {/* WEEK VIEW */}
      {calView === 'week' && (
        <WeekView
          allMeetings={meetings}
          cursorDate={cursorDate}
          setCursorDate={setCursorDate}
          onEdit={openEdit}
        />
      )}

      <MeetingFormModal
        isOpen={modalOpen}
        onClose={() => { setModalOpen(false); setEditMeeting(null); }}
        meeting={editMeeting}
        mode={modalMode}
        workspaces={workspaces}
        users={users}
        onSave={handleSave}
      />

      <Modal isOpen={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} title="Delete" maxWidth="380px">
        <div style={{ textAlign: 'center', padding: '8px 0' }}>
          <div style={{ fontSize: '40px', marginBottom: '12px' }}>🗑️</div>
          <p style={{ color: '#6b7280', fontSize: '14px', margin: '0 0 20px' }}>Delete this? This cannot be undone. Recurring items remove all occurrences.</p>
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
            <button onClick={() => setDeleteConfirm(null)} style={{ padding: '10px 20px', borderRadius: '10px', border: '1.5px solid #e8e8ed', background: 'white', cursor: 'pointer', fontSize: '14px', fontWeight: '500', color: '#6b7280' }}>Cancel</button>
            <button onClick={() => handleDelete(deleteConfirm)} style={{ padding: '10px 20px', borderRadius: '10px', border: 'none', background: '#ef4444', cursor: 'pointer', fontSize: '14px', fontWeight: '600', color: 'white' }}>Delete</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
