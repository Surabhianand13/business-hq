import { useState, useEffect } from 'react';
import { useApp } from '../App';
import api from '../api';

function MemberCard({ member, isCurrentUser }) {
  const initials = member.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  return (
    <div style={{
      background: 'white', borderRadius: '16px',
      border: `1px solid ${isCurrentUser ? '#ede9ff' : '#f0f0f5'}`,
      boxShadow: isCurrentUser ? '0 2px 16px rgba(108,99,255,0.08)' : '0 2px 8px rgba(0,0,0,0.04)',
      padding: '20px',
      position: 'relative', overflow: 'hidden'
    }}>
      {/* Background gradient decoration */}
      <div style={{
        position: 'absolute', top: 0, right: 0, width: '80px', height: '80px',
        background: `${member.avatar_color || '#6c63ff'}10`,
        borderRadius: '0 0 0 80px'
      }} />

      {isCurrentUser && (
        <div style={{
          position: 'absolute', top: '12px', right: '12px',
          background: 'linear-gradient(135deg, #ede9ff, #e0eaff)',
          color: '#6c63ff', fontSize: '10px', fontWeight: '700',
          padding: '3px 8px', borderRadius: '6px'
        }}>
          You
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '16px' }}>
        <div style={{
          width: '52px', height: '52px', borderRadius: '50%',
          background: member.avatar_color || '#6c63ff',
          color: 'white', fontSize: '18px', fontWeight: '800',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
          boxShadow: `0 4px 12px ${member.avatar_color || '#6c63ff'}40`
        }}>
          {initials}
        </div>
        <div>
          <div style={{ fontSize: '16px', fontWeight: '700', color: '#1a1a2e' }}>{member.name}</div>
          <div style={{ fontSize: '12px', color: '#9ca3af' }}>{member.email}</div>
          <span style={{
            display: 'inline-block', marginTop: '4px',
            padding: '2px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: '600',
            background: member.role === 'admin' ? 'linear-gradient(135deg, #ede9ff, #e0eaff)' : '#f5f5f7',
            color: member.role === 'admin' ? '#6c63ff' : '#6b7280',
            textTransform: 'capitalize'
          }}>
            {member.role === 'admin' ? '⭐ Admin' : '👤 Member'}
          </span>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
        <div style={{
          flex: 1, background: '#f9f9fb', borderRadius: '10px', padding: '10px',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '20px', fontWeight: '800', color: '#1a1a2e' }}>{member.task_count}</div>
          <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '2px' }}>Total Tasks</div>
        </div>
        <div style={{
          flex: 1, background: '#eff6ff', borderRadius: '10px', padding: '10px',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '20px', fontWeight: '800', color: '#3b82f6' }}>{member.active_task_count}</div>
          <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '2px' }}>Active</div>
        </div>
        <div style={{
          flex: 1, background: '#f0fdf4', borderRadius: '10px', padding: '10px',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '20px', fontWeight: '800', color: '#16a34a' }}>
            {member.task_count - member.active_task_count}
          </div>
          <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '2px' }}>Done</div>
        </div>
      </div>

      {/* Workspaces */}
      <div>
        <div style={{ fontSize: '11px', fontWeight: '600', color: '#9ca3af', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Workspaces
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
          {(member.workspaces || []).map(w => (
            <span
              key={w.id}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '4px',
                padding: '4px 10px', borderRadius: '8px',
                background: `${w.color || '#6c63ff'}15`,
                color: w.color || '#6c63ff',
                fontSize: '12px', fontWeight: '600'
              }}
            >
              {w.emoji} {w.name}
            </span>
          ))}
          {(member.workspaces || []).length === 0 && (
            <span style={{ fontSize: '12px', color: '#d1d5db' }}>No workspaces assigned</span>
          )}
        </div>
      </div>
    </div>
  );
}

export default function TeamPage() {
  const { user, addToast } = useApp();
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const data = await api.getUsers();
        setMembers(data);
      } catch (err) {
        addToast('Failed to load team', 'error');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const totalTasks = members.reduce((sum, m) => sum + m.task_count, 0);
  const activeTasks = members.reduce((sum, m) => sum + m.active_task_count, 0);

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '300px' }}>
      <div style={{ color: '#9ca3af' }}>Loading team...</div>
    </div>
  );

  return (
    <div className="fade-in">
      {/* Team overview stats */}
      <div style={{
        background: 'linear-gradient(135deg, #6c63ff 0%, #3b82f6 100%)',
        borderRadius: '20px', padding: '24px', marginBottom: '24px',
        color: 'white', display: 'flex', alignItems: 'center', gap: '24px'
      }}>
        <div>
          <div style={{ fontSize: '13px', opacity: 0.75 }}>Total Members</div>
          <div style={{ fontSize: '40px', fontWeight: '800', lineHeight: 1 }}>{members.length}</div>
        </div>
        <div style={{ width: '1px', height: '50px', background: 'rgba(255,255,255,0.2)' }} />
        <div>
          <div style={{ fontSize: '13px', opacity: 0.75 }}>Total Tasks</div>
          <div style={{ fontSize: '40px', fontWeight: '800', lineHeight: 1 }}>{totalTasks}</div>
        </div>
        <div style={{ width: '1px', height: '50px', background: 'rgba(255,255,255,0.2)' }} />
        <div>
          <div style={{ fontSize: '13px', opacity: 0.75 }}>Active Tasks</div>
          <div style={{ fontSize: '40px', fontWeight: '800', lineHeight: 1 }}>{activeTasks}</div>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '-8px' }}>
          {members.map((m, i) => (
            <div
              key={m.id}
              title={m.name}
              style={{
                width: '38px', height: '38px', borderRadius: '50%',
                background: m.avatar_color || '#6c63ff',
                border: '3px solid rgba(255,255,255,0.4)',
                marginLeft: i > 0 ? '-12px' : '0',
                color: 'white', fontSize: '14px', fontWeight: '700',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                zIndex: members.length - i
              }}
            >
              {m.name[0]}
            </div>
          ))}
        </div>
      </div>

      {/* Members grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
        {members.map(m => (
          <MemberCard
            key={m.id}
            member={m}
            isCurrentUser={m.id === user?.id}
          />
        ))}
      </div>
    </div>
  );
}
