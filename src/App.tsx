import { Suspense, useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { useAuth } from './hooks/useAuth';
import { LoginForm } from './components/auth/LoginForm';
import { RegisterForm } from './components/auth/RegisterForm';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { LoadingSpinner } from './components/common/LoadingSpinner';
import {
  LazyDashboard,
  LazyDocumentsPage,
  LazyCRMPage,
  LazyAdminPage,
} from './lib/lazyLoader';

type AuthView = 'login' | 'register';

const AppContent = () => {
  const { user, isLoading, refreshUser, isAdmin, isMarketing } = useAuth();
  const navigate = useNavigate();
  const [authView, setAuthView] = useState<AuthView>('login');
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    // Load sidebar preference from localStorage
    const saved = localStorage.getItem('sidebarCollapsed');
    return saved ? JSON.parse(saved) : true; // Default: expanded (true means visible)
  });

  // Redirect to default page on first login based on role
  useEffect(() => {
    if (user) {
      const role = (user as { role?: string }).role;
      // Check if we're on root path - if so, redirect to appropriate page
      if (window.location.pathname === '/') {
        if (role === 'marketing' || role === 'user') {
          navigate('/crm', { replace: true });
        } else {
          navigate('/dashboard', { replace: true });
        }
      }
    }
  }, [user, navigate]);

  // Save sidebar preference to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('sidebarCollapsed', JSON.stringify(sidebarOpen));
  }, [sidebarOpen]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (!user) {
    if (authView === 'login') {
      return (
        <LoginForm
          onSuccess={() => refreshUser()}
          onSwitchToRegister={() => setAuthView('register')}
        />
      );
    } else {
      return (
        <RegisterForm
          onSwitchToLogin={() => setAuthView('login')}
        />
      );
    }
  }

  // Protected route wrapper for admin pages
  const AdminRoute = ({ children }: { children: React.ReactNode }) => {
    if (!isAdmin) {
      return <Navigate to="/crm" replace />;
    }
    return children;
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
      />

      <div className="flex-1 flex flex-col overflow-hidden">
        <Header onMenuClick={() => setSidebarOpen(!sidebarOpen)} />

        <main className="flex-1 overflow-y-auto">
          <Suspense fallback={<div className="flex items-center justify-center h-full"><LoadingSpinner /></div>}>
            <Routes>
              <Route path="/dashboard" element={<LazyDashboard />} />
              <Route path="/documents" element={<LazyDocumentsPage />} />
              <Route path="/crm" element={<LazyCRMPage />} />
              <Route
                path="/admin"
                element={
                  <AdminRoute>
                    <LazyAdminPage />
                  </AdminRoute>
                }
              />
              {/* Redirect root to default based on role */}
              <Route
                path="/"
                element={
                  isMarketing || (user as { role?: string }).role === 'user' ? (
                    <Navigate to="/crm" replace />
                  ) : (
                    <Navigate to="/dashboard" replace />
                  )
                }
              />
              {/* Catch all - redirect to home */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </main>
      </div>

      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
};

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
