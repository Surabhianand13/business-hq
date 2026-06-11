import { useState, useEffect } from 'react';
import { useApp } from '../App';
import api from '../api';

const WORKSPACE_COLORS = ['#f97316', '#8b5cf6', '#10b981', '#6366f1', '#ec4899', '#3b82f6', '#f59e0b'];

function StatCard({ icon, label, value, color, sub }) {
  return (
    <div style={{
      background: 'white', borderRadius: '16px', border: '1px solid #f0f0f5',
      boxShadow: '0 2px 8px rgba(0,0,0,0.03)', padding: '20px 24px',
      display: 'flex', alignItems: 'center', gap: '16px'
    }}>
      <div style={{
        width: '48px', height: '48px', borderRadius: '12px',
        background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '22px', flexShrink: 0
      }}>
        {icon}
      </div>
      <div>
        <div style={{ fontSize: '28px', fontWeight: '800', color: '#1a1a2e', lineHeight: 1 }}>{value}</div>
        <div style={{ fontSize: '13px', color: '#9ca3af', marginTop: '2px' }}>{label}</div>
        {sub && <div style={{ fontSize: '12px', color, marginTop: '2px', fontWeight: '600' }}>{sub}</div>}
      </div>
    </div>
  );
}

function SectionTitle({ children }) {
  return (
    <h2 style={{ margin: '0 0 14px', fontSize: '16px', fontWeight: '700', color: '#1a1a2e' }}>{children}</h2>
  );
}

function Card({ children, style }) {
  return (
    <div style={{
      background: 'white', borderRadius: '16px', border: '1px solid #f0f0f5',
      boxShadow: '0 2px 8px rgba(0,0,0,0.03)', padding: '24px', ...style
    }}>
      {children}
    </div>
  );
}

