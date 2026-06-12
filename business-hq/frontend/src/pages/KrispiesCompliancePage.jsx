import { useState, useEffect, useMemo } from 'react';
import { useApp } from '../App';
import api from '../api';

const COLORS = {
  pass: '#10b981',
  fail: '#ef4444',
  na: '#9ca3af',
  pending: '#d1d5db',
};

const cardStyle = {
  background: 'white',
  border: '1px solid #f0f0f5',
  boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
  borderRadius: '16px',
};

function todayStr() {
  return new Date().toISOString().split('T')[0];
}

// Cycle order when clicking a cell
const CYCLE = { pending: 'pass', pass: 'fail', fail: 'na', na: 'pending' };

const CELL_DISPLAY = {
  pass:    { label: '✓',   bg: '#ecfdf5', color: COLORS.pass, border: '#10b98140' },
  fail:    { label: '✕',   bg: '#fef2f2', color: COLORS.fail, border: '#ef444440' },
  na:      { label: 'N/A', bg: '#f3f4f6', color: COLORS.na,   border: '#d1d5db' },
  pending: { label: '–',   bg: 'white',   color: '#d1d5db',   border: '#e8e8ed' },
};

export default function KrispiesCompliancePage() {
  const { addToast } = useApp();
  const [date, setDate] = useState(todayStr());
  const [allStores, setAllStores] = useState([]);
  const [items, setItems] = useState([]);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStatic() {
      try {
        const [storesData, itemsData] = await Promise.all([
          api.getKrispiesStores(),
          api.getComplianceItems(),
        ]);
        setAllStores(storesData);
        setItems(itemsData);
      } catch (e) {
        addToast('Failed to load stores', 'error');
      }
    }
    loadStatic();
  }, [addToast]);

  useEffect(() => {
    let active = true;
    async function loadCompliance() {
      setLoading(true);
      try {
        const data = await api.getCompliance(date);
        if (active) setRecords(data);
      } catch (e) {
        if (active) setRecords([]);
      } finally {
        if (active) setLoading(false);
      }
    }
    loadCompliance();
    return () => { active = false; };
  }, [date]);

  // Exclude NSL — it's a wholesale account, not a retail store
  const stores = useMemo(
    () => allStores.filter(s => s.name !== 'NSL'),
    [allStores]
  );

  const statusMap = useMemo(() => {
    const m = {};
    for (const r of records) m[`${r.store_id}-${r.item_key}`] = r.status;
    return m;
  }, [records]);

  function getStatus(storeId, itemKey) {
    return statusMap[`${storeId}-${itemKey}`] || 'pending';
  }

  async function cycleStatus(storeId, itemKey) {
    const current = getStatus(storeId, itemKey);
    const next = CYCLE[current];
    setRecords(prev => {
      const idx = prev.findIndex(r => r.store_id === storeId && r.item_key === itemKey);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = { ...copy[idx], status: next };
        return copy;
      }
      return [...prev, { store_id: storeId, item_key: itemKey, status: next, check_date: date }];
    });
    try {
      await api.saveCompliance({ store_id: storeId, check_date: date, item_key: itemKey, status: next });
    } catch (e) {
      addToast('Failed to save check', 'error');
      try { setRecords(await api.getCompliance(date)); } catch {}
    }
  }

  // Stats
  const stats = useMemo(() => {
    let passed = 0, failed = 0, pending = 0, na = 0;
    const perStore = {};
    for (const s of stores) perStore[s.id] = { passed: 0, na: 0 };
    for (const s of stores) {
      for (const it of items) {
        const st = getStatus(s.id, it.key);
        if (st === 'pass') { passed++; perStore[s.id].passed++; }
        else if (st === 'fail') failed++;
        else if (st === 'na') { na++; perStore[s.id].na++; }
        else pending++;
      }
    }
    const evaluable = (stores.length * items.length) - na;
    const overallPct = evaluable > 0 ? Math.round((passed / evaluable) * 100) : 0;
    // per-store pct
    for (const s of stores) {
      const ev = items.length - perStore[s.id].na;
      perStore[s.id].pct = ev > 0 ? Math.round((perStore[s.id].passed / ev) * 100) : 0;
    }
    return { passed, failed, pending, na, overallPct, perStore };
  }, [stores, items, statusMap]);

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', marginBottom: '20px' }}>
        <div>
          <h1 style={{ fontSize: '26px', fontWeight: '800', color: '#1a1a2e', margin: 0, letterSpacing: '-0.5px' }}>
            ✅ Store Compliance
          </h1>
          <p style={{ fontSize: '14px', color: '#9ca3af', margin: '4px 0 0' }}>Daily compliance checks for every store</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <label style={{ fontSize: '13px', fontWeight: '600', color: '#6b7280' }}>Date</label>
          <input type="date" value={date} max={todayStr()} onChange={e => setDate(e.target.value)} style={{
            border: '1px solid #e8e8ed', borderRadius: '10px', padding: '9px 12px', fontSize: '14px',
            fontFamily: 'inherit', color: '#1a1a2e', outline: 'none',
          }} />
        </div>
      </div>

      {/* Summary bar */}
      <div style={{ ...cardStyle, padding: '16px 24px', marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{
            width: '54px', height: '54px', borderRadius: '50%', flexShrink: 0,
            background: `conic-gradient(${COLORS.pass} ${stats.overallPct * 3.6}deg, #f0f0f5 0deg)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: '800', color: '#1a1a2e' }}>{stats.overallPct}%</div>
          </div>
          <div>
            <div style={{ fontSize: '15px', fontWeight: '700', color: '#1a1a2e' }}>Overall Compliance</div>
            <div style={{ fontSize: '12px', color: '#9ca3af' }}>{stores.length} stores · {items.length} checks each</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <StatPill emoji="✅" label="Passed" count={stats.passed} color={COLORS.pass} />
          <StatPill emoji="❌" label="Failed" count={stats.failed} color={COLORS.fail} />
          <StatPill emoji="⏳" label="Pending" count={stats.pending} color="#f59e0b" />
        </div>
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: '14px', marginBottom: '12px', fontSize: '12px', color: '#9ca3af', flexWrap: 'wrap' }}>
        <span>Tap a cell to change:</span>
        <span><b style={{ color: COLORS.pass }}>✓</b> Pass</span>
        <span><b style={{ color: COLORS.fail }}>✕</b> Fail</span>
        <span><b style={{ color: COLORS.na }}>N/A</b></span>
        <span><b style={{ color: '#d1d5db' }}>–</b> Pending</span>
      </div>

      {loading && <div style={{ padding: '20px', textAlign: 'center', color: '#9ca3af' }}>Loading checks...</div>}

      {/* Single compliance table */}
      <div style={{ ...cardStyle, padding: '0', overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '600px' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #f0f0f5' }}>
              <th style={{ textAlign: 'left', padding: '14px 16px', fontSize: '12px', fontWeight: '700', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.5px', position: 'sticky', left: 0, background: 'white', minWidth: '200px' }}>
                Compliance Check
              </th>
              {stores.map(s => (
                <th key={s.id} style={{ textAlign: 'center', padding: '14px 10px', minWidth: '90px' }}>
                  <div style={{ fontSize: '13px', fontWeight: '700', color: '#1a1a2e' }}>{s.name}</div>
                  <div style={{
                    display: 'inline-block', marginTop: '4px', fontSize: '11px', fontWeight: '700',
                    padding: '2px 8px', borderRadius: '8px',
                    background: stats.perStore[s.id]?.pct >= 80 ? '#ecfdf5' : stats.perStore[s.id]?.pct >= 50 ? '#fffbeb' : '#fef2f2',
                    color: stats.perStore[s.id]?.pct >= 80 ? COLORS.pass : stats.perStore[s.id]?.pct >= 50 ? '#d97706' : COLORS.fail,
                  }}>{stats.perStore[s.id]?.pct ?? 0}%</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.map((item, ri) => (
              <tr key={item.key} style={{ borderBottom: ri < items.length - 1 ? '1px solid #f5f5f7' : 'none' }}>
                <td style={{ padding: '10px 16px', position: 'sticky', left: 0, background: 'white' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '15px' }}>{item.emoji}</span>
                    <span style={{ fontSize: '13px', fontWeight: '500', color: '#374151' }}>{item.label}</span>
                  </div>
                </td>
                {stores.map(s => {
                  const st = getStatus(s.id, item.key);
                  const disp = CELL_DISPLAY[st];
                  return (
                    <td key={s.id} style={{ textAlign: 'center', padding: '8px 10px' }}>
                      <button
                        onClick={() => cycleStatus(s.id, item.key)}
                        title={`${s.name} · ${item.label}`}
                        style={{
                          width: '40px', height: '32px', borderRadius: '8px',
                          border: `1.5px solid ${disp.border}`, background: disp.bg, color: disp.color,
                          fontSize: st === 'na' ? '11px' : '16px', fontWeight: '800',
                          cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.12s',
                        }}
                      >{disp.label}</button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatPill({ emoji, label, count, color }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 12px',
      borderRadius: '12px', background: `${color}12`, border: `1px solid ${color}22`,
    }}>
      <span style={{ fontSize: '14px' }}>{emoji}</span>
      <div>
        <div style={{ fontSize: '16px', fontWeight: '800', color, lineHeight: 1 }}>{count}</div>
        <div style={{ fontSize: '10px', color: '#9ca3af', fontWeight: '600' }}>{label}</div>
      </div>
    </div>
  );
}
