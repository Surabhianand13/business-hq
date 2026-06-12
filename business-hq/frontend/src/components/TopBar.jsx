import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useApp } from '../App';
import api from '../api';

const pageInfo = {
  '/': { title: 'Dashboard', subtitle: 'Good morning! Here\'s your business overview.' },
  '/tasks': { title: 'Tasks', subtitle: 'Manage your tasks across all workspaces.' },
  '/meetings': { title: 'Meetings', subtitle: 'Schedule and track team meetings.' },
  '/updates': { title: 'Team Updates', subtitle: 'Stay informed with team activity.' },
  '/team': { title: 'Team', subtitle: 'Manage your team members.' },
  '/settings': { title: 'Settings', subtitle: 'Manage your account and preferences.' },
  '/reports': { title: 'Reports', subtitle: 'Analytics and insights for your business.' },
  '/pipeline': { title: 'Sales Pipeline', subtitle: 'Track deals through your sales funnel.' },
  '/krispies-sales': { title: 'Krispies Sales', subtitle: 'Daily sales across all stores.' },
  '/krispies-compliance': { title: 'Store Compliance', subtitle: 'Daily compliance checks for every store.' },
};

const teamAvatars = [
  { initial: 'S', gradient: 'linear-gradient(135deg, #6c63ff, #3b82f6)' },
  { initial: 'R', gradient: 'linear-gradient(135deg, #f59e0b, #ef4444)' },
  { initial: 'A', gradient: 'linear-gradient(135deg, #10b981, #06b6d4)' },
  { initial: 'P', gradient: 'linear-gradient(135deg, #db2777, #9333ea)' },
];

const STATUS_COLORS = {
  todo: { bg: '#f3f4f6', color: '#6b7280' },
  inprogress: { bg: '#eff6ff', color: '#3b82f6' },
  done: { bg: '#f0fdf4', color: '#16a34a' },
};

