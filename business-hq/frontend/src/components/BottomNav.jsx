import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useApp } from '../App';

const tabs = [
  { path: '/',         label: 'Home',     icon: '🏠', exact: true },
  { path: '/tasks',    label: 'Tasks',    icon: '✅' },
  { path: '/meetings', label: 'Meetings', icon: '📅' },
  { path: '/pipeline', label: 'Pipeline', icon: '💰' },
];

// Full navigation for the "More" sheet
const moreSections = [
  {
    title: 'MAIN',
    items: [
      { path: '/', label: 'Dashboard', icon: '🏠', exact: true },
      { path: '/tasks', label: 'My Tasks', icon: '✅' },
      { path: '/meetings', label: 'Meetings', icon: '📅' },
      { path: '/updates', label: 'Updates', icon: '📢' },
      { path: '/reports', label: 'Reports', icon: '📊' },
    ],
  },
  {
    title: 'KRISPIES',
    items: [
      { path: '/tasks?workspace=Krispies', label: 'Krispies Tasks', icon: '🥐' },
      { path: '/krispies-sales', label: 'Krispies Sales', icon: '📊' },
      { path: '/krispies-compliance', label: 'Store Compliance', icon: '✅' },
      { path: '/krispies-renewals', label: 'Licences & Renewals', icon: '📋' },
    ],
  },
  {
    title: 'SOLVV AI & CONTENT',
    items: [
      { path: '/tasks?workspace=Solvv AI', label: 'Solvv AI', icon: '🤖' },
      { path: '/pipeline', label: 'Sales Pipeline', icon: '💰' },
      { path: '/tasks?workspace=Krispies Content', label: 'Content', icon: '🎬' },
      { path: "/tasks?workspace=Surabhi's Channel", label: "Surabhi's Channel", icon: '📺' },
    ],
  },
  {
    title: 'TEAM',
    items: [
      { path: '/team', label: 'Members', icon: '👥' },
      { path: '/settings', label: 'Settings', icon: '⚙️' },
    ],
  },
];

function MoreSheet({ onClose }) {
  const navigate = useNavigate();
  const { user, logout } = useApp();

  function go(path) {
    navigate(path);
    onClose();
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'flex-end',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: '#fff', width: '100%',
          borderRadius: '20px 20px 0 0',
          maxHeight: '85vh', overflowY: 'auto',
          padding: '8px 16px calc(20px + env(safe-area-inset-bottom))',
          boxShadow: '0 -8px 30px rgba(0,0,0,0.15)',
        }}
      >
        {/* Grabber */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '8px 0 4px' }}>
          <div style={{ width: '40px', height: '4px', borderRadius: '2px', background: '#e0e0ef' }} />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 4px 12px' }}>
          <div style={{ fontSize: '17px', fontWeight: '800', color: '#1a1a2e' }}>All Sections</div>
          <button onClick={onClose} style={{ background: '#f5f5f7', border: 'none', width: '32px', height: '32px', borderRadius: '10px', fontSize: '16px', color: '#6b7280', cursor: 'pointer' }}>×</button>
        </div>

        {moreSections.map(section => (
          <div key={section.title} style={{ marginBottom: '14px' }}>
            <div style={{ fontSize: '10px', fontWeight: '700', color: '#c0c0d0', letterSpacing: '1px', margin: '4px 4px 8px' }}>{section.title}</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              {section.items.map(item => (
                <button
                  key={item.path + item.label}
                  onClick={() => go(item.path)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '10px',
                    background: '#f9f9fb', border: '1px solid #f0f0f5', borderRadius: '12px',
                    padding: '12px 12px', cursor: 'pointer', fontFamily: 'inherit',
                    fontSize: '13px', fontWeight: '600', color: '#1a1a2e', textAlign: 'left',
                  }}
                >
                  <span style={{ fontSize: '18px' }}>{item.icon}</span>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.label}</span>
                </button>
              ))}
            </div>
          </div>
        ))}

        {/* User + logout */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px', borderRadius: '12px', background: 'linear-gradient(135deg, #f5f3ff, #eff6ff)', border: '1px solid #e8e4ff', marginTop: '4px' }}>
          <div style={{ width: '34px', height: '34px', borderRadius: '50%', background: user?.avatar_color || '#6c63ff', color: 'white', fontWeight: '700', fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {user?.name?.[0] || 'U'}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '13px', fontWeight: '700', color: '#1a1a2e' }}>{user?.name}</div>
            <div style={{ fontSize: '11px', color: '#9ca3af', textTransform: 'capitalize' }}>{user?.role}</div>
          </div>
          <button onClick={() => { logout(); onClose(); }} style={{ background: 'white', border: '1px solid #e8e8ed', borderRadius: '10px', padding: '8px 14px', fontSize: '12px', fontWeight: '700', color: '#ef4444', cursor: 'pointer', fontFamily: 'inherit' }}>
            Log out
          </button>
        </div>
      </div>
    </div>
  );
}

export default function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const [moreOpen, setMoreOpen] = useState(false);

  // "More" is active when not on one of the 4 primary tabs
  const onPrimary = tabs.some(t => t.exact ? location.pathname === t.path : location.pathname.startsWith(t.path));

  const cell = (active, onClick, icon, label) => (
    <button onClick={onClick} style={{
      flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px',
      background: 'none', border: 'none', cursor: 'pointer', padding: '2px 0', fontFamily: 'inherit',
    }}>
      <div style={{
        width: '46px', height: '32px', borderRadius: '16px',
        background: active ? 'linear-gradient(135deg, #ede9ff, #e0eaff)' : 'transparent',
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px',
      }}>{icon}</div>
      <span style={{ fontSize: '10px', fontWeight: active ? '700' : '500', color: active ? '#6c63ff' : '#9ca3af' }}>{label}</span>
    </button>
  );

  return (
    <>
      {moreOpen && <MoreSheet onClose={() => setMoreOpen(false)} />}
      <nav style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        background: 'white', borderTop: '1px solid #e8e8ed',
        display: 'flex', alignItems: 'center',
        padding: '8px 0 calc(10px + env(safe-area-inset-bottom))',
        zIndex: 100, boxShadow: '0 -4px 20px rgba(0,0,0,0.08)'
      }}>
        {tabs.map(tab => {
          const isActive = tab.exact ? location.pathname === tab.path : location.pathname.startsWith(tab.path);
          return cell(isActive, () => navigate(tab.path), tab.icon, tab.label);
        })}
        {cell(moreOpen || !onPrimary, () => setMoreOpen(true), '☰', 'More')}
      </nav>
    </>
  );
}
