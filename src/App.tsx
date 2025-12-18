import { Suspense, useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthProvider';
import { useAuth } from './hooks/useAuth';
import { useToast } from './contexts/ToastContext';
import { LoginForm } from './components/auth/LoginForm';
import { RegisterForm } from './components/auth/RegisterForm';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { LoadingSpinner } from './components/common/LoadingSpinner';
import { OfflineIndicator } from './components/common/OfflineIndicator';
import { SyncErrorHandler } from './components/common/SyncErrorHandler';
import { SyncQueueModal } from './components/common/SyncQueueModal';
import { SkipLinks } from './components/common/SkipLinks';
import {
  LazyDashboard,
  LazyDocumentsPage,
  LazyCRMPage,
  LazyAdminPage,
} from './lib/lazyLoader';

type AuthView = 'login' | 'register';

// Protected route wrapper for admin pages
const AdminRoute = ({ children, isAdmin }: { children: React.ReactNode; isAdmin: boolean }) => {
  if (!isAdmin) {
    return <Navigate to="/crm" replace />;
  }
  return children;
};

const AppContent = () => {
  const { user, isLoading, refreshUser, isAdmin, isMarketing } = useAuth();
  const { showToast } = useToast();
  const [authView, setAuthView] = useState<AuthView>('login');
  const [hasShownOfflineToast, setHasShownOfflineToast] = useState(false);
  // Sidebar state: true = expanded, false = collapsed
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(() => {
    // Load sidebar preference from localStorage
    const saved = localStorage.getItem('sidebarExpanded');
    return saved ? JSON.parse(saved) : true; // Default: expanded
  });

  // Save sidebar preference to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('sidebarExpanded', JSON.stringify(isSidebarExpanded));
  }, [isSidebarExpanded]);

  // Listen for offline mode activation and show toast notification
  useEffect(() => {
    const handleOfflineActivation = () => {
      if (!hasShownOfflineToast && user) {
        showToast({
          type: 'info',
          title: 'Offline Mode Active',
          message: 'You can continue working offline. Changes will sync automatically when you\'re back online.',
          durationMs: 6000,
        });
        setHasShownOfflineToast(true);
      }
    };

    window.addEventListener('offline-mode-activated', handleOfflineActivation);
    return () => {
      window.removeEventListener('offline-mode-activated', handleOfflineActivation);
    };
  }, [user, hasShownOfflineToast, showToast]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
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

  return (
    <div className="flex h-screen">
      <SkipLinks />
      <Sidebar
        isOpen={isSidebarExpanded}
        onToggle={() => setIsSidebarExpanded(!isSidebarExpanded)}
      />

      <div className="flex-1 flex flex-col overflow-hidden">
        <Header onMenuClick={() => setIsSidebarExpanded(!isSidebarExpanded)} />

        <main id="main-content" role="main" className="flex-1 overflow-y-auto">
          <Suspense fallback={<div className="flex items-center justify-center h-full"><LoadingSpinner /></div>}>
            <Routes>
              <Route path="/dashboard" element={<LazyDashboard />} />
              <Route path="/documents" element={<LazyDocumentsPage />} />
              <Route path="/crm" element={<LazyCRMPage />} />
              <Route
                path="/admin"
                element={
                  <AdminRoute isAdmin={isAdmin}>
                    <LazyAdminPage />
                  </AdminRoute>
                }
              />
              {/* Redirect root to default based on role */}
              <Route
                path="/"
                element={
                  isMarketing || user?.role === 'user' ? (
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
    </div>
  );
};

function App() {
  return (
    <AuthProvider>
      <AppContent />
      <SyncQueueModal />
      {/* Offline indicator and sync error handler shown even before authentication */}
      <OfflineIndicator />
      <SyncErrorHandler />
    </AuthProvider>
  );
}

export default App;
