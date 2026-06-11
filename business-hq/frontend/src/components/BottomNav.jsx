import { useLocation, NavLink } from 'react-router-dom';

const tabs = [
  { path: '/',         label: 'Home',     icon: '🏠', exact: true },
  { path: '/tasks',    label: 'Tasks',    icon: '✅' },
  { path: '/meetings', label: 'Meetings', icon: '📅' },
  { path: '/pipeline', label: 'Pipeline', icon: '💰' },
  { path: '/updates',  label: 'Updates',  icon: '📢' },
];

export default function BottomNav() {
  const location = useLocation();
  return (
    <nav style={{
      position: 'fixed', bottom: 0, left: 0, right: 0,
      background: 'white', borderTop: '1px solid #e8e8ed',
      display: 'flex', alignItems: 'center',
      padding: '8px 0 calc(10px + env(safe-area-inset-bottom))',
      zIndex: 100, boxShadow: '0 -4px 20px rgba(0,0,0,0.08)'
    }}>
      {tabs.map(tab => {
        const isActive = tab.exact
          ? location.pathname === tab.path
          : location.pathname.startsWith(tab.path);
        return (
          <NavLink key={tab.path} to={tab.path} style={{
            flex: 1, display: 'flex', flexDirection: 'column',
            alignItems: 'center', gap: '3px', textDecoration: 'none',
            padding: '2px 0',
          }}>
            <div style={{
              width: '46px', height: '32px', borderRadius: '16px',
              background: isActive ? 'linear-gradient(135deg, #ede9ff, #e0eaff)' : 'transparent',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '20px', transition: 'all 0.15s ease'
            }}>
              {tab.icon}
            </div>
            <span style={{
              fontSize: '10px', fontWeight: isActive ? '700' : '500',
              color: isActive ? '#6c63ff' : '#9ca3af',
            }}>
              {tab.label}
            </span>
          </NavLink>
        );
      })}
    </nav>
  );
}
