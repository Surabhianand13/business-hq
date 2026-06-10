import { useState, useEffect } from 'react';
import { useApp } from '../App';
import api from '../api';

function timeAgo(dateStr) {
  const now = new Date();
  const date = new Date(dateStr);
  const diff = Math.floor((now - date) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function UpdateCard({ update, currentUser, onLike, onComment }) {
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleComment(e) {
    e.preventDefault();
    if (!commentText.trim()) return;
    setSubmitting(true);
    try {
      await onComment(update.id, commentText.trim());
      setCommentText('');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={{
      background: 'white', borderRadius: '16px',
      border: '1px solid #f0f0f5', boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
      overflow: 'hidden'
    }}>
      <div style={{ padding: '20px' }}>
        {/* Author */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
          <div style={{
            width: '38px', height: '38px', borderRadius: '50%',
            background: update.avatar_color || '#6c63ff',
            color: 'white', fontSize: '15px', fontWeight: '700',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0
          }}>
            {update.user_name?.[0] || '?'}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '14px', fontWeight: '700', color: '#1a1a2e' }}>
                {update.user_name}
              </span>
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: '3px',
                padding: '2px 8px', borderRadius: '6px',
                background: `${update.workspace_color || '#6c63ff'}15`,
                color: update.workspace_color || '#6c63ff',
                fontSize: '11px', fontWeight: '600'
              }}>
                {update.workspace_emoji} {update.workspace_name}
              </span>
            </div>
            <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '2px' }}>
              {timeAgo(update.created_at)}
            </div>
          </div>
        </div>

        {/* Content */}
        <p style={{ margin: 0, fontSize: '14px', color: '#374151', lineHeight: 1.6 }}>
          {update.content}
        </p>

        {/* Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: '16px', paddingTop: '14px', borderTop: '1px solid #f9f9fb' }}>
          <button
            onClick={() => onLike(update.id)}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: '13px', fontWeight: '500',
              color: update.liked_by_me ? '#6c63ff' : '#9ca3af',
              transition: 'color 0.15s'
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24"
              fill={update.liked_by_me ? '#6c63ff' : 'none'}
              stroke={update.liked_by_me ? '#6c63ff' : 'currentColor'}
              strokeWidth="2"
            >
              <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>
            </svg>
            {update.like_count > 0 && update.like_count}
            {' '}Like
          </button>

          <button
            onClick={() => setShowComments(!showComments)}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: '13px', fontWeight: '500',
              color: '#9ca3af', transition: 'color 0.15s'
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
            </svg>
            {update.comment_count > 0 && update.comment_count}
            {' '}Comment
          </button>
        </div>
      </div>

      {/* Comments section */}
      {showComments && (
        <div style={{ padding: '0 20px 20px', borderTop: '1px solid #f5f5f7' }}>
          {(update.comments || []).length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '14px', marginBottom: '14px' }}>
              {(update.comments || []).map(c => (
                <div key={c.id} style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                  <div style={{
                    width: '28px', height: '28px', borderRadius: '50%', flexShrink: 0,
                    background: c.avatar_color || '#6c63ff',
                    color: 'white', fontSize: '11px', fontWeight: '700',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>
                    {c.user_name?.[0]}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ background: '#f5f5f7', borderRadius: '10px', padding: '8px 12px' }}>
                      <span style={{ fontSize: '12px', fontWeight: '700', color: '#374151' }}>{c.user_name} </span>
                      <span style={{ fontSize: '13px', color: '#4b5563' }}>{c.content}</span>
                    </div>
                    <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '3px', marginLeft: '4px' }}>
                      {timeAgo(c.created_at)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Comment input */}
          <form onSubmit={handleComment} style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '12px' }}>
            <div style={{
              width: '28px', height: '28px', borderRadius: '50%', flexShrink: 0,
              background: currentUser?.avatar_color || '#6c63ff',
              color: 'white', fontSize: '11px', fontWeight: '700',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              {currentUser?.name?.[0]}
            </div>
            <input
              className="input-field"
              value={commentText}
              onChange={e => setCommentText(e.target.value)}
              placeholder="Write a comment..."
              style={{ flex: 1, padding: '8px 14px', fontSize: '13px' }}
            />
            <button
              type="submit"
              disabled={submitting || !commentText.trim()}
              style={{
                padding: '8px 14px', borderRadius: '8px', border: 'none',
                background: 'linear-gradient(135deg, #6c63ff, #3b82f6)',
                color: 'white', cursor: 'pointer', fontSize: '13px', fontWeight: '600',
                opacity: (submitting || !commentText.trim()) ? 0.6 : 1,
                transition: 'opacity 0.15s'
              }}
            >
              Post
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

export default function UpdatesPage() {
  const { user, addToast } = useApp();
  const [updates, setUpdates] = useState([]);
  const [workspaces, setWorkspaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newContent, setNewContent] = useState('');
  const [newWorkspace, setNewWorkspace] = useState('');
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [u, w] = await Promise.all([api.getUpdates(), api.getWorkspaces()]);
      setUpdates(u);
      setWorkspaces(w);
      if (w.length > 0) setNewWorkspace(w[0].id);
    } catch (err) {
      addToast('Failed to load updates', 'error');
    } finally {
      setLoading(false);
    }
  }

  async function handlePost(e) {
    e.preventDefault();
    if (!newContent.trim() || !newWorkspace) return;
    setPosting(true);
    try {
      const created = await api.createUpdate({ content: newContent.trim(), workspace_id: parseInt(newWorkspace) });
      setUpdates(prev => [created, ...prev]);
      setNewContent('');
      addToast('Update posted!');
    } catch (err) {
      addToast('Failed to post update', 'error');
    } finally {
      setPosting(false);
    }
  }

  async function handleLike(id) {
    try {
      const result = await api.likeUpdate(id);
      setUpdates(prev => prev.map(u => u.id === id
        ? { ...u, liked_by_me: result.liked, like_count: result.count }
        : u
      ));
    } catch (err) {
      addToast('Failed to like update', 'error');
    }
  }

  async function handleComment(updateId, content) {
    try {
      const comment = await api.commentUpdate(updateId, content);
      setUpdates(prev => prev.map(u => u.id === updateId
        ? { ...u, comments: [...(u.comments || []), comment], comment_count: (u.comment_count || 0) + 1 }
        : u
      ));
      addToast('Comment added!');
    } catch (err) {
      addToast('Failed to add comment', 'error');
      throw err;
    }
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '300px' }}>
      <div style={{ color: '#9ca3af' }}>Loading updates...</div>
    </div>
  );

  return (
    <div className="fade-in" style={{ maxWidth: '680px', margin: '0 auto' }}>
      {/* Post new update */}
      <div style={{
        background: 'white', borderRadius: '16px', border: '1px solid #f0f0f5',
        boxShadow: '0 2px 8px rgba(0,0,0,0.04)', padding: '20px', marginBottom: '20px'
      }}>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
          <div style={{
            width: '38px', height: '38px', borderRadius: '50%', flexShrink: 0,
            background: user?.avatar_color || '#6c63ff',
            color: 'white', fontSize: '15px', fontWeight: '700',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            {user?.name?.[0]}
          </div>
          <form onSubmit={handlePost} style={{ flex: 1 }}>
            <textarea
              className="input-field"
              value={newContent}
              onChange={e => setNewContent(e.target.value)}
              placeholder={`What's happening, ${user?.name?.split(' ')[0]}?`}
              rows={3}
              style={{ resize: 'none', marginBottom: '10px' }}
            />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <select
                className="input-field"
                value={newWorkspace}
                onChange={e => setNewWorkspace(e.target.value)}
                style={{ width: 'auto', padding: '6px 12px', fontSize: '13px' }}
                required
              >
                {workspaces.map(w => (
                  <option key={w.id} value={w.id}>{w.emoji} {w.name}</option>
                ))}
              </select>
              <button
                type="submit"
                disabled={posting || !newContent.trim()}
                className="btn-primary"
                style={{
                  padding: '8px 20px', borderRadius: '10px', fontSize: '14px', fontWeight: '600',
                  opacity: (posting || !newContent.trim()) ? 0.6 : 1
                }}
              >
                {posting ? 'Posting...' : 'Post Update'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Updates feed */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {updates.length === 0 ? (
          <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #f0f0f5', padding: '60px', textAlign: 'center' }}>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>💬</div>
            <div style={{ color: '#9ca3af', fontSize: '15px' }}>No updates yet. Be the first to post!</div>
          </div>
        ) : (
          updates.map(upd => (
            <UpdateCard
              key={upd.id}
              update={upd}
              currentUser={user}
              onLike={handleLike}
              onComment={handleComment}
            />
          ))
        )}
      </div>
    </div>
  );
}
