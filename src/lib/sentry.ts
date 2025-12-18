/**
 * Sentry Configuration for Error Tracking and Performance Monitoring
 * Integrates with Sentry for production error monitoring, crash reporting, and performance insights
 */

import * as Sentry from '@sentry/react';

/**
 * Initialize Sentry for production error tracking
 * Call this as early as possible in your application
 */
export const initSentry = () => {
  const sentryDsn = import.meta.env.VITE_SENTRY_DSN;

  // Only initialize if DSN is provided (production environments)
  if (!sentryDsn) {
    if (import.meta.env.DEV) {
      console.info('Sentry DSN not configured. Error tracking disabled.');
    }
    return;
  }

  Sentry.init({
    dsn: sentryDsn,
    environment: import.meta.env.MODE,
    integrations: [
      new Sentry.Replay({
        maskAllText: true,
        blockAllMedia: true,
      }),
    ],
    // Performance monitoring
    tracesSampleRate: import.meta.env.PROD ? 0.1 : 1.0, // 10% in production, 100% in dev
    replaysSessionSampleRate: 0.1, // Session replay 10% of all sessions
    replaysOnErrorSampleRate: 1.0, // 100% of sessions with errors
    // Release tracking
    release: import.meta.env.VITE_APP_VERSION || '0.0.0',
    // Ignore noise and internal errors
    ignoreErrors: [
      // Browser extensions
      'top.GLOBALS',
      'originalCreateNotification',
      'canvas.contentDocument',
      'MyApp_RemoveAllHighlights',
      // See http://blog.errorception.com/2012/03/tale-of-unfindable-js-error.html
      'Can\'t find variable: ZiteReader',
      'jigsaw is not defined',
      'ComboSearch is not defined',
      // Network errors
      'NetworkError',
      'Network request failed',
    ],
    denyUrls: [
      // Browser extensions
      /extensions\//i,
      /^chrome:\/\//i,
      /^moz-extension:\/\//i,
    ],
  });
};

/**
 * Capture exception and report to Sentry
 * Use this for error handling in try-catch blocks
 */
export const captureException = (error: Error | string, context?: Record<string, unknown>) => {
  Sentry.captureException(error, {
    contexts: context ? { custom: context } : undefined,
  });
};

/**
 * Capture message for non-error situations
 * Useful for tracking important events
 */
export const captureMessage = (message: string, level: 'fatal' | 'error' | 'warning' | 'info' | 'debug' = 'info') => {
  Sentry.captureMessage(message, level);
};

/**
 * Set user context in Sentry
 * Call this after user authentication to track which users are affected by errors
 */
export const setSentryUser = (userId: string, email?: string, username?: string) => {
  Sentry.setUser({
    id: userId,
    email,
    username,
  });
};

/**
 * Clear user context (on logout)
 */
export const clearSentryUser = () => {
  Sentry.setUser(null);
};

/**
 * Add custom context for better error diagnosis
 */
export const addSentryContext = (name: string, data: Record<string, unknown>) => {
  Sentry.setContext(name, data);
};

/**
 * Create a transaction for performance monitoring
 */
export const startSentryTransaction = (name: string, op: string = 'http.request') => {
  const transaction = Sentry.startTransaction({
    name,
    op,
  });
  return transaction;
};

