import { useState, useEffect, useRef } from 'react';
import { useApp } from '../App';
import api from '../api';

const STAGES = [
  { key: 'lead',              label: 'Lead',               color: '#6b7280', bg: '#f3f4f6', emoji: '🔵' },
  { key: 'qualified',         label: 'Qualified',          color: '#3b82f6', bg: '#eff6ff', emoji: '⭐' },
  { key: 'meeting_scheduled', label: 'Meeting Scheduled',  color: '#06b6d4', bg: '#ecfeff', emoji: '📞' },
  { key: 'proposal',          label: 'Proposal Sent',      color: '#8b5cf6', bg: '#f5f3ff', emoji: '📝' },
  { key: 'negotiation',       label: 'Negotiation',        color: '#f59e0b', bg: '#fffbeb', emoji: '🤝' },
  { key: 'won',               label: 'Closed Won',         color: '#10b981', bg: '#f0fdf4', emoji: '✅' },
  { key: 'lost',              label: 'Closed Lost',        color: '#ef4444', bg: '#fef2f2', emoji: '❌' },
];

const STAGE_PROBABILITY = {
  lead: 10, qualified: 30, meeting_scheduled: 50, proposal: 60, negotiation: 80, won: 100, lost: 0
};

function formatCurrency(val) {
  return '₹' + Number(val || 0).toLocaleString('en-IN');
}

