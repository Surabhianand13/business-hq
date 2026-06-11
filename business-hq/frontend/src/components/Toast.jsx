export default function Toast({ message, type = 'success' }) {
  const colors = {
    success: { bg: '#f0fdf4', border: '#86efac', icon: '#16a34a', text: '#15803d' },
    error: { bg: '#fef2f2', border: '#fca5a5', icon: '#dc2626', text: '#b91c1c' },
    info: { bg: '#eff6ff', border: '#93c5fd', icon: '#3b82f6', text: '#1d4ed8' },
  };
  const c = colors[type] || colors.success;

  return (
    <div
      className="toast-enter"
      style={{
        background: c.bg, border: `1px solid ${c.border}`,
        borderRadius: '12px', padding: '12px 16px',
        display: 'flex', alignItems: 'center', gap: '10px',
        minWidth: '260px', maxWidth: '380px',
        boxShadow: '0 4px 15px rgba(0,0,0,0.08)'
      }}
    >
      {type === 'success' && (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={c.icon} strokeWidth="2.5">
          <polyline points="20 6 9 17 4 12"/>
        </svg>
      )}
      {type === 'error' && (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={c.icon} strokeWidth="2.5">
          <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
      )}
      {type === 'info' && (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={c.icon} strokeWidth="2.5">
          <circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>
        </svg>
      )}
      <span style={{ fontSize: '13px', fontWeight: '500', color: c.text }}>{message}</span>
    </div>
  );
}
