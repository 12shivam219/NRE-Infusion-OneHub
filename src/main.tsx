import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { setupGlobalErrorHandler } from './lib/errorReporting';
import './index.css';

setupGlobalErrorHandler();

document.title = 'NRE Infusion OneHub Suite';

// Temporary debug: wrap global fetch to log Supabase REST requests/responses
(() => {
  const originalFetch = window.fetch.bind(window);
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  if (!supabaseUrl) return;

  window.fetch = async (input: string | Request | URL, init?: RequestInit) => {
    try {
      const url = typeof input === 'string' ? input : input instanceof Request ? input.url : String(input);
      // Only log requests to the Supabase REST endpoint for users
      if (url.startsWith(supabaseUrl) && url.includes('/rest/v1/users')) {
        console.log('[FETCH WRAP] Request:', { url, init });
        const reqBody = init?.body;
        if (reqBody) {
          try {
            const bodyText = typeof reqBody === 'string' ? reqBody : JSON.stringify(reqBody);
            console.log('[FETCH WRAP] Request body:', bodyText);
          } catch (e) {
            console.log('[FETCH WRAP] Request body parse failed', e);
          }
        }
        const resp = await originalFetch(input, init);
        const clone = resp.clone();
        let text = '';
        try {
          text = await clone.text();
        } catch (e) {
          text = '<unreadable body>';
        }
        console.log('[FETCH WRAP] Response:', { url, status: resp.status, body: text });
        return resp;
      }
      return await originalFetch(input, init);
    } catch (err) {
      console.error('[FETCH WRAP] fetch error', err);
      throw err;
    }
  };
})();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>
);