function formatDate(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function Avatar({ name, color, size = 24 }) {
  const initials = (name || '?').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  return (
    <div style={{
      width: size, height: size,
      background: color || '#6c63ff',
      borderRadius: '50%',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: 'white', fontWeight: '700',
      fontSize: size * 0.38, flexShrink: 0
    }}>
      {initials}
    </div>
  );
}

function StatCard({ emoji, label, value, sub, color }) {
  return (
    <div style={{
      background: 'white',
      borderRadius: '16px',
      padding: '20px',
      border: '1px solid #f0f0f5',
      boxShadow: '0 1px 8px rgba(0,0,0,0.04)',
      flex: 1, minWidth: 0
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
        <span style={{ fontSize: '22px' }}>{emoji}</span>
        <span style={{ fontSize: '12px', color: '#9ca3af', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</span>
      </div>
      <div style={{ fontSize: '22px', fontWeight: '800', color: color || '#1a1a2e', lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '4px' }}>{sub}</div>}
    </div>
  );
}

function MoveStageDropdown({ deal, onMove }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const stageInfo = STAGES.find(s => s.key === deal.stage);

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          background: stageInfo?.bg || '#f3f4f6',
          border: `1px solid ${stageInfo?.color || '#6b7280'}30`,
          borderRadius: '8px',
          padding: '4px 10px',
          fontSize: '11px',
          fontWeight: '600',
          color: stageInfo?.color || '#6b7280',
          cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: '4px',
          whiteSpace: 'nowrap'
        }}
      >
        Move Stage ▾
      </button>
      {open && (
        <div style={{
          position: 'absolute', bottom: '110%', left: 0,
          background: 'white',
          border: '1px solid #e8e8ed',
          borderRadius: '12px',
          boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
          zIndex: 100,
          overflow: 'hidden',
          minWidth: '160px'
        }}>
          {STAGES.filter(s => s.key !== deal.stage).map(s => (
            <button
              key={s.key}
              onClick={() => { onMove(deal, s.key); setOpen(false); }}
              style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                width: '100%', padding: '9px 14px',
                background: 'none', border: 'none', cursor: 'pointer',
                fontSize: '13px', fontWeight: '500', color: '#374151',
                textAlign: 'left',
                transition: 'background 0.12s'
              }}
              onMouseEnter={e => e.currentTarget.style.background = s.bg}
              onMouseLeave={e => e.currentTarget.style.background = 'none'}
            >
              <span>{s.emoji}</span>
              <span style={{ color: s.color, fontWeight: '600' }}>{s.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function DealCard({ deal, onEdit, onDelete, onMove }) {
  const stageInfo = STAGES.find(s => s.key === deal.stage);
  return (
    <div style={{
      background: 'white',
      borderRadius: '12px',
      padding: '14px',
      border: '1px solid #f0f0f5',
      boxShadow: '0 1px 6px rgba(0,0,0,0.04)',
      borderLeft: `3px solid ${stageInfo?.color || '#6b7280'}`,
      marginBottom: '10px',
      transition: 'box-shadow 0.15s'
    }}
      onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.08)'}
      onMouseLeave={e => e.currentTarget.style.boxShadow = '0 1px 6px rgba(0,0,0,0.04)'}
    >
      {/* Header row: company + actions */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '4px' }}>
        <div style={{ fontWeight: '700', fontSize: '13px', color: '#1a1a2e', flex: 1, paddingRight: '6px' }}>
          {deal.company}
        </div>
        <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
          <button
            onClick={() => onEdit(deal)}
            title="Edit"
            style={{
              background: '#f5f5f7', border: 'none', cursor: 'pointer',
              width: '24px', height: '24px', borderRadius: '6px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#9ca3af'
            }}
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
          </button>
          <button
            onClick={() => onDelete(deal.id)}
            title="Delete"
            style={{
              background: '#fef2f2', border: 'none', cursor: 'pointer',
              width: '24px', height: '24px', borderRadius: '6px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#ef4444'
            }}
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
              <path d="M10 11v6"/><path d="M14 11v6"/>
              <path d="M9 6V4h6v2"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Deal title */}
      <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '8px', fontWeight: '500' }}>
        {deal.title}
      </div>

      {/* Value + probability */}
      <div style={{ fontSize: '13px', fontWeight: '700', color: '#1a1a2e', marginBottom: '6px' }}>
        {formatCurrency(deal.value)}
        <span style={{ fontSize: '11px', color: '#9ca3af', fontWeight: '500', marginLeft: '6px' }}>
          {deal.probability}% probability
        </span>
      </div>

      {/* Contact */}
      {deal.contact_name && (
        <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span>👤</span>
          <span>{deal.contact_name}</span>
          {deal.contact_email && (
            <span style={{ color: '#9ca3af' }}>· {deal.contact_email}</span>
          )}
        </div>
      )}

      {/* Meeting info for meeting_scheduled stage */}
      {deal.stage === 'meeting_scheduled' && deal.meeting_date && (
        <div style={{ margin: '8px 0', padding: '8px 10px', borderRadius: '8px', background: '#ecfeff', border: '1px solid #06b6d420' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px' }}>
            <span style={{ fontSize: '12px' }}>{deal.meeting_type === 'online' ? '💻' : '🤝'}</span>
            <span style={{ fontSize: '11px', fontWeight: '700', color: '#06b6d4' }}>
              {deal.meeting_type === 'online' ? 'Online Meeting' : deal.meeting_type === 'offline' ? 'In-Person Meeting' : 'Meeting'}
            </span>
          </div>
          <div style={{ fontSize: '11px', color: '#0e7490' }}>
            📅 {new Date(deal.meeting_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
            {' · '}
            {new Date(deal.meeting_date).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
          </div>
          {deal.meeting_link && (
            <a href={deal.meeting_link} target="_blank" rel="noopener noreferrer" style={{ fontSize: '11px', color: '#06b6d4', textDecoration: 'none', fontWeight: '600' }}>
              🔗 Join Meeting →
            </a>
          )}
        </div>
      )}

      {/* Expected close date */}
      {deal.expected_close_date && (
        <div style={{ fontSize: '11px', color: '#9ca3af', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span>📅</span>
          <span>Expected: {formatDate(deal.expected_close_date)}</span>
        </div>
      )}

      {/* Footer: assignee + move stage */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        paddingTop: '8px', borderTop: '1px solid #f5f5f7'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {deal.assignee_name ? (
            <>
              <Avatar name={deal.assignee_name} color={deal.assignee_color} size={22} />
              <span style={{ fontSize: '11px', color: '#6b7280', fontWeight: '500' }}>{deal.assignee_name}</span>
            </>
          ) : (
            <span style={{ fontSize: '11px', color: '#d1d5db' }}>Unassigned</span>
          )}
        </div>
        <MoveStageDropdown deal={deal} onMove={onMove} />
      </div>
    </div>
  );
}

function KanbanColumn({ stage, deals, onEdit, onDelete, onMove }) {
  const total = deals.reduce((s, d) => s + (d.value || 0), 0);
  return (
    <div style={{
      minWidth: '230px', flex: '0 0 230px',
      display: 'flex', flexDirection: 'column',
    }}>
      {/* Column header */}
      <div style={{
        background: stage.bg,
        border: `1px solid ${stage.color}25`,
        borderRadius: '12px',
        padding: '12px 14px',
        marginBottom: '10px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '15px' }}>{stage.emoji}</span>
            <span style={{ fontSize: '13px', fontWeight: '700', color: stage.color }}>{stage.label}</span>
          </div>
          <span style={{
            background: stage.color + '20',
            color: stage.color,
            borderRadius: '10px',
            padding: '1px 8px',
            fontSize: '11px',
            fontWeight: '700'
          }}>
            {deals.length}
          </span>
        </div>
        {deals.length > 0 && (
          <div style={{ fontSize: '11px', color: stage.color, fontWeight: '600', opacity: 0.8 }}>
            {formatCurrency(total)}
          </div>
        )}
      </div>

      {/* Deal cards */}
      <div style={{ flex: 1 }}>
        {deals.length === 0 ? (
          <div style={{
            textAlign: 'center', padding: '24px 12px',
            color: '#d1d5db', fontSize: '12px',
            border: '2px dashed #e8e8ed',
            borderRadius: '12px'
          }}>
            No deals
          </div>
        ) : (
          deals.map(deal => (
            <DealCard
              key={deal.id}
              deal={deal}
              onEdit={onEdit}
              onDelete={onDelete}
              onMove={onMove}
            />
          ))
        )}
      </div>
    </div>
  );
}

const EMPTY_FORM = {
  title: '', company: '', value: '', stage: 'lead', probability: 10,
  expected_close_date: '', assignee_id: '', contact_name: '',
  contact_email: '', contact_phone: '', notes: '',
  meeting_type: 'online', meeting_date: '', meeting_link: '', meeting_notes: ''
};

function DealModal({ deal, users, onClose, onSave }) {
  const [form, setForm] = useState(deal ? {
    title: deal.title || '',
    company: deal.company || '',
    value: deal.value || '',
    stage: deal.stage || 'lead',
    probability: deal.probability ?? 10,
    expected_close_date: deal.expected_close_date ? deal.expected_close_date.split('T')[0] : '',
    assignee_id: deal.assignee_id || '',
    contact_name: deal.contact_name || '',
    contact_email: deal.contact_email || '',
    contact_phone: deal.contact_phone || '',
    notes: deal.notes || '',
    meeting_type: deal.meeting_type || 'online',
    meeting_date: deal.meeting_date ? new Date(deal.meeting_date).toISOString().slice(0, 16) : '',
    meeting_link: deal.meeting_link || '',
    meeting_notes: deal.meeting_notes || ''
  } : { ...EMPTY_FORM });

  const [saving, setSaving] = useState(false);

  function handleChange(field, value) {
    setForm(f => {
      const updated = { ...f, [field]: value };
      if (field === 'stage') {
        updated.probability = STAGE_PROBABILITY[value] ?? f.probability;
      }
      return updated;
    });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave({
        ...form,
        value: parseFloat(form.value) || 0,
        probability: parseInt(form.probability) || 0,
        assignee_id: form.assignee_id || null,
        expected_close_date: form.expected_close_date || null,
        meeting_date: form.stage === 'meeting_scheduled' && form.meeting_date ? form.meeting_date : null,
        meeting_type: form.stage === 'meeting_scheduled' ? (form.meeting_type || 'online') : '',
        meeting_link: form.stage === 'meeting_scheduled' ? (form.meeting_link || '') : '',
        meeting_notes: form.stage === 'meeting_scheduled' ? (form.meeting_notes || '') : ''
      });
      onClose();
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  }

  const inputStyle = {
    width: '100%', padding: '9px 12px',
    border: '1px solid #e5e7eb', borderRadius: '8px',
    fontSize: '13px', fontFamily: 'inherit',
    color: '#1a1a2e', background: 'white',
    outline: 'none', boxSizing: 'border-box'
  };

  const labelStyle = {
    display: 'block', fontSize: '12px',
    fontWeight: '600', color: '#374151',
    marginBottom: '5px'
  };

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'rgba(0,0,0,0.45)',
      zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '20px'
    }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        background: 'white',
        borderRadius: '20px',
        padding: '28px',
        width: '100%', maxWidth: '580px',
        maxHeight: '90vh', overflowY: 'auto',
        boxShadow: '0 20px 60px rgba(0,0,0,0.18)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
          <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: '#1a1a2e' }}>
            {deal ? '✏️ Edit Deal' : '➕ New Deal'}
          </h2>
          <button
            onClick={onClose}
            style={{ background: '#f5f5f7', border: 'none', cursor: 'pointer', width: '32px', height: '32px', borderRadius: '8px', fontSize: '16px', color: '#6b7280' }}
          >×</button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Deal title + Company */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
            <div>
              <label style={labelStyle}>Deal Title *</label>
              <input
                style={inputStyle}
                value={form.title}
                onChange={e => handleChange('title', e.target.value)}
                placeholder="e.g. AI Automation Suite"
                required
              />
            </div>
            <div>
              <label style={labelStyle}>Company Name *</label>
              <input
                style={inputStyle}
                value={form.company}
                onChange={e => handleChange('company', e.target.value)}
                placeholder="e.g. TechCorp Solutions"
                required
              />
            </div>
          </div>

          {/* Value + Stage */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
            <div>
              <label style={labelStyle}>Deal Value ₹</label>
              <input
                style={inputStyle}
                type="number"
                value={form.value}
                onChange={e => handleChange('value', e.target.value)}
                placeholder="e.g. 85000"
                min="0"
              />
            </div>
            <div>
              <label style={labelStyle}>Stage</label>
              <select
                style={{ ...inputStyle, cursor: 'pointer' }}
                value={form.stage}
                onChange={e => handleChange('stage', e.target.value)}
              >
                {STAGES.map(s => (
                  <option key={s.key} value={s.key}>{s.emoji} {s.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Probability + Expected close */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
            <div>
              <label style={labelStyle}>Probability %</label>
              <input
                style={inputStyle}
                type="number"
                value={form.probability}
                onChange={e => handleChange('probability', e.target.value)}
                min="0" max="100"
              />
            </div>
            <div>
              <label style={labelStyle}>Expected Close Date</label>
              <input
                style={inputStyle}
                type="date"
                value={form.expected_close_date}
                onChange={e => handleChange('expected_close_date', e.target.value)}
              />
            </div>
          </div>

          {/* Assigned to */}
          <div style={{ marginBottom: '14px' }}>
            <label style={labelStyle}>Assigned To</label>
            <select
              style={{ ...inputStyle, cursor: 'pointer' }}
              value={form.assignee_id}
              onChange={e => handleChange('assignee_id', e.target.value)}
            >
              <option value="">Unassigned</option>
              {users.filter(u => ['Ritesh', 'Sneha'].includes(u.name)).map(u => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
          </div>

          {/* Contact info */}
          <div style={{ marginBottom: '14px' }}>
            <label style={labelStyle}>Contact Name</label>
            <input
              style={inputStyle}
              value={form.contact_name}
              onChange={e => handleChange('contact_name', e.target.value)}
              placeholder="e.g. John Smith"
            />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
            <div>
              <label style={labelStyle}>Contact Email</label>
              <input
                style={inputStyle}
                type="email"
                value={form.contact_email}
                onChange={e => handleChange('contact_email', e.target.value)}
                placeholder="john@company.com"
              />
            </div>
            <div>
              <label style={labelStyle}>Contact Phone</label>
              <input
                style={inputStyle}
                value={form.contact_phone}
                onChange={e => handleChange('contact_phone', e.target.value)}
                placeholder="+91 98765 43210"
              />
            </div>
          </div>

          {/* Notes */}
          <div style={{ marginBottom: '14px' }}>
            <label style={labelStyle}>Notes</label>
            <textarea
              style={{ ...inputStyle, minHeight: '70px', resize: 'vertical' }}
              value={form.notes}
              onChange={e => handleChange('notes', e.target.value)}
              placeholder="Any additional context..."
            />
          </div>

          {/* Meeting Scheduled fields — shown only when stage = meeting_scheduled */}
          {form.stage === 'meeting_scheduled' && (
            <div style={{ background: '#ecfeff', border: '1px solid #06b6d430', borderRadius: '12px', padding: '16px', marginBottom: '14px' }}>
              <div style={{ fontSize: '13px', fontWeight: '700', color: '#0e7490', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                📞 Meeting Details
              </div>
              {/* Meeting type */}
              <div style={{ marginBottom: '12px' }}>
                <label style={labelStyle}>Meeting Type</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {['online', 'offline'].map(type => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => handleChange('meeting_type', type)}
                      style={{
                        flex: 1, padding: '9px', borderRadius: '8px', border: `2px solid ${form.meeting_type === type ? '#06b6d4' : '#e5e7eb'}`,
                        background: form.meeting_type === type ? '#ecfeff' : 'white',
                        color: form.meeting_type === type ? '#0e7490' : '#6b7280',
                        fontWeight: '600', fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
                      }}
                    >
                      {type === 'online' ? '💻 Online' : '🤝 In-Person'}
                    </button>
                  ))}
                </div>
              </div>
              {/* Meeting date */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div>
                  <label style={labelStyle}>Meeting Date & Time *</label>
                  <input
                    style={inputStyle}
                    type="datetime-local"
                    value={form.meeting_date}
                    onChange={e => handleChange('meeting_date', e.target.value)}
                    required={form.stage === 'meeting_scheduled'}
                  />
                </div>
                {form.meeting_type === 'online' && (
                  <div>
                    <label style={labelStyle}>Meeting Link (Google Meet, Zoom etc.)</label>
                    <input
                      style={inputStyle}
                      type="url"
                      value={form.meeting_link}
                      onChange={e => handleChange('meeting_link', e.target.value)}
                      placeholder="https://meet.google.com/..."
                    />
                  </div>
                )}
                {form.meeting_type === 'offline' && (
                  <div>
                    <label style={labelStyle}>Meeting Location / Address</label>
                    <input
                      style={inputStyle}
                      value={form.meeting_link}
                      onChange={e => handleChange('meeting_link', e.target.value)}
                      placeholder="e.g. Client Office, Hyderabad"
                    />
                  </div>
                )}
              </div>
              {/* Meeting notes */}
              <div>
                <label style={labelStyle}>Meeting Agenda / Notes</label>
                <textarea
                  style={{ ...inputStyle, minHeight: '60px', resize: 'vertical' }}
                  value={form.meeting_notes}
                  onChange={e => handleChange('meeting_notes', e.target.value)}
                  placeholder="What topics to cover, demo points, client requirements..."
                />
              </div>
            </div>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '10px 20px', borderRadius: '10px',
                border: '1px solid #e5e7eb',
                background: 'white', cursor: 'pointer',
                fontSize: '14px', fontWeight: '600', color: '#6b7280',
                fontFamily: 'inherit'
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              style={{
                padding: '10px 24px', borderRadius: '10px',
                background: 'linear-gradient(135deg, #8b5cf6, #6c63ff)',
                border: 'none', cursor: saving ? 'not-allowed' : 'pointer',
                fontSize: '14px', fontWeight: '700', color: 'white',
                fontFamily: 'inherit', opacity: saving ? 0.7 : 1
              }}
            >
              {saving ? 'Saving...' : (deal ? 'Save Changes' : 'Create Deal')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function RevenueForecast({ deals }) {
  const stageData = STAGES.filter(s => s.key !== 'lost').map(s => {
    const weighted = deals
      .filter(d => d.stage === s.key)
      .reduce((sum, d) => sum + (d.value || 0) * (d.probability || 0) / 100, 0);
    return { ...s, weighted };
  });

  const maxVal = Math.max(...stageData.map(s => s.weighted), 1);

  return (
    <div style={{
      background: 'white',
      borderRadius: '16px',
      padding: '24px',
      border: '1px solid #f0f0f5',
      boxShadow: '0 1px 8px rgba(0,0,0,0.04)',
      marginTop: '24px'
    }}>
      <h3 style={{ margin: '0 0 20px', fontSize: '16px', fontWeight: '700', color: '#1a1a2e' }}>
        📈 Revenue Forecast (Weighted by Probability)
      </h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {stageData.map(s => {
          const pct = maxVal > 0 ? (s.weighted / maxVal) * 100 : 0;
          return (
            <div key={s.key} style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{ width: '130px', flexShrink: 0, fontSize: '12px', fontWeight: '600', color: s.color, display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>{s.emoji}</span>
                <span>{s.label}</span>
              </div>
              <div style={{ flex: 1, background: '#f5f5f7', borderRadius: '6px', height: '10px', overflow: 'hidden' }}>
                <div style={{
                  width: `${pct}%`,
                  height: '100%',
                  background: s.color,
                  borderRadius: '6px',
                  transition: 'width 0.6s ease'
                }} />
              </div>
              <div style={{ width: '100px', flexShrink: 0, fontSize: '13px', fontWeight: '700', color: '#1a1a2e', textAlign: 'right' }}>
                {formatCurrency(Math.round(s.weighted))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function SalesPipelinePage() {
  const { addToast } = useApp();
  const [deals, setDeals] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('All');
  const [modal, setModal] = useState(null); // null | { mode: 'create' | 'edit', deal?: {} }

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [dealsData, usersData] = await Promise.all([
        api.getDeals(),
        api.getUsers()
      ]);
      setDeals(dealsData);
      setUsers(usersData);
    } catch (err) {
      addToast('Failed to load deals', 'error');
    } finally {
      setLoading(false);
    }
  }

  const filteredDeals = filter === 'All'
    ? deals
    : deals.filter(d => d.assignee_name === filter);

  // Stats
  const activePipelineValue = filteredDeals
    .filter(d => d.stage !== 'lost')
    .reduce((s, d) => s + (d.value || 0), 0);

  const wonRevenue = filteredDeals
    .filter(d => d.stage === 'won')
    .reduce((s, d) => s + (d.value || 0), 0);

  const activeDeals = filteredDeals.filter(d => d.stage !== 'won' && d.stage !== 'lost').length;

  const wonCount = filteredDeals.filter(d => d.stage === 'won').length;
  const lostCount = filteredDeals.filter(d => d.stage === 'lost').length;
  const winRate = (wonCount + lostCount) > 0 ? Math.round((wonCount / (wonCount + lostCount)) * 100) : 0;

  const nonLost = filteredDeals.filter(d => d.stage !== 'lost');
  const avgDealSize = nonLost.length > 0
    ? Math.round(nonLost.reduce((s, d) => s + (d.value || 0), 0) / nonLost.length)
    : 0;

  async function handleSave(formData) {
    if (modal.mode === 'edit') {
      const updated = await api.updateDeal(modal.deal.id, formData);
      setDeals(prev => prev.map(d => d.id === updated.id ? updated : d));
      addToast('Deal updated!');
    } else {
      const created = await api.createDeal(formData);
      setDeals(prev => [created, ...prev]);
      addToast('Deal created!');
    }
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this deal?')) return;
    try {
      await api.deleteDeal(id);
      setDeals(prev => prev.filter(d => d.id !== id));
      addToast('Deal deleted');
    } catch (err) {
      addToast('Failed to delete', 'error');
    }
  }

  async function handleMove(deal, newStage) {
    try {
      const updated = await api.updateDeal(deal.id, {
        ...deal,
        stage: newStage,
        probability: STAGE_PROBABILITY[newStage] ?? deal.probability
      });
      setDeals(prev => prev.map(d => d.id === updated.id ? updated : d));
      addToast(`Moved to ${STAGES.find(s => s.key === newStage)?.label}`);
    } catch (err) {
      addToast('Failed to move deal', 'error');
    }
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '300px', color: '#9ca3af' }}>
        Loading pipeline...
      </div>
    );
  }

  return (
    <div style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
      {/* Page header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '24px', fontWeight: '800', color: '#1a1a2e' }}>
            🤖 Solvv AI Sales Pipeline
          </h1>
          <p style={{ margin: '4px 0 0', color: '#9ca3af', fontSize: '14px' }}>
            Track deals, manage contacts, close more revenue
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {/* Filter buttons */}
          <div style={{ display: 'flex', background: '#f5f5f7', borderRadius: '10px', padding: '3px', gap: '2px' }}>
            {['All', 'Ritesh', 'Sneha'].map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                style={{
                  padding: '6px 14px', borderRadius: '8px', border: 'none',
                  cursor: 'pointer', fontSize: '13px', fontWeight: '600',
                  fontFamily: 'inherit',
                  background: filter === f ? 'white' : 'transparent',
                  color: filter === f ? '#6c63ff' : '#6b7280',
                  boxShadow: filter === f ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
                  transition: 'all 0.15s'
                }}
              >
                {f}
              </button>
            ))}
          </div>

          {/* New Deal button */}
          <button
            onClick={() => setModal({ mode: 'create' })}
            style={{
              background: 'linear-gradient(135deg, #8b5cf6, #6c63ff)',
              color: 'white', border: 'none', cursor: 'pointer',
              padding: '10px 20px', borderRadius: '12px',
              fontSize: '14px', fontWeight: '700', fontFamily: 'inherit',
              display: 'flex', alignItems: 'center', gap: '6px',
              boxShadow: '0 4px 14px rgba(108,99,255,0.35)'
            }}
          >
            <span style={{ fontSize: '16px' }}>+</span>
            New Deal
          </button>
        </div>
      </div>

      {/* Stats row */}
      <div style={{ display: 'flex', gap: '14px', marginBottom: '24px', flexWrap: 'wrap' }}>
        <StatCard emoji="💰" label="Total Pipeline" value={formatCurrency(activePipelineValue)} sub="All non-lost deals" color="#6c63ff" />
        <StatCard emoji="✅" label="Won Revenue" value={formatCurrency(wonRevenue)} sub={`${wonCount} deal${wonCount !== 1 ? 's' : ''} closed`} color="#10b981" />
        <StatCard emoji="🎯" label="Active Deals" value={activeDeals} sub="In progress" color="#3b82f6" />
        <StatCard emoji="📈" label="Win Rate" value={`${winRate}%`} sub={`${wonCount}W / ${lostCount}L`} color={winRate >= 50 ? '#10b981' : '#f59e0b'} />
        <StatCard emoji="📅" label="Avg Deal Size" value={formatCurrency(avgDealSize)} sub="Excl. lost" color="#8b5cf6" />
      </div>

      {/* Kanban board */}
      <div style={{
        display: 'flex', gap: '16px',
        overflowX: 'auto',
        paddingBottom: '16px',
        alignItems: 'flex-start'
      }}>
        {STAGES.map(stage => {
          const stageDeals = filteredDeals.filter(d => d.stage === stage.key);
          return (
            <KanbanColumn
              key={stage.key}
              stage={stage}
              deals={stageDeals}
              onEdit={deal => setModal({ mode: 'edit', deal })}
              onDelete={handleDelete}
              onMove={handleMove}
            />
          );
        })}
      </div>

      {/* Revenue forecast */}
      <RevenueForecast deals={filteredDeals} />

      {/* Modal */}
      {modal && (
        <DealModal
          deal={modal.mode === 'edit' ? modal.deal : null}
          users={users}
          onClose={() => setModal(null)}
          onSave={handleSave}
        />
      )}
    </div>
  );
}
