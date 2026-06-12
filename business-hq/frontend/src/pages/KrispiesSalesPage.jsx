import { useState, useEffect, useMemo } from 'react';
import { useApp } from '../App';
import api from '../api';

const ORANGE = '#f59e0b';
const ORANGE_DARK = '#d97706';

function fmt(val) {
  return '₹' + Number(val || 0).toLocaleString('en-IN');
}

function todayStr() {
  return new Date().toISOString().split('T')[0];
}

function dateNDaysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split('T')[0];
}

const cardStyle = {
  background: 'white',
  border: '1px solid #f0f0f5',
  boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
  borderRadius: '16px',
};

function KpiCard({ emoji, label, value, sub, subColor, accent }) {
  return (
    <div style={{ ...cardStyle, padding: '20px', position: 'relative', overflow: 'hidden' }}>
      <div style={{
        position: 'absolute', top: 0, left: 0, width: '100%', height: '3px',
        background: accent || `linear-gradient(90deg, ${ORANGE}, ${ORANGE_DARK})`,
      }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
        <span style={{ fontSize: '18px' }}>{emoji}</span>
        <span style={{ fontSize: '12px', fontWeight: '600', color: '#9ca3af', letterSpacing: '0.3px' }}>{label}</span>
      </div>
      <div style={{ fontSize: '26px', fontWeight: '800', color: '#1a1a2e', letterSpacing: '-0.5px' }}>{value}</div>
      {sub !== undefined && sub !== null && (
        <div style={{ fontSize: '12px', fontWeight: '600', color: subColor || '#9ca3af', marginTop: '6px' }}>{sub}</div>
      )}
    </div>
  );
}

function Sparkline({ values }) {
  const max = Math.max(...values, 1);
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '3px', height: '34px' }}>
      {values.map((v, i) => (
        <div
          key={i}
          title={fmt(v)}
          style={{
            width: '7px',
            height: `${Math.max((v / max) * 34, 3)}px`,
            background: i === values.length - 1 ? ORANGE_DARK : ORANGE,
            borderRadius: '2px',
            opacity: i === values.length - 1 ? 1 : 0.55,
            transition: 'height 0.2s',
          }}
        />
      ))}
    </div>
  );
}

