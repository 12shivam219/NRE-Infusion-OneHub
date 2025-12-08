import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { setupGlobalErrorHandler } from './lib/errorReporting';
import { ToastProvider } from './contexts/ToastContext';
import './index.css';

setupGlobalErrorHandler();

document.title = 'NRE Infusion OneHub Suite';

// Temporary debug: wrap global fetch to log Supabase REST requests/responses (development only)
if (import.meta.env.DEV) {
  (() => {
    const originalFetch = window.fetch.bind(window);
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    if (!supabaseUrl) return;

    window.fetch = async (input: string | Request | URL, init?: RequestInit) => {
      // Silent logging in dev mode only
      return await originalFetch(input, init);
    };
  })();
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <ToastProvider>
        <App />
      </ToastProvider>
    </ErrorBoundary>
  </StrictMode>
);
