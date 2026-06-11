import { useState } from 'react';
import { useApp } from '../App';

function Card({ title, children }) {
  return (
    <div style={{
      background: 'white', borderRadius: '16px',
      border: '1px solid #f0f0f5',
      boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
      padding: '24px', marginBottom: '20px'
    }}>
      <h2 style={{ margin: '0 0 20px', fontSize: '16px', fontWeight: '700', color: '#1a1a2e' }}>{title}</h2>
      {children}
    </div>
  );
}

function Toggle({ checked, onChange, label }) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', padding: '10px 0', borderBottom: '1px solid #f5f5f7' }}>
      <span style={{ fontSize: '14px', color: '#374151', fontWeight: '500' }}>{label}</span>
      <div
        onClick={onChange}
        style={{
          width: '44px', height: '24px', borderRadius: '12px',
          background: checked ? '#6c63ff' : '#e8e8ed',
          position: 'relative', transition: 'background 0.2s', flexShrink: 0
        }}
      >
        <div style={{
          position: 'absolute', top: '3px',
          left: checked ? '23px' : '3px',
          width: '18px', height: '18px', borderRadius: '50%',
          background: 'white', boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
          transition: 'left 0.2s'
        }} />
      </div>
    </label>
  );
}

export default function SettingsPage() {
  const { user, addToast } = useApp();

  const [passwordForm, setPasswordForm] = useState({ current: '', newPass: '', confirm: '' });
  const [savingPass, setSavingPass] = useState(false);

  const [notifications, setNotifications] = useState({
    emailNotifications: true,
    taskReminders: true,
    meetingAlerts: true,
  });

  function handlePasswordSave(e) {
    e.preventDefault();
    if (passwordForm.newPass !== passwordForm.confirm) {
      addToast('New passwords do not match', 'error');
      return;
    }
    if (passwordForm.newPass.length < 6) {
      addToast('Password must be at least 6 characters', 'error');
      return;
    }
    setSavingPass(true);
    // Simulate save
    setTimeout(() => {
      setSavingPass(false);
      setPasswordForm({ current: '', newPass: '', confirm: '' });
      addToast('Password updated!');
    }, 800);
  }

  const roleColors = {
    admin: { bg: '#ede9ff', color: '#6c63ff' },
    member: { bg: '#eff6ff', color: '#3b82f6' },
  };
  const roleBadge = roleColors[user?.role] || roleColors.member;

  return (
    <div className="fade-in" style={{ maxWidth: '640px' }}>

      {/* Profile */}
      <Card title="Profile">
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px' }}>
          <div style={{
            width: '56px', height: '56px', borderRadius: '50%',
            background: user?.avatar_color || '#6c63ff',
            color: 'white', fontSize: '20px', fontWeight: '700',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
          }}>
            {user?.name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '??'}
          </div>
          <div>
            <div style={{ fontSize: '18px', fontWeight: '700', color: '#1a1a2e' }}>{user?.name}</div>
            <span style={{
              display: 'inline-block', marginTop: '4px',
              padding: '2px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: '600',
              background: roleBadge.bg, color: roleBadge.color, textTransform: 'capitalize'
            }}>
              {user?.role}
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>Full Name</label>
            <input
              className="input-field"
              defaultValue={user?.name || ''}
              readOnly
              style={{ background: '#fafafa', cursor: 'default' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>Email</label>
            <input
              className="input-field"
              defaultValue={user?.email || ''}
              readOnly
              style={{ background: '#fafafa', cursor: 'default' }}
            />
            <p style={{ fontSize: '12px', color: '#9ca3af', margin: '4px 0 0' }}>Email cannot be changed.</p>
          </div>
        </div>
      </Card>

      {/* Change Password */}
      <Card title="Change Password">
        <form onSubmit={handlePasswordSave} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>Current Password</label>
            <input
              type="password"
              className="input-field"
              value={passwordForm.current}
              onChange={e => setPasswordForm(f => ({ ...f, current: e.target.value }))}
              placeholder="Enter current password"
              required
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>New Password</label>
            <input
              type="password"
              className="input-field"
              value={passwordForm.newPass}
              onChange={e => setPasswordForm(f => ({ ...f, newPass: e.target.value }))}
              placeholder="Enter new password"
              required
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>Confirm New Password</label>
            <input
              type="password"
              className="input-field"
              value={passwordForm.confirm}
              onChange={e => setPasswordForm(f => ({ ...f, confirm: e.target.value }))}
              placeholder="Confirm new password"
              required
            />
          </div>
          <div style={{ paddingTop: '4px' }}>
            <button
              type="submit"
              disabled={savingPass}
              className="btn-primary"
              style={{ padding: '10px 24px', borderRadius: '10px', fontSize: '14px', fontWeight: '600', opacity: savingPass ? 0.7 : 1 }}
            >
              {savingPass ? 'Saving...' : 'Save Password'}
            </button>
          </div>
        </form>
      </Card>

      {/* Notifications */}
      <Card title="Notifications">
        <Toggle
          label="Email notifications"
          checked={notifications.emailNotifications}
          onChange={() => setNotifications(n => ({ ...n, emailNotifications: !n.emailNotifications }))}
        />
        <Toggle
          label="Task reminders"
          checked={notifications.taskReminders}
          onChange={() => setNotifications(n => ({ ...n, taskReminders: !n.taskReminders }))}
        />
        <div style={{ borderBottom: 'none' }}>
          <Toggle
            label="Meeting alerts"
            checked={notifications.meetingAlerts}
            onChange={() => setNotifications(n => ({ ...n, meetingAlerts: !n.meetingAlerts }))}
          />
        </div>
      </Card>

      {/* Appearance */}
      <Card title="Appearance">
        <div style={{ display: 'flex', gap: '10px' }}>
          <div style={{
            flex: 1, padding: '14px 18px', borderRadius: '12px',
            border: '2px solid #6c63ff',
            background: 'linear-gradient(135deg, #f5f3ff, #eff6ff)',
            display: 'flex', alignItems: 'center', gap: '10px',
            cursor: 'default'
          }}>
            <span style={{ fontSize: '20px' }}>☀️</span>
            <div>
              <div style={{ fontSize: '14px', fontWeight: '600', color: '#1a1a2e' }}>Light Mode</div>
              <div style={{ fontSize: '12px', color: '#9ca3af' }}>Currently active</div>
            </div>
            <div style={{ marginLeft: 'auto', width: '18px', height: '18px', borderRadius: '50%', background: '#6c63ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
            </div>
          </div>
          <div style={{
            flex: 1, padding: '14px 18px', borderRadius: '12px',
            border: '2px solid #e8e8ed',
            background: '#fafafa',
            display: 'flex', alignItems: 'center', gap: '10px',
            cursor: 'not-allowed', opacity: 0.6
          }}>
            <span style={{ fontSize: '20px' }}>🌙</span>
            <div>
              <div style={{ fontSize: '14px', fontWeight: '600', color: '#1a1a2e' }}>Dark Mode</div>
              <div style={{ fontSize: '12px', color: '#9ca3af' }}>Coming soon</div>
            </div>
          </div>
        </div>
      </Card>

    </div>
  );
}
