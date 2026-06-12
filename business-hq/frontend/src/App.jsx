import { useState, createContext, useContext } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import TopBar from './components/TopBar';
import BottomNav from './components/BottomNav';
import MobileTopBar from './components/MobileTopBar';
import Toast from './components/Toast';
import LoginPage from './pages/LoginPage';
import Dashboard from './pages/Dashboard';
import TasksPage from './pages/TasksPage';
import MeetingsPage from './pages/MeetingsPage';
import UpdatesPage from './pages/UpdatesPage';
import TeamPage from './pages/TeamPage';
import SettingsPage from './pages/SettingsPage';
import ReportsPage from './pages/ReportsPage';
import SalesPipelinePage from './pages/SalesPipelinePage';
import KrispiesSalesPage from './pages/KrispiesSalesPage';
import KrispiesCompliancePage from './pages/KrispiesCompliancePage';
import KrispiesRenewalsPage from './pages/KrispiesRenewalsPage';

export const AppContext = createContext(null);

export function useApp() {
  return useContext(AppContext);
}

function AppLayout({ children }) {
  const { sidebarOpen, setSidebarOpen } = useApp();
  return (
    <>
      {/* ── DESKTOP LAYOUT (≥ 768px) ── */}
      <div className="desktop-layout" style={{
        display: 'flex', height: '100vh', overflow: 'hidden', background: '#f5f5f7'
      }}>
        <div
          className={`sidebar-overlay ${sidebarOpen ? 'open' : ''}`}
          onClick={() => setSidebarOpen(false)}
        />
        <Sidebar />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
          <TopBar />
          <main className="page-main" style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
            {children}
          </main>
        </div>
      </div>

      {/* ── MOBILE LAYOUT (< 768px) ── */}
      <div className="mobile-layout" style={{
        display: 'none', flexDirection: 'column',
        height: '100vh', background: '#f5f5f7', overflow: 'hidden'
      }}>
        <MobileTopBar />
        <main style={{
          flex: 1, overflowY: 'auto',
          padding: '16px 16px calc(80px + env(safe-area-inset-bottom)) 16px'
        }}>
          {children}
        </main>
        <BottomNav />
      </div>
    </>
  );
}

function ProtectedRoute({ children }) {
  const { user } = useApp();
  if (!user) return <Navigate to="/login" replace />;
  return <AppLayout>{children}</AppLayout>;
}

export default function App() {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('hq_user');
      return stored ? JSON.parse(stored) : null;
    } catch { return null; }
  });
  const [toasts, setToasts] = useState([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  function login(userData, token) {
    localStorage.setItem('hq_token', token);
    localStorage.setItem('hq_user', JSON.stringify(userData));
    setUser(userData);
  }

  function logout() {
    localStorage.removeItem('hq_token');
    localStorage.removeItem('hq_user');
    setUser(null);
  }

  function addToast(message, type = 'success') {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500);
  }

  return (
    <AppContext.Provider value={{ user, login, logout, addToast, sidebarOpen, setSidebarOpen }}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={user ? <Navigate to="/" replace /> : <LoginPage />} />
          <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/tasks" element={<ProtectedRoute><TasksPage /></ProtectedRoute>} />
          <Route path="/meetings" element={<ProtectedRoute><MeetingsPage /></ProtectedRoute>} />
          <Route path="/updates" element={<ProtectedRoute><UpdatesPage /></ProtectedRoute>} />
          <Route path="/team" element={<ProtectedRoute><TeamPage /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
          <Route path="/reports" element={<ProtectedRoute><ReportsPage /></ProtectedRoute>} />
          <Route path="/pipeline" element={<ProtectedRoute><SalesPipelinePage /></ProtectedRoute>} />
          <Route path="/krispies-sales" element={<ProtectedRoute><KrispiesSalesPage /></ProtectedRoute>} />
          <Route path="/krispies-compliance" element={<ProtectedRoute><KrispiesCompliancePage /></ProtectedRoute>} />
          <Route path="/krispies-renewals" element={<ProtectedRoute><KrispiesRenewalsPage /></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        {/* Toasts */}
        <div style={{ position: 'fixed', bottom: '90px', right: '16px', display: 'flex', flexDirection: 'column', gap: '8px', zIndex: 9999 }}>
          {toasts.map(t => <Toast key={t.id} message={t.message} type={t.type} />)}
        </div>
      </BrowserRouter>
    </AppContext.Provider>
  );
}
