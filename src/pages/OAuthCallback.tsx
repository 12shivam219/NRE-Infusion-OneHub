import { useEffect } from 'react';
import { Mail } from 'lucide-react';

/**
 * OAuth Callback Page
 * Handles the redirect from Google OAuth consent screen
 * The GmailSyncSettings component handles the actual token exchange
 */

export default function OAuthCallback() {
  useEffect(() => {
    // The auth code is in the URL parameters
    // GmailSyncSettings component (which may be open) will handle it automatically
    // After a brief delay, redirect to admin panel
    const timer = setTimeout(() => {
      window.location.href = '/admin';
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="text-center space-y-6">
        <div className="flex justify-center">
          <div className="p-4 bg-white rounded-full shadow-lg">
            <Mail className="w-12 h-12 text-blue-600 animate-bounce" />
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-gray-900">Connecting Gmail</h1>
          <p className="text-lg text-gray-600">
            Authenticating your account...
          </p>
        </div>

        <div className="flex justify-center">
          <div className="space-y-3">
            <div className="flex items-center gap-3 text-gray-700">
              <div className="w-3 h-3 rounded-full bg-blue-600 animate-pulse"></div>
              <span>Exchanging authorization code</span>
            </div>
            <div className="flex items-center gap-3 text-gray-700">
              <div className="w-3 h-3 rounded-full bg-blue-600 animate-pulse" style={{ animationDelay: '0.2s' }}></div>
              <span>Saving secure tokens</span>
            </div>
            <div className="flex items-center gap-3 text-gray-700">
              <div className="w-3 h-3 rounded-full bg-blue-600 animate-pulse" style={{ animationDelay: '0.4s' }}></div>
              <span>Redirecting to admin panel</span>
            </div>
          </div>
        </div>

        <p className="text-sm text-gray-500">
          If you're not redirected automatically, <a href="/admin" className="text-blue-600 hover:underline">click here</a>
        </p>
      </div>
    </div>
  );
}
