import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../App';
import api from '../api';

// ─── Workspace filter pills ────────────────────────────────────────────────

const workspaceFilters = [
  { label: 'All Workspaces', value: 'all' },
  { label: '🥐 Krispies', value: 'Krispies' },
  { label: '🤖 Solvv AI', value: 'Solvv AI' },
  { label: '🎬 Krispies Content', value: 'Krispies Content' },
  { label: '🤖 Solvv Content', value: 'Solvv Content' },
  { label: "📺 Surabhi's Channel", value: "Surabhi's Channel" },
];

function WorkspaceFilterPills({ active, onSelect }) {
  return (
    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '24px' }}>
      {workspaceFilters.map(f => (
        <button
          key={f.value}
          onClick={() => onSelect(f.value)}
          style={{
            padding: '7px 16px', borderRadius: '20px', fontSize: '13px',
            fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit',
            border: active === f.value ? 'none' : '1px solid #e8e8ed',
            background: active === f.value ? 'linear-gradient(135deg, #6c63ff, #3b82f6)' : 'white',
            color: active === f.value ? 'white' : '#6b7280',
            boxShadow: active === f.value ? '0 4px 12px rgba(108,99,255,0.25)' : 'none',
            transition: 'all 0.15s ease'
          }}
        >
          {f.label}
        </button>
      ))}
    </div>
  );
}

// ─── Focus Mode Overlay ────────────────────────────────────────────────────

