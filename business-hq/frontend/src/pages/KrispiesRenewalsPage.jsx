import { useState, useEffect, useMemo } from 'react';
import { useApp } from '../App';
import api from '../api';

const cardStyle = {
  background: 'white',
  border: '1px solid #f0f0f5',
  boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
  borderRadius: '16px',
};

const STATUS = {
  overdue:  { key: 'overdue',  label: 'Overdue',  color: '#ef4444', bg: '#fef2f2', border: '#ef444433' },
  duesoon:  { key: 'duesoon',  label: 'Due Soon', color: '#f59e0b', bg: '#fffbeb', border: '#f59e0b33' },
  upcoming: { key: 'upcoming', label: 'Upcoming', color: '#3b82f6', bg: '#eff6ff', border: '#3b82f633' },
  valid:    { key: 'valid',    label: 'Valid',    color: '#10b981', bg: '#ecfdf5', border: '#10b98133' },
  none:     { key: 'none',     label: 'No Date',  color: '#9ca3af', bg: '#f3f4f6', border: '#d1d5db' },
};

const FREQ_LABELS = {
  annual: 'Annual',
  semiannual: 'Semi-annual',
  quarterly: 'Quarterly',
  monthly: 'Monthly',
};

const CATEGORIES = [
  { value: 'licence', label: 'Licence' },
  { value: 'service', label: 'Service' },
  { value: 'tax', label: 'Tax' },
  { value: 'insurance', label: 'Insurance' },
  { value: 'other', label: 'Other' },
];

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function daysUntil(due) {
  if (!due) return null;
  const d = new Date(due);
  d.setHours(0, 0, 0, 0);
  return Math.round((d - startOfToday()) / 86400000);
}

function statusFor(due) {
  if (!due) return STATUS.none;
  const days = daysUntil(due);
  if (days < 0) return STATUS.overdue;
  if (days <= 30) return STATUS.duesoon;
  if (days <= 90) return STATUS.upcoming;
  return STATUS.valid;
}

