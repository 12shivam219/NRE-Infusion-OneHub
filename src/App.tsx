import { Suspense, useState, useEffect, useLayoutEffect, useRef, useCallback, useMemo, lazy } from 'react';
import { Command as CommandIcon, X as CloseIcon } from 'lucide-react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthProvider';
import { useAuth } from './hooks/useAuth';
import { useToast } from './contexts/ToastContext';
import { LoginForm } from './components/auth/LoginForm';
import { RegisterForm } from './components/auth/RegisterForm';
import { LogoLoader } from './components/common/LogoLoader';
import { OfflineIndicator } from './components/common/OfflineIndicator';
import { SyncErrorHandler } from './components/common/SyncErrorHandler';
import { SyncQueueModal } from './components/common/SyncQueueModal';
import { SkipLinks } from './components/common/SkipLinks';
import { CommandNavigation } from './components/navigation/CommandNavigation';
import { ThemeSyncProvider, useThemeSync, resolveThemeKeyFromRoute } from './contexts/ThemeSyncContext';
import { AdaptiveAtmosphereProvider } from './contexts/AdaptiveAtmosphereContext';
import { usePrefersReducedMotion } from './hooks/usePrefersReducedMotion';
import {
  LazyDashboard,
  LazyDocumentsPage,
  LazyCRMPage,
  LazyAdminPage,
} from './lib/lazyLoader';

// Lazy load Header to reduce initial bundle size
const LazyHeader = lazy(() => import('./components/layout/Header').then(m => ({ default: m.Header })));

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
  const [isCommandVisible, setCommandVisible] = useState(false);
  const isInitializedRef = useRef(false);
  const { setTheme, clearPreview, theme } = useThemeSync();
  const commandSectionRef = useRef<HTMLDivElement | null>(null);
  const prefersReducedMotion = usePrefersReducedMotion();
  const [isRouteLoading, setIsRouteLoading] = useState(false);
  // Memoize theme properties to prevent unnecessary re-renders
  const { accentSoft, accentGlow, onAccent } = useMemo(() => ({
    accentSoft: theme.accentSoft,
    accentGlow: theme.accentGlow,
    onAccent: theme.onAccent,
  }), [theme.accentSoft, theme.accentGlow, theme.onAccent]);
  const shouldReduceMotion = prefersReducedMotion || isRouteLoading;

  // Update ref when state changes
  useEffect(() => {
    hasShownOfflineToastRef.current = hasShownOfflineToast;
  }, [hasShownOfflineToast]);

  const signalCommandInteraction = useCallback(() => {
    window.dispatchEvent(new CustomEvent('adaptive-command-interaction'));
  }, []);

  const handleThemeUpdate = useCallback(() => {
    const key = resolveThemeKeyFromRoute(location.pathname, location.search);
    setTheme(key);
    clearPreview();
    window.dispatchEvent(new CustomEvent('adaptive-module-change', { detail: { key } }));
  }, [clearPreview, location.pathname, location.search, setTheme]);

  useEffect(() => {
    handleThemeUpdate();
  }, [handleThemeUpdate]);

  // Hide command center when navigating to a different page
  useLayoutEffect(() => {
    if (!isInitializedRef.current) {
      isInitializedRef.current = true;
      return;
    }
    // Only hide command when location actually changes
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCommandVisible(false);
    signalCommandInteraction();
  }, [location.pathname, location.search, signalCommandInteraction]);

  const handleCommandVisibilityChange = useCallback(() => {
    if (isCommandVisible) {
      commandSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    signalCommandInteraction();
  }, [isCommandVisible, signalCommandInteraction]);

  useEffect(() => {
    handleCommandVisibilityChange();
  }, [isCommandVisible, handleCommandVisibilityChange]);

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
      signalCommandInteraction();
    }
  }, [user, showToast, signalCommandInteraction]);

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
    <div className="relative min-h-screen overflow-hidden text-amber-50" style={{
      backgroundColor: 'var(--bg)',
      transition: shouldReduceMotion ? undefined : 'background-color 100ms linear'
    }}>
      <SkipLinks />

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

        <div className="relative flex flex-1 flex-col">
          {isCommandVisible ? (
            <section
              ref={commandSectionRef}
              className="relative mx-auto flex w-full max-w-6xl flex-1 flex-col justify-center"
            >
              <div className="mb-6 flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setCommandVisible(false);
                    signalCommandInteraction();
                  }}
                  className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-black/70 text-white shadow-[0_18px_46px_rgba(0,0,0,0.45)] backdrop-blur-xl transition-transform duration-300 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
                  style={{
                    backgroundColor: accentSoft,
                    color: '#FFFFFF',
                    boxShadow: `0 18px calc(46px * var(--nre-glow-scale, 1)) ${accentGlow}`,
                  }}
                  aria-label="Close Orbital Command Center"
                >
                  <CloseIcon className="h-5 w-5" />
                </button>
              </div>
              <CommandNavigation onNavigate={() => {
                setCommandVisible(false);
                signalCommandInteraction();
              }} />
            </section>
          ) : (
            <main
              id="main-content"
              role="main"
              className="flex-1 overflow-y-auto"
              style={{
                backgroundColor: 'var(--surface)',
                transition: shouldReduceMotion ? undefined : 'background-color 100ms linear',
                marginTop: '72px',
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
          )}
        </div>
      </div>

      {!isCommandVisible ? (
        <button
          type="button"
          onClick={() => {
            setCommandVisible(true);
            signalCommandInteraction();
          }}
          className="fixed bottom-6 right-6 z-40 inline-flex h-14 w-14 items-center justify-center rounded-full bg-black/70 text-white shadow-[0_16px_45px_rgba(0,0,0,0.45)] backdrop-blur-xl transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_24px_55px_rgba(0,0,0,0.55)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
          style={{
            backgroundColor: accentSoft,
            color: onAccent,
            boxShadow: `0 20px calc(52px * var(--nre-glow-scale, 1)) ${accentGlow}`,
          }}
          aria-label="Re-open Orbital Command Center"
        >
          <CommandIcon className="h-5 w-5" />
        </button>
      ) : null}
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <ThemeSyncProvider>
        <AdaptiveAtmosphereProvider>
          <AppContent />
          <SyncQueueModal />
          {/* Offline indicator and sync error handler shown even before authentication */}
          <OfflineIndicator />
          <SyncErrorHandler />
        </AdaptiveAtmosphereProvider>
      </ThemeSyncProvider>
    </AuthProvider>
  );
}
  
export default App;