function AddSalesModal({ stores, onClose, onSaved }) {
  const { addToast } = useApp();
  const [date, setDate] = useState(todayStr());
  const [rows, setRows] = useState(() =>
    stores.reduce((acc, s) => { acc[s.id] = { amount: '', transactions: '' }; return acc; }, {})
  );
  const [saving, setSaving] = useState(false);

  function update(storeId, field, value) {
    setRows(prev => ({ ...prev, [storeId]: { ...prev[storeId], [field]: value } }));
  }

  async function handleSave() {
    setSaving(true);
    try {
      const entries = stores.filter(s => rows[s.id].amount !== '' || rows[s.id].transactions !== '');
      for (const s of entries) {
        await api.saveKrispiesSale({
          store_id: s.id,
          sale_date: date,
          amount: Number(rows[s.id].amount) || 0,
          transactions: Number(rows[s.id].transactions) || 0,
          target: 30000,
        });
      }
      addToast(`Saved sales for ${entries.length} store${entries.length === 1 ? '' : 's'}`, 'success');
      onSaved();
      onClose();
    } catch (e) {
      addToast(e.message || 'Failed to save sales', 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, zIndex: 3000, background: 'rgba(0,0,0,0.45)',
      display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '60px 16px', overflowY: 'auto',
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: 'white', borderRadius: '18px', width: '560px', maxWidth: '100%',
        boxShadow: '0 24px 70px rgba(0,0,0,0.18)', overflow: 'hidden',
      }}>
        <div style={{
          padding: '20px 24px', borderBottom: '1px solid #f0f0f5',
          background: `linear-gradient(135deg, ${ORANGE}12, #fff)`,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div>
            <div style={{ fontSize: '18px', fontWeight: '800', color: '#1a1a2e' }}>🥐 Add Sales Entry</div>
            <div style={{ fontSize: '13px', color: '#9ca3af', marginTop: '2px' }}>Enter amount and transactions per store</div>
          </div>
          <button onClick={onClose} style={{
            background: '#f5f5f7', border: 'none', borderRadius: '8px', width: '32px', height: '32px',
            fontSize: '18px', color: '#6b7280', cursor: 'pointer',
          }}>×</button>
        </div>

        <div style={{ padding: '20px 24px' }}>
          <label style={{ fontSize: '12px', fontWeight: '600', color: '#6b7280', display: 'block', marginBottom: '6px' }}>Date</label>
          <input type="date" value={date} max={todayStr()} onChange={e => setDate(e.target.value)} style={{
            border: '1px solid #e8e8ed', borderRadius: '10px', padding: '9px 12px', fontSize: '14px',
            fontFamily: 'inherit', color: '#1a1a2e', marginBottom: '18px', outline: 'none',
          }} />

          <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr', gap: '10px', marginBottom: '8px', padding: '0 4px' }}>
            <span style={{ fontSize: '11px', fontWeight: '700', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Store</span>
            <span style={{ fontSize: '11px', fontWeight: '700', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Amount (₹)</span>
            <span style={{ fontSize: '11px', fontWeight: '700', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Txns</span>
          </div>

          {stores.map(s => (
            <div key={s.id} style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr', gap: '10px', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '14px', fontWeight: '600', color: '#1a1a2e' }}>{s.name}</span>
              <input type="number" placeholder="0" value={rows[s.id].amount}
                onChange={e => update(s.id, 'amount', e.target.value)}
                style={{ border: '1px solid #e8e8ed', borderRadius: '8px', padding: '8px 10px', fontSize: '14px', fontFamily: 'inherit', outline: 'none', width: '100%' }} />
              <input type="number" placeholder="0" value={rows[s.id].transactions}
                onChange={e => update(s.id, 'transactions', e.target.value)}
                style={{ border: '1px solid #e8e8ed', borderRadius: '8px', padding: '8px 10px', fontSize: '14px', fontFamily: 'inherit', outline: 'none', width: '100%' }} />
            </div>
          ))}
        </div>

        <div style={{ padding: '16px 24px', borderTop: '1px solid #f0f0f5', display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{
            background: '#f5f5f7', border: 'none', borderRadius: '10px', padding: '10px 18px',
            fontSize: '14px', fontWeight: '600', color: '#6b7280', cursor: 'pointer', fontFamily: 'inherit',
          }}>Cancel</button>
          <button onClick={handleSave} disabled={saving} style={{
            background: `linear-gradient(135deg, ${ORANGE}, ${ORANGE_DARK})`, border: 'none', borderRadius: '10px',
            padding: '10px 20px', fontSize: '14px', fontWeight: '700', color: 'white', cursor: saving ? 'default' : 'pointer',
            fontFamily: 'inherit', boxShadow: '0 4px 14px rgba(245,158,11,0.35)', opacity: saving ? 0.7 : 1,
          }}>{saving ? 'Saving...' : 'Save Sales'}</button>
        </div>
      </div>
    </div>
  );
}

export default function KrispiesSalesPage() {
  const [sales, setSales] = useState([]);
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  async function load() {
    try {
      const [salesData, storesData] = await Promise.all([
        api.getKrispiesSales(),
        api.getKrispiesStores(),
      ]);
      setSales(salesData);
      setStores(storesData);
    } catch (e) {
      // swallow; show empty state
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const today = todayStr();
  const yesterday = dateNDaysAgo(1);

  const derived = useMemo(() => {
    // Build per-store map of date -> amount/transactions
    const byStore = {};
    for (const s of stores) {
      byStore[s.id] = { store: s, byDate: {} };
    }
    let allMax = 0;
    for (const row of sales) {
      const d = row.sale_date.split('T')[0];
      if (!byStore[row.store_id]) byStore[row.store_id] = { store: { id: row.store_id, name: row.store_name, manager: row.manager }, byDate: {} };
      byStore[row.store_id].byDate[d] = { amount: row.amount, transactions: row.transactions, target: row.target };
    }

    // Last 14 days date list (oldest -> newest)
    const days14 = [];
    for (let i = 13; i >= 0; i--) days14.push(dateNDaysAgo(i));
    const days7 = days14.slice(-7);

    // Totals across stores per day
    const dailyTotals = days14.map(d => {
      let sum = 0;
      for (const sid in byStore) sum += byStore[sid].byDate[d]?.amount || 0;
      if (sum > allMax) allMax = sum;
      return { date: d, total: sum };
    });

    let todayTotal = 0, yesterdayTotal = 0, todayTargetTotal = 0, week7Total = 0;
    for (const sid in byStore) {
      todayTotal += byStore[sid].byDate[today]?.amount || 0;
      yesterdayTotal += byStore[sid].byDate[yesterday]?.amount || 0;
      todayTargetTotal += byStore[sid].byDate[today]?.target || 0;
      for (const d of days7) week7Total += byStore[sid].byDate[d]?.amount || 0;
    }

    const avgDaily7 = week7Total / 7;
    const monthlyProjection = avgDaily7 * 30;

    // Per-store cards
    const storeCards = Object.values(byStore).map(({ store, byDate }) => {
      const todayAmt = byDate[today]?.amount || 0;
      const todayTxns = byDate[today]?.transactions || 0;
      const target = byDate[today]?.target || 30000;
      const last7 = days7.map(d => byDate[d]?.amount || 0);
      return { store, todayAmt, todayTxns, target, last7 };
    }).sort((a, b) => b.todayAmt - a.todayAmt);

    const dayChange = yesterdayTotal > 0
      ? ((todayTotal - yesterdayTotal) / yesterdayTotal) * 100
      : (todayTotal > 0 ? 100 : 0);

    const targetPct = todayTargetTotal > 0 ? (todayTotal / todayTargetTotal) * 100 : 0;

    return {
      dailyTotals, todayTotal, yesterdayTotal, week7Total, todayTargetTotal,
      avgDaily7, monthlyProjection, storeCards, dayChange, targetPct, allMax,
    };
  }, [sales, stores, today, yesterday]);

  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center', color: '#9ca3af' }}>Loading sales...</div>;
  }

  const dayChangePositive = derived.dayChange >= 0;
  const chartMax = Math.max(derived.allMax, 1);

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', marginBottom: '20px' }}>
        <div>
          <h1 style={{ fontSize: '26px', fontWeight: '800', color: '#1a1a2e', margin: 0, letterSpacing: '-0.5px' }}>
            🥐 Krispies Sales
          </h1>
          <p style={{ fontSize: '14px', color: '#9ca3af', margin: '4px 0 0' }}>Daily sales across all stores</p>
        </div>
        <button onClick={() => setShowModal(true)} style={{
          background: `linear-gradient(135deg, ${ORANGE}, ${ORANGE_DARK})`, color: 'white', border: 'none',
          borderRadius: '12px', padding: '11px 20px', fontSize: '14px', fontWeight: '700', cursor: 'pointer',
          boxShadow: '0 4px 16px rgba(245,158,11,0.35)', fontFamily: 'inherit', whiteSpace: 'nowrap',
        }}>+ Add Today's Sales</button>
      </div>

      {/* KPI cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '20px' }}>
        <KpiCard
          emoji="💰" label="TODAY'S TOTAL SALES" value={fmt(derived.todayTotal)}
          sub={`${dayChangePositive ? '▲' : '▼'} ${Math.abs(derived.dayChange).toFixed(1)}% vs yesterday`}
          subColor={dayChangePositive ? '#10b981' : '#ef4444'}
        />
        <KpiCard
          emoji="📈" label="THIS WEEK TOTAL" value={fmt(derived.week7Total)}
          sub="Last 7 days combined" subColor="#9ca3af"
          accent="linear-gradient(90deg, #6c63ff, #3b82f6)"
        />
        <KpiCard
          emoji="🎯" label="TODAY VS TARGET" value={`${derived.targetPct.toFixed(0)}%`}
          sub={`${fmt(derived.todayTotal)} of ${fmt(derived.todayTargetTotal)}`}
          subColor={derived.targetPct >= 100 ? '#10b981' : ORANGE_DARK}
          accent={derived.targetPct >= 100 ? 'linear-gradient(90deg, #10b981, #059669)' : `linear-gradient(90deg, ${ORANGE}, ${ORANGE_DARK})`}
        />
        <KpiCard
          emoji="📊" label="MONTHLY PROJECTION" value={fmt(Math.round(derived.monthlyProjection))}
          sub={`Run-rate · ${fmt(Math.round(derived.avgDaily7))}/day avg`} subColor="#9ca3af"
          accent="linear-gradient(90deg, #8b5cf6, #6366f1)"
        />
      </div>

      {/* Sales trend chart */}
      <div style={{ ...cardStyle, padding: '22px 24px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
          <div>
            <div style={{ fontSize: '16px', fontWeight: '700', color: '#1a1a2e' }}>Total Daily Sales</div>
            <div style={{ fontSize: '13px', color: '#9ca3af', marginTop: '2px' }}>All stores combined · last 14 days</div>
          </div>
          <div style={{ fontSize: '12px', fontWeight: '600', color: ORANGE_DARK, background: `${ORANGE}14`, padding: '5px 12px', borderRadius: '8px' }}>
            Peak {fmt(derived.allMax)}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '6px', height: '180px' }}>
          {derived.dailyTotals.map(({ date, total }, i) => {
            const dayNum = date.split('-')[2];
            const isToday = date === today;
            const h = Math.max((total / chartMax) * 160, 4);
            return (
              <div key={date} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                <div
                  title={`${date}: ${fmt(total)}`}
                  style={{
                    width: '100%', maxWidth: '36px', height: `${h}px`, borderRadius: '6px 6px 3px 3px',
                    background: isToday
                      ? `linear-gradient(180deg, ${ORANGE_DARK}, ${ORANGE})`
                      : `linear-gradient(180deg, ${ORANGE}, ${ORANGE}99)`,
                    boxShadow: isToday ? '0 4px 12px rgba(245,158,11,0.35)' : 'none',
                    cursor: 'default', transition: 'height 0.3s',
                  }}
                />
                <span style={{ fontSize: '11px', fontWeight: isToday ? '700' : '500', color: isToday ? ORANGE_DARK : '#9ca3af' }}>{dayNum}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Store performance */}
      <div style={{ marginBottom: '20px' }}>
        <div style={{ fontSize: '16px', fontWeight: '700', color: '#1a1a2e', marginBottom: '14px' }}>Store Performance · Today</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))', gap: '16px' }}>
          {derived.storeCards.map((sc, idx) => {
            const pct = sc.target > 0 ? Math.min((sc.todayAmt / sc.target) * 100, 100) : 0;
            const reached = sc.todayAmt >= sc.target;
            const isTop = idx === 0 && sc.todayAmt > 0;
            return (
              <div key={sc.store.id} style={{
                ...cardStyle, padding: '18px 20px',
                border: isTop ? `1px solid ${ORANGE}55` : '1px solid #f0f0f5',
                boxShadow: isTop ? '0 4px 18px rgba(245,158,11,0.12)' : '0 2px 12px rgba(0,0,0,0.04)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <div style={{ fontSize: '16px', fontWeight: '800', color: '#1a1a2e', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {sc.store.name} {isTop && <span title="Top performer">🏆</span>}
                  </div>
                  <Sparkline values={sc.last7} />
                </div>
                <div style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '14px' }}>👤 {sc.store.manager || '—'}</div>

                <div style={{ display: 'flex', gap: '18px', marginBottom: '14px' }}>
                  <div>
                    <div style={{ fontSize: '20px', fontWeight: '800', color: '#1a1a2e' }}>{fmt(sc.todayAmt)}</div>
                    <div style={{ fontSize: '11px', color: '#9ca3af', fontWeight: '600' }}>SALES TODAY</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '20px', fontWeight: '800', color: '#1a1a2e' }}>{sc.todayTxns}</div>
                    <div style={{ fontSize: '11px', color: '#9ca3af', fontWeight: '600' }}>TXNS</div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span style={{ fontSize: '11px', fontWeight: '600', color: '#9ca3af' }}>Target {fmt(sc.target)}</span>
                  <span style={{ fontSize: '12px', fontWeight: '700', color: reached ? '#10b981' : ORANGE_DARK }}>{pct.toFixed(0)}%</span>
                </div>
                <div style={{ height: '8px', background: '#f0f0f5', borderRadius: '6px', overflow: 'hidden' }}>
                  <div style={{
                    width: `${pct}%`, height: '100%', borderRadius: '6px',
                    background: reached ? 'linear-gradient(90deg, #10b981, #059669)' : `linear-gradient(90deg, ${ORANGE}, ${ORANGE_DARK})`,
                    transition: 'width 0.4s',
                  }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Projection callout */}
      <div style={{
        ...cardStyle, padding: '24px 28px',
        background: `linear-gradient(135deg, ${ORANGE}10, #fff 60%)`,
        border: `1px solid ${ORANGE}33`,
        display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap',
      }}>
        <div style={{
          width: '56px', height: '56px', borderRadius: '16px', flexShrink: 0,
          background: `linear-gradient(135deg, ${ORANGE}, ${ORANGE_DARK})`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '26px',
          boxShadow: '0 6px 18px rgba(245,158,11,0.35)',
        }}>📈</div>
        <div style={{ flex: 1, minWidth: '240px' }}>
          <div style={{ fontSize: '13px', fontWeight: '600', color: ORANGE_DARK, marginBottom: '2px' }}>MONTHLY PROJECTION</div>
          <div style={{ fontSize: '30px', fontWeight: '800', color: '#1a1a2e', letterSpacing: '-0.5px' }}>{fmt(Math.round(derived.monthlyProjection))}</div>
          <div style={{ fontSize: '13px', color: '#6b7280', marginTop: '4px' }}>
            Based on a {fmt(Math.round(derived.avgDaily7))}/day run-rate (last 7-day average) extrapolated over 30 days across all {stores.length} stores.
          </div>
        </div>
      </div>

      {showModal && <AddSalesModal stores={stores} onClose={() => setShowModal(false)} onSaved={load} />}
    </div>
  );
}