function FocusMode({ tasks, meetings, onClose }) {
  const now = new Date();
  const dueTasks = tasks.filter(t => t.status !== 'done' && t.due_date &&
    new Date(t.due_date).toDateString() === now.toDateString());
  const inProgress = tasks.filter(t => t.status === 'inprogress');
  const todayMeetings = meetings || [];

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 2000,
      background: 'rgba(15,15,30,0.85)',
      backdropFilter: 'blur(12px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '20px'
    }}>
      <div style={{
        background: 'white', borderRadius: '24px',
        width: '100%', maxWidth: '680px',
        boxShadow: '0 32px 80px rgba(0,0,0,0.3)',
        overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg, #6c63ff, #3b82f6)',
          padding: '24px 28px', color: 'white',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between'
        }}>
          <div>
            <div style={{ fontSize: '20px', fontWeight: '800', letterSpacing: '-0.5px' }}>⚡ Focus Mode</div>
            <div style={{ fontSize: '13px', opacity: 0.8, marginTop: '4px' }}>
              {now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </div>
          </div>
          <button onClick={onClose} style={{
            background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white',
            width: '36px', height: '36px', borderRadius: '10px', cursor: 'pointer',
            fontSize: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>×</button>
        </div>

        <div style={{ padding: '24px 28px', maxHeight: '70vh', overflowY: 'auto' }}>
          {/* Today's meetings */}
          {todayMeetings.length > 0 && (
            <div style={{ marginBottom: '24px' }}>
              <div style={{ fontSize: '12px', fontWeight: '700', color: '#9ca3af', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '10px' }}>
                📅 Meetings Today
              </div>
              {todayMeetings.map(m => (
                <div key={m.id} style={{
                  display: 'flex', alignItems: 'center', gap: '12px',
                  padding: '12px', borderRadius: '12px', background: '#f5f3ff',
                  border: '1px solid #e8e4ff', marginBottom: '8px'
                }}>
                  <div style={{ fontSize: '13px', fontWeight: '700', color: '#6c63ff', minWidth: '55px' }}>
                    {new Date(m.start_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                  <div style={{ flex: 1, fontSize: '14px', fontWeight: '600', color: '#1a1a2e' }}>{m.title}</div>
                  <span style={{ fontSize: '11px', fontWeight: '600', color: m.workspace_color || '#6c63ff',
                    background: `${m.workspace_color || '#6c63ff'}15`, padding: '2px 8px', borderRadius: '6px' }}>
                    {m.workspace_emoji} {m.workspace_name}
                  </span>
                  {m.meeting_url && (
                    <button onClick={() => window.open(m.meeting_url, '_blank')} style={{
                      background: 'linear-gradient(135deg, #6c63ff, #3b82f6)', color: 'white',
                      border: 'none', borderRadius: '8px', padding: '5px 12px',
                      fontSize: '11px', fontWeight: '700', cursor: 'pointer'
                    }}>Join →</button>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Due today tasks */}
          <div style={{ marginBottom: '24px' }}>
            <div style={{ fontSize: '12px', fontWeight: '700', color: '#9ca3af', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '10px' }}>
              🔥 Due Today ({dueTasks.length})
            </div>
            {dueTasks.length === 0 ? (
              <div style={{ color: '#9ca3af', fontSize: '13px', padding: '12px', background: '#f9f9fb', borderRadius: '10px', textAlign: 'center' }}>
                🎉 Nothing due today!
              </div>
            ) : dueTasks.map(t => (
              <div key={t.id} style={{
                display: 'flex', alignItems: 'center', gap: '10px',
                padding: '12px', borderRadius: '12px', background: '#fff5f5',
                border: '1px solid #fecaca', marginBottom: '8px'
              }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ef4444', flexShrink: 0 }} />
                <div style={{ flex: 1, fontSize: '14px', fontWeight: '600', color: '#1a1a2e' }}>{t.title}</div>
                <span style={{ fontSize: '11px', color: t.workspace_color || '#6c63ff',
                  background: `${t.workspace_color || '#6c63ff'}15`, padding: '2px 8px', borderRadius: '6px', fontWeight: '600' }}>
                  {t.workspace_emoji} {t.workspace_name}
                </span>
              </div>
            ))}
          </div>

          {/* In progress */}
          <div>
            <div style={{ fontSize: '12px', fontWeight: '700', color: '#9ca3af', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '10px' }}>
              ⚡ In Progress ({inProgress.length})
            </div>
            {inProgress.length === 0 ? (
              <div style={{ color: '#9ca3af', fontSize: '13px', padding: '12px', background: '#f9f9fb', borderRadius: '10px', textAlign: 'center' }}>
                No tasks in progress
              </div>
            ) : inProgress.map(t => (
              <div key={t.id} style={{
                display: 'flex', alignItems: 'center', gap: '10px',
                padding: '12px', borderRadius: '12px', background: '#eff6ff',
                border: '1px solid #bfdbfe', marginBottom: '8px'
              }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#3b82f6', flexShrink: 0 }} />
                <div style={{ flex: 1, fontSize: '14px', fontWeight: '600', color: '#1a1a2e' }}>{t.title}</div>
                <span style={{ fontSize: '11px', color: t.workspace_color || '#6c63ff',
                  background: `${t.workspace_color || '#6c63ff'}15`, padding: '2px 8px', borderRadius: '6px', fontWeight: '600' }}>
                  {t.workspace_emoji} {t.workspace_name}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ padding: '16px 28px', borderTop: '1px solid #f0f0f5', display: 'flex', justifyContent: 'center' }}>
          <button onClick={onClose} style={{
            background: 'linear-gradient(135deg, #6c63ff, #3b82f6)', color: 'white',
            border: 'none', borderRadius: '12px', padding: '12px 32px',
            fontSize: '14px', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit'
          }}>
            Exit Focus Mode
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Stat cards ────────────────────────────────────────────────────────────

function StatCard({ label, value, icon, color, badge, badgeColor, progressValue }) {
  return (
    <div style={{
      background: 'white', borderRadius: '16px',
      border: '1px solid #f0f0f5', boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
      padding: '20px', display: 'flex', flexDirection: 'column', gap: '10px'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{
          width: '40px', height: '40px', borderRadius: '12px',
          background: `${color}18`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '20px'
        }}>
          {icon}
        </div>
        {badge && (
          <span style={{
            padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '700',
            background: `${badgeColor || color}18`, color: badgeColor || color
          }}>
            {badge}
          </span>
        )}
      </div>
      <div>
        <div style={{ fontSize: '32px', fontWeight: '900', color: '#1a1a2e', lineHeight: 1 }}>{value}</div>
        <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '4px', fontWeight: '500' }}>{label}</div>
      </div>
      {progressValue !== undefined && (
        <div style={{ height: '4px', background: '#f0f0f5', borderRadius: '4px', overflow: 'hidden' }}>
          <div style={{
            height: '100%', width: `${Math.min(progressValue, 100)}%`,
            background: `linear-gradient(90deg, ${color}, ${color}aa)`,
            borderRadius: '4px', transition: 'width 0.5s ease'
          }} />
        </div>
      )}
    </div>
  );
}

// ─── Morning Briefing banner ───────────────────────────────────────────────

function MorningBriefing({ stats, onFocusMode }) {
  const hour = new Date().getHours();
  const items = [
    { label: 'Due Today', value: stats?.tasks_due_today || 0 },
    { label: 'Meetings', value: stats?.meetings_today || 0 },
    { label: 'In Progress', value: stats?.inprogress || 0 },
    { label: 'Team Online', value: stats?.team_count || 0 },
  ];

  return (
    <div style={{
      background: 'linear-gradient(135deg, #6c63ff 0%, #3b82f6 100%)',
      borderRadius: '20px', padding: '24px 28px', marginBottom: '20px',
      color: 'white', display: 'flex', alignItems: 'center',
      justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexShrink: 0 }}>
        <div style={{
          width: '48px', height: '48px', borderRadius: '14px',
          background: 'rgba(255,255,255,0.18)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px'
        }}>⚡</div>
        <div>
          <div style={{ fontWeight: '700', fontSize: '16px', letterSpacing: '-0.2px' }}>
            Morning Briefing · Your Day at a Glance
          </div>
          <div style={{ fontSize: '13px', opacity: 0.75, marginTop: '2px' }}>
            {hour < 12 ? 'Start strong today' : hour < 17 ? 'Keep the momentum going' : 'Wrap up the day well'}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '0', flex: 1, justifyContent: 'center' }}>
        {items.map((item, i) => (
          <div key={i} style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            padding: '0 24px',
            borderLeft: i > 0 ? '1px solid rgba(255,255,255,0.2)' : 'none',
          }}>
            <div style={{ fontSize: '28px', fontWeight: '800', lineHeight: 1 }}>{item.value}</div>
            <div style={{ fontSize: '11px', opacity: 0.75, marginTop: '4px', whiteSpace: 'nowrap' }}>{item.label}</div>
          </div>
        ))}
      </div>

      <button
        onClick={onFocusMode}
        style={{
          background: 'white', color: '#6c63ff', border: 'none',
          borderRadius: '12px', padding: '10px 20px',
          fontWeight: '700', fontSize: '13px', cursor: 'pointer',
          boxShadow: '0 4px 14px rgba(0,0,0,0.12)',
          whiteSpace: 'nowrap', flexShrink: 0, fontFamily: 'inherit'
        }}
      >
        Start Focus Mode ⚡
      </button>
    </div>
  );
}

// ─── Workspace badge ───────────────────────────────────────────────────────

function WorkspaceBadge({ workspace }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '4px',
      padding: '3px 8px', borderRadius: '6px',
      background: `${workspace?.workspace_color || '#6c63ff'}15`,
      color: workspace?.workspace_color || '#6c63ff',
      fontSize: '11px', fontWeight: '600'
    }}>
      {workspace?.workspace_emoji} {workspace?.workspace_name}
    </span>
  );
}

// ─── Kanban column ─────────────────────────────────────────────────────────

function KanbanColumn({ title, tasks, color, bgColor }) {
  const navigate = useNavigate();
  return (
    <div style={{ flex: 1, minWidth: '180px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
        <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: color }} />
        <span style={{ fontSize: '13px', fontWeight: '600', color: '#374151' }}>{title}</span>
        <span style={{ background: bgColor, color, borderRadius: '6px', padding: '1px 8px', fontSize: '12px', fontWeight: '700' }}>
          {tasks.length}
        </span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {tasks.slice(0, 4).map(task => (
          <div key={task.id} onClick={() => navigate('/tasks')}
            style={{
              background: 'white', borderRadius: '12px', padding: '12px',
              cursor: 'pointer', border: '1px solid #f0f0f5',
              boxShadow: '0 1px 6px rgba(0,0,0,0.04)', transition: 'all 0.15s'
            }}
          >
            <div style={{ fontSize: '13px', fontWeight: '600', color: '#1a1a2e', marginBottom: '8px', lineHeight: 1.4 }}>
              {task.title}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <WorkspaceBadge workspace={task} />
              {task.assignee_name && (
                <div style={{
                  width: '22px', height: '22px', borderRadius: '50%',
                  background: task.assignee_color || '#6c63ff',
                  color: 'white', fontSize: '10px', fontWeight: '700',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                }} title={task.assignee_name}>
                  {task.assignee_name[0]}
                </div>
              )}
            </div>
          </div>
        ))}
        {tasks.length > 4 && (
          <button onClick={() => navigate('/tasks')} style={{
            background: 'none', border: '1.5px dashed #e0e0ef',
            borderRadius: '10px', padding: '8px', cursor: 'pointer',
            fontSize: '12px', color: '#9ca3af', fontWeight: '500', fontFamily: 'inherit'
          }}>
            +{tasks.length - 4} more tasks
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Today's Meetings panel ────────────────────────────────────────────────

function MeetingsPanel({ meetings }) {
  const navigate = useNavigate();
  const now = new Date();

  function isLiveNow(m) {
    const start = new Date(m.start_time);
    const end = new Date(start.getTime() + (m.duration_mins || 30) * 60000);
    return now >= start && now <= end;
  }

  return (
    <div style={{
      background: 'white', borderRadius: '16px',
      border: '1px solid #f0f0f5', boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
      padding: '20px', height: '100%'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
        <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '700', color: '#1a1a2e' }}>Today's Meetings</h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ background: '#eff6ff', color: '#3b82f6', borderRadius: '6px', padding: '2px 8px', fontSize: '12px', fontWeight: '700' }}>
            {(meetings || []).length}
          </span>
          <button onClick={() => navigate('/meetings')} style={{
            background: 'none', border: 'none', color: '#6c63ff',
            fontSize: '12px', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit'
          }}>+ Schedule</button>
        </div>
      </div>
      {(meetings || []).length === 0 ? (
        <div style={{ background: '#f9f9fb', borderRadius: '12px', padding: '20px', textAlign: 'center', color: '#9ca3af', fontSize: '13px' }}>
          🎉 No meetings today!
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {(meetings || []).map(m => {
            const live = isLiveNow(m);
            return (
              <div key={m.id} style={{
                borderRadius: '12px', padding: '12px',
                border: `1px solid ${live ? '#6c63ff33' : '#f0f0f5'}`,
                background: live ? '#f5f3ff' : '#f9f9fb',
                display: 'flex', gap: '12px', alignItems: 'flex-start'
              }}>
                <div style={{ flexShrink: 0, textAlign: 'center', minWidth: '50px' }}>
                  <div style={{ fontSize: '12px', fontWeight: '700', color: live ? '#6c63ff' : '#374151' }}>
                    {new Date(m.start_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                  <div style={{ fontSize: '10px', color: '#9ca3af', marginTop: '2px' }}>{m.duration_mins} min</div>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '13px', fontWeight: '600', color: '#1a1a2e' }}>{m.title}</span>
                    {live && (
                      <span style={{
                        background: '#ef4444', color: 'white', borderRadius: '4px',
                        padding: '1px 6px', fontSize: '10px', fontWeight: '700', letterSpacing: '0.5px'
                      }}>LIVE NOW</span>
                    )}
                  </div>
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: '3px',
                    padding: '2px 8px', borderRadius: '6px',
                    background: `${m.workspace_color || '#6c63ff'}15`,
                    color: m.workspace_color || '#6c63ff',
                    fontSize: '11px', fontWeight: '600'
                  }}>
                    {m.workspace_emoji} {m.workspace_name}
                  </span>
                </div>
                <button
                  onClick={() => m.meeting_url ? window.open(m.meeting_url, '_blank') : navigate('/meetings')}
                  style={{
                    background: 'linear-gradient(135deg, #6c63ff, #3b82f6)',
                    color: 'white', border: 'none', borderRadius: '8px',
                    padding: '6px 12px', fontSize: '11px', fontWeight: '700',
                    cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0, fontFamily: 'inherit'
                  }}
                >
                  Join →
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Team Activity feed ────────────────────────────────────────────────────

function TeamActivityPanel({ activity }) {
  return (
    <div style={{
      background: 'white', borderRadius: '16px',
      border: '1px solid #f0f0f5', boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
      padding: '20px'
    }}>
      <h3 style={{ margin: '0 0 16px', fontSize: '15px', fontWeight: '700', color: '#1a1a2e' }}>⚡ Team Activity</h3>
      {(activity || []).length === 0 ? (
        <div style={{ color: '#9ca3af', fontSize: '13px', textAlign: 'center', padding: '20px' }}>No recent activity</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
          {(activity || []).map((item, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 0',
              borderBottom: i < activity.length - 1 ? '1px solid #f9f9fb' : 'none'
            }}>
              <div style={{
                width: '32px', height: '32px', borderRadius: '50%',
                background: item.avatar_color || '#6c63ff', color: 'white',
                fontSize: '13px', fontWeight: '700',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
              }}>
                {item.user_name?.[0] || '?'}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '13px', color: '#1a1a2e' }}>
                  <span style={{ fontWeight: '600' }}>{item.user_name}</span>{' created '}
                  <span style={{ fontWeight: '500' }}>{item.title}</span>
                </div>
                <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '2px' }}>
                  {item.workspace_emoji} {item.workspace_name} · {new Date(item.created_at).toLocaleDateString()}
                </div>
              </div>
              <span style={{
                padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: '500',
                background: item.status === 'done' ? '#f0fdf4' : item.status === 'inprogress' ? '#eff6ff' : '#f3f4f6',
                color: item.status === 'done' ? '#16a34a' : item.status === 'inprogress' ? '#3b82f6' : '#6b7280',
              }}>
                {item.status === 'inprogress' ? 'In Progress' : item.status === 'done' ? 'Done' : 'Todo'}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Team Updates feed ─────────────────────────────────────────────────────

function TeamUpdatesPanel({ updates }) {
  const navigate = useNavigate();
  return (
    <div style={{
      background: 'white', borderRadius: '16px',
      border: '1px solid #f0f0f5', boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
      padding: '20px'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
        <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '700', color: '#1a1a2e' }}>📢 Team Updates</h3>
        <button onClick={() => navigate('/updates')} style={{
          background: 'none', border: 'none', color: '#6c63ff',
          fontSize: '12px', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit'
        }}>View all</button>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {(updates || []).length === 0 ? (
          <div style={{ color: '#9ca3af', fontSize: '13px', textAlign: 'center', padding: '20px' }}>No updates yet</div>
        ) : (updates || []).map((upd, i) => (
          <div key={upd.id || i} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
            <div style={{
              width: '30px', height: '30px', borderRadius: '50%',
              background: upd.avatar_color || '#6c63ff', color: 'white',
              fontSize: '12px', fontWeight: '700',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
            }}>
              {upd.user_name?.[0] || '?'}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '12px', fontWeight: '600', color: '#374151' }}>
                {upd.user_name}
                <span style={{ color: '#9ca3af', fontWeight: '400', marginLeft: '6px' }}>
                  {upd.workspace_emoji} {upd.workspace_name}
                </span>
              </div>
              <div style={{
                fontSize: '12px', color: '#6b7280', marginTop: '2px',
                overflow: 'hidden', display: '-webkit-box',
                WebkitLineClamp: 2, WebkitBoxOrient: 'vertical'
              }}>
                {upd.content}
              </div>
              {upd.likes_count !== undefined && (
                <div style={{ marginTop: '4px', fontSize: '11px', color: '#9ca3af' }}>
                  ❤️ {upd.likes_count} likes
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Team Overview panel ───────────────────────────────────────────────────

function TeamOverviewPanel({ teamMembers }) {
  const navigate = useNavigate();
  return (
    <div style={{
      background: 'white', borderRadius: '16px',
      border: '1px solid #f0f0f5', boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
      padding: '20px'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
        <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '700', color: '#1a1a2e' }}>👥 Team</h3>
        <button onClick={() => navigate('/team')} style={{
          background: 'none', border: 'none', color: '#6c63ff',
          fontSize: '12px', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit'
        }}>View all</button>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {(teamMembers || []).map((member, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <div style={{
                width: '34px', height: '34px', borderRadius: '50%',
                background: member.avatar_color || '#6c63ff',
                color: 'white', fontSize: '13px', fontWeight: '700',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                {member.name?.[0] || '?'}
              </div>
              <span style={{
                position: 'absolute', bottom: 0, right: 0,
                width: '9px', height: '9px', borderRadius: '50%',
                background: '#10b981', border: '1.5px solid white'
              }} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '13px', fontWeight: '600', color: '#1a1a2e' }}>
                {member.name}
                {member.role === 'admin' && (
                  <span style={{ marginLeft: '6px', fontSize: '10px', background: '#ede9ff', color: '#6c63ff', padding: '1px 6px', borderRadius: '4px', fontWeight: '700' }}>
                    Admin
                  </span>
                )}
              </div>
              <div style={{ fontSize: '11px', color: '#9ca3af' }}>{member.role}</div>
            </div>
            <div style={{ fontSize: '12px', color: '#6b7280', fontWeight: '600', background: '#f3f4f6', borderRadius: '8px', padding: '2px 8px' }}>
              {member.task_count || 0} tasks
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main Dashboard ────────────────────────────────────────────────────────

export default function Dashboard() {
  const { addToast } = useApp();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [allTasks, setAllTasks] = useState([]);
  const [activeWorkspace, setActiveWorkspace] = useState('all');
  const [focusMode, setFocusMode] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const [dashData, tasksData] = await Promise.all([api.getDashboard(), api.getTasks()]);
        setData(dashData);
        setAllTasks(tasksData);
      } catch (err) {
        addToast('Failed to load dashboard', 'error');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '300px' }}>
      <div style={{ color: '#9ca3af', fontSize: '15px' }}>Loading your dashboard...</div>
    </div>
  );

  const stats = data?.stats || {};

  // Filter tasks by selected workspace
  const filteredTasks = activeWorkspace === 'all'
    ? allTasks
    : allTasks.filter(t => t.workspace_name === activeWorkspace);

  const todoTasks = filteredTasks.filter(t => t.status === 'todo');
  const inProgressTasks = filteredTasks.filter(t => t.status === 'inprogress');
  const doneTasks = filteredTasks.filter(t => t.status === 'done');

  const totalTasks = stats.total || 0;
  const doneCount = stats.done || 0;
  const inprogressCount = stats.inprogress || 0;
  const doneProgress = totalTasks > 0 ? Math.round((doneCount / totalTasks) * 100) : 0;
  const inprogressProgress = totalTasks > 0 ? Math.round((inprogressCount / totalTasks) * 100) : 0;

  return (
    <div className="fade-in">
      {/* Focus Mode overlay */}
      {focusMode && (
        <FocusMode
          tasks={allTasks}
          meetings={data?.today_meetings || []}
          onClose={() => setFocusMode(false)}
        />
      )}

      {/* Morning briefing */}
      <MorningBriefing stats={stats} onFocusMode={() => setFocusMode(true)} />

      {/* Workspace filter pills */}
      <WorkspaceFilterPills active={activeWorkspace} onSelect={setActiveWorkspace} />

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
        <StatCard label="Total Tasks" value={totalTasks} icon="✅" color="#6c63ff" badge="↑ 12%" badgeColor="#10b981" progressValue={60} />
        <StatCard label="In Progress" value={inprogressCount} icon="⚡" color="#f97316" badge="Today" badgeColor="#f97316" progressValue={inprogressProgress} />
        <StatCard label="Completed" value={doneCount} icon="🎯" color="#10b981" badge="↑ 8%" badgeColor="#10b981" progressValue={doneProgress} />
        <StatCard label="Due Today" value={stats.tasks_due_today || 0} icon="🔥" color="#ef4444" badge="1 blocked" badgeColor="#ef4444" progressValue={stats.tasks_due_today ? Math.min(stats.tasks_due_today * 10, 100) : 0} />
      </div>

      {/* Top section: Task Board + Meetings */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 370px', gap: '20px', marginBottom: '20px' }}>
        <div style={{
          background: 'white', borderRadius: '16px',
          border: '1px solid #f0f0f5', boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
          padding: '20px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '700', color: '#1a1a2e' }}>📋 Task Board</h3>
            <button onClick={() => window.location.href = '/tasks'} style={{
              background: 'none', border: 'none', color: '#6c63ff',
              fontSize: '13px', fontWeight: '500', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: '4px', fontFamily: 'inherit'
            }}>
              View all
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            </button>
          </div>
          <div style={{ display: 'flex', gap: '16px' }}>
            <KanbanColumn title="To Do" tasks={todoTasks} color="#6b7280" bgColor="#f3f4f6" />
            <KanbanColumn title="In Progress" tasks={inProgressTasks} color="#3b82f6" bgColor="#eff6ff" />
            <KanbanColumn title="Done" tasks={doneTasks} color="#16a34a" bgColor="#f0fdf4" />
          </div>
        </div>
        <MeetingsPanel meetings={data?.today_meetings} />
      </div>

      {/* Bottom section: Activity + Updates + Team */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 320px', gap: '20px' }}>
        <TeamActivityPanel activity={data?.recent_activity} />
        <TeamUpdatesPanel updates={data?.recent_updates} />
        <TeamOverviewPanel teamMembers={data?.team_members} />
      </div>
    </div>
  );
}
