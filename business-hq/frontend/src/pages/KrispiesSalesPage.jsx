import { useState, useEffect, useMemo } from 'react';
import { useApp } from '../App';
import api from '../api';

const ORANGE = '#f59e0b';
const ORANGE_DARK = '#d97706';
const GREEN = '#10b981';
const GREEN_DARK = '#047857';
const BLUE = '#3b82f6';
const BLUE_DARK = '#2563eb';
const RED = '#ef4444';
const PRIMARY = 'linear-gradient(135deg, #6c63ff, #3b82f6)';

const FY_START = new Date(2026, 3, 1); // 1 Apr 2026
const FY_END = new Date(2027, 2, 31); // 31 Mar 2027
const DEFAULT_TARGET = 50000000; // 5 Cr

const fmt = v => '₹' + Math.round(Number(v) || 0).toLocaleString('en-IN');
const fmtShort = v => {
  v = Number(v) || 0;
  if (v >= 10000000) return '₹' + (v / 10000000).toFixed(2) + 'Cr';
  if (v >= 100000) return '₹' + (v / 100000).toFixed(2) + 'L';
  if (v >= 1000) return '₹' + (v / 1000).toFixed(1) + 'K';
  return '₹' + Math.round(v);
};

const cardStyle = {
  background: '#fff',
  borderRadius: '16px',
  border: '1px solid #f0f0f5',
  boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
  padding: '20px',
};

// ---- date helpers ----
function parseDate(s) {
  if (!s) return null;
  const iso = String(s).split('T')[0];
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}
function toISO(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}
function addDays(d, n) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}
function daysBetween(a, b) {
  return Math.round((b - a) / 86400000);
}
function startOfDay(d) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}
// Monday of the week containing d
function weekStart(d) {
  const x = startOfDay(d);
  const day = (x.getDay() + 6) % 7; // 0 = Monday
  return addDays(x, -day);
}
function fmtDateShort(d) {
  if (!d) return '';
  const dd = d instanceof Date ? d : parseDate(d);
  if (!dd) return '';
  return dd.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

function regionAccent(view) {
  if (view === 'TG') return { c1: GREEN, c2: GREEN_DARK };
  if (view === 'AP') return { c1: BLUE, c2: BLUE_DARK };
  return { c1: ORANGE, c2: ORANGE_DARK };
}

function RegionChip({ region }) {
  const tg = region === 'TG';
  return (
    <span style={{
      fontSize: '10px', fontWeight: '700', padding: '2px 8px', borderRadius: '6px',
      background: tg ? '#ecfdf5' : '#eff6ff', color: tg ? GREEN_DARK : BLUE_DARK,
      letterSpacing: '0.3px',
    }}>{region}</span>
  );
}

function MiniBars({ values, color }) {
  const max = Math.max(...values, 1);
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '3px', height: '30px' }}>
      {values.map((v, i) => (
        <div key={i} title={fmt(v)} style={{
          width: '6px', height: `${Math.max((v / max) * 30, 2)}px`,
          background: color, borderRadius: '2px',
          opacity: i === values.length - 1 ? 1 : 0.5,
        }} />
      ))}
    </div>
  );
}

