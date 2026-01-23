import { Suspense, useState, useEffect, useCallback, useRef, lazy } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthProvider';
import { CreateFormProvider } from './contexts/CreateFormContext';
import { ChatProvider } from './contexts/ChatProvider';
import { useAuth } from './hooks/useAuth';
import { useToast } from './contexts/ToastContext';
import { LogoLoader } from './components/common/LogoLoader';
import { ThemeSyncProvider, useThemeSync, resolveThemeKeyFromRoute } from './contexts/ThemeSyncContext';
import { AdaptiveAtmosphereProvider } from './contexts/AdaptiveAtmosphereContext';
import { usePrefersReducedMotion } from './hooks/usePrefersReducedMotion';
import {
  LazyDashboard,
  LazyDocumentsPage,
  LazyCRMPage,
  LazyAdminPage,
} from './lib/lazyLoader';

// ⚡ Lazy load all heavy components to defer loading until needed
const LazyHeader = lazy(() => import('./components/layout/Header').then(m => ({ default: m.Header })));
const LazyLoginForm = lazy(() => import('./components/auth/LoginForm').then(m => ({ default: m.LoginForm })));
const LazyRegisterForm = lazy(() => import('./components/auth/RegisterForm').then(m => ({ default: m.RegisterForm })));
const LazyOfflineIndicator = lazy(() => import('./components/common/OfflineIndicator').then(m => ({ default: m.OfflineIndicator })));
const LazySyncErrorHandler = lazy(() => import('./components/common/SyncErrorHandler').then(m => ({ default: m.SyncErrorHandler })));
const LazySyncQueueModal = lazy(() => import('./components/common/SyncQueueModal').then(m => ({ default: m.SyncQueueModal })));
const LazySkipLinks = lazy(() => import('./components/common/SkipLinks').then(m => ({ default: m.SkipLinks })));
// Startup guide removed: no lazy import to prevent startup notification
const LazyModernSidebar = lazy(() => import('./components/layout/ModernSidebar').then(m => ({ default: m.ModernSidebar })));
const LazyFloatingChat = lazy(() => import('./components/chat/FloatingChat').then(m => ({ default: m.FloatingChat })));

type AuthView = 'login' | 'register';

// Protected route wrapper for admin pages
const AdminRoute = ({ children, isAdmin }: { children: React.ReactNode; isAdmin: boolean }) => {
  if (!isAdmin) {
    return <Navigate to="/crm" replace />;
  }
  return children;
};

const RouteSuspenseFallback = ({ onStart, onStop }: { onStart: () => void; onStop: () => void }) => {
  useEffect(() => {
    onStart();
    return () => {
      onStop();
    };
  }, [onStart, onStop]);

  return <LogoLoader fullScreen size="lg" showText label="Loading..." />;
};