function SearchModal({ onClose, navigate }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [allTasks, setAllTasks] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();

    async function loadTasks() {
      try {
        const tasks = await api.getTasks();
        setAllTasks(tasks);
        setLoaded(true);
      } catch {
        setLoaded(true);
      }
    }
    loadTasks();

    function handleKey(e) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    const q = query.toLowerCase();
    const filtered = allTasks.filter(t =>
      t.title.toLowerCase().includes(q) ||
      (t.description || '').toLowerCase().includes(q) ||
      (t.workspace_name || '').toLowerCase().includes(q) ||
      (t.assignee_name || '').toLowerCase().includes(q)
    ).slice(0, 10);
    setResults(filtered);
  }, [query, allTasks]);

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 3000,
        background: 'rgba(0,0,0,0.4)',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
        paddingTop: '80px'
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'white', borderRadius: '16px',
          width: '560px', maxWidth: '90vw',
          boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
          overflow: 'hidden'
        }}
      >
        {/* Search input */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '16px 20px', borderBottom: '1px solid #f0f0f5' }}>
          <span style={{ fontSize: '18px', color: '#9ca3af' }}>🔍</span>
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search tasks..."
            style={{
              flex: 1, border: 'none', outline: 'none', fontSize: '16px',
              color: '#1a1a2e', background: 'transparent', fontFamily: 'inherit'
            }}
          />
          <button
            onClick={onClose}
            style={{
              background: '#f5f5f7', border: 'none', borderRadius: '6px',
              padding: '4px 8px', cursor: 'pointer', fontSize: '12px', color: '#9ca3af', fontFamily: 'inherit'
            }}
          >
            Esc
          </button>
        </div>

        {/* Results */}
        <div style={{ maxHeight: '380px', overflowY: 'auto' }}>
          {!loaded && (
            <div style={{ padding: '24px', textAlign: 'center', color: '#9ca3af', fontSize: '14px' }}>Loading...</div>
          )}
          {loaded && query && results.length === 0 && (
            <div style={{ padding: '24px', textAlign: 'center', color: '#9ca3af', fontSize: '14px' }}>No tasks found for "{query}"</div>
          )}
          {loaded && !query && (
            <div style={{ padding: '24px', textAlign: 'center', color: '#9ca3af', fontSize: '14px' }}>
              Type to search across {allTasks.length} tasks...
            </div>
          )}
          {results.map(task => {
            const sc = STATUS_COLORS[task.status] || STATUS_COLORS.todo;
            return (
              <button
                key={task.id}
                onClick={() => { navigate('/tasks'); onClose(); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: '12px',
                  width: '100%', padding: '12px 20px', border: 'none', background: 'white',
                  cursor: 'pointer', textAlign: 'left', borderBottom: '1px solid #f9f9fb',
                  fontFamily: 'inherit', transition: 'background 0.1s'
                }}
                onMouseEnter={e => e.currentTarget.style.background = '#f9f9fb'}
                onMouseLeave={e => e.currentTarget.style.background = 'white'}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '14px', fontWeight: '500', color: '#1a1a2e', marginBottom: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {task.title}
                  </div>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {task.workspace_name && (
                      <span style={{
                        padding: '1px 7px', borderRadius: '5px', fontSize: '11px', fontWeight: '600',
                        background: `${task.workspace_color || '#6c63ff'}18`, color: task.workspace_color || '#6c63ff'
                      }}>
                        {task.workspace_emoji} {task.workspace_name}
                      </span>
                    )}
                    {task.assignee_name && (
                      <span style={{ fontSize: '11px', color: '#9ca3af' }}>{task.assignee_name}</span>
                    )}
                  </div>
                </div>
                <span style={{
                  padding: '2px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: '600',
                  background: sc.bg, color: sc.color, flexShrink: 0
                }}>
                  {task.status === 'inprogress' ? 'In Progress' : task.status === 'done' ? 'Done' : 'Todo'}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function TopBar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, setSidebarOpen } = useApp();
  const [searchOpen, setSearchOpen] = useState(false);

  const info = pageInfo[location.pathname] || { title: 'Business HQ', subtitle: '' };

  const now = new Date();
  const dateStr = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  const hour = now.getHours();
  let greeting = 'Good Morning';
  let greetingEmoji = '☀️';
  if (hour >= 12 && hour < 17) { greeting = 'Good Afternoon'; greetingEmoji = '🌤️'; }
  else if (hour >= 17) { greeting = 'Good Evening'; greetingEmoji = '🌙'; }

  const firstName = user?.name?.split(' ')[0] || 'there';

  const isDashboard = location.pathname === '/';

  return (
    <>
      <div
        className="topbar-wrapper"
        style={{
          background: '#ffffff',
          borderBottom: '1px solid #e8e8ed',
          padding: '16px 24px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          flexShrink: 0
        }}
      >
        {/* Hamburger button — visible only on mobile via .show-mobile */}
        <button
          className="show-mobile"
          onClick={() => setSidebarOpen(true)}
          style={{
            display: 'none', // overridden by .show-mobile on mobile
            background: 'none', border: 'none', cursor: 'pointer',
            padding: '6px', borderRadius: '8px',
            flexDirection: 'column', gap: '4px', alignItems: 'center',
            flexShrink: 0
          }}
          aria-label="Open menu"
        >
          <span style={{ display: 'block', width: '20px', height: '2px', background: '#374151', borderRadius: '2px' }} />
          <span style={{ display: 'block', width: '20px', height: '2px', background: '#374151', borderRadius: '2px' }} />
          <span style={{ display: 'block', width: '20px', height: '2px', background: '#374151', borderRadius: '2px' }} />
        </button>

        {/* Left: greeting + subtitle */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 style={{ fontSize: '20px', fontWeight: '700', color: '#1a1a2e', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {isDashboard
              ? `${greeting}, ${firstName} ${greetingEmoji}`
              : info.title}
          </h1>
          <p style={{ fontSize: '13px', color: '#9ca3af', margin: '2px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {isDashboard
              ? `${dateStr} · You have 3 critical tasks and 2 meetings today`
              : info.subtitle}
          </p>
        </div>

        {/* Right: avatars + notification + search + new task */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
          {/* Team avatar stack — hidden on mobile */}
          <div className="hide-mobile" style={{ display: 'flex', alignItems: 'center' }}>
            {teamAvatars.map((av, i) => (
              <div
                key={i}
                title={`Team member ${av.initial}`}
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: av.gradient,
                  color: 'white',
                  fontWeight: '700',
                  fontSize: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '2px solid white',
                  marginLeft: i === 0 ? '0' : '-8px',
                  zIndex: teamAvatars.length - i,
                  position: 'relative',
                  flexShrink: 0
                }}
              >
                {av.initial}
              </div>
            ))}
          </div>

          {/* Notification bell */}
          <button
            style={{
              position: 'relative',
              background: 'white',
              border: '1px solid #e8e8ed',
              borderRadius: '10px',
              width: '38px',
              height: '38px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              fontSize: '16px',
              flexShrink: 0
            }}
            title="Notifications"
          >
            🔔
            <span style={{
              position: 'absolute',
              top: '6px',
              right: '6px',
              width: '8px',
              height: '8px',
              background: '#ef4444',
              borderRadius: '50%',
              border: '1.5px solid white'
            }} />
          </button>

          {/* Search button — hidden on mobile */}
          <button
            className="hide-mobile"
            onClick={() => setSearchOpen(true)}
            style={{
              background: 'white',
              border: '1px solid #e8e8ed',
              borderRadius: '10px',
              padding: '8px 14px',
              fontSize: '13px',
              color: '#6b7280',
              fontWeight: '500',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              whiteSpace: 'nowrap',
              fontFamily: 'inherit'
            }}
          >
            🔍 Search
          </button>

          {/* New Task button */}
          <button
            onClick={() => navigate('/tasks?new=1')}
            style={{
              background: 'linear-gradient(135deg, #6c63ff, #3b82f6)',
              color: 'white',
              border: 'none',
              borderRadius: '10px',
              padding: '8px 16px',
              fontSize: '13px',
              fontWeight: '600',
              cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(108,99,255,0.3)',
              whiteSpace: 'nowrap',
              fontFamily: 'inherit'
            }}
          >
            + New Task
          </button>
        </div>
      </div>

      {searchOpen && <SearchModal onClose={() => setSearchOpen(false)} navigate={navigate} />}
    </>
  );
}