function KpiCard({ emoji, label, value, sub, subColor, accent }) {
  return (
    <div style={{ ...cardStyle, position: 'relative', overflow: 'hidden' }}>
      <div style={{
        position: 'absolute', top: 0, left: 0, width: '100%', height: '3px',
        background: accent || `linear-gradient(90deg, ${ORANGE}, ${ORANGE_DARK})`,
      }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
        <span style={{ fontSize: '18px' }}>{emoji}</span>
        <span style={{ fontSize: '11px', fontWeight: '700', color: '#9ca3af', letterSpacing: '0.4px' }}>{label}</span>
      </div>
      <div style={{ fontSize: '26px', fontWeight: '800', color: '#1a1a2e', letterSpacing: '-0.5px' }}>{value}</div>
      {sub != null && (
        <div style={{ fontSize: '12px', fontWeight: '600', color: subColor || '#9ca3af', marginTop: '6px' }}>{sub}</div>
      )}
    </div>
  );
}

export default function KrispiesSalesPage() {
  const { addToast } = useApp();
  const [sales, setSales] = useState([]);
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [view, setView] = useState('Org');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [rangeHint, setRangeHint] = useState('');
  const [target, setTarget] = useState(() => {
    const saved = localStorage.getItem('krispies_fy_target');
    return saved ? Number(saved) : DEFAULT_TARGET;
  });

  async function load() {
    try {
      const [salesData, storesData] = await Promise.all([
        api.getKrispiesSales(),
        api.getKrispiesStores(),
      ]);
      setSales(Array.isArray(salesData) ? salesData : []);
      setStores(Array.isArray(storesData) ? storesData : []);
    } catch (e) {
      // swallow; show empty state
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  // Normalize sales rows once (attach JS Date)
  const normSales = useMemo(() => sales.map(r => ({
    ...r,
    d: parseDate(r.sale_date),
    amount: Number(r.amount) || 0,
    cash_sales: Number(r.cash_sales) || 0,
    online_sales: Number(r.online_sales) || 0,
    region: r.region || 'TG',
  })).filter(r => r.d), [sales]);

  const latestDate = useMemo(() => {
    if (!normSales.length) return null;
    return normSales.reduce((m, r) => (r.d > m ? r.d : m), normSales[0].d);
  }, [normSales]);

  // Default date range = last 30 days ending at latest data date
  useEffect(() => {
    if (latestDate && !toDate && !fromDate) {
      setToDate(toISO(latestDate));
      setFromDate(toISO(addDays(latestDate, -29)));
    }
  }, [latestDate]); // eslint-disable-line

  // Persist target
  useEffect(() => {
    localStorage.setItem('krispies_fy_target', String(target));
  }, [target]);

  async function handleSync() {
    setSyncing(true);
    try {
      const res = await api.syncKrispiesSheet();
      const storeCount = (res.stores || []).length;
      const range = res.dateRange ? ` (${fmtDateShort(res.dateRange.from)} – ${fmtDateShort(res.dateRange.to)})` : '';
      addToast(`Synced ${res.synced} rows across ${storeCount} store${storeCount === 1 ? '' : 's'}${range}`, 'success');
      await load();
    } catch (e) {
      addToast(e.message || 'Failed to sync from sheet', 'error');
    } finally {
      setSyncing(false);
    }
  }

  // ---- Region scoping ----
  const scopeStores = useMemo(() => {
    if (view === 'Org') return stores;
    return stores.filter(s => (s.region || 'TG') === view);
  }, [stores, view]);

  const activeSales = useMemo(() => {
    if (view === 'Org') return normSales;
    return normSales.filter(r => r.region === view);
  }, [normSales, view]);

  // ---- SECTION 1: Org-level FY KPIs ----
  const orgKpi = useMemo(() => {
    const fyt = normSales.filter(r => r.d >= FY_START && r.d <= FY_END);
    const fyTotal = fyt.reduce((s, r) => s + r.amount, 0);
    const tgTotal = fyt.filter(r => r.region === 'TG').reduce((s, r) => s + r.amount, 0);
    const apTotal = fyt.filter(r => r.region === 'AP').reduce((s, r) => s + r.amount, 0);

    // run-rate over last 30 days of available data
    let runRate = 0;
    if (latestDate) {
      const lo = addDays(latestDate, -29);
      const win = normSales.filter(r => r.d >= lo && r.d <= latestDate);
      runRate = win.reduce((s, r) => s + r.amount, 0) / 30;
    }
    const today = startOfDay(new Date());
    const projEnd = today > FY_END ? FY_END : today;
    const daysRemaining = Math.max(0, daysBetween(projEnd, FY_END));
    const projectedFY = fyTotal + runRate * daysRemaining;

    const tgPct = fyTotal > 0 ? (tgTotal / fyTotal) * 100 : 0;
    const apPct = fyTotal > 0 ? (apTotal / fyTotal) * 100 : 0;

    return { fyTotal, tgTotal, apTotal, tgPct, apPct, runRate, projectedFY, daysRemaining };
  }, [normSales, latestDate]);

  // ---- FY timing (for projection section) ----
  const fyTiming = useMemo(() => {
    const today = startOfDay(new Date());
    const clampedToday = today > FY_END ? FY_END : (today < FY_START ? FY_START : today);
    const daysElapsed = Math.max(0, daysBetween(FY_START, clampedToday) + 1);
    const daysRemaining = Math.max(0, daysBetween(clampedToday, FY_END));
    return { daysElapsed, daysRemaining };
  }, []);

  // ---- date range clamp ----
  function onFromChange(v) {
    if (!v) return;
    const f = parseDate(v);
    const t = parseDate(toDate);
    if (f && t && daysBetween(f, t) > 31) {
      const clamped = toISO(addDays(t, -31));
      setFromDate(clamped);
      setRangeHint('Max 1 month range');
    } else {
      setFromDate(v);
      setRangeHint('');
    }
  }
  function onToChange(v) {
    if (!v) return;
    const t = parseDate(v);
    const f = parseDate(fromDate);
    setToDate(v);
    if (f && t && daysBetween(f, t) > 31) {
      setFromDate(toISO(addDays(t, -31)));
      setRangeHint('Max 1 month range');
    } else {
      setRangeHint('');
    }
  }

  // ---- SECTION 2: Daily sales over selected range (active scope) ----
  const rangeData = useMemo(() => {
    const f = parseDate(fromDate);
    const t = parseDate(toDate);
    if (!f || !t || f > t) return { days: [], total: 0, avg: 0, best: null, peak: 0 };

    // map ISO -> total within scope
    const byDate = {};
    for (const r of activeSales) {
      if (r.d >= f && r.d <= t) {
        const k = toISO(r.d);
        byDate[k] = (byDate[k] || 0) + r.amount;
      }
    }
    const days = [];
    let cur = new Date(f);
    while (cur <= t) {
      const k = toISO(cur);
      days.push({ iso: k, date: new Date(cur), total: byDate[k] || 0 });
      cur = addDays(cur, 1);
    }
    const total = days.reduce((s, d) => s + d.total, 0);
    const avg = days.length ? total / days.length : 0;
    let best = null, peak = 0;
    for (const d of days) {
      if (d.total > peak) { peak = d.total; best = d; }
    }
    return { days, total, avg, best, peak };
  }, [activeSales, fromDate, toDate]);

  // ---- SECTION 3: Weekly mapping ----
  const weekly = useMemo(() => {
    // group active sales into weeks
    const weeks = {}; // isoMonday -> { ts, byRegion:{}, byStore:{}, total }
    for (const r of activeSales) {
      const ws = weekStart(r.d);
      const k = toISO(ws);
      if (!weeks[k]) weeks[k] = { ts: ws.getTime(), monday: ws, byRegion: { TG: 0, AP: 0 }, byStore: {}, total: 0 };
      weeks[k].byRegion[r.region] = (weeks[k].byRegion[r.region] || 0) + r.amount;
      weeks[k].byStore[r.store_id] = (weeks[k].byStore[r.store_id] || 0) + r.amount;
      weeks[k].total += r.amount;
    }
    const arr = Object.values(weeks).sort((a, b) => a.ts - b.ts);
    const last8 = arr.slice(-8); // chronological, most recent at bottom
    return last8;
  }, [activeSales]);

  // ---- SECTION 4: Store performance over selected range ----
  const storePerf = useMemo(() => {
    const f = parseDate(fromDate);
    const t = parseDate(toDate);
    if (!f || !t) return { rows: [], scopeTotal: 0 };

    const last7Start = latestDate ? addDays(latestDate, -6) : null;
    const map = {};
    for (const s of scopeStores) {
      map[s.id] = {
        store: s, revenue: 0, cash: 0, online: 0,
        spark: {}, // iso -> amount for last 7 days
      };
    }
    for (const r of activeSales) {
      if (!map[r.store_id]) continue;
      if (r.d >= f && r.d <= t) {
        map[r.store_id].revenue += r.amount;
        map[r.store_id].cash += r.cash_sales;
        map[r.store_id].online += r.online_sales;
      }
      if (last7Start && r.d >= last7Start && r.d <= latestDate) {
        map[r.store_id].spark[toISO(r.d)] = (map[r.store_id].spark[toISO(r.d)] || 0) + r.amount;
      }
    }
    const last7Days = [];
    if (latestDate) {
      for (let i = 6; i >= 0; i--) last7Days.push(toISO(addDays(latestDate, -i)));
    }
    const rows = Object.values(map).map(m => ({
      ...m,
      sparkVals: last7Days.map(k => m.spark[k] || 0),
    })).sort((a, b) => b.revenue - a.revenue);
    const scopeTotal = rows.reduce((s, r) => s + r.revenue, 0);
    return { rows, scopeTotal };
  }, [activeSales, scopeStores, fromDate, toDate, latestDate]);

  // ---- SECTION 5: projection vs target ----
  const projection = useMemo(() => {
    const tgt = Number(target) || 0;
    const fyTotal = orgKpi.fyTotal;
    const remaining = fyTiming.daysRemaining;
    const needPerDay = remaining > 0 ? Math.max(0, (tgt - fyTotal) / remaining) : 0;
    const onTrack = orgKpi.runRate >= needPerDay;
    const gap = needPerDay - orgKpi.runRate;
    const progressPct = tgt > 0 ? Math.min((fyTotal / tgt) * 100, 100) : 0;
    return { tgt, needPerDay, onTrack, gap, progressPct, remaining };
  }, [target, orgKpi, fyTiming]);

  if (loading) {
    return <div style={{ padding: '60px', textAlign: 'center', color: '#9ca3af', fontSize: '15px' }}>Loading sales command center…</div>;
  }

  const acc = regionAccent(view);
  const accGrad = `linear-gradient(180deg, ${acc.c1}, ${acc.c2})`;

  const segBtn = (val, label) => {
    const active = view === val;
    return (
      <button key={val} onClick={() => setView(val)} style={{
        background: active ? PRIMARY : 'transparent',
        color: active ? '#fff' : '#6b7280',
        border: 'none', borderRadius: '8px', padding: '8px 16px',
        fontSize: '13px', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit',
        transition: 'all 0.15s',
      }}>{label}</button>
    );
  };

  const inputStyle = {
    border: '1px solid #e8e8ed', borderRadius: '9px', padding: '8px 11px',
    fontSize: '13px', fontFamily: 'inherit', color: '#1a1a2e', outline: 'none',
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', marginBottom: '20px' }}>
        <div>
          <h1 style={{ fontSize: '26px', fontWeight: '800', color: '#1a1a2e', margin: 0, letterSpacing: '-0.5px' }}>
            🥐 Krispies Sales
          </h1>
          <p style={{ fontSize: '14px', color: '#9ca3af', margin: '4px 0 0' }}>Daily sales command center · FY 2026-27</p>
        </div>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{
            display: 'inline-flex', background: '#f5f5f7', borderRadius: '11px', padding: '3px', gap: '2px',
          }}>
            {segBtn('Org', 'Org')}
            {segBtn('TG', 'TG')}
            {segBtn('AP', 'AP')}
          </div>
          <button onClick={handleSync} disabled={syncing} style={{
            background: 'white', color: ORANGE_DARK, border: `1px solid ${ORANGE}66`,
            borderRadius: '12px', padding: '10px 18px', fontSize: '14px', fontWeight: '700',
            cursor: syncing ? 'default' : 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap',
            opacity: syncing ? 0.7 : 1,
          }}>{syncing ? 'Syncing…' : '🔄 Sync from Sheet'}</button>
        </div>
      </div>

      {normSales.length === 0 ? (
        <div style={{ ...cardStyle, padding: '60px 24px', textAlign: 'center' }}>
          <div style={{ fontSize: '46px', marginBottom: '12px' }}>📊</div>
          <div style={{ fontSize: '18px', fontWeight: '800', color: '#1a1a2e', marginBottom: '6px' }}>No sales data yet</div>
          <div style={{ fontSize: '14px', color: '#9ca3af', maxWidth: '380px', margin: '0 auto' }}>
            Click <strong>🔄 Sync from Sheet</strong> above to pull the latest daily sales from your Google Sheet.
          </div>
        </div>
      ) : (
        <>
          {/* SECTION 1 — Org-level FY KPIs */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '22px' }}>
            <KpiCard
              emoji="🏦" label="FY REVENUE TO DATE"
              value={fmtShort(orgKpi.fyTotal)} sub="Since 1 Apr 2026" subColor="#9ca3af"
            />
            <KpiCard
              emoji="🟢" label="TG REVENUE (FYTD)"
              value={fmtShort(orgKpi.tgTotal)} sub={`${orgKpi.tgPct.toFixed(0)}% of total`} subColor={GREEN_DARK}
              accent={`linear-gradient(90deg, ${GREEN}, ${GREEN_DARK})`}
            />
            <KpiCard
              emoji="🔵" label="AP REVENUE (FYTD)"
              value={fmtShort(orgKpi.apTotal)} sub={`${orgKpi.apPct.toFixed(0)}% of total`} subColor={BLUE_DARK}
              accent={`linear-gradient(90deg, ${BLUE}, ${BLUE_DARK})`}
            />
            <KpiCard
              emoji="📈" label="PROJECTED FY (TO MAR 2027)"
              value={fmtShort(orgKpi.projectedFY)} sub={`Run-rate ${fmt(orgKpi.runRate)}/day`} subColor={ORANGE_DARK}
              accent={`linear-gradient(90deg, ${ORANGE}, ${ORANGE_DARK})`}
            />
          </div>

          {/* SECTION 2 — Daily sales (date range) */}
          <div style={{ ...cardStyle, marginBottom: '22px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', marginBottom: '18px' }}>
              <div style={{ fontSize: '16px', fontWeight: '800', color: '#1a1a2e' }}>📈 Daily Sales · {view}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <label style={{ fontSize: '12px', fontWeight: '600', color: '#9ca3af' }}>From</label>
                <input type="date" value={fromDate} onChange={e => onFromChange(e.target.value)} style={inputStyle} />
                <label style={{ fontSize: '12px', fontWeight: '600', color: '#9ca3af' }}>To</label>
                <input type="date" value={toDate} onChange={e => onToChange(e.target.value)} style={inputStyle} />
                {rangeHint && <span style={{ fontSize: '11px', color: RED, fontWeight: '600' }}>{rangeHint}</span>}
              </div>
            </div>

            {rangeData.days.length === 0 ? (
              <div style={{ padding: '30px', textAlign: 'center', color: '#9ca3af', fontSize: '13px' }}>No data in selected range.</div>
            ) : (
              <>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: '4px', height: '170px', overflowX: 'auto', paddingBottom: '4px' }}>
                  {rangeData.days.map((d) => {
                    const isPeak = rangeData.best && d.iso === rangeData.best.iso && d.total > 0;
                    const h = Math.max((d.total / (rangeData.peak || 1)) * 150, d.total > 0 ? 4 : 2);
                    return (
                      <div key={d.iso} style={{ flex: '1 0 14px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px', minWidth: '14px' }}>
                        <div title={`${fmtDateShort(d.date)}: ${fmt(d.total)}`} style={{
                          width: '100%', maxWidth: '30px', height: `${h}px`, borderRadius: '5px 5px 2px 2px',
                          background: isPeak ? `linear-gradient(180deg, ${acc.c2}, ${acc.c1})` : accGrad,
                          opacity: isPeak ? 1 : 0.78,
                          boxShadow: isPeak ? `0 4px 12px ${acc.c1}55` : 'none',
                          cursor: 'default',
                        }} />
                        <span style={{ fontSize: '10px', fontWeight: isPeak ? '800' : '500', color: isPeak ? acc.c2 : '#bbb' }}>
                          {d.date.getDate()}
                        </span>
                      </div>
                    );
                  })}
                </div>
                <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', marginTop: '18px', borderTop: '1px solid #f5f5f7', paddingTop: '16px' }}>
                  <MiniStat label="TOTAL" value={fmt(rangeData.total)} />
                  <MiniStat label="DAILY AVG" value={fmt(rangeData.avg)} />
                  <MiniStat label="BEST DAY" value={rangeData.best ? fmt(rangeData.best.total) : '—'} sub={rangeData.best ? fmtDateShort(rangeData.best.date) : ''} />
                </div>
              </>
            )}
          </div>

          {/* SECTION 3 — Weekly mapping */}
          <div style={{ ...cardStyle, marginBottom: '22px' }}>
            <div style={{ fontSize: '16px', fontWeight: '800', color: '#1a1a2e', marginBottom: '4px' }}>🗓️ Weekly Performance</div>
            <div style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '16px' }}>
              {view === 'Org' ? 'Region split with week-over-week trend · last 8 weeks' : `Store-level weekly breakdown · ${view} · last 8 weeks`}
            </div>
            <WeeklyTable view={view} weeks={weekly} scopeStores={scopeStores} />
          </div>

          {/* SECTION 4 — Store performance */}
          <div style={{ ...cardStyle, marginBottom: '22px' }}>
            <div style={{ fontSize: '16px', fontWeight: '800', color: '#1a1a2e', marginBottom: '4px' }}>🏪 Store Performance · {view}</div>
            <div style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '16px' }}>
              Selected period · {fmtDateShort(parseDate(fromDate))} – {fmtDateShort(parseDate(toDate))}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {storePerf.rows.map((r, idx) => {
                const pct = storePerf.scopeTotal > 0 ? (r.revenue / storePerf.scopeTotal) * 100 : 0;
                const isTop = idx === 0 && r.revenue > 0;
                const splitTotal = r.cash + r.online;
                const cashPct = splitTotal > 0 ? (r.cash / splitTotal) * 100 : null;
                return (
                  <div key={r.store.id} style={{
                    display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap',
                    padding: '14px 16px', borderRadius: '12px',
                    background: isTop ? `${ORANGE}0c` : '#fafafb',
                    border: isTop ? `1px solid ${ORANGE}33` : '1px solid #f0f0f5',
                  }}>
                    <div style={{ flex: '1 1 200px', minWidth: '180px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                        <span style={{ fontSize: '15px', fontWeight: '800', color: '#1a1a2e' }}>
                          {r.store.name} {isTop && <span title="Top store">🏆</span>}
                        </span>
                        <RegionChip region={r.store.region || 'TG'} />
                      </div>
                      <div style={{ height: '7px', background: '#f0f0f5', borderRadius: '5px', overflow: 'hidden', maxWidth: '320px' }}>
                        <div style={{
                          width: `${pct}%`, height: '100%', borderRadius: '5px',
                          background: `linear-gradient(90deg, ${acc.c1}, ${acc.c2})`,
                        }} />
                      </div>
                      {cashPct != null && (
                        <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '5px', fontWeight: '600' }}>
                          Cash {cashPct.toFixed(0)}% · Online {(100 - cashPct).toFixed(0)}%
                        </div>
                      )}
                    </div>
                    <div style={{ textAlign: 'right', minWidth: '110px' }}>
                      <div style={{ fontSize: '18px', fontWeight: '800', color: '#1a1a2e' }}>{fmtShort(r.revenue)}</div>
                      <div style={{ fontSize: '11px', color: '#9ca3af', fontWeight: '600' }}>{pct.toFixed(1)}% of {view}</div>
                    </div>
                    <div style={{ flexShrink: 0 }}>
                      <MiniBars values={r.sparkVals} color={acc.c1} />
                      <div style={{ fontSize: '9px', color: '#bbb', textAlign: 'center', marginTop: '3px', fontWeight: '600' }}>7-DAY</div>
                    </div>
                  </div>
                );
              })}
              {storePerf.rows.length === 0 && (
                <div style={{ padding: '24px', textAlign: 'center', color: '#9ca3af', fontSize: '13px' }}>No stores in this scope.</div>
              )}
            </div>
          </div>

          {/* SECTION 5 — FY Projection & Target */}
          <div style={{
            ...cardStyle, marginBottom: '8px',
            background: `linear-gradient(135deg, ${ORANGE}0a, #fff 60%)`,
            border: `1px solid ${ORANGE}33`,
          }}>
            <div style={{ fontSize: '16px', fontWeight: '800', color: '#1a1a2e', marginBottom: '16px' }}>🎯 FY 2026-27 Projection (to Mar 2027)</div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '14px', marginBottom: '20px' }}>
              <PlanStat label="FYTD ACTUAL" value={fmtShort(orgKpi.fyTotal)} />
              <PlanStat label="RUN-RATE (LAST 30D)" value={`${fmt(orgKpi.runRate)}/day`} />
              <PlanStat label="PROJECTED FY TOTAL" value={fmtShort(orgKpi.projectedFY)} color={ORANGE_DARK} />
              <PlanStat label="DAYS ELAPSED / LEFT" value={`${fyTiming.daysElapsed} / ${fyTiming.daysRemaining}`} />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', marginBottom: '16px' }}>
              <label style={{ fontSize: '13px', fontWeight: '700', color: '#1a1a2e' }}>Annual target (₹)</label>
              <input
                type="number"
                value={target}
                onChange={e => setTarget(Number(e.target.value) || 0)}
                style={{ ...inputStyle, width: '180px', fontWeight: '700' }}
              />
              <span style={{ fontSize: '13px', fontWeight: '700', color: '#6b7280' }}>{fmtShort(target)}</span>
            </div>

            <div style={{
              padding: '14px 16px', borderRadius: '12px', marginBottom: '16px',
              background: projection.onTrack ? '#ecfdf5' : '#fef2f2',
              border: `1px solid ${projection.onTrack ? GREEN : RED}33`,
            }}>
              <div style={{ fontSize: '14px', fontWeight: '700', color: '#1a1a2e' }}>
                To hit {fmtShort(projection.tgt)} you need <span style={{ color: ORANGE_DARK }}>{fmt(projection.needPerDay)}/day</span> for the remaining {projection.remaining} days.
              </div>
              <div style={{ fontSize: '13px', fontWeight: '700', marginTop: '6px', color: projection.onTrack ? GREEN_DARK : RED }}>
                {projection.onTrack
                  ? `✅ On track — current run-rate of ${fmt(orgKpi.runRate)}/day exceeds the required pace.`
                  : `⚠️ Behind by ${fmt(projection.gap)}/day — current run-rate is ${fmt(orgKpi.runRate)}/day.`}
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
              <span style={{ fontSize: '12px', fontWeight: '600', color: '#9ca3af' }}>FYTD vs target</span>
              <span style={{ fontSize: '12px', fontWeight: '700', color: '#1a1a2e' }}>{projection.progressPct.toFixed(1)}%</span>
            </div>
            <div style={{ height: '12px', background: '#f0f0f5', borderRadius: '7px', overflow: 'hidden' }}>
              <div style={{
                width: `${projection.progressPct}%`, height: '100%', borderRadius: '7px',
                background: projection.onTrack ? `linear-gradient(90deg, ${GREEN}, ${GREEN_DARK})` : `linear-gradient(90deg, ${ORANGE}, ${ORANGE_DARK})`,
                transition: 'width 0.4s',
              }} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function MiniStat({ label, value, sub }) {
  return (
    <div style={{ flex: '1 1 120px', minWidth: '110px' }}>
      <div style={{ fontSize: '10px', fontWeight: '700', color: '#9ca3af', letterSpacing: '0.4px', marginBottom: '4px' }}>{label}</div>
      <div style={{ fontSize: '19px', fontWeight: '800', color: '#1a1a2e' }}>{value}</div>
      {sub && <div style={{ fontSize: '11px', color: '#9ca3af', fontWeight: '600', marginTop: '2px' }}>{sub}</div>}
    </div>
  );
}

