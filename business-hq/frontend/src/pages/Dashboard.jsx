import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../App';
import api from '../api';

// ─── Helpers ───────────────────────────────────────────────────────────────

function formatCurrency(val) {
  return '₹' + Number(val || 0).toLocaleString('en-IN');
}

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

// ─── Focus Mode ────────────────────────────────────────────────────────────

function FocusMode({ tasks, meetings, onClose }) {
  const now = new Date();
  const dueTasks = tasks.filter(t => t.status !== 'done' && t.due_date &&
    new Date(t.due_date).toDateString() === now.toDateString());
  const inProgress = tasks.filter(t => t.status === 'inprogress');

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, zIndex: 2000,
      background: 'rgba(15,15,30,0.85)', backdropFilter: 'blur(12px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px'
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: 'white', borderRadius: '24px', width: '100%', maxWidth: '660px',
        boxShadow: '0 32px 80px rgba(0,0,0,0.3)', overflow: 'hidden'
      }}>
        <div style={{
          background: 'linear-gradient(135deg, #6c63ff, #3b82f6)',
          padding: '24px 28px', color: 'white',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between'
        }}>
          <div>
            <div style={{ fontSize: '20px', fontWeight: '800' }}>⚡ Focus Mode</div>
            <div style={{ fontSize: '13px', opacity: 0.8, marginTop: '3px' }}>
              {now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </div>
          </div>
          <button onClick={onClose} style={{
            background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white',
            width: '36px', height: '36px', borderRadius: '10px', cursor: 'pointer', fontSize: '20px',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>×</button>
        </div>
        <div style={{ padding: '24px 28px', maxHeight: '65vh', overflowY: 'auto' }}>
          {(meetings || []).length > 0 && (
            <div style={{ marginBottom: '20px' }}>
              <div style={{ fontSize: '11px', fontWeight: '700', color: '#9ca3af', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '10px' }}>📅 Meetings Today</div>
              {meetings.map(m => (
                <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '11px 14px', borderRadius: '10px', background: '#f5f3ff', border: '1px solid #e8e4ff', marginBottom: '8px' }}>
                  <div style={{ fontSize: '13px', fontWeight: '700', color: '#6c63ff', minWidth: '55px' }}>
                    {new Date(m.start_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                  <div style={{ flex: 1, fontSize: '14px', fontWeight: '600', color: '#1a1a2e' }}>{m.title}</div>
                  {m.meeting_url && (
                    <button onClick={() => window.open(m.meeting_url, '_blank')} style={{ background: 'linear-gradient(135deg, #6c63ff, #3b82f6)', color: 'white', border: 'none', borderRadius: '8px', padding: '5px 12px', fontSize: '11px', fontWeight: '700', cursor: 'pointer' }}>Join →</button>
                  )}
                </div>
              ))}
            </div>
          )}
          <div style={{ marginBottom: '20px' }}>
            <div style={{ fontSize: '11px', fontWeight: '700', color: '#9ca3af', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '10px' }}>🔥 Due Today ({dueTasks.length})</div>
            {dueTasks.length === 0 ? (
              <div style={{ color: '#9ca3af', fontSize: '13px', padding: '12px', background: '#f9f9fb', borderRadius: '10px', textAlign: 'center' }}>🎉 Nothing due today!</div>
            ) : dueTasks.map(t => (
              <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '11px 14px', borderRadius: '10px', background: '#fff5f5', border: '1px solid #fecaca', marginBottom: '8px' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ef4444', flexShrink: 0 }} />
                <div style={{ flex: 1, fontSize: '14px', fontWeight: '600', color: '#1a1a2e' }}>{t.title}</div>
                <span style={{ fontSize: '11px', color: t.workspace_color || '#6c63ff', background: `${t.workspace_color || '#6c63ff'}15`, padding: '2px 8px', borderRadius: '6px', fontWeight: '600' }}>
                  {t.workspace_emoji} {t.workspace_name}
                </span>
              </div>
            ))}
          </div>
          <div>
            <div style={{ fontSize: '11px', fontWeight: '700', color: '#9ca3af', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '10px' }}>⚡ In Progress ({inProgress.length})</div>
            {inProgress.map(t => (
              <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '11px 14px', borderRadius: '10px', background: '#eff6ff', border: '1px solid #bfdbfe', marginBottom: '8px' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#3b82f6', flexShrink: 0 }} />
                <div style={{ flex: 1, fontSize: '14px', fontWeight: '600', color: '#1a1a2e' }}>{t.title}</div>
                <span style={{ fontSize: '11px', color: t.workspace_color || '#6c63ff', background: `${t.workspace_color || '#6c63ff'}15`, padding: '2px 8px', borderRadius: '6px', fontWeight: '600' }}>
                  {t.workspace_emoji} {t.workspace_name}
                </span>
              </div>
            ))}
          </div>
        </div>
        <div style={{ padding: '16px 28px', borderTop: '1px solid #f0f0f5', display: 'flex', justifyContent: 'center' }}>
          <button onClick={onClose} style={{ background: 'linear-gradient(135deg, #6c63ff, #3b82f6)', color: 'white', border: 'none', borderRadius: '12px', padding: '12px 32px', fontSize: '14px', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit' }}>
            Exit Focus Mode
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Dashboard ────────────────────────────────────────────────────────

export default function Dashboard() {
  const { user, addToast } = useApp();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [deals, setDeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [focusMode, setFocusMode] = useState(false);
  const [activeWs, setActiveWs] = useState('all');

  useEffect(() => {
    async function load() {
      try {
        const [dash, allTasks, allDeals] = await Promise.all([
          api.getDashboard(), api.getTasks(), api.getDeals()
        ]);
        setData(dash);
        setTasks(allTasks);
        setDeals(allDeals);
      } catch {
        addToast('Failed to load dashboard', 'error');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', flexDirection: 'column', gap: '12px' }}>
      <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'linear-gradient(135deg, #6c63ff, #3b82f6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>🏢</div>
      <div style={{ color: '#9ca3af', fontSize: '14px', fontWeight: '500' }}>Loading your dashboard…</div>
    </div>
  );

  const stats = data?.stats || {};
  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening';
  const greetEmoji = hour < 12 ? '🌅' : hour < 17 ? '☀️' : '🌙';

  // Tasks filtered
  const filtered = activeWs === 'all' ? tasks : tasks.filter(t => t.workspace_name === activeWs);
  const todo = filtered.filter(t => t.status === 'todo');
  const inprog = filtered.filter(t => t.status === 'inprogress');
  const done = filtered.filter(t => t.status === 'done');

  // Pipeline stats
  const activeDeals = deals.filter(d => !['won','lost'].includes(d.stage));
  const wonDeals = deals.filter(d => d.stage === 'won');
  const pipelineValue = activeDeals.reduce((s, d) => s + (d.value || 0), 0);
  const wonValue = wonDeals.reduce((s, d) => s + (d.value || 0), 0);
  const topDeals = activeDeals.sort((a,b) => b.value - a.value).slice(0, 3);

  // Upcoming lead meetings
  const upcomingMeetings = deals
    .filter(d => d.stage === 'meeting_scheduled' && d.meeting_date && new Date(d.meeting_date) >= new Date())
    .sort((a, b) => new Date(a.meeting_date) - new Date(b.meeting_date))
    .slice(0, 4);

  // Business health per workspace
  const workspaces = [
    { name: 'Krispies', emoji: '🥐', color: '#f59e0b', bg: '#fffbeb' },
    { name: 'Solvv AI', emoji: '🤖', color: '#6c63ff', bg: '#f5f3ff' },
    { name: "Surabhi's Channel", emoji: '📺', color: '#ec4899', bg: '#fdf2f8' },
  ];

  const wsTasks = workspaces.map(ws => {
    const wt = tasks.filter(t => t.workspace_name?.includes(ws.name.split(' ')[0]));
    const total = wt.length;
    const doneC = wt.filter(t => t.status === 'done').length;
    const prog = wt.filter(t => t.status === 'inprogress').length;
    const pct = total > 0 ? Math.round((doneC / total) * 100) : 0;
    return { ...ws, total, done: doneC, inprog: prog, pct };
  });

  const STAGES = {
    lead: { label: 'Lead', color: '#6b7280' },
    qualified: { label: 'Qualified', color: '#3b82f6' },
    proposal: { label: 'Proposal', color: '#8b5cf6' },
    negotiation: { label: 'Negotiation', color: '#f59e0b' },
  };

  const wsFilterList = [
    { label: 'All', value: 'all' },
    { label: '🥐 Krispies', value: 'Krispies' },
    { label: '🤖 Solvv AI', value: 'Solvv AI' },
    { label: '🎬 Content', value: 'Krispies Content' },
    { label: "📺 Channel", value: "Surabhi's Channel" },
  ];

  return (
    <div style={{ fontFamily: 'Inter, sans-serif' }}>
      {focusMode && <FocusMode tasks={tasks} meetings={data?.today_meetings} onClose={() => setFocusMode(false)} />}

      {/* ── HERO ROW ─────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '18px', marginBottom: '20px' }}>

        {/* Welcome + briefing */}
        <div style={{
          background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #1e40af 100%)',
          borderRadius: '20px', padding: '28px 32px', color: 'white',
          display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '160px',
          position: 'relative', overflow: 'hidden'
        }}>
          {/* Decorative circles */}
          <div style={{ position: 'absolute', top: -40, right: -40, width: 200, height: 200, borderRadius: '50%', background: 'rgba(255,255,255,0.04)' }} />
          <div style={{ position: 'absolute', bottom: -60, right: 80, width: 160, height: 160, borderRadius: '50%', background: 'rgba(255,255,255,0.04)' }} />

          <div>
            <div style={{ fontSize: '22px', fontWeight: '800', letterSpacing: '-0.5px', marginBottom: '4px' }}>
              {greeting}, {user?.name?.split(' ')[0]} {greetEmoji}
            </div>
            <div style={{ fontSize: '13px', opacity: 0.65, fontWeight: '400' }}>
              {now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '28px', alignItems: 'flex-end', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', gap: '28px' }}>
              {[
                { label: 'Due Today', value: stats.tasks_due_today || 0, warn: (stats.tasks_due_today || 0) > 0 },
                { label: 'Meetings', value: stats.meetings_today || 0 },
                { label: 'In Progress', value: stats.inprogress || 0 },
                { label: 'Team Active', value: stats.team_count || 0 },
              ].map((item, i) => (
                <div key={i}>
                  <div style={{ fontSize: '28px', fontWeight: '900', lineHeight: 1, color: item.warn ? '#fbbf24' : 'white' }}>{item.value}</div>
                  <div style={{ fontSize: '11px', opacity: 0.6, marginTop: '3px', whiteSpace: 'nowrap' }}>{item.label}</div>
                </div>
              ))}
            </div>
            <button onClick={() => setFocusMode(true)} style={{
              background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)',
              border: '1px solid rgba(255,255,255,0.2)', color: 'white',
              borderRadius: '12px', padding: '10px 18px', fontSize: '13px',
              fontWeight: '700', cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: 'inherit',
              transition: 'all 0.15s'
            }}>
              ⚡ Focus Mode
            </button>
          </div>
        </div>

        {/* Quick pipeline snapshot */}
        <div style={{ background: 'white', borderRadius: '20px', border: '1px solid #f0f0f5', boxShadow: '0 2px 12px rgba(0,0,0,0.04)', padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
            <div>
              <div style={{ fontSize: '13px', fontWeight: '700', color: '#1a1a2e' }}>🤖 Solvv AI Pipeline</div>
              <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '2px' }}>Active deals snapshot</div>
            </div>
            <button onClick={() => navigate('/pipeline')} style={{ background: '#f5f3ff', border: 'none', color: '#6c63ff', fontSize: '11px', fontWeight: '700', padding: '5px 10px', borderRadius: '8px', cursor: 'pointer', fontFamily: 'inherit' }}>
              View all →
            </button>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '14px' }}>
            <div>
              <div style={{ fontSize: '20px', fontWeight: '800', color: '#1a1a2e' }}>{formatCurrency(pipelineValue)}</div>
              <div style={{ fontSize: '11px', color: '#9ca3af' }}>Pipeline value</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '20px', fontWeight: '800', color: '#10b981' }}>{formatCurrency(wonValue)}</div>
              <div style={{ fontSize: '11px', color: '#9ca3af' }}>Won revenue</div>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
            {topDeals.slice(0, 3).map(deal => (
              <div key={deal.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 10px', borderRadius: '10px', background: '#f9f9fb' }}>
                <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: STAGES[deal.stage]?.color || '#6b7280', flexShrink: 0 }} />
                <div style={{ flex: 1, fontSize: '12px', fontWeight: '600', color: '#1a1a2e', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{deal.company}</div>
                <div style={{ fontSize: '12px', fontWeight: '700', color: '#374151', flexShrink: 0 }}>{formatCurrency(deal.value)}</div>
              </div>
            ))}
            {topDeals.length === 0 && (
              <div style={{ textAlign: 'center', padding: '12px', color: '#9ca3af', fontSize: '12px' }}>No active deals</div>
            )}
          </div>
        </div>
      </div>

      {/* ── UPCOMING LEAD MEETINGS ───────────────────────────────── */}
      {upcomingMeetings.length > 0 && (
        <div style={{ background: 'linear-gradient(135deg, #ecfeff, #f0fdff)', border: '1px solid #06b6d425', borderRadius: '16px', padding: '16px 20px', marginBottom: '18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '18px' }}>📞</span>
              <div>
                <div style={{ fontSize: '14px', fontWeight: '700', color: '#0e7490' }}>Upcoming Lead Meetings</div>
                <div style={{ fontSize: '11px', color: '#67e8f9', marginTop: '1px' }}>{upcomingMeetings.length} meeting{upcomingMeetings.length > 1 ? 's' : ''} scheduled</div>
              </div>
            </div>
            <button onClick={() => navigate('/pipeline')} style={{ background: 'white', border: '1px solid #06b6d430', color: '#06b6d4', fontSize: '11px', fontWeight: '700', padding: '5px 12px', borderRadius: '8px', cursor: 'pointer', fontFamily: 'inherit' }}>
              View Pipeline →
            </button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '10px' }}>
            {upcomingMeetings.map(deal => {
              const mDate = new Date(deal.meeting_date);
              const isToday = mDate.toDateString() === now.toDateString();
              const isTomorrow = mDate.toDateString() === new Date(now.getTime() + 86400000).toDateString();
              const dateLabel = isToday ? 'Today' : isTomorrow ? 'Tomorrow' : mDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
              return (
                <div key={deal.id} style={{ background: 'white', borderRadius: '12px', padding: '12px 14px', border: `1px solid ${isToday ? '#06b6d440' : '#f0f0f5'}`, display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: isToday ? '#06b6d4' : '#ecfeff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <div style={{ fontSize: '10px', fontWeight: '700', color: isToday ? 'white' : '#06b6d4' }}>{dateLabel}</div>
                    <div style={{ fontSize: '11px', fontWeight: '700', color: isToday ? 'white' : '#0e7490' }}>{mDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</div>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '13px', fontWeight: '700', color: '#1a1a2e', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{deal.company}</div>
                    <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <span>{deal.meeting_type === 'online' ? '💻' : '🤝'}</span>
                      <span>{deal.meeting_type === 'online' ? 'Online' : 'In-Person'}</span>
                      {deal.assignee_name && <><span>·</span><span>{deal.assignee_name}</span></>}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: '12px', fontWeight: '700', color: '#0e7490' }}>{formatCurrency(deal.value)}</div>
                    {deal.meeting_link && (
                      <button onClick={() => window.open(deal.meeting_link, '_blank')} style={{ fontSize: '10px', background: '#06b6d4', color: 'white', border: 'none', borderRadius: '6px', padding: '3px 8px', cursor: 'pointer', marginTop: '4px', fontFamily: 'inherit', fontWeight: '700' }}>
                        Join →
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── WORKSPACE HEALTH ROW ──────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px', marginBottom: '20px' }}>
        {wsTasks.map((ws, i) => (
          <div key={i} style={{ background: 'white', borderRadius: '16px', border: '1px solid #f0f0f5', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', padding: '18px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: ws.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px' }}>{ws.emoji}</div>
                <div style={{ fontSize: '13px', fontWeight: '700', color: '#1a1a2e' }}>{ws.name}</div>
              </div>
              <div style={{ fontSize: '11px', fontWeight: '700', color: ws.color, background: ws.bg, padding: '3px 8px', borderRadius: '6px' }}>
                {ws.pct}% done
              </div>
            </div>
            <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
              {[
                { label: 'Total', value: ws.total, color: '#374151' },
                { label: 'Active', value: ws.inprog, color: '#3b82f6' },
                { label: 'Done', value: ws.done, color: '#10b981' },
              ].map((s, j) => (
                <div key={j} style={{ flex: 1, textAlign: 'center', padding: '8px', background: '#f9f9fb', borderRadius: '8px' }}>
                  <div style={{ fontSize: '18px', fontWeight: '800', color: s.color }}>{s.value}</div>
                  <div style={{ fontSize: '10px', color: '#9ca3af', fontWeight: '500', marginTop: '1px' }}>{s.label}</div>
                </div>
              ))}
            </div>
            {/* Progress bar */}
            <div style={{ height: '5px', background: '#f0f0f5', borderRadius: '4px', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${ws.pct}%`, background: `linear-gradient(90deg, ${ws.color}, ${ws.color}99)`, borderRadius: '4px', transition: 'width 0.6s ease' }} />
            </div>
          </div>
        ))}
      </div>

      {/* ── WORKSPACE FILTER ─────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '18px', flexWrap: 'wrap' }}>
        {wsFilterList.map(f => (
          <button key={f.value} onClick={() => setActiveWs(f.value)} style={{
            padding: '6px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: '600',
            cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s',
            border: activeWs === f.value ? 'none' : '1px solid #e8e8ed',
            background: activeWs === f.value ? 'linear-gradient(135deg, #6c63ff, #3b82f6)' : 'white',
            color: activeWs === f.value ? 'white' : '#6b7280',
            boxShadow: activeWs === f.value ? '0 4px 12px rgba(108,99,255,0.25)' : 'none',
          }}>{f.label}</button>
        ))}
      </div>

      {/* ── MAIN CONTENT GRID ────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '18px', marginBottom: '18px' }}>

        {/* Left: Task Board */}
        <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #f0f0f5', boxShadow: '0 2px 12px rgba(0,0,0,0.04)', padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <div>
              <div style={{ fontSize: '15px', fontWeight: '700', color: '#1a1a2e' }}>📋 Task Board</div>
              <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '2px' }}>{filtered.length} tasks total</div>
            </div>
            <button onClick={() => navigate('/tasks')} style={{ background: '#f5f3ff', border: 'none', color: '#6c63ff', fontSize: '12px', fontWeight: '600', padding: '6px 12px', borderRadius: '8px', cursor: 'pointer', fontFamily: 'inherit' }}>
              View all →
            </button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
            {[
              { title: 'To Do', items: todo, color: '#6b7280', bg: '#f3f4f6' },
              { title: 'In Progress', items: inprog, color: '#3b82f6', bg: '#eff6ff' },
              { title: 'Done', items: done, color: '#10b981', bg: '#f0fdf4' },
            ].map(col => (
              <div key={col.title} style={{ background: '#f9f9fb', borderRadius: '12px', padding: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: col.color }} />
                  <span style={{ fontSize: '11px', fontWeight: '700', color: '#6b7280', letterSpacing: '0.3px' }}>{col.title.toUpperCase()}</span>
                  <span style={{ marginLeft: 'auto', background: col.bg, color: col.color, borderRadius: '6px', padding: '1px 7px', fontSize: '11px', fontWeight: '700' }}>{col.items.length}</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
                  {col.items.slice(0, 4).map(t => (
                    <div key={t.id} onClick={() => navigate('/tasks')} style={{
                      background: 'white', borderRadius: '10px', padding: '10px',
                      cursor: 'pointer', border: '1px solid #f0f0f5',
                      boxShadow: '0 1px 4px rgba(0,0,0,0.04)', transition: 'all 0.15s'
                    }}>
                      <div style={{ fontSize: '12px', fontWeight: '600', color: '#1a1a2e', lineHeight: 1.4, marginBottom: '6px' }}>{t.title}</div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '10px', fontWeight: '600', color: t.workspace_color || '#6c63ff', background: `${t.workspace_color || '#6c63ff'}15`, padding: '2px 6px', borderRadius: '5px' }}>
                          {t.workspace_emoji} {t.workspace_name}
                        </span>
                        {t.assignee_name && (
                          <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: t.assignee_color || '#6c63ff', color: 'white', fontSize: '9px', fontWeight: '700', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {t.assignee_name[0]}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  {col.items.length > 4 && (
                    <button onClick={() => navigate('/tasks')} style={{ background: 'none', border: '1.5px dashed #e0e0ef', borderRadius: '8px', padding: '6px', cursor: 'pointer', fontSize: '11px', color: '#9ca3af', fontFamily: 'inherit' }}>
                      +{col.items.length - 4} more
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Meetings + Quick Actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Today's Meetings */}
          <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #f0f0f5', boxShadow: '0 2px 12px rgba(0,0,0,0.04)', padding: '18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <div style={{ fontSize: '14px', fontWeight: '700', color: '#1a1a2e' }}>📅 Today's Meetings</div>
              <button onClick={() => navigate('/meetings')} style={{ background: 'none', border: 'none', color: '#6c63ff', fontSize: '11px', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit' }}>+ Schedule</button>
            </div>
            {(data?.today_meetings || []).length === 0 ? (
              <div style={{ textAlign: 'center', padding: '16px', color: '#9ca3af', fontSize: '12px', background: '#f9f9fb', borderRadius: '10px' }}>🎉 No meetings today!</div>
            ) : (data?.today_meetings || []).map(m => {
              const start = new Date(m.start_time);
              const end = new Date(start.getTime() + (m.duration_mins || 30) * 60000);
              const live = now >= start && now <= end;
              return (
                <div key={m.id} style={{ display: 'flex', gap: '10px', alignItems: 'center', padding: '10px 12px', borderRadius: '10px', background: live ? '#f5f3ff' : '#f9f9fb', border: `1px solid ${live ? '#e8e4ff' : '#f0f0f5'}`, marginBottom: '8px' }}>
                  <div style={{ textAlign: 'center', minWidth: '44px' }}>
                    <div style={{ fontSize: '11px', fontWeight: '700', color: live ? '#6c63ff' : '#374151' }}>
                      {start.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                    <div style={{ fontSize: '10px', color: '#9ca3af' }}>{m.duration_mins}m</div>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '12px', fontWeight: '600', color: '#1a1a2e', display: 'flex', alignItems: 'center', gap: '5px' }}>
                      {m.title}
                      {live && <span style={{ fontSize: '9px', fontWeight: '700', background: '#ef4444', color: 'white', padding: '1px 5px', borderRadius: '4px', letterSpacing: '0.5px' }}>LIVE</span>}
                    </div>
                    <div style={{ fontSize: '11px', color: m.workspace_color || '#6c63ff', marginTop: '2px' }}>{m.workspace_emoji} {m.workspace_name}</div>
                  </div>
                  <button onClick={() => m.meeting_url ? window.open(m.meeting_url, '_blank') : navigate('/meetings')} style={{ background: 'linear-gradient(135deg, #6c63ff, #3b82f6)', color: 'white', border: 'none', borderRadius: '7px', padding: '5px 10px', fontSize: '10px', fontWeight: '700', cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: 'inherit' }}>
                    Join →
                  </button>
                </div>
              );
            })}
          </div>

          {/* Quick Actions */}
          <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #f0f0f5', boxShadow: '0 2px 12px rgba(0,0,0,0.04)', padding: '18px' }}>
            <div style={{ fontSize: '14px', fontWeight: '700', color: '#1a1a2e', marginBottom: '12px' }}>⚡ Quick Actions</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              {[
                { label: '+ New Task', icon: '✅', action: () => navigate('/tasks?new=1'), color: '#6c63ff', bg: '#f5f3ff' },
                { label: 'Schedule Meeting', icon: '📅', action: () => navigate('/meetings'), color: '#3b82f6', bg: '#eff6ff' },
                { label: 'Add Deal', icon: '💰', action: () => navigate('/pipeline'), color: '#10b981', bg: '#f0fdf4' },
                { label: 'Post Update', icon: '📢', action: () => navigate('/updates'), color: '#f59e0b', bg: '#fffbeb' },
              ].map((a, i) => (
                <button key={i} onClick={a.action} style={{
                  background: a.bg, border: `1px solid ${a.color}20`,
                  borderRadius: '10px', padding: '10px 12px',
                  cursor: 'pointer', fontFamily: 'inherit',
                  display: 'flex', alignItems: 'center', gap: '7px',
                  fontSize: '12px', fontWeight: '600', color: a.color,
                  transition: 'all 0.15s', textAlign: 'left'
                }}>
                  <span>{a.icon}</span> {a.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── BOTTOM ROW ───────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '18px' }}>

        {/* Team Activity */}
        <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #f0f0f5', boxShadow: '0 2px 12px rgba(0,0,0,0.04)', padding: '18px' }}>
          <div style={{ fontSize: '14px', fontWeight: '700', color: '#1a1a2e', marginBottom: '14px' }}>⚡ Team Activity</div>
          {(data?.recent_activity || []).length === 0 ? (
            <div style={{ color: '#9ca3af', fontSize: '12px', textAlign: 'center', padding: '20px' }}>No recent activity</div>
          ) : (data?.recent_activity || []).slice(0, 6).map((item, i, arr) => (
            <div key={i} style={{ display: 'flex', gap: '10px', paddingBottom: '12px', marginBottom: i < arr.length - 1 ? '12px' : 0, borderBottom: i < arr.length - 1 ? '1px solid #f5f5f7' : 'none' }}>
              <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: item.avatar_color || '#6c63ff', color: 'white', fontSize: '12px', fontWeight: '700', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {item.user_name?.[0]}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '12px', color: '#374151', lineHeight: 1.4 }}>
                  <span style={{ fontWeight: '600' }}>{item.user_name}</span>{' '}
                  <span style={{ color: '#9ca3af' }}>created</span>{' '}
                  <span style={{ fontWeight: '500', color: '#1a1a2e', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'inline-block', maxWidth: '120px', verticalAlign: 'bottom' }}>{item.title}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                  <span style={{ fontSize: '10px', color: '#9ca3af' }}>{timeAgo(item.created_at)}</span>
                  <span style={{ fontSize: '10px', color: '#6b7280' }}>·</span>
                  <span style={{ fontSize: '10px', fontWeight: '600', color: item.status === 'done' ? '#10b981' : item.status === 'inprogress' ? '#3b82f6' : '#6b7280', background: item.status === 'done' ? '#f0fdf4' : item.status === 'inprogress' ? '#eff6ff' : '#f3f4f6', padding: '1px 6px', borderRadius: '5px' }}>
                    {item.status === 'inprogress' ? 'In Progress' : item.status === 'done' ? 'Done' : 'Todo'}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Team Updates */}
        <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #f0f0f5', boxShadow: '0 2px 12px rgba(0,0,0,0.04)', padding: '18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
            <div style={{ fontSize: '14px', fontWeight: '700', color: '#1a1a2e' }}>📢 Team Updates</div>
            <button onClick={() => navigate('/updates')} style={{ background: 'none', border: 'none', color: '#6c63ff', fontSize: '11px', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit' }}>View all</button>
          </div>
          {(data?.recent_updates || []).length === 0 ? (
            <div style={{ color: '#9ca3af', fontSize: '12px', textAlign: 'center', padding: '20px' }}>No updates yet</div>
          ) : (data?.recent_updates || []).map((u, i) => (
            <div key={u.id || i} style={{ paddingBottom: '12px', marginBottom: '12px', borderBottom: i < (data.recent_updates.length - 1) ? '1px solid #f5f5f7' : 'none' }}>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: u.avatar_color || '#6c63ff', color: 'white', fontSize: '11px', fontWeight: '700', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {u.user_name?.[0]}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                    <span style={{ fontSize: '12px', fontWeight: '700', color: '#1a1a2e' }}>{u.user_name}</span>
                    <span style={{ fontSize: '10px', fontWeight: '600', color: u.workspace_color || '#6c63ff', background: `${u.workspace_color || '#6c63ff'}15`, padding: '1px 6px', borderRadius: '5px' }}>
                      {u.workspace_emoji} {u.workspace_name}
                    </span>
                  </div>
                  <div style={{ fontSize: '12px', color: '#6b7280', lineHeight: 1.5, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                    {u.content}
                  </div>
                  {u.likes_count > 0 && (
                    <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '5px' }}>❤️ {u.likes_count}</div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Team Overview */}
        <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #f0f0f5', boxShadow: '0 2px 12px rgba(0,0,0,0.04)', padding: '18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
            <div style={{ fontSize: '14px', fontWeight: '700', color: '#1a1a2e' }}>👥 Team Overview</div>
            <button onClick={() => navigate('/team')} style={{ background: 'none', border: 'none', color: '#6c63ff', fontSize: '11px', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit' }}>View all</button>
          </div>
          {(data?.team_members || []).map((m, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', paddingBottom: '12px', marginBottom: '12px', borderBottom: i < (data.team_members.length - 1) ? '1px solid #f5f5f7' : 'none' }}>
              <div style={{ position: 'relative', flexShrink: 0 }}>
                <div style={{ width: '34px', height: '34px', borderRadius: '50%', background: m.avatar_color || '#6c63ff', color: 'white', fontSize: '13px', fontWeight: '700', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {m.name?.[0]}
                </div>
                <span style={{ position: 'absolute', bottom: 0, right: 0, width: '9px', height: '9px', borderRadius: '50%', background: '#10b981', border: '1.5px solid white' }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <span style={{ fontSize: '13px', fontWeight: '600', color: '#1a1a2e' }}>{m.name}</span>
                  {m.role === 'admin' && <span style={{ fontSize: '9px', background: '#ede9ff', color: '#6c63ff', padding: '1px 5px', borderRadius: '4px', fontWeight: '700' }}>ADMIN</span>}
                </div>
                <div style={{ fontSize: '11px', color: '#9ca3af', textTransform: 'capitalize', marginTop: '1px' }}>{m.role}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '15px', fontWeight: '800', color: '#1a1a2e' }}>{m.task_count || 0}</div>
                <div style={{ fontSize: '10px', color: '#9ca3af' }}>tasks</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