function statusLabel(due) {
  if (!due) return 'No due date';
  const days = daysUntil(due);
  if (days < 0) return `${Math.abs(days)} day${Math.abs(days) === 1 ? '' : 's'} overdue`;
  if (days === 0) return 'Due today';
  return `Due in ${days} day${days === 1 ? '' : 's'}`;
}

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function fmtShort(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

function shortDays(due) {
  if (!due) return '—';
  const days = daysUntil(due);
  if (days < 0) return `${Math.abs(days)}d over`;
  if (days === 0) return 'today';
  return `${days}d`;
}

const TITLE_EMOJI = {
  'FSSAI Licence': '🍴',
  'Trade Licence (GHMC)': '🏛️',
  'Shop & Establishment': '🏬',
  'Fire Safety NOC': '🔥',
  'Labour Licence': '👷',
  'Food Handler Medical': '🩺',
  'Weighing Scale Stamping': '⚖️',
  'Pest Control Service': '🐜',
  'Deep Cleaning': '🧼',
};

// Preferred row order for the matrix
const ROW_ORDER = [
  'FSSAI Licence', 'Trade Licence (GHMC)', 'Shop & Establishment', 'Fire Safety NOC',
  'Labour Licence', 'Food Handler Medical', 'Weighing Scale Stamping',
  'Pest Control Service', 'Deep Cleaning',
];

export default function KrispiesRenewalsPage() {
  const { addToast } = useApp();
  const [renewals, setRenewals] = useState([]);
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  async function load() {
    try {
      const [ren, st] = await Promise.all([api.getRenewals(), api.getKrispiesStores()]);
      setRenewals(ren);
      setStores(st);
    } catch (e) {
      addToast('Failed to load renewals', 'error');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  // Business-wide (vehicle) items — no store
  const businessWide = useMemo(
    () => renewals.filter(r => !r.store_id).sort((a, b) => {
      if (!a.due_date) return 1;
      if (!b.due_date) return -1;
      return new Date(a.due_date) - new Date(b.due_date);
    }),
    [renewals]
  );

  // Per-store items for the matrix
  const perStore = useMemo(() => renewals.filter(r => r.store_id), [renewals]);

  // Columns = stores that have per-store renewals
  const matrixStores = useMemo(() => {
    const ids = new Set(perStore.map(r => r.store_id));
    return stores.filter(s => ids.has(s.id));
  }, [perStore, stores]);

  // Rows = unique renewal titles, in preferred order then any extras
  const matrixRows = useMemo(() => {
    const titles = [...new Set(perStore.map(r => r.title))];
    return titles.sort((a, b) => {
      const ia = ROW_ORDER.indexOf(a), ib = ROW_ORDER.indexOf(b);
      return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
    });
  }, [perStore]);

  // Lookup: `${title}|${store_id}` -> renewal
  const matrixMap = useMemo(() => {
    const m = {};
    for (const r of perStore) m[`${r.title}|${r.store_id}`] = r;
    return m;
  }, [perStore]);

  const counts = useMemo(() => {
    const c = { overdue: 0, duesoon: 0, upcoming: 0, valid: 0 };
    for (const r of renewals) {
      const s = statusFor(r.due_date).key;
      if (c[s] !== undefined) c[s]++;
    }
    return c;
  }, [renewals]);

  const urgent = useMemo(
    () => renewals
      .filter(r => { const k = statusFor(r.due_date).key; return k === 'overdue' || k === 'duesoon'; })
      .sort((a, b) => new Date(a.due_date) - new Date(b.due_date)),
    [renewals]
  );

  async function markDone(id) {
    try {
      const updated = await api.markRenewalDone(id);
      setRenewals(prev => prev.map(r => r.id === id ? updated : r));
      addToast('Marked done — next due date scheduled', 'success');
    } catch (e) {
      addToast('Failed to update', 'error');
    }
  }

  function openAdd() { setEditing(null); setModalOpen(true); }
  function openEdit(r) { setEditing(r); setModalOpen(true); }

  async function handleSave(form) {
    try {
      if (editing) {
        const updated = await api.updateRenewal(editing.id, form);
        setRenewals(prev => prev.map(r => r.id === editing.id ? updated : r));
        addToast('Renewal updated', 'success');
      } else {
        const created = await api.createRenewal(form);
        setRenewals(prev => [...prev, created]);
        addToast('Renewal added', 'success');
      }
      setModalOpen(false);
    } catch (e) {
      addToast('Failed to save', 'error');
    }
  }

  async function handleDelete() {
    if (!editing) return;
    try {
      await api.deleteRenewal(editing.id);
      setRenewals(prev => prev.filter(r => r.id !== editing.id));
      addToast('Renewal deleted', 'success');
      setModalOpen(false);
    } catch (e) {
      addToast('Failed to delete', 'error');
    }
  }

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', marginBottom: '20px' }}>
        <div>
          <h1 style={{ fontSize: '26px', fontWeight: '800', color: '#1a1a2e', margin: 0, letterSpacing: '-0.5px' }}>
            📋 Licence &amp; Renewals
          </h1>
          <p style={{ fontSize: '14px', color: '#9ca3af', margin: '4px 0 0' }}>Never miss a renewal — automated reminders</p>
        </div>
        <button onClick={openAdd} style={{
          background: 'linear-gradient(135deg, #6c63ff, #3b82f6)', color: 'white', border: 'none',
          borderRadius: '12px', padding: '10px 18px', fontSize: '14px', fontWeight: '700',
          cursor: 'pointer', boxShadow: '0 4px 14px rgba(108,99,255,0.3)', fontFamily: 'inherit', whiteSpace: 'nowrap',
        }}>+ Add Renewal</button>
      </div>

      {loading ? (
        <div style={{ padding: '40px', textAlign: 'center', color: '#9ca3af' }}>Loading renewals…</div>
      ) : (
        <>
          {/* Alert banner */}
          {urgent.length > 0 ? (
            <div style={{
              background: 'linear-gradient(135deg, #fef2f2, #fffbeb)',
              border: '1px solid #f59e0b33', borderRadius: '16px', padding: '18px 22px', marginBottom: '18px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                <span style={{ fontSize: '22px' }}>⚠️</span>
                <div style={{ fontSize: '16px', fontWeight: '800', color: '#b45309' }}>
                  {urgent.length} item{urgent.length === 1 ? '' : 's'} need attention
                </div>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {urgent.slice(0, 8).map(r => {
                  const s = statusFor(r.due_date);
                  return (
                    <span key={r.id} style={{
                      display: 'inline-flex', alignItems: 'center', gap: '6px',
                      background: 'white', border: `1px solid ${s.border}`, borderRadius: '10px',
                      padding: '6px 11px', fontSize: '12px', fontWeight: '600', color: '#374151',
                    }}>
                      <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: s.color }} />
                      {r.title}{r.store_name ? ` · ${r.store_name}` : ''}
                      <span style={{ color: s.color, fontWeight: '700' }}>{statusLabel(r.due_date)}</span>
                    </span>
                  );
                })}
              </div>
            </div>
          ) : (
            <div style={{
              background: 'linear-gradient(135deg, #ecfdf5, #f0fdf4)',
              border: '1px solid #10b98133', borderRadius: '16px', padding: '18px 22px', marginBottom: '18px',
              display: 'flex', alignItems: 'center', gap: '10px',
            }}>
              <span style={{ fontSize: '22px' }}>✅</span>
              <div style={{ fontSize: '16px', fontWeight: '800', color: '#047857' }}>All compliance up to date</div>
            </div>
          )}

          {/* Summary stat cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px', marginBottom: '22px' }}>
            {[
              { ...STATUS.overdue, emoji: '🔴', count: counts.overdue, sub: 'Past due date' },
              { ...STATUS.duesoon, emoji: '🟠', count: counts.duesoon, sub: 'Within 30 days' },
              { ...STATUS.upcoming, emoji: '🔵', count: counts.upcoming, sub: '30–90 days' },
              { ...STATUS.valid, emoji: '🟢', count: counts.valid, sub: 'More than 90 days' },
            ].map(s => (
              <div key={s.key} style={{ ...cardStyle, padding: '16px 18px', borderLeft: `4px solid ${s.color}` }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '12px', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.4px' }}>{s.label}</span>
                  <span style={{ fontSize: '15px' }}>{s.emoji}</span>
                </div>
                <div style={{ fontSize: '32px', fontWeight: '900', color: s.color, lineHeight: 1.1, marginTop: '6px' }}>{s.count}</div>
                <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '2px' }}>{s.sub}</div>
              </div>
            ))}
          </div>

          {/* Per-store renewals matrix */}
          <div style={{ marginBottom: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
              <div style={{ fontSize: '17px', fontWeight: '800', color: '#1a1a2e' }}>
                🏪 Store Licences &amp; Services
              </div>
              <div style={{ fontSize: '12px', color: '#9ca3af' }}>Tap any cell to update its date or mark done</div>
            </div>
            <div style={{ ...cardStyle, padding: 0, overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: `${200 + matrixStores.length * 110}px` }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #f0f0f5' }}>
                    <th style={{ textAlign: 'left', padding: '14px 16px', fontSize: '11px', fontWeight: '700', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.5px', position: 'sticky', left: 0, background: 'white', minWidth: '190px' }}>
                      Renewal
                    </th>
                    {matrixStores.map(s => (
                      <th key={s.id} style={{ textAlign: 'center', padding: '14px 8px', minWidth: '104px', fontSize: '13px', fontWeight: '700', color: '#1a1a2e' }}>
                        {s.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {matrixRows.map((title, ri) => (
                    <tr key={title} style={{ borderBottom: ri < matrixRows.length - 1 ? '1px solid #f5f5f7' : 'none' }}>
                      <td style={{ padding: '10px 16px', position: 'sticky', left: 0, background: 'white' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '15px' }}>{TITLE_EMOJI[title] || '📋'}</span>
                          <div>
                            <div style={{ fontSize: '13px', fontWeight: '600', color: '#374151' }}>{title}</div>
                            <div style={{ fontSize: '10px', color: '#c0c0d0', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                              {FREQ_LABELS[perStore.find(r => r.title === title)?.frequency] || ''}
                            </div>
                          </div>
                        </div>
                      </td>
                      {matrixStores.map(s => {
                        const r = matrixMap[`${title}|${s.id}`];
                        if (!r) return <td key={s.id} style={{ textAlign: 'center', color: '#e8e8ed' }}>—</td>;
                        const st = statusFor(r.due_date);
                        return (
                          <td key={s.id} style={{ textAlign: 'center', padding: '7px 8px' }}>
                            <button
                              onClick={() => openEdit(r)}
                              title={`${title} · ${s.name} — ${statusLabel(r.due_date)} (${fmtDate(r.due_date)})`}
                              style={{
                                width: '92px', borderRadius: '9px', cursor: 'pointer', fontFamily: 'inherit',
                                border: `1.5px solid ${st.border}`, background: st.bg, padding: '6px 4px',
                                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1px', margin: '0 auto',
                              }}
                            >
                              <span style={{ fontSize: '11px', fontWeight: '800', color: st.color }}>{shortDays(r.due_date)}</span>
                              <span style={{ fontSize: '10px', color: '#9ca3af', fontWeight: '600' }}>{fmtShort(r.due_date)}</span>
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Business-wide (vehicle) items */}
          {businessWide.length > 0 && (
            <div>
              <div style={{ fontSize: '17px', fontWeight: '800', color: '#1a1a2e', marginBottom: '12px' }}>
                🚚 Business-wide (Delivery Vehicle)
              </div>
              <div style={{ ...cardStyle, padding: '6px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {businessWide.map(r => {
                  const s = statusFor(r.due_date);
                  return (
                    <div key={r.id} style={{
                      display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap',
                      padding: '12px 16px', borderRadius: '12px', background: '#fcfcfd',
                      borderLeft: `4px solid ${s.color}`,
                    }}>
                      <div style={{ flex: '1 1 200px', fontSize: '14px', fontWeight: '700', color: '#1a1a2e' }}>{r.title}</div>
                      <div style={{ fontSize: '13px', fontWeight: '700', color: '#374151', minWidth: '110px' }}>{fmtDate(r.due_date)}</div>
                      <span style={{
                        fontSize: '12px', fontWeight: '700', color: s.color, background: s.bg,
                        border: `1px solid ${s.border}`, padding: '5px 11px', borderRadius: '20px', whiteSpace: 'nowrap',
                      }}>{statusLabel(r.due_date)}</span>
                      <div style={{ display: 'flex', gap: '7px', marginLeft: 'auto' }}>
                        <button onClick={() => markDone(r.id)} style={{
                          background: '#ecfdf5', color: '#047857', border: '1px solid #10b98133',
                          borderRadius: '9px', padding: '7px 12px', fontSize: '12px', fontWeight: '700',
                          cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap',
                        }}>✓ Mark Done</button>
                        <button onClick={() => openEdit(r)} title="Edit" style={{
                          background: 'white', color: '#6b7280', border: '1px solid #e8e8ed',
                          borderRadius: '9px', padding: '7px 11px', fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit',
                        }}>✏️</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}

      {modalOpen && (
        <RenewalModal
          editing={editing}
          stores={stores}
          onClose={() => setModalOpen(false)}
          onSave={handleSave}
          onDelete={handleDelete}
          onMarkDone={async () => { if (editing) { await markDone(editing.id); setModalOpen(false); } }}
        />
      )}
    </div>
  );
}

function RenewalModal({ editing, stores, onClose, onSave, onDelete, onMarkDone }) {
  const [form, setForm] = useState({
    title: editing?.title || '',
    category: editing?.category || 'licence',
    frequency: editing?.frequency || 'annual',
    store_id: editing?.store_id ? String(editing.store_id) : '',
    due_date: editing?.due_date ? new Date(editing.due_date).toISOString().split('T')[0] : '',
    responsible: editing?.responsible || '',
    notes: editing?.notes || '',
  });

  function set(k, v) { setForm(prev => ({ ...prev, [k]: v })); }

  function submit(e) {
    e.preventDefault();
    if (!form.title.trim()) return;
    onSave({
      ...form,
      store_id: form.store_id ? parseInt(form.store_id) : null,
      due_date: form.due_date || null,
    });
  }

  const inputStyle = {
    width: '100%', border: '1px solid #e8e8ed', borderRadius: '10px', padding: '10px 12px',
    fontSize: '14px', fontFamily: 'inherit', color: '#1a1a2e', outline: 'none', boxSizing: 'border-box',
  };
  const labelStyle = { fontSize: '12px', fontWeight: '700', color: '#6b7280', marginBottom: '5px', display: 'block' };

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, zIndex: 3000, background: 'rgba(0,0,0,0.4)',
      display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '40px 16px', overflowY: 'auto',
    }}>
      <form onClick={e => e.stopPropagation()} onSubmit={submit} style={{
        background: 'white', borderRadius: '18px', width: '480px', maxWidth: '100%',
        boxShadow: '0 20px 60px rgba(0,0,0,0.18)',
      }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #f0f0f5', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontSize: '17px', fontWeight: '800', color: '#1a1a2e' }}>
            {editing ? 'Edit Renewal' : 'Add Renewal'}
          </div>
          <button type="button" onClick={onClose} style={{
            background: '#f5f5f7', border: 'none', borderRadius: '8px', width: '30px', height: '30px',
            cursor: 'pointer', fontSize: '18px', color: '#6b7280',
          }}>×</button>
        </div>

        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={labelStyle}>Title</label>
            <input value={form.title} onChange={e => set('title', e.target.value)} placeholder="e.g. FSSAI Licence Renewal" style={inputStyle} autoFocus />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={labelStyle}>Category</label>
              <select value={form.category} onChange={e => set('category', e.target.value)} style={inputStyle}>
                {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Frequency</label>
              <select value={form.frequency} onChange={e => set('frequency', e.target.value)} style={inputStyle}>
                <option value="annual">Annual</option>
                <option value="semiannual">Semi-annual</option>
                <option value="quarterly">Quarterly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={labelStyle}>Store</label>
              <select value={form.store_id} onChange={e => set('store_id', e.target.value)} style={inputStyle}>
                <option value="">Business-wide</option>
                {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Due Date</label>
              <input type="date" value={form.due_date} onChange={e => set('due_date', e.target.value)} style={inputStyle} />
            </div>
          </div>
          <div>
            <label style={labelStyle}>Responsible</label>
            <input value={form.responsible} onChange={e => set('responsible', e.target.value)} placeholder="e.g. Surabhi" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Notes</label>
            <textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={2} placeholder="Optional notes…" style={{ ...inputStyle, resize: 'vertical' }} />
          </div>
        </div>

        <div style={{ padding: '16px 24px', borderTop: '1px solid #f0f0f5', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
          {editing ? (
            <button type="button" onClick={onDelete} style={{
              background: '#fef2f2', color: '#ef4444', border: '1px solid #ef444433',
              borderRadius: '10px', padding: '9px 14px', fontSize: '13px', fontWeight: '700',
              cursor: 'pointer', fontFamily: 'inherit',
            }}>Delete</button>
          ) : <span />}
          <div style={{ display: 'flex', gap: '10px' }}>
            {editing && (
              <button type="button" onClick={onMarkDone} style={{
                background: '#ecfdf5', color: '#047857', border: '1px solid #10b98133',
                borderRadius: '10px', padding: '9px 14px', fontSize: '13px', fontWeight: '700',
                cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap',
              }}>✓ Mark Done</button>
            )}
            <button type="button" onClick={onClose} style={{
              background: 'white', color: '#6b7280', border: '1px solid #e8e8ed',
              borderRadius: '10px', padding: '9px 16px', fontSize: '13px', fontWeight: '700',
              cursor: 'pointer', fontFamily: 'inherit',
            }}>Cancel</button>
            <button type="submit" style={{
              background: 'linear-gradient(135deg, #6c63ff, #3b82f6)', color: 'white', border: 'none',
              borderRadius: '10px', padding: '9px 20px', fontSize: '13px', fontWeight: '700',
              cursor: 'pointer', boxShadow: '0 4px 14px rgba(108,99,255,0.3)', fontFamily: 'inherit',
            }}>{editing ? 'Save Changes' : 'Add Renewal'}</button>
          </div>
        </div>
      </form>
    </div>
  );
}