function PlanStat({ label, value, color }) {
  return (
    <div>
      <div style={{ fontSize: '10px', fontWeight: '700', color: '#9ca3af', letterSpacing: '0.4px', marginBottom: '4px' }}>{label}</div>
      <div style={{ fontSize: '18px', fontWeight: '800', color: color || '#1a1a2e' }}>{value}</div>
    </div>
  );
}

function WeeklyTable({ view, weeks, scopeStores }) {
  const thStyle = { fontSize: '11px', fontWeight: '700', color: '#9ca3af', textAlign: 'right', padding: '8px 10px', whiteSpace: 'nowrap', letterSpacing: '0.3px' };
  const thLeft = { ...thStyle, textAlign: 'left' };
  const tdStyle = { fontSize: '13px', color: '#374151', textAlign: 'right', padding: '9px 10px', whiteSpace: 'nowrap' };
  const tdLeft = { ...tdStyle, textAlign: 'left', fontWeight: '600', color: '#1a1a2e' };

  function weekLabel(w) {
    const end = addDays(w.monday, 6);
    return `${fmtDateShort(w.monday)}–${fmtDateShort(end)}`;
  }

  if (weeks.length === 0) {
    return <div style={{ padding: '24px', textAlign: 'center', color: '#9ca3af', fontSize: '13px' }}>No weekly data yet.</div>;
  }

  if (view === 'Org') {
    let prevTotal = null;
    const rows = weeks.map(w => {
      const tg = w.byRegion.TG || 0;
      const ap = w.byRegion.AP || 0;
      const grand = w.total;
      const wow = prevTotal != null && prevTotal > 0 ? ((grand - prevTotal) / prevTotal) * 100 : null;
      prevTotal = grand;
      return { w, tg, ap, grand, wow };
    });
    const sumTg = rows.reduce((s, r) => s + r.tg, 0);
    const sumAp = rows.reduce((s, r) => s + r.ap, 0);
    const sumGrand = rows.reduce((s, r) => s + r.grand, 0);
    return (
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '480px' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #f0f0f5' }}>
              <th style={thLeft}>WEEK</th>
              <th style={thStyle}>TG TOTAL</th>
              <th style={thStyle}>AP TOTAL</th>
              <th style={thStyle}>GRAND TOTAL</th>
              <th style={thStyle}>WoW %</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.w.ts} style={{ borderBottom: '1px solid #f5f5f7' }}>
                <td style={tdLeft}>{weekLabel(r.w)}</td>
                <td style={tdStyle}>{fmtShort(r.tg)}</td>
                <td style={tdStyle}>{fmtShort(r.ap)}</td>
                <td style={{ ...tdStyle, fontWeight: '800', color: '#1a1a2e' }}>{fmtShort(r.grand)}</td>
                <td style={{ ...tdStyle, fontWeight: '700', color: r.wow == null ? '#bbb' : (r.wow >= 0 ? GREEN_DARK : RED) }}>
                  {r.wow == null ? '—' : `${r.wow >= 0 ? '▲' : '▼'} ${Math.abs(r.wow).toFixed(0)}%`}
                </td>
              </tr>
            ))}
            <tr style={{ borderTop: '2px solid #f0f0f5', background: '#fafafb' }}>
              <td style={{ ...tdLeft, fontWeight: '800' }}>TOTAL</td>
              <td style={{ ...tdStyle, fontWeight: '800' }}>{fmtShort(sumTg)}</td>
              <td style={{ ...tdStyle, fontWeight: '800' }}>{fmtShort(sumAp)}</td>
              <td style={{ ...tdStyle, fontWeight: '800', color: '#1a1a2e' }}>{fmtShort(sumGrand)}</td>
              <td style={tdStyle}></td>
            </tr>
          </tbody>
        </table>
      </div>
    );
  }

  // Store-level (TG or AP)
  const storeCols = scopeStores;
  const colTotals = {};
  storeCols.forEach(s => { colTotals[s.id] = 0; });
  let grandSum = 0;
  const rows = weeks.map(w => {
    let total = 0;
    storeCols.forEach(s => {
      const v = w.byStore[s.id] || 0;
      colTotals[s.id] += v;
      total += v;
    });
    grandSum += total;
    return { w, total };
  });

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: `${200 + storeCols.length * 90}px` }}>
        <thead>
          <tr style={{ borderBottom: '2px solid #f0f0f5' }}>
            <th style={thLeft}>WEEK</th>
            {storeCols.map(s => <th key={s.id} style={thStyle}>{s.name.toUpperCase()}</th>)}
            <th style={thStyle}>TOTAL</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ w, total }) => (
            <tr key={w.ts} style={{ borderBottom: '1px solid #f5f5f7' }}>
              <td style={tdLeft}>{weekLabel(w)}</td>
              {storeCols.map(s => <td key={s.id} style={tdStyle}>{fmtShort(w.byStore[s.id] || 0)}</td>)}
              <td style={{ ...tdStyle, fontWeight: '800', color: '#1a1a2e' }}>{fmtShort(total)}</td>
            </tr>
          ))}
          <tr style={{ borderTop: '2px solid #f0f0f5', background: '#fafafb' }}>
            <td style={{ ...tdLeft, fontWeight: '800' }}>TOTAL</td>
            {storeCols.map(s => <td key={s.id} style={{ ...tdStyle, fontWeight: '800' }}>{fmtShort(colTotals[s.id])}</td>)}
            <td style={{ ...tdStyle, fontWeight: '800', color: '#1a1a2e' }}>{fmtShort(grandSum)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