export default function ReportsPage() {
  const { addToast } = useApp();
  const [tasks, setTasks] = useState([]);
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [t, m] = await Promise.all([api.getTasks(), api.getMeetings()]);
        setTasks(t);
        setMeetings(m);
      } catch {
        addToast('Failed to load report data', 'error');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '300px' }}>
        <div style={{ color: '#9ca3af' }}>Loading reports...</div>
      </div>
    );
  }

  const total = tasks.length;
  const completed = tasks.filter(t => t.status === 'done').length;
  const inProgress = tasks.filter(t => t.status === 'inprogress').length;
  const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

  // Group by workspace
  const wsMap = {};
  tasks.forEach(task => {
    const wsName = task.workspace_name || 'Unknown';
    if (!wsMap[wsName]) {
      wsMap[wsName] = { name: wsName, color: task.workspace_color || '#6c63ff', emoji: task.workspace_emoji || '📁', total: 0, done: 0 };
    }
    wsMap[wsName].total++;
    if (task.status === 'done') wsMap[wsName].done++;
  });
  const workspaceStats = Object.values(wsMap).sort((a, b) => b.total - a.total);

  // Group by assignee
  const assigneeMap = {};
  tasks.forEach(task => {
    const name = task.assignee_name || 'Unassigned';
    if (!assigneeMap[name]) {
      assigneeMap[name] = { name, color: task.assignee_color || '#9ca3af', tasks: [] };
    }
    assigneeMap[name].tasks.push(task);
  });
  const assigneeStats = Object.values(assigneeMap).sort((a, b) => b.tasks.length - a.tasks.length);

  // Recent completions
  const recentDone = tasks
    .filter(t => t.status === 'done')
    .slice(0, 5);

  const STATUS_STYLE = {
    todo: { bg: '#f3f4f6', color: '#6b7280', label: 'Todo' },
    inprogress: { bg: '#eff6ff', color: '#3b82f6', label: 'In Progress' },
    done: { bg: '#f0fdf4', color: '#16a34a', label: 'Done' },
  };

  return (
    <div className="fade-in">
      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '28px' }}>
        <StatCard icon="📋" label="Total Tasks" value={total} color="#6c63ff" />
        <StatCard icon="✅" label="Completed" value={completed} color="#16a34a" sub={total > 0 ? `${completionRate}% done` : null} />
        <StatCard icon="⚡" label="In Progress" value={inProgress} color="#3b82f6" />
        <StatCard icon="📊" label="Completion Rate" value={`${completionRate}%`} color="#f97316" sub={`${completed} of ${total}`} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
        {/* Tasks by Workspace */}
        <Card>
          <SectionTitle>Tasks by Workspace</SectionTitle>
          {workspaceStats.length === 0 ? (
            <div style={{ color: '#9ca3af', fontSize: '14px', padding: '12px 0' }}>No data yet</div>
          ) : workspaceStats.map(ws => {
            const pct = ws.total > 0 ? Math.round((ws.done / ws.total) * 100) : 0;
            return (
              <div key={ws.name} style={{ marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '5px' }}>
                  <span style={{ fontSize: '13px', fontWeight: '600', color: '#374151', display: 'flex', alignItems: 'center', gap: '5px' }}>
                    {ws.emoji} {ws.name}
                  </span>
                  <span style={{ fontSize: '12px', color: '#9ca3af' }}>{ws.done}/{ws.total} · {pct}%</span>
                </div>
                <div style={{ height: '8px', borderRadius: '4px', background: '#f3f4f6', overflow: 'hidden' }}>
                  <div style={{
                    height: '100%', borderRadius: '4px',
                    background: ws.color,
                    width: `${pct}%`,
                    transition: 'width 0.4s ease'
                  }} />
                </div>
              </div>
            );
          })}
        </Card>

        {/* Recent Completions */}
        <Card>
          <SectionTitle>Recent Completions</SectionTitle>
          {recentDone.length === 0 ? (
            <div style={{ color: '#9ca3af', fontSize: '14px', padding: '12px 0' }}>No completed tasks yet</div>
          ) : recentDone.map(task => (
            <div key={task.id} style={{
              display: 'flex', alignItems: 'flex-start', gap: '10px',
              padding: '10px 0', borderBottom: '1px solid #f5f5f7'
            }}>
              <div style={{ width: '18px', height: '18px', borderRadius: '50%', background: '#f0fdf4', border: '2px solid #16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '1px' }}>
                <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '13px', fontWeight: '500', color: '#1a1a2e', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {task.title}
                </div>
                <div style={{ display: 'flex', gap: '6px', marginTop: '3px', flexWrap: 'wrap' }}>
                  {task.workspace_name && (
                    <span style={{ fontSize: '11px', color: task.workspace_color || '#6c63ff', fontWeight: '600' }}>
                      {task.workspace_emoji} {task.workspace_name}
                    </span>
                  )}
                  {task.assignee_name && (
                    <span style={{ fontSize: '11px', color: '#9ca3af' }}>{task.assignee_name}</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </Card>
      </div>

      {/* Tasks by Assignee */}
      <Card style={{ marginBottom: '20px' }}>
        <SectionTitle>Tasks by Assignee</SectionTitle>
        {assigneeStats.length === 0 ? (
          <div style={{ color: '#9ca3af', fontSize: '14px' }}>No tasks assigned</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
            {assigneeStats.map(a => {
              const doneCnt = a.tasks.filter(t => t.status === 'done').length;
              const inProgCnt = a.tasks.filter(t => t.status === 'inprogress').length;
              const todoCnt = a.tasks.filter(t => t.status === 'todo').length;
              return (
                <div key={a.name} style={{ border: '1px solid #f0f0f5', borderRadius: '12px', padding: '14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                    <div style={{
                      width: '28px', height: '28px', borderRadius: '50%',
                      background: a.color, color: 'white', fontSize: '12px', fontWeight: '700',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                    }}>
                      {a.name === 'Unassigned' ? '?' : a.name[0]}
                    </div>
                    <span style={{ fontWeight: '600', fontSize: '13px', color: '#1a1a2e' }}>{a.name}</span>
                    <span style={{ marginLeft: 'auto', fontSize: '12px', color: '#9ca3af' }}>{a.tasks.length} tasks</span>
                  </div>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    {[
                      { label: 'Todo', count: todoCnt, ...STATUS_STYLE.todo },
                      { label: 'In Prog', count: inProgCnt, ...STATUS_STYLE.inprogress },
                      { label: 'Done', count: doneCnt, ...STATUS_STYLE.done },
                    ].map(s => (
                      <div key={s.label} style={{
                        flex: 1, textAlign: 'center', padding: '6px 4px', borderRadius: '8px',
                        background: s.bg
                      }}>
                        <div style={{ fontSize: '16px', fontWeight: '800', color: s.color }}>{s.count}</div>
                        <div style={{ fontSize: '10px', color: s.color, fontWeight: '600' }}>{s.label}</div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Meetings summary */}
      <Card>
        <SectionTitle>Meetings Overview</SectionTitle>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
          {[
            { label: 'Total Meetings', value: meetings.length, color: '#6c63ff', icon: '📅' },
            { label: 'Upcoming', value: meetings.filter(m => new Date(m.start_time) >= new Date()).length, color: '#3b82f6', icon: '🗓️' },
            { label: 'Today', value: meetings.filter(m => new Date(m.start_time).toDateString() === new Date().toDateString()).length, color: '#f97316', icon: '⏰' },
          ].map(s => (
            <div key={s.label} style={{ background: `${s.color}08`, border: `1px solid ${s.color}20`, borderRadius: '12px', padding: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '24px' }}>{s.icon}</span>
              <div>
                <div style={{ fontSize: '22px', fontWeight: '800', color: '#1a1a2e' }}>{s.value}</div>
                <div style={{ fontSize: '12px', color: '#9ca3af' }}>{s.label}</div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
