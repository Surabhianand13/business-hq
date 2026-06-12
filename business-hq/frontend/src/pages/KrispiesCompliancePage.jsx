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

const STATUS_BTNS = [
  { value: 'pass', label: '✅ Pass', color: COLORS.pass },
  { value: 'fail', label: '❌ Fail', color: COLORS.fail },
  { value: 'na', label: 'N/A', color: COLORS.na },
];

export default function KrispiesCompliancePage() {
  const { addToast } = useApp();
  const [date, setDate] = useState(todayStr());
  const [stores, setStores] = useState([]);
  const [items, setItems] = useState([]);
  const [records, setRecords] = useState([]); // raw compliance rows for the date
  const [loading, setLoading] = useState(true);

  // Load stores + items once
  useEffect(() => {
    async function loadStatic() {
      try {
        const [storesData, itemsData] = await Promise.all([
          api.getKrispiesStores(),
          api.getComplianceItems(),
        ]);
        setStores(storesData);
        setItems(itemsData);
      } catch (e) {
        addToast('Failed to load stores', 'error');
      }
    }
    loadStatic();
  }, [addToast]);

  // Load compliance whenever date changes
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

  // Lookup: `${store_id}-${item_key}` -> status
  const statusMap = useMemo(() => {
    const m = {};
    for (const r of records) {
      m[`${r.store_id}-${r.item_key}`] = r.status;
    }
    return m;
  }, [records]);

  function getStatus(storeId, itemKey) {
    return statusMap[`${storeId}-${itemKey}`] || 'pending';
  }

  async function setStatus(storeId, itemKey, status) {
    // Optimistic update of local records
    setRecords(prev => {
      const idx = prev.findIndex(r => r.store_id === storeId && r.item_key === itemKey);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = { ...copy[idx], status };
        return copy;
      }
      return [...prev, { store_id: storeId, item_key: itemKey, status, check_date: date }];
    });
    try {
      await api.saveCompliance({ store_id: storeId, check_date: date, item_key: itemKey, status });
    } catch (e) {
      addToast('Failed to save check', 'error');
      // re-fetch to recover correct state
      try { setRecords(await api.getCompliance(date)); } catch {}
    }
  }

  // Overall + per-store stats
  const stats = useMemo(() => {
    const totalItems = stores.length * items.length;
    let passed = 0, failed = 0, pending = 0, na = 0;
    const perStore = {};
    for (const s of stores) {
      let sPassed = 0, sChecked = 0, sNa = 0;
      for (const it of items) {
        const st = getStatus(s.id, it.key);
        if (st === 'pass') { passed++; sPassed++; }
        else if (st === 'fail') { failed++; }
        else if (st === 'na') { na++; sNa++; }
        else { pending++; }
        if (st !== 'pending') sChecked++;
      }
      // pct of evaluated (non-NA) items that passed
      const evaluable = items.length - sNa;
      const pct = evaluable > 0 ? Math.round((sPassed / evaluable) * 100) : 0;
      const allPassed = items.length > 0 && sPassed + sNa === items.length && sPassed > 0;
      perStore[s.id] = { pct, allPassed };
    }
    const evaluableTotal = totalItems - na;
    const overallPct = evaluableTotal > 0 ? Math.round((passed / evaluableTotal) * 100) : 0;
    return { totalItems, passed, failed, pending, na, perStore, overallPct };
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

      {/* Overall summary bar */}
      <div style={{ ...cardStyle, padding: '20px 24px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
            <div style={{
              width: '64px', height: '64px', borderRadius: '50%', flexShrink: 0,
              background: `conic-gradient(${COLORS.pass} ${stats.overallPct * 3.6}deg, #f0f0f5 0deg)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative',
            }}>
              <div style={{
                width: '48px', height: '48px', borderRadius: '50%', background: 'white',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '15px', fontWeight: '800', color: '#1a1a2e',
              }}>{stats.overallPct}%</div>
            </div>
            <div>
              <div style={{ fontSize: '16px', fontWeight: '700', color: '#1a1a2e' }}>Overall Compliance</div>
              <div style={{ fontSize: '13px', color: '#9ca3af', marginTop: '2px' }}>
                {stores.length} stores · {items.length} checks each
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <StatPill emoji="✅" label="Passed" count={stats.passed} color={COLORS.pass} />
            <StatPill emoji="❌" label="Failed" count={stats.failed} color={COLORS.fail} />
            <StatPill emoji="⏳" label="Pending" count={stats.pending} color="#f59e0b" />
            {stats.na > 0 && <StatPill emoji="➖" label="N/A" count={stats.na} color={COLORS.na} />}
          </div>
        </div>
      </div>

      {loading && <div style={{ padding: '30px', textAlign: 'center', color: '#9ca3af' }}>Loading checks...</div>}

      {/* Per-store grid */}
      <div className="grid-2" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: '16px' }}>
        {stores.map(store => {
          const sStat = stats.perStore[store.id] || { pct: 0, allPassed: false };
          return (
            <div key={store.id} style={{ ...cardStyle, padding: '18px 20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', paddingBottom: '12px', borderBottom: '1px solid #f5f5f7' }}>
                <div>
                  <div style={{ fontSize: '16px', fontWeight: '800', color: '#1a1a2e', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {store.name}
                    {sStat.allPassed && <span title="All checks passed">🟢</span>}
                  </div>
                  <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '2px' }}>👤 {store.manager || '—'}</div>
                </div>
                <div style={{
                  fontSize: '13px', fontWeight: '800', padding: '6px 12px', borderRadius: '10px',
                  background: sStat.pct >= 80 ? '#ecfdf5' : sStat.pct >= 50 ? '#fffbeb' : '#fef2f2',
                  color: sStat.pct >= 80 ? COLORS.pass : sStat.pct >= 50 ? '#d97706' : COLORS.fail,
                }}>{sStat.pct}%</div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {items.map(item => {
                  const current = getStatus(store.id, item.key);
                  return (
                    <div key={item.key} style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      gap: '10px', padding: '7px 4px',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flex: 1 }}>
                        <span style={{ fontSize: '15px', flexShrink: 0 }}>{item.emoji}</span>
                        <span style={{ fontSize: '13px', fontWeight: '500', color: '#374151', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.label}</span>
                      </div>
                      <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                        {STATUS_BTNS.map(btn => {
                          const active = current === btn.value;
                          return (
                            <button
                              key={btn.value}
                              onClick={() => setStatus(store.id, item.key, btn.value)}
                              style={{
                                border: active ? `1px solid ${btn.color}` : '1px solid #e8e8ed',
                                background: active ? `${btn.color}18` : 'white',
                                color: active ? btn.color : '#9ca3af',
                                borderRadius: '8px', padding: '4px 8px', fontSize: '12px',
                                fontWeight: active ? '700' : '500', cursor: 'pointer', fontFamily: 'inherit',
                                whiteSpace: 'nowrap', transition: 'all 0.12s',
                              }}
                            >{btn.label}</button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function StatPill({ emoji, label, count, color }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 14px',
      borderRadius: '12px', background: `${color}12`, border: `1px solid ${color}22`,
    }}>
      <span style={{ fontSize: '15px' }}>{emoji}</span>
      <div>
        <div style={{ fontSize: '17px', fontWeight: '800', color, lineHeight: 1 }}>{count}</div>
        <div style={{ fontSize: '11px', color: '#9ca3af', fontWeight: '600' }}>{label}</div>
      </div>
    </div>
  );
}
