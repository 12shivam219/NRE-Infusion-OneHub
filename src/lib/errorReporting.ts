import { supabase } from './supabase';

export const reportError = async (
  error: Error,
  userId?: string
): Promise<void> => {
  try {
    await supabase.from('error_reports').insert({
      user_id: userId || null,
      error_message: error.message,
      error_stack: error.stack || null,
      error_type: error.name,
      url: window.location.href,
      user_agent: navigator.userAgent,
      status: 'new',
    });
  } catch (reportingError) {
    console.error('Failed to report error:', reportingError);
  }
};

export const setupGlobalErrorHandler = (userId?: string): void => {
  window.addEventListener('error', (event) => {
    reportError(
      new Error(event.message),
      userId
    );
  });

  window.addEventListener('unhandledrejection', (event) => {
    reportError(
      new Error(event.reason?.message || 'Unhandled promise rejection'),
      userId
    );
  });
};
