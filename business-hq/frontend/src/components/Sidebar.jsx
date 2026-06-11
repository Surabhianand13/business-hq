import { NavLink, useNavigate } from 'react-router-dom';
import { useApp } from '../App';
import { useState, useEffect } from 'react';
import api from '../api';

function WorkspaceItem({ icon, label, wsName }) {
  const navigate = useNavigate();
  return (
    <button
      onClick={() => navigate(`/tasks?workspace=${encodeURIComponent(wsName)}`)}
      style={{
        display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 10px',
        borderRadius: '10px', textDecoration: 'none', marginBottom: '2px', fontWeight: '500',
        fontSize: '14px', background: 'transparent', border: 'none', cursor: 'pointer',
        color: '#4b5563', width: '100%', fontFamily: 'inherit', textAlign: 'left',
        transition: 'all 0.15s ease'
      }}
      onMouseEnter={e => e.currentTarget.style.background = '#f5f5f7'}
      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
    >
      <span style={{ fontSize: '16px' }}>{icon}</span>
      <span>{label}</span>
    </button>
  );
}

function SectionLabel({ children }) {
  return (
    <div style={{
      fontSize: '10px',
      color: '#c0c0d0',
      fontWeight: '700',
      letterSpacing: '1.2px',
      textTransform: 'uppercase',
      margin: '18px 0 8px 8px'
    }}>
      {children}
    </div>
  );
}

function NavItem({ to, icon, label, badge, badgeColor, end }) {
  return (
    <NavLink
      to={to}
      end={end}
      style={({ isActive }) => ({
        display: 'flex', alignItems: 'center', gap: '10px',
        padding: '9px 10px', borderRadius: '10px',
        textDecoration: 'none', marginBottom: '2px',
        fontWeight: '500', fontSize: '14px',
        transition: 'all 0.15s ease',
        background: isActive ? 'linear-gradient(135deg, #ede9ff, #e0eaff)' : 'transparent',
        color: isActive ? '#6c63ff' : '#4b5563'
      })}
    >
      <span style={{ fontSize: '16px', lineHeight: 1 }}>{icon}</span>
      <span style={{ flex: 1 }}>{label}</span>
      {badge !== undefined && (
        <span style={{
          background: badgeColor || '#6c63ff',
          color: 'white',
          borderRadius: '10px',
          padding: '1px 7px',
          fontSize: '11px',
          fontWeight: '700',
          minWidth: '20px',
          textAlign: 'center'
        }}>
          {badge}
        </span>
      )}
    </NavLink>
  );
}

function Avatar({ user, size = 32 }) {
  const initials = user?.name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '??';
  return (
    <div
      style={{
        width: size, height: size,
        background: user?.avatar_color || '#6c63ff',
        borderRadius: '50%',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: 'white', fontWeight: '600',
        fontSize: size * 0.35,
        flexShrink: 0
      }}
    >
      {initials}
    </div>
  );
}

export { Avatar };

export default function Sidebar() {
  const { user, logout } = useApp();
  const navigate = useNavigate();
  const [counts, setCounts] = useState({ tasks: 0, meetings: 0, updates: 0 });

  useEffect(() => {
    async function loadCounts() {
      try {
        const [tasks, meetings, updates] = await Promise.all([
          api.getTasks(),
          api.getMeetings(),
          api.getUpdates()
        ]);
        const activeTasks = tasks.filter(t => t.status !== 'done').length;
        const today = new Date().toDateString();
        const todayMeetings = meetings.filter(m => new Date(m.start_time).toDateString() === today).length;
        setCounts({ tasks: activeTasks, meetings: todayMeetings, updates: updates.length });
      } catch {}
    }
    if (user) loadCounts();
  }, [user]);

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <div style={{
      width: '230px', flexShrink: 0,
      background: '#ffffff',
      borderRight: '1px solid #e8e8ed',
      display: 'flex', flexDirection: 'column',
      padding: '20px 12px',
      height: '100vh',
      overflowY: 'auto'
    }}>
      {/* Logo */}
      <div style={{ padding: '0 8px 20px', borderBottom: '1px solid #f0f0f5', marginBottom: '4px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '36px', height: '36px',
            background: 'linear-gradient(135deg, #6c63ff, #3b82f6)',
            borderRadius: '10px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '18px'
          }}>
            🏢
          </div>
          <div>
            <div style={{ fontWeight: '700', fontSize: '15px', color: '#1a1a2e' }}>Business HQ</div>
            <div style={{ fontSize: '11px', color: '#9ca3af' }}>Workspace</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1 }}>
        {/* MAIN section */}
        <SectionLabel>MAIN</SectionLabel>
        <NavItem to="/" icon="🏠" label="Dashboard" end={true} />
        <NavItem to="/tasks" icon="✅" label="My Tasks" badge={counts.tasks || undefined} badgeColor="#6c63ff" />
        <NavItem to="/meetings" icon="📅" label="Meetings" badge={counts.meetings || undefined} badgeColor="#f97316" />
        <NavItem to="/updates" icon="📢" label="Updates" badge={counts.updates || undefined} badgeColor="#ef4444" />
        <NavItem to="/reports" icon="📊" label="Reports" />

        {/* WORKSPACES section */}
        <SectionLabel>WORKSPACES</SectionLabel>
        <WorkspaceItem icon="🥐" label="Krispies" wsName="Krispies" />
        <WorkspaceItem icon="🤖" label="Solvv AI" wsName="Solvv AI" />
        <WorkspaceItem icon="🎬" label="Content" wsName="Krispies Content" />
        <WorkspaceItem icon="📺" label="Surabhi's Channel" wsName="Surabhi's Channel" />

        {/* TEAM section */}
        <SectionLabel>TEAM</SectionLabel>
        <NavItem to="/team" icon="👥" label="Members" />
        <NavItem to="/settings" icon="⚙️" label="Settings" />
      </nav>

      {/* Styled user profile card */}
      <div style={{
        background: 'linear-gradient(135deg, #f5f3ff, #eff6ff)',
        border: '1px solid #e8e4ff',
        borderRadius: '12px',
        padding: '12px',
        marginTop: '8px',
        display: 'flex', alignItems: 'center', gap: '10px'
      }}>
        <Avatar user={user} size={34} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: '600', fontSize: '13px', color: '#1a1a2e', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {user?.name}
          </div>
          <div style={{ fontSize: '11px', color: '#9ca3af', textTransform: 'capitalize' }}>
            {user?.role}
          </div>
        </div>
        <button
          onClick={handleLogout}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: '#9ca3af', padding: '4px', borderRadius: '6px',
            transition: 'color 0.15s'
          }}
          title="Logout"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/>
            <polyline points="16 17 21 12 16 7"/>
            <line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
        </button>
      </div>
    </div>
  );
}
