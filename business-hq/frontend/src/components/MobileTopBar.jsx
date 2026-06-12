import { useLocation, useNavigate } from 'react-router-dom';
import { useApp } from '../App';

const pageLabels = {
  '/': null, // dashboard uses custom greeting
  '/tasks': 'My Tasks',
  '/meetings': 'Meetings',
  '/updates': 'Team Updates',
  '/team': 'Team',
  '/settings': 'Settings',
  '/reports': 'Reports',
  '/pipeline': 'Sales Pipeline',
  '/krispies-sales': 'Krispies Sales',
  '/krispies-compliance': 'Store Compliance',
};

export default function MobileTopBar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useApp();
  const isDashboard = location.pathname === '/';
  const title = pageLabels[location.pathname];
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening';

  return (
    <div style={{
      background: 'white', borderBottom: '1px solid #f0f0f5',
      padding: '14px 16px 12px',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      position: 'sticky', top: 0, zIndex: 50,
      boxShadow: '0 1px 8px rgba(0,0,0,0.04)'
    }}>
      <div>
        {isDashboard ? (
          <>
            <div style={{ fontSize: '12px', color: '#9ca3af', fontWeight: '500' }}>{greeting} 👋</div>
            <div style={{ fontSize: '20px', fontWeight: '800', color: '#1a1a2e', letterSpacing: '-0.5px' }}>
              {user?.name?.split(' ')[0]}
            </div>
          </>
        ) : (
          <div style={{ fontSize: '20px', fontWeight: '800', color: '#1a1a2e', letterSpacing: '-0.5px' }}>
            {title || 'Business HQ'}
          </div>
        )}
      </div>
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        <button style={{
          width: '40px', height: '40px', borderRadius: '12px',
          background: '#f5f5f7', border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '18px', position: 'relative'
        }}>
          🔔
          <span style={{
            position: 'absolute', top: '8px', right: '8px',
            width: '7px', height: '7px', borderRadius: '50%',
            background: '#ef4444', border: '1.5px solid white'
          }} />
        </button>
        <div onClick={() => navigate('/settings')} style={{
          width: '40px', height: '40px', borderRadius: '12px',
          background: 'linear-gradient(135deg, #6c63ff, #3b82f6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'white', fontWeight: '800', fontSize: '15px', cursor: 'pointer'
        }}>
          {user?.name?.[0] || 'S'}
        </div>
      </div>
    </div>
  );
}