const AppContent = () => {
  const { user, isLoading, refreshUser, isAdmin } = useAuth();
  const { showToast } = useToast();
  const [authView, setAuthView] = useState<AuthView>('login');
  const [hasShownOfflineToast, setHasShownOfflineToast] = useState(false);
  const hasShownOfflineToastRef = useRef(false);
  const location = useLocation();
  const { setTheme, clearPreview } = useThemeSync();
  const prefersReducedMotion = usePrefersReducedMotion();
  const [isRouteLoading, setIsRouteLoading] = useState(false);
  const shouldReduceMotion = prefersReducedMotion || isRouteLoading;

  // Update ref when state changes
  useEffect(() => {
    hasShownOfflineToastRef.current = hasShownOfflineToast;
  }, [hasShownOfflineToast]);

  const handleThemeUpdate = useCallback(() => {
    const key = resolveThemeKeyFromRoute(location.pathname, location.search);
    setTheme(key);
    clearPreview();
    window.dispatchEvent(new CustomEvent('adaptive-module-change', { detail: { key } }));
  }, [clearPreview, location.pathname, location.search, setTheme]);

  useEffect(() => {
    handleThemeUpdate();
  }, [handleThemeUpdate]);

  useEffect(() => {
    const root = document.documentElement;
    if (!root) return;
    if (shouldReduceMotion) {
      root.classList.add('reduce-motion');
    } else {
      root.classList.remove('reduce-motion');
    }
  }, [shouldReduceMotion]);


  // Listen for offline mode activation and show toast notification
  const handleOfflineActivation = useCallback(() => {
    if (!hasShownOfflineToastRef.current && user) {
      showToast({
        type: 'info',
        title: 'Offline Mode Active',
        message: 'You can continue working offline. Changes will sync automatically when you\'re back online.',
        durationMs: 6000,
      });
      hasShownOfflineToastRef.current = true;
      setHasShownOfflineToast(true);
    }
  }, [user, showToast]);

  useEffect(() => {
    window.addEventListener('offline-mode-activated', handleOfflineActivation);
    return () => {
      window.removeEventListener('offline-mode-activated', handleOfflineActivation);
    };
  }, [handleOfflineActivation]);

  const handleRouteLoadingStart = useCallback(() => setIsRouteLoading(true), []);
  const handleRouteLoadingStop = useCallback(() => setIsRouteLoading(false), []);

  if (isLoading) {
    return <LogoLoader fullScreen size="xl" showText label="Loading Application" />;
  }

  if (!user) {
    if (authView === 'login') {
      return (
        <Suspense fallback={<LogoLoader fullScreen size="xl" showText label="Loading Login" />}>
          <LazyLoginForm
            onSuccess={() => refreshUser()}
            onSwitchToRegister={() => setAuthView('register')}
          />
        </Suspense>
      );
    } else {
      return (
        <Suspense fallback={<LogoLoader fullScreen size="xl" showText label="Loading Register" />}>
          <LazyRegisterForm
            onSwitchToLogin={() => setAuthView('login')}
          />
        </Suspense>
      );
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden text-amber-50" style={{
      backgroundColor: 'var(--bg)',
      transition: shouldReduceMotion ? undefined : 'background-color 100ms linear'
    }}>
      <Suspense fallback={null}>
        <LazySkipLinks />
      </Suspense>

      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className="absolute inset-0 transition-opacity duration-500"
          style={{
            background: 'linear-gradient(140deg, var(--nre-gradient-start), var(--nre-gradient-end))',
            opacity: 0.92,
          }}
        />
        <div
          className="absolute -inset-[45%] opacity-90"
          style={{
            background:
              'radial-gradient(circle at 18% 22%, var(--nre-ambient) 0%, transparent 58%), radial-gradient(circle at 78% 12%, var(--nre-ambient-secondary) 0%, transparent 60%)',
            animation: shouldReduceMotion ? 'none' : 'nre-gradient-pan var(--nre-gradient-duration) linear infinite',
            mixBlendMode: 'screen',
          }}
        />
        <div
          className="absolute inset-x-0 bottom-[-28%] h-[55vh] transition-opacity duration-500"
          style={{
            background:
              'radial-gradient(circle at 50% 0%, var(--nre-ambient-secondary) 0%, transparent 70%)',
          }}
        />
        <div className="adaptive-haze" />
        <div className="adaptive-system-overlay" />
      </div>

      <div className="relative z-10 flex min-h-screen flex-col">
      <Suspense fallback={<div style={{ height: '72px' }} />}>
        <LazyHeader />
      </Suspense>

      {/* Modern Sidebar Navigation */}
      <Suspense fallback={null}>
        <LazyModernSidebar />
      </Suspense>

      <main
        id="main-content"
        role="main"
        className="flex-1 overflow-y-auto md:ml-64"
        style={{
          backgroundColor: 'var(--surface)',
          transition: shouldReduceMotion ? undefined : 'background-color 100ms linear',
          marginTop: '72px',
          minHeight: 'calc(100vh - 72px)',
        }}
      >
        <Suspense
          fallback={
            <RouteSuspenseFallback
              onStart={handleRouteLoadingStart}
              onStop={handleRouteLoadingStop}
            />
          }
        >
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
            {/* Redirect root to Dashboard for all authenticated users */}
            <Route
              path="/"
              element={<Navigate to="/dashboard" replace />}
            />
            {/* Catch all - redirect to home */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </main>
      </div>

      {/* Startup guide removed: no notification shown on startup */}

      {/* Floating Chat Widget */}
      <Suspense fallback={null}>
        <LazyFloatingChat />
      </Suspense>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <ThemeSyncProvider>
        <AdaptiveAtmosphereProvider>
          <CreateFormProvider>
            <Suspense fallback={null}>
              <ChatProvider>
                <AppContent />
              </ChatProvider>
            </Suspense>
            <Suspense fallback={null}>
              <LazySyncQueueModal />
            </Suspense>
            {/* Offline indicator and sync error handler shown even before authentication */}
            <Suspense fallback={null}>
              <LazyOfflineIndicator />
            </Suspense>
            <Suspense fallback={null}>
              <LazySyncErrorHandler />
            </Suspense>
          </CreateFormProvider>
        </AdaptiveAtmosphereProvider>
      </ThemeSyncProvider>
    </AuthProvider>
  );
}
  
export default App;