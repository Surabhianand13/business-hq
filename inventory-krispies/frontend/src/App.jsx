import React, { useState, useEffect } from 'react';
import LoginPage from './pages/LoginPage.jsx';
import DispatchPage from './pages/DispatchPage.jsx';
import ClosePage from './pages/ClosePage.jsx';
import HistoryPage from './pages/HistoryPage.jsx';
import CatalogPage from './pages/CatalogPage.jsx';
import Toast from './components/Toast.jsx';
import { setToken, getToken, clearToken } from './api.js';

export default function App() {
  const [authState, setAuthState] = useState('checking'); // checking | granted | denied
  const [supervisor, setSupervisor] = useState(() => localStorage.getItem('supervisor') || '');
  const [page, setPage] = useState('dispatch');
  const [toast, setToast] = useState(null);
  const [sessionId, setSessionId] = useState(null);

  useEffect(() => {
    async function checkAccess() {
      // Check if ?access=KEY is in the URL — verify with backend
      const params = new URLSearchParams(window.location.search);
      const urlKey = params.get('access');

      if (urlKey) {
        // Clean key from URL immediately
        window.history.replaceState({}, '', window.location.pathname);
        try {
          const res = await fetch('/api/auth', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ key: urlKey }),
          });
          if (res.ok) {
            const { token } = await res.json();
            setToken(token);
            setAuthState('granted');
            return;
          }
        } catch {}
        setAuthState('denied');
        return;
      }

      // Already have a token saved — verify it still works
      if (getToken()) {
        try {
          const res = await fetch('/api/items', {
            headers: { 'x-access-token': getToken() },
          });
          if (res.ok) { setAuthState('granted'); return; }
        } catch {}
        clearToken();
      }

      setAuthState('denied');
    }

    checkAccess();
  }, []);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  const handleLogin = (name) => {
    localStorage.setItem('supervisor', name);
    setSupervisor(name);
    setPage('dispatch');
  };

  if (authState === 'checking') {
    return (
      <div className="min-h-screen bg-amber-50 flex items-center justify-center">
        <div className="text-amber-500 text-lg">Loading…</div>
      </div>
    );
  }

  if (authState === 'denied') {
    return (
      <div className="min-h-screen bg-amber-50 flex flex-col items-center justify-center px-6 text-center">
        <div className="text-6xl mb-4">🔒</div>
        <h1 className="text-2xl font-bold text-amber-800 mb-2">Access Restricted</h1>
        <p className="text-gray-500 text-sm max-w-xs">
          This app is for Krispies staff only.<br />Please use the link shared by your manager.
        </p>
      </div>
    );
  }

  if (!supervisor) {
    return <LoginPage onLogin={handleLogin} />;
  }

  const navItems = [
    { key: 'dispatch', label: 'Dispatch', icon: '📦' },
    { key: 'history', label: 'History', icon: '📋' },
    { key: 'catalog', label: 'Catalog', icon: '🗂️' },
  ];

  return (
    <div className="min-h-screen flex flex-col pb-16">
      <div className="flex-1">
        {page === 'dispatch' && (
          <DispatchPage
            supervisor={supervisor}
            showToast={showToast}
            onClose={(sid) => { setSessionId(sid); setPage('close'); }}
          />
        )}
        {page === 'close' && (
          <ClosePage
            sessionId={sessionId}
            showToast={showToast}
            onBack={() => setPage('dispatch')}
            onNewDispatch={() => { setSessionId(null); setPage('dispatch'); }}
          />
        )}
        {page === 'history' && <HistoryPage showToast={showToast} />}
        {page === 'catalog' && <CatalogPage showToast={showToast} />}
      </div>

      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex z-40">
        {navItems.map((item) => (
          <button
            key={item.key}
            onClick={() => setPage(item.key)}
            className={`flex-1 flex flex-col items-center py-3 text-xs font-medium transition-colors ${
              page === item.key || (page === 'close' && item.key === 'dispatch')
                ? 'text-amber-600 bg-amber-50'
                : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            <span className="text-xl mb-0.5">{item.icon}</span>
            {item.label}
          </button>
        ))}
      </nav>

      {toast && <Toast message={toast} />}
    </div>
  );
}
