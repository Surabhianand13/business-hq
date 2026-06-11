import { useState, useEffect, createContext, useContext } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import TopBar from './components/TopBar';
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

export const AppContext = createContext(null);

export function useApp() {
  return useContext(AppContext);
}

function AppLayout({ children }) {
  return (
    <div className="flex h-screen overflow-hidden bg-[#f5f5f7]">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar />
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
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
    <AppContext.Provider value={{ user, login, logout, addToast }}>
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
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <div className="fixed bottom-6 right-6 flex flex-col gap-2 z-50">
          {toasts.map(t => <Toast key={t.id} message={t.message} type={t.type} />)}
        </div>
      </BrowserRouter>
    </AppContext.Provider>
  );
}
