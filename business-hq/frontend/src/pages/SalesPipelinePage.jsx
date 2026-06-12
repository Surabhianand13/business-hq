import { useState, useEffect, useRef } from 'react';
import { useApp } from '../App';
import api from '../api';

const STAGES = [
  { key: 'lead',              label: 'Lead',               color: '#6b7280', bg: '#f3f4f6', emoji: '🔵' },
  { key: 'meeting_scheduled', label: 'Meeting Scheduled',  color: '#06b6d4', bg: '#ecfeff', emoji: '📞' },
  { key: 'proposal',          label: 'Proposal Sent',      color: '#8b5cf6', bg: '#f5f3ff', emoji: '📝' },
  { key: 'negotiation',       label: 'Negotiation',        color: '#f59e0b', bg: '#fffbeb', emoji: '🤝' },
  { key: 'won',               label: 'Closed Won',         color: '#10b981', bg: '#f0fdf4', emoji: '✅' },
  { key: 'lost',              label: 'Closed Lost',        color: '#ef4444', bg: '#fef2f2', emoji: '❌' },
];

const STAGE_PROBABILITY = {
  lead: 10, meeting_scheduled: 50, proposal: 60, negotiation: 80, won: 100, lost: 0
};

const DEAL_TITLE_OPTIONS = [
  'Website Development',
  'AI Tools',
  'Others',
];

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

      {/* Next follow-up date */}
      {deal.next_followup_date && (
        <div style={{ fontSize: '11px', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span>🔔</span>
          {(() => {
            const fDate = new Date(deal.next_followup_date);
            const today = new Date();
            const isToday = fDate.toDateString() === today.toDateString();
            const isPast = fDate < today && !isToday;
            return (
              <span style={{ fontWeight: '600', color: isPast ? '#ef4444' : isToday ? '#f59e0b' : '#6b7280', background: isPast ? '#fff0f0' : isToday ? '#fff7ed' : 'transparent', padding: isPast || isToday ? '1px 6px' : '0', borderRadius: '5px' }}>
                Follow-up: {isToday ? 'Today!' : isPast ? `Overdue (${formatDate(deal.next_followup_date)})` : formatDate(deal.next_followup_date)}
              </span>
            );
          })()}
        </div>
      )}

      {/* Expected close date */}
      {deal.expected_close_date && (
        <div style={{ fontSize: '11px', color: '#9ca3af', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span>📅</span>
          <span>Close: {formatDate(deal.expected_close_date)}</span>
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
      <div style={{ flex: 1, maxHeight: '560px', overflowY: 'auto', paddingRight: '2px' }}>
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
  title: 'Website Development', title_custom: '', company: '', value: '', stage: 'lead', probability: 10,
  expected_close_date: '', next_followup_date: '', assignee_id: '', contact_name: '',
  contact_email: '', contact_phone: '', notes: '',
  meeting_type: 'online', meeting_date: '', meeting_link: '', meeting_notes: ''
};

function DealModal({ deal, users, onClose, onSave }) {
  const dealTitle = deal?.title || '';
  const isCustomTitle = dealTitle && !DEAL_TITLE_OPTIONS.includes(dealTitle);

  const [form, setForm] = useState(deal ? {
    title: isCustomTitle ? 'Others' : (dealTitle || 'Website Development'),
    title_custom: isCustomTitle ? dealTitle : '',
    company: deal.company || '',
    value: deal.value || '',
    stage: deal.stage || 'lead',
    probability: deal.probability ?? 10,
    expected_close_date: deal.expected_close_date ? deal.expected_close_date.split('T')[0] : '',
    next_followup_date: deal.next_followup_date ? deal.next_followup_date.split('T')[0] : '',
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
      const finalTitle = form.title === 'Others' ? (form.title_custom || 'Others') : form.title;
      await onSave({
        ...form,
        title: finalTitle,
        value: parseFloat(form.value) || 0,
        probability: parseInt(form.probability) || 0,
        assignee_id: form.assignee_id || null,
        expected_close_date: form.expected_close_date || null,
        next_followup_date: form.next_followup_date || null,
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
          <div className="form-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
            <div>
              <label style={labelStyle}>Deal Type *</label>
              <select
                style={{ ...inputStyle, cursor: 'pointer' }}
                value={form.title}
                onChange={e => handleChange('title', e.target.value)}
                required
              >
                {DEAL_TITLE_OPTIONS.map(opt => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
              {form.title === 'Others' && (
                <input
                  style={{ ...inputStyle, marginTop: '8px' }}
                  value={form.title_custom}
                  onChange={e => handleChange('title_custom', e.target.value)}
                  placeholder="Describe the deal type..."
                  required
                />
              )}
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
          <div className="form-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
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

          {/* Next Follow-up + Probability */}
          <div className="form-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
            <div>
              <label style={labelStyle}>🔔 Next Follow-up Date</label>
              <input
                style={inputStyle}
                type="date"
                value={form.next_followup_date}
                onChange={e => handleChange('next_followup_date', e.target.value)}
              />
            </div>
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
          </div>

          {/* Expected close */}
          <div style={{ marginBottom: '14px' }}>
            <label style={labelStyle}>Expected Close Date</label>
            <input
              style={inputStyle}
              type="date"
              value={form.expected_close_date}
              onChange={e => handleChange('expected_close_date', e.target.value)}
            />
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
          <div className="form-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
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
              <div className="form-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
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

function startOfDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function followupRelative(dateStr) {
  const today = startOfDay(new Date());
  const fd = startOfDay(dateStr);
  const diffDays = Math.round((fd.getTime() - today.getTime()) / 86400000);
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Tomorrow';
  if (diffDays === -1) return 'Yesterday';
  if (diffDays < 0) return `${Math.abs(diffDays)}d ago`;
  return `${diffDays}d`;
}

function CompactFollowUpPanel({ deals, onEdit }) {
  const today = startOfDay(new Date());
  const tomorrow = new Date(today.getTime() + 86400000);
  const weekEnd = new Date(today.getTime() + 7 * 86400000);

  const withFollowup = deals.filter(d =>
    d.next_followup_date && !['won', 'lost'].includes(d.stage)
  );

  const groups = { overdue: [], today: [], tomorrow: [], thisWeek: [] };
  for (const d of withFollowup) {
    const fd = startOfDay(d.next_followup_date);
    if (fd < today) groups.overdue.push(d);
    else if (fd.getTime() === today.getTime()) groups.today.push(d);
    else if (fd.getTime() === tomorrow.getTime()) groups.tomorrow.push(d);
    else if (fd <= weekEnd) groups.thisWeek.push(d);
  }
  // sort each bucket by date ascending
  for (const k of Object.keys(groups)) {
    groups[k].sort((a, b) => new Date(a.next_followup_date) - new Date(b.next_followup_date));
  }

  const sections = [
    { key: 'overdue',  label: 'Overdue',   emoji: '⚠️', color: '#ef4444', bg: '#fef2f2', deals: groups.overdue },
    { key: 'today',    label: 'Today',     emoji: '🔥', color: '#f59e0b', bg: '#fffbeb', deals: groups.today },
    { key: 'tomorrow', label: 'Tomorrow',  emoji: '📌', color: '#3b82f6', bg: '#eff6ff', deals: groups.tomorrow },
    { key: 'thisWeek', label: 'This Week', emoji: '📅', color: '#8b5cf6', bg: '#f5f3ff', deals: groups.thisWeek },
  ];

  const totalDue = groups.overdue.length + groups.today.length;

  return (
    <div style={{
      background: 'white', borderRadius: '16px', padding: '16px',
      border: '1px solid #f0f0f5', boxShadow: '0 1px 8px rgba(0,0,0,0.04)',
      marginBottom: '20px', maxHeight: '280px', overflow: 'hidden',
      display: 'flex', flexDirection: 'column'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '16px' }}>🔔</span>
          <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '700', color: '#1a1a2e' }}>Follow-ups</h3>
        </div>
        {totalDue > 0 && (
          <span style={{ fontSize: '12px', fontWeight: '700', color: '#ef4444', background: '#fef2f2', padding: '4px 12px', borderRadius: '20px' }}>
            {totalDue} need attention now
          </span>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', minHeight: 0 }}>
        {sections.map(section => (
          <div key={section.key} style={{
            background: section.bg, borderRadius: '12px', padding: '10px',
            border: `1px solid ${section.color}20`,
            display: 'flex', flexDirection: 'column', maxHeight: '240px', minHeight: 0
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px', flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '13px' }}>{section.emoji}</span>
                <span style={{ fontSize: '12px', fontWeight: '700', color: section.color }}>{section.label}</span>
              </div>
              <span style={{ fontSize: '11px', fontWeight: '700', color: section.color, background: 'white', padding: '1px 7px', borderRadius: '10px' }}>
                {section.deals.length}
              </span>
            </div>
            {section.deals.length === 0 ? (
              <div style={{ fontSize: '12px', color: '#9ca3af', textAlign: 'center', padding: '8px 0' }}>Nothing here ✓</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', overflowY: 'auto', minHeight: 0 }}>
                {section.deals.map(deal => (
                  <button
                    key={deal.id}
                    onClick={() => onEdit(deal)}
                    title={`${deal.company} · ${formatCurrency(deal.value)}`}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '7px',
                      width: '100%', padding: '6px 8px', borderRadius: '8px',
                      background: 'white', border: 'none', cursor: 'pointer',
                      textAlign: 'left', fontFamily: 'inherit',
                      transition: 'box-shadow 0.15s'
                    }}
                    onMouseEnter={e => e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)'}
                    onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
                  >
                    <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: deal.assignee_color || '#cbd5e1', color: 'white', fontSize: '10px', fontWeight: '700', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      {deal.assignee_name ? deal.assignee_name[0] : '?'}
                    </div>
                    <div style={{ flex: 1, minWidth: 0, fontSize: '12px', fontWeight: '600', color: '#1a1a2e', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {deal.company}
                    </div>
                    <div style={{ fontSize: '11px', fontWeight: '700', color: '#374151', flexShrink: 0 }}>{formatCurrency(deal.value)}</div>
                    <div style={{ fontSize: '10px', fontWeight: '600', color: section.color, flexShrink: 0, minWidth: '34px', textAlign: 'right' }}>
                      {followupRelative(deal.next_followup_date)}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
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

const PAGE_SIZE = 25;

function DealListView({ deals, onEdit, onDelete, onMove }) {
  const [sortKey, setSortKey] = useState('next_followup_date');
  const [sortDir, setSortDir] = useState('asc');
  const [page, setPage] = useState(1);

  // Reset to page 1 whenever the underlying deal set changes (filters/search)
  const dealIdsSig = deals.map(d => d.id).join(',');
  useEffect(() => { setPage(1); }, [dealIdsSig, sortKey, sortDir]);

  function toggleSort(key) {
    if (sortKey === key) {
      setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  }

  const sorted = [...deals].sort((a, b) => {
    let av, bv;
    if (sortKey === 'value') {
      av = a.value || 0; bv = b.value || 0;
    } else if (sortKey === 'next_followup_date') {
      av = a.next_followup_date ? new Date(a.next_followup_date).getTime() : Infinity;
      bv = b.next_followup_date ? new Date(b.next_followup_date).getTime() : Infinity;
    } else if (sortKey === 'company') {
      av = (a.company || '').toLowerCase(); bv = (b.company || '').toLowerCase();
    } else {
      av = a[sortKey]; bv = b[sortKey];
    }
    if (av < bv) return sortDir === 'asc' ? -1 : 1;
    if (av > bv) return sortDir === 'asc' ? 1 : -1;
    return 0;
  });

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * PAGE_SIZE;
  const pageDeals = sorted.slice(start, start + PAGE_SIZE);

  const today = startOfDay(new Date());

  const arrow = key => (sortKey === key ? (sortDir === 'asc' ? ' ▲' : ' ▼') : '');

  const thStyle = {
    textAlign: 'left', padding: '10px 12px', fontSize: '11px', fontWeight: '700',
    color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.4px',
    borderBottom: '1px solid #f0f0f5', whiteSpace: 'nowrap', position: 'sticky', top: 0,
    background: '#fafafb', zIndex: 1
  };
  const sortableTh = { ...thStyle, cursor: 'pointer', userSelect: 'none' };
  const tdStyle = { padding: '10px 12px', fontSize: '13px', borderBottom: '1px solid #f5f5f7', verticalAlign: 'middle' };

  return (
    <div style={{
      background: 'white', borderRadius: '16px',
      border: '1px solid #f0f0f5', boxShadow: '0 1px 8px rgba(0,0,0,0.04)',
      overflow: 'hidden'
    }}>
      <div style={{ overflowX: 'auto' }}>
        {deals.length === 0 ? (
          <div style={{ padding: '48px 16px', textAlign: 'center', color: '#9ca3af', fontSize: '14px' }}>
            No deals match your filters.
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '880px' }}>
            <thead>
              <tr>
                <th style={sortableTh} onClick={() => toggleSort('company')}>Company{arrow('company')}</th>
                <th style={thStyle}>Type</th>
                <th style={sortableTh} onClick={() => toggleSort('value')}>Value{arrow('value')}</th>
                <th style={thStyle}>Stage</th>
                <th style={thStyle}>Owner</th>
                <th style={sortableTh} onClick={() => toggleSort('next_followup_date')}>Follow-up{arrow('next_followup_date')}</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {pageDeals.map(deal => {
                const stageInfo = STAGES.find(s => s.key === deal.stage);
                let fuColor = '#6b7280', fuBg = 'transparent', fuText = formatDate(deal.next_followup_date) || '—';
                if (deal.next_followup_date) {
                  const fd = startOfDay(deal.next_followup_date);
                  if (fd < today) { fuColor = '#ef4444'; fuBg = '#fef2f2'; }
                  else if (fd.getTime() === today.getTime()) { fuColor = '#f59e0b'; fuBg = '#fffbeb'; fuText = 'Today'; }
                }
                return (
                  <tr
                    key={deal.id}
                    onClick={() => onEdit(deal)}
                    style={{ cursor: 'pointer', transition: 'background 0.12s' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#fafafb'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <td style={tdStyle}>
                      <div style={{ fontWeight: '700', color: '#1a1a2e' }}>{deal.company}</div>
                      {(deal.contact_name || deal.contact_phone) && (
                        <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '1px' }}>
                          {deal.contact_name}{deal.contact_name && deal.contact_phone ? ' · ' : ''}{deal.contact_phone}
                        </div>
                      )}
                    </td>
                    <td style={{ ...tdStyle, color: '#6b7280' }}>{deal.title}</td>
                    <td style={{ ...tdStyle, fontWeight: '700', color: '#1a1a2e', whiteSpace: 'nowrap' }}>{formatCurrency(deal.value)}</td>
                    <td style={tdStyle} onClick={e => e.stopPropagation()}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{
                          background: stageInfo?.bg || '#f3f4f6', color: stageInfo?.color || '#6b7280',
                          border: `1px solid ${stageInfo?.color || '#6b7280'}25`,
                          borderRadius: '20px', padding: '2px 9px', fontSize: '11px', fontWeight: '700', whiteSpace: 'nowrap'
                        }}>
                          {stageInfo?.emoji} {stageInfo?.label}
                        </span>
                        <MoveStageDropdown deal={deal} onMove={onMove} />
                      </div>
                    </td>
                    <td style={tdStyle}>
                      {deal.assignee_name ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Avatar name={deal.assignee_name} color={deal.assignee_color} size={22} />
                          <span style={{ fontSize: '12px', color: '#6b7280', fontWeight: '500', whiteSpace: 'nowrap' }}>{deal.assignee_name}</span>
                        </div>
                      ) : (
                        <span style={{ fontSize: '12px', color: '#d1d5db' }}>Unassigned</span>
                      )}
                    </td>
                    <td style={tdStyle}>
                      <span style={{
                        fontSize: '12px', fontWeight: '600', color: fuColor,
                        background: fuBg, padding: fuBg !== 'transparent' ? '2px 8px' : '0',
                        borderRadius: '6px', whiteSpace: 'nowrap'
                      }}>
                        {fuText}
                      </span>
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'right' }} onClick={e => e.stopPropagation()}>
                      <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                        <button
                          onClick={() => onEdit(deal)}
                          title="Edit"
                          style={{ background: '#f5f5f7', border: 'none', cursor: 'pointer', width: '28px', height: '28px', borderRadius: '7px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6b7280' }}
                        >
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                            <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                            <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                          </svg>
                        </button>
                        <button
                          onClick={() => onDelete(deal.id)}
                          title="Delete"
                          style={{ background: '#fef2f2', border: 'none', cursor: 'pointer', width: '28px', height: '28px', borderRadius: '7px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444' }}
                        >
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                            <polyline points="3 6 5 6 21 6"/>
                            <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
                            <path d="M10 11v6"/><path d="M14 11v6"/>
                            <path d="M9 6V4h6v2"/>
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {deals.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderTop: '1px solid #f0f0f5', flexWrap: 'wrap', gap: '10px' }}>
          <span style={{ fontSize: '12px', color: '#9ca3af' }}>
            Showing {start + 1}–{Math.min(start + PAGE_SIZE, sorted.length)} of {sorted.length}
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={safePage <= 1}
              style={{
                padding: '6px 14px', borderRadius: '8px', border: '1px solid #e5e7eb',
                background: 'white', cursor: safePage <= 1 ? 'not-allowed' : 'pointer',
                fontSize: '13px', fontWeight: '600', color: safePage <= 1 ? '#d1d5db' : '#6b7280',
                fontFamily: 'inherit'
              }}
            >
              ← Prev
            </button>
            <span style={{ fontSize: '12px', fontWeight: '600', color: '#6b7280' }}>Page {safePage} of {totalPages}</span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={safePage >= totalPages}
              style={{
                padding: '6px 14px', borderRadius: '8px', border: '1px solid #e5e7eb',
                background: 'white', cursor: safePage >= totalPages ? 'not-allowed' : 'pointer',
                fontSize: '13px', fontWeight: '600', color: safePage >= totalPages ? '#d1d5db' : '#6b7280',
                fontFamily: 'inherit'
              }}
            >
              Next →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function SalesPipelinePage() {
  const { addToast } = useApp();
  const [deals, setDeals] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState('All');
  const [viewMode, setViewMode] = useState('List'); // 'List' | 'Board'
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

  // visibleDeals: owner + stage + search — drives both List and Board views
  const searchLc = search.trim().toLowerCase();
  const visibleDeals = filteredDeals.filter(d => {
    if (stageFilter !== 'All' && d.stage !== stageFilter) return false;
    if (searchLc) {
      const hay = `${d.company || ''} ${d.contact_name || ''} ${d.contact_phone || ''}`.toLowerCase();
      if (!hay.includes(searchLc)) return false;
    }
    return true;
  });

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

      </div>

      {/* Stats row */}
      <div style={{ display: 'flex', gap: '14px', marginBottom: '24px', flexWrap: 'wrap' }}>
        <StatCard emoji="💰" label="Total Pipeline" value={formatCurrency(activePipelineValue)} sub="All non-lost deals" color="#6c63ff" />
        <StatCard emoji="✅" label="Won Revenue" value={formatCurrency(wonRevenue)} sub={`${wonCount} deal${wonCount !== 1 ? 's' : ''} closed`} color="#10b981" />
        <StatCard emoji="🎯" label="Active Deals" value={activeDeals} sub="In progress" color="#3b82f6" />
        <StatCard emoji="📈" label="Win Rate" value={`${winRate}%`} sub={`${wonCount}W / ${lostCount}L`} color={winRate >= 50 ? '#10b981' : '#f59e0b'} />
        <StatCard emoji="📅" label="Avg Deal Size" value={formatCurrency(avgDealSize)} sub="Excl. lost" color="#8b5cf6" />
      </div>

      {/* Compact follow-ups panel — start your day here */}
      <CompactFollowUpPanel deals={filteredDeals} onEdit={deal => setModal({ mode: 'edit', deal })} />

      {/* Toolbar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap',
        background: 'white', borderRadius: '14px', padding: '12px 14px',
        border: '1px solid #f0f0f5', boxShadow: '0 1px 8px rgba(0,0,0,0.04)',
        marginBottom: '16px', position: 'sticky', top: '0', zIndex: 10
      }}>
        {/* Search */}
        <div style={{ position: 'relative', flex: '1 1 240px', minWidth: '200px' }}>
          <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '14px', pointerEvents: 'none' }}>🔍</span>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search company, contact, phone…"
            style={{
              width: '100%', padding: '9px 12px 9px 34px',
              border: '1px solid #e5e7eb', borderRadius: '10px',
              fontSize: '13px', fontFamily: 'inherit', color: '#1a1a2e',
              background: '#fafafb', outline: 'none', boxSizing: 'border-box'
            }}
          />
        </div>

        {/* Owner filter segmented */}
        <div style={{ display: 'flex', background: '#f5f5f7', borderRadius: '10px', padding: '3px', gap: '2px' }}>
          {['All', 'Ritesh', 'Sneha'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                padding: '6px 14px', borderRadius: '8px', border: 'none',
                cursor: 'pointer', fontSize: '13px', fontWeight: '600', fontFamily: 'inherit',
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

        {/* Stage filter dropdown */}
        <select
          value={stageFilter}
          onChange={e => setStageFilter(e.target.value)}
          style={{
            padding: '8px 12px', border: '1px solid #e5e7eb', borderRadius: '10px',
            fontSize: '13px', fontFamily: 'inherit', color: '#374151', background: 'white',
            cursor: 'pointer', outline: 'none', fontWeight: '600'
          }}
        >
          <option value="All">All Stages</option>
          {STAGES.map(s => (
            <option key={s.key} value={s.key}>{s.label}</option>
          ))}
        </select>

        {/* View toggle segmented */}
        <div style={{ display: 'flex', background: '#f5f5f7', borderRadius: '10px', padding: '3px', gap: '2px' }}>
          {['List', 'Board'].map(v => (
            <button
              key={v}
              onClick={() => setViewMode(v)}
              style={{
                padding: '6px 14px', borderRadius: '8px', border: 'none',
                cursor: 'pointer', fontSize: '13px', fontWeight: '600', fontFamily: 'inherit',
                background: viewMode === v ? 'white' : 'transparent',
                color: viewMode === v ? '#6c63ff' : '#6b7280',
                boxShadow: viewMode === v ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
                transition: 'all 0.15s'
              }}
            >
              {v === 'List' ? '☰ List' : '▦ Board'}
            </button>
          ))}
        </div>

        {/* Count */}
        <span style={{ fontSize: '12px', fontWeight: '600', color: '#9ca3af', marginLeft: 'auto' }}>
          {visibleDeals.length} deal{visibleDeals.length !== 1 ? 's' : ''}
        </span>

        {/* New Deal */}
        <button
          onClick={() => setModal({ mode: 'create' })}
          style={{
            background: 'linear-gradient(135deg, #8b5cf6, #6c63ff)',
            color: 'white', border: 'none', cursor: 'pointer',
            padding: '9px 18px', borderRadius: '10px',
            fontSize: '13px', fontWeight: '700', fontFamily: 'inherit',
            display: 'flex', alignItems: 'center', gap: '6px',
            boxShadow: '0 4px 14px rgba(108,99,255,0.35)', whiteSpace: 'nowrap'
          }}
        >
          <span style={{ fontSize: '15px' }}>+</span>
          New Deal
        </button>
      </div>

      {/* Main deals area */}
      {viewMode === 'List' ? (
        <DealListView
          deals={visibleDeals}
          onEdit={deal => setModal({ mode: 'edit', deal })}
          onDelete={handleDelete}
          onMove={handleMove}
        />
      ) : (
        <div style={{
          display: 'flex', gap: '16px',
          overflowX: 'auto',
          paddingBottom: '16px',
          alignItems: 'flex-start'
        }}>
          {STAGES.map(stage => {
            const stageDeals = visibleDeals.filter(d => d.stage === stage.key);
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
      )}

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
