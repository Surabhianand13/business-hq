import { useLocation } from 'react-router-dom';
import { useApp } from '../App';

const pageInfo = {
  '/': { title: 'Dashboard', subtitle: 'Good morning! Here\'s your business overview.' },
  '/tasks': { title: 'Tasks', subtitle: 'Manage your tasks across all workspaces.' },
  '/meetings': { title: 'Meetings', subtitle: 'Schedule and track team meetings.' },
  '/updates': { title: 'Team Updates', subtitle: 'Stay informed with team activity.' },
  '/team': { title: 'Team', subtitle: 'Manage your team members.' },
};

export default function TopBar() {
  const location = useLocation();
  const { user } = useApp();
  const info = pageInfo[location.pathname] || { title: 'Business HQ', subtitle: '' };

  const now = new Date();
  const dateStr = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  // Personalize greeting
  const hour = now.getHours();
  let greeting = 'Good morning';
  if (hour >= 12 && hour < 17) greeting = 'Good afternoon';
  else if (hour >= 17) greeting = 'Good evening';

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
      <div>
        <h1 style={{ fontSize: '20px', fontWeight: '700', color: '#1a1a2e', margin: 0 }}>
          {location.pathname === '/' ? `${greeting}, ${user?.name?.split(' ')[0]}! 👋` : info.title}
        </h1>
        <p style={{ fontSize: '13px', color: '#9ca3af', margin: '2px 0 0' }}>
          {location.pathname === '/' ? dateStr : info.subtitle}
        </p>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{
          background: '#f5f5f7', borderRadius: '10px', padding: '6px 14px',
          fontSize: '13px', color: '#6b7280', fontWeight: '500'
        }}>
          {dateStr}
        </div>

        {user?.role === 'admin' && (
          <div style={{
            background: 'linear-gradient(135deg, #ede9ff, #e0eaff)',
            borderRadius: '10px', padding: '5px 12px',
            fontSize: '12px', color: '#6c63ff', fontWeight: '600',
            display: 'flex', alignItems: 'center', gap: '4px'
          }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
            </svg>
            Admin
          </div>
        )}
      </div>
    </div>
  );
}
