import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../App';
import api from '../api';
import { Avatar } from '../components/Sidebar';

function StatCard({ label, value, icon, color, sublabel }) {
  return (
    <div style={{
      background: 'white', borderRadius: '16px',
      border: '1px solid #f0f0f5', boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
      padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: '13px', color: '#6b7280', fontWeight: '500' }}>{label}</span>
        <div style={{
          width: '36px', height: '36px', borderRadius: '10px',
          background: `${color}15`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: color, fontSize: '18px'
        }}>
          {icon}
        </div>
      </div>
      <div>
        <div style={{ fontSize: '32px', fontWeight: '800', color: '#1a1a2e', lineHeight: 1 }}>{value}</div>
        {sublabel && <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '4px' }}>{sublabel}</div>}
      </div>
    </div>
  );
}

function MorningBriefing({ stats }) {
  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? '🌅 Good morning' : hour < 17 ? '☀️ Good afternoon' : '🌙 Good evening';

  const items = [
    { label: 'Tasks due today', value: stats?.tasks_due_today || 0, color: '#f97316', icon: '📋' },
    { label: 'Meetings today', value: stats?.meetings_today || 0, color: '#3b82f6', icon: '📅' },
    { label: 'In progress', value: stats?.inprogress || 0, color: '#8b5cf6', icon: '⚡' },
    { label: 'Team members', value: stats?.team_count || 0, color: '#10b981', icon: '👥' },
  ];

  return (
    <div style={{
      background: 'linear-gradient(135deg, #6c63ff 0%, #3b82f6 100%)',
      borderRadius: '20px', padding: '20px 24px',
      marginBottom: '24px',
      color: 'white',
      display: 'flex', alignItems: 'center',
      flexWrap: 'wrap', gap: '0'
    }}>
      <div style={{ marginRight: '32px', flexShrink: 0 }}>
        <div style={{ fontSize: '15px', opacity: 0.85 }}>{greeting}</div>
        <div style={{ fontSize: '13px', opacity: 0.65, marginTop: '2px' }}>Here's your briefing</div>
      </div>
      <div style={{ display: 'flex', gap: '0', flexWrap: 'wrap', flex: 1 }}>
        {items.map((item, i) => (
          <div key={i} style={{
            display: 'flex', alignItems: 'center', gap: '10px',
            padding: '8px 20px',
            borderLeft: '1px solid rgba(255,255,255,0.2)',
          }}>
            <div style={{
              width: '36px', height: '36px', borderRadius: '10px',
              background: 'rgba(255,255,255,0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '16px'
            }}>
              {item.icon}
            </div>
            <div>
              <div style={{ fontSize: '22px', fontWeight: '800', lineHeight: 1 }}>{item.value}</div>
              <div style={{ fontSize: '11px', opacity: 0.7, marginTop: '2px' }}>{item.label}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

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

function KanbanColumn({ title, tasks, color, status, bgColor }) {
  const navigate = useNavigate();
  return (
    <div style={{ flex: 1, minWidth: '200px' }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px'
      }}>
        <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: color }} />
        <span style={{ fontSize: '13px', fontWeight: '600', color: '#374151' }}>{title}</span>
        <span style={{
          background: bgColor, color: color,
          borderRadius: '6px', padding: '1px 8px', fontSize: '12px', fontWeight: '700'
        }}>{tasks.length}</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {tasks.slice(0, 4).map(task => (
          <div
            key={task.id}
            className="kanban-card"
            onClick={() => navigate('/tasks')}
            style={{
              background: 'white', borderRadius: '12px',
              padding: '12px', cursor: 'pointer',
              border: '1px solid #f0f0f5',
              boxShadow: '0 1px 6px rgba(0,0,0,0.04)'
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
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0
                }} title={task.assignee_name}>
                  {task.assignee_name[0]}
                </div>
              )}
            </div>
          </div>
        ))}
        {tasks.length > 4 && (
          <button
            onClick={() => navigate('/tasks')}
            style={{
              background: 'none', border: '1.5px dashed #e0e0ef',
              borderRadius: '10px', padding: '8px', cursor: 'pointer',
              fontSize: '12px', color: '#9ca3af', fontWeight: '500'
            }}
          >
            +{tasks.length - 4} more tasks
          </button>
        )}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { user, addToast } = useApp();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [allTasks, setAllTasks] = useState([]);

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
  const todoTasks = allTasks.filter(t => t.status === 'todo');
  const inProgressTasks = allTasks.filter(t => t.status === 'inprogress');
  const doneTasks = allTasks.filter(t => t.status === 'done');

  return (
    <div className="fade-in">
      {/* Morning briefing */}
      <MorningBriefing stats={stats} />

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
        <StatCard
          label="Total Tasks"
          value={stats.total || 0}
          icon="✅"
          color="#6c63ff"
          sublabel="across all workspaces"
        />
        <StatCard
          label="In Progress"
          value={stats.inprogress || 0}
          icon="⚡"
          color="#f97316"
          sublabel="actively working"
        />
        <StatCard
          label="Completed"
          value={stats.done || 0}
          icon="🎯"
          color="#10b981"
          sublabel="tasks done"
        />
        <StatCard
          label="Due Today"
          value={stats.tasks_due_today || 0}
          icon="🔥"
          color="#ef4444"
          sublabel="need attention"
        />
      </div>

      {/* Main content grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '20px' }}>
        {/* Left column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Kanban overview */}
          <div style={{
            background: 'white', borderRadius: '16px',
            border: '1px solid #f0f0f5', boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
            padding: '20px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '700', color: '#1a1a2e' }}>Task Board</h3>
              <a href="/tasks" style={{
                fontSize: '13px', color: '#6c63ff', fontWeight: '500',
                textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px'
              }}>
                View all
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="9 18 15 12 9 6"/>
                </svg>
              </a>
            </div>
            <div style={{ display: 'flex', gap: '16px' }}>
              <KanbanColumn title="To Do" tasks={todoTasks} color="#6b7280" bgColor="#f3f4f6" status="todo" />
              <KanbanColumn title="In Progress" tasks={inProgressTasks} color="#3b82f6" bgColor="#eff6ff" status="inprogress" />
              <KanbanColumn title="Done" tasks={doneTasks} color="#16a34a" bgColor="#f0fdf4" status="done" />
            </div>
          </div>

          {/* Recent activity */}
          <div style={{
            background: 'white', borderRadius: '16px',
            border: '1px solid #f0f0f5', boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
            padding: '20px'
          }}>
            <h3 style={{ margin: '0 0 16px', fontSize: '15px', fontWeight: '700', color: '#1a1a2e' }}>
              Recent Activity
            </h3>
            {(data?.recent_activity || []).length === 0 ? (
              <div style={{ color: '#9ca3af', fontSize: '13px', textAlign: 'center', padding: '20px' }}>
                No recent activity
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
                {(data?.recent_activity || []).map((item, i) => (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', gap: '12px',
                    padding: '10px 0',
                    borderBottom: i < data.recent_activity.length - 1 ? '1px solid #f9f9fb' : 'none'
                  }}>
                    <div style={{
                      width: '32px', height: '32px', borderRadius: '50%',
                      background: item.avatar_color || '#6c63ff',
                      color: 'white', fontSize: '13px', fontWeight: '700',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      {item.user_name?.[0] || '?'}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '13px', color: '#1a1a2e' }}>
                        <span style={{ fontWeight: '600' }}>{item.user_name}</span>
                        {' created '}
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
        </div>

        {/* Right column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Today's meetings */}
          <div style={{
            background: 'white', borderRadius: '16px',
            border: '1px solid #f0f0f5', boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
            padding: '20px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '700', color: '#1a1a2e' }}>
                Today's Meetings
              </h3>
              <span style={{
                background: '#eff6ff', color: '#3b82f6',
                borderRadius: '6px', padding: '2px 8px', fontSize: '12px', fontWeight: '700'
              }}>
                {(data?.today_meetings || []).length}
              </span>
            </div>
            {(data?.today_meetings || []).length === 0 ? (
              <div style={{
                background: '#f9f9fb', borderRadius: '12px', padding: '20px',
                textAlign: 'center', color: '#9ca3af', fontSize: '13px'
              }}>
                🎉 No meetings today!
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {(data?.today_meetings || []).map(m => (
                  <div key={m.id} style={{
                    background: '#f9f9fb', borderRadius: '12px', padding: '12px',
                    borderLeft: `3px solid ${m.workspace_color || '#6c63ff'}`
                  }}>
                    <div style={{ fontSize: '13px', fontWeight: '600', color: '#1a1a2e', marginBottom: '4px' }}>
                      {m.title}
                    </div>
                    <div style={{ fontSize: '12px', color: '#6b7280', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                      </svg>
                      {new Date(m.start_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                      {' · '}{m.duration_mins} min
                    </div>
                    <div style={{ marginTop: '6px' }}>
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
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Team updates */}
          <div style={{
            background: 'white', borderRadius: '16px',
            border: '1px solid #f0f0f5', boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
            padding: '20px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '700', color: '#1a1a2e' }}>
                Team Updates
              </h3>
              <a href="/updates" style={{ fontSize: '12px', color: '#6c63ff', textDecoration: 'none', fontWeight: '500' }}>
                View all
              </a>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {(data?.recent_updates || []).map(upd => (
                <div key={upd.id} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                  <div style={{
                    width: '30px', height: '30px', borderRadius: '50%',
                    background: upd.avatar_color || '#6c63ff',
                    color: 'white', fontSize: '12px', fontWeight: '700',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0
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
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
