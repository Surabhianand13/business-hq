import { useLocation } from 'react-router-dom';
import { useApp } from '../App';

const pageInfo = {
  '/': { title: 'Dashboard', subtitle: 'Good morning! Here\'s your business overview.' },
  '/tasks': { title: 'Tasks', subtitle: 'Manage your tasks across all workspaces.' },
  '/meetings': { title: 'Meetings', subtitle: 'Schedule and track team meetings.' },
  '/updates': { title: 'Team Updates', subtitle: 'Stay informed with team activity.' },
  '/team': { title: 'Team', subtitle: 'Manage your team members.' },
};

const teamAvatars = [
  { initial: 'S', gradient: 'linear-gradient(135deg, #6c63ff, #3b82f6)' },
  { initial: 'R', gradient: 'linear-gradient(135deg, #f59e0b, #ef4444)' },
  { initial: 'A', gradient: 'linear-gradient(135deg, #10b981, #06b6d4)' },
  { initial: 'P', gradient: 'linear-gradient(135deg, #db2777, #9333ea)' },
];

export default function TopBar() {
  const location = useLocation();
  const { user } = useApp();
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
    <div style={{
      background: '#ffffff',
      borderBottom: '1px solid #e8e8ed',
      padding: '16px 24px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      flexShrink: 0
    }}>
      {/* Left: greeting + subtitle */}
      <div>
        <h1 style={{ fontSize: '20px', fontWeight: '700', color: '#1a1a2e', margin: 0 }}>
          {isDashboard
            ? `${greeting}, ${firstName} ${greetingEmoji}`
            : info.title}
        </h1>
        <p style={{ fontSize: '13px', color: '#9ca3af', margin: '2px 0 0' }}>
          {isDashboard
            ? `${dateStr} · You have 3 critical tasks and 2 meetings today`
            : info.subtitle}
        </p>
      </div>

      {/* Right: avatars + notification + search + new task */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        {/* Team avatar stack */}
        <div style={{ display: 'flex', alignItems: 'center' }}>
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

        {/* Search button */}
        <button
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
            whiteSpace: 'nowrap'
          }}
        >
          🔍 Search
        </button>

        {/* New Task button */}
        <button
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
            whiteSpace: 'nowrap'
          }}
        >
          + New Task
        </button>
      </div>
    </div>
  );
}
