import { useState } from 'react';
import { useApp } from '../App';
import api from '../api';

export default function LoginPage() {
  const { login } = useApp();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const teamMembers = [
    { name: 'Surabhi', email: 'surabhi@businesshq.com', role: 'Admin', color: '#6c63ff' },
    { name: 'Shilpa', email: 'shilpa@businesshq.com', role: 'Krispies', color: '#f97316' },
    { name: 'Tejas', email: 'tejas@businesshq.com', role: 'Content', color: '#10b981' },
    { name: 'Ritesh', email: 'ritesh@businesshq.com', role: 'Solvv AI', color: '#3b82f6' },
    { name: 'Sneha', email: 'sneha@businesshq.com', role: 'Solvv AI', color: '#ec4899' },
  ];

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await api.login(email, password);
      login(data.user, data.token);
    } catch (err) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #f5f5f7 0%, #e8e0ff 50%, #dce8ff 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '20px'
    }}>
      <div style={{ width: '100%', maxWidth: '420px' }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{
            width: '60px', height: '60px',
            background: 'linear-gradient(135deg, #6c63ff, #3b82f6)',
            borderRadius: '16px', margin: '0 auto 16px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '28px', boxShadow: '0 8px 24px rgba(108,99,255,0.3)'
          }}>
            🏢
          </div>
          <h1 style={{ fontSize: '28px', fontWeight: '800', color: '#1a1a2e', margin: '0 0 6px' }}>
            Business HQ
          </h1>
          <p style={{ color: '#6b7280', fontSize: '15px', margin: 0 }}>
            Sign in to your workspace
          </p>
        </div>

        {/* Card */}
        <div style={{
          background: 'white', borderRadius: '20px', padding: '32px',
          boxShadow: '0 8px 40px rgba(0,0,0,0.08)',
          border: '1px solid rgba(255,255,255,0.8)'
        }}>
          <form onSubmit={handleSubmit}>
            {error && (
              <div style={{
                background: '#fef2f2', border: '1px solid #fca5a5',
                borderRadius: '10px', padding: '10px 14px',
                color: '#dc2626', fontSize: '13px', marginBottom: '16px',
                display: 'flex', alignItems: 'center', gap: '8px'
              }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="12" y1="8" x2="12" y2="12"/>
                  <line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                {error}
              </div>
            )}

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@businesshq.com"
                required
                className="input-field"
                style={{ fontSize: '14px' }}
              />
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••••••"
                required
                className="input-field"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary"
              style={{
                width: '100%', padding: '12px',
                borderRadius: '12px', fontSize: '15px', fontWeight: '600',
                opacity: loading ? 0.7 : 1,
                cursor: loading ? 'not-allowed' : 'pointer'
              }}
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <div style={{ marginTop: '24px', paddingTop: '24px', borderTop: '1px solid #f0f0f5' }}>
            <p style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '12px', textAlign: 'center' }}>
              Quick sign-in (password: businesshq123)
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center' }}>
              {teamMembers.map(member => (
                <button
                  key={member.email}
                  onClick={() => { setEmail(member.email); setPassword('businesshq123'); }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '6px',
                    padding: '6px 10px', borderRadius: '8px',
                    border: `1.5px solid ${email === member.email ? member.color : '#e8e8ed'}`,
                    background: email === member.email ? `${member.color}15` : 'white',
                    cursor: 'pointer', fontSize: '12px', fontWeight: '500',
                    color: '#374151', transition: 'all 0.15s'
                  }}
                >
                  <div style={{
                    width: '20px', height: '20px', borderRadius: '50%',
                    background: member.color, color: 'white',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '10px', fontWeight: '700'
                  }}>
                    {member.name[0]}
                  </div>
                  {member.name}
                  <span style={{ color: '#9ca3af' }}>·</span>
                  <span style={{ color: '#9ca3af' }}>{member.role}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
