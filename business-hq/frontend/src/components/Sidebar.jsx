import { NavLink, useNavigate } from 'react-router-dom';
import { useApp } from '../App';

const navItems = [
  {
    path: '/',
    label: 'Dashboard',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
        <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
      </svg>
    )
  },
  {
    path: '/tasks',
    label: 'Tasks',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>
      </svg>
    )
  },
  {
    path: '/meetings',
    label: 'Meetings',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
      </svg>
    )
  },
  {
    path: '/updates',
    label: 'Updates',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
      </svg>
    )
  },
  {
    path: '/team',
    label: 'Team',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/>
        <path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/>
      </svg>
    )
  }
];

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
      height: '100vh'
    }}>
      {/* Logo */}
      <div style={{ padding: '0 8px 20px', borderBottom: '1px solid #f0f0f5', marginBottom: '8px' }}>
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
        <div style={{ fontSize: '11px', fontWeight: '600', color: '#9ca3af', letterSpacing: '0.05em', padding: '8px 8px 4px', textTransform: 'uppercase' }}>
          Navigation
        </div>
        {navItems.map(item => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/'}
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
            {item.icon}
            {item.label}
          </NavLink>
        ))}
      </nav>

      {/* User profile */}
      <div style={{
        borderTop: '1px solid #f0f0f5', paddingTop: '12px',
        display: 'flex', alignItems: 'center', gap: '10px',
        padding: '12px 8px 0'
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
