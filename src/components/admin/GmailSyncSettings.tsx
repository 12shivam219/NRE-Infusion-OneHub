import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import {
  getGmailAuthUrl,
  exchangeCodeForToken,
  saveGmailToken,
  getGmailProfile,
  hasGmailConnected,
  disconnectGmailAccount,
} from '../../lib/api/gmailIntegration';
import { useAuth } from '../../hooks/useAuth';
import { Mail, AlertCircle, CheckCircle, Clock, LogOut, Settings } from 'lucide-react';

interface GmailToken {
  email: string;
  lastSync: string | null;
  isActive: boolean;
  syncFrequency: number;
  confidenceLevel: 'high' | 'medium' | 'low';
}

const GmailSyncSettings: React.FC = () => {
  const { user } = useAuth();
  const [gmailConnected, setGmailConnected] = useState(false);
  const [gmailInfo, setGmailInfo] = useState<GmailToken | null>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [syncFrequency, setSyncFrequency] = useState(15);
  const [confidenceLevel, setConfidenceLevel] = useState<'high' | 'medium' | 'low'>('medium');
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      loadGmailStatus();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Handle OAuth callback
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');

    if (code && user) {
      handleOAuthCallback(code);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  async function loadGmailStatus() {
    try {
      setLoading(true);
      if (!user) return;

      const isConnected = await hasGmailConnected(user.id);

      if (isConnected) {
        setGmailConnected(true);

        // Load token info
        const { data: tokenData, error: tokenError } = await supabase
          .from('gmail_sync_tokens')
          .select('*')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .single();

        if (!tokenError && tokenData) {
          setGmailInfo({
            email: tokenData.gmail_email,
            lastSync: tokenData.last_sync_at,
            isActive: true,
            syncFrequency: tokenData.sync_frequency_minutes,
            confidenceLevel: tokenData.auto_link_confidence_level,
          });
          setSyncFrequency(tokenData.sync_frequency_minutes);
          setConfidenceLevel(tokenData.auto_link_confidence_level);
          setLastSyncTime(tokenData.last_sync_at);
        }
      }

      setError(null);
    } catch (err) {
      console.error('Error loading Gmail status:', err);
      setError(err instanceof Error ? err.message : 'Failed to load Gmail status');
    } finally {
      setLoading(false);
    }
  }

  async function handleOAuthCallback(code: string) {
    try {
      setConnecting(true);
      setError(null);
      if (!user) return;

      // Exchange code for token
      const token = await exchangeCodeForToken(code);

      // Get Gmail profile info
      const profile = await getGmailProfile(token.access_token);

      // Save token to database
      await saveGmailToken(user.id, token, profile.emailAddress, syncFrequency);

      // Update UI
      setGmailConnected(true);
      setGmailInfo({
        email: profile.emailAddress,
        lastSync: null,
        isActive: true,
        syncFrequency: syncFrequency,
        confidenceLevel: confidenceLevel,
      });

      setSuccess('Gmail account connected successfully!');

      // Clear URL
      window.history.replaceState({}, document.title, window.location.pathname);

      // Reload status
      setTimeout(() => loadGmailStatus(), 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect Gmail account');
    } finally {
      setConnecting(false);
    }
  }

  async function handleConnect() {
    try {
      setConnecting(true);
      const authUrl = getGmailAuthUrl();
      window.location.href = authUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start OAuth flow');
      setConnecting(false);
    }
  }

  async function handleDisconnect() {
    if (!user) return;

    try {
      setLoading(true);
      await disconnectGmailAccount(user.id);
      setGmailConnected(false);
      setGmailInfo(null);
      setSuccess('Gmail account disconnected');
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to disconnect Gmail account');
    } finally {
      setLoading(false);
    }
  }

  async function handleSettingsUpdate() {
    if (!user) return;

    try {
      setLoading(true);

      const { error: updateError } = await supabase
        .from('gmail_sync_tokens')
        .update({
          sync_frequency_minutes: syncFrequency,
          auto_link_confidence_level: confidenceLevel,
        })
        .eq('user_id', user.id)
        .eq('is_active', true);

      if (updateError) throw updateError;

      setSuccess('Settings updated successfully!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update settings');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 pb-4 border-b border-gray-200">
        <Mail className="w-6 h-6 text-blue-600" />
        <div>
          <h3 className="text-xl font-semibold text-gray-900">Gmail Integration</h3>
          <p className="text-sm text-gray-600">
            Automatically sync and track emails sent via Gmail for your requirements
          </p>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
          <div>
            <h4 className="font-medium text-red-900">Error</h4>
            <p className="text-sm text-red-700 mt-1">{error}</p>
          </div>
        </div>
      )}

      {/* Success message */}
      {success && (
        <div className="rounded-lg bg-green-50 border border-green-200 p-4 flex items-start gap-3">
          <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-green-700">{success}</p>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      ) : gmailConnected && gmailInfo ? (
        // Connected state
        <div className="space-y-4">
          {/* Connection status */}
          <div className="rounded-lg bg-green-50 border border-green-200 p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <h4 className="font-semibold text-green-900">Connected</h4>
              </div>
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                Active
              </span>
            </div>
            <p className="text-sm text-green-700 font-medium">{gmailInfo.email}</p>
          </div>

          {/* Last sync info */}
          {lastSyncTime && (
            <div className="rounded-lg bg-blue-50 border border-blue-200 p-4">
              <div className="flex items-start gap-3">
                <Clock className="w-5 h-5 text-blue-600 mt-0.5" />
                <div>
                  <h4 className="font-medium text-blue-900">Last Sync</h4>
                  <p className="text-sm text-blue-700">
                    {new Date(lastSyncTime).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Settings */}
          <div className="rounded-lg border border-gray-200 p-4 space-y-4">
            <h4 className="font-semibold text-gray-900 flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Sync Settings
            </h4>

            {/* Sync frequency */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Sync Frequency
              </label>
              <select
                value={syncFrequency}
                onChange={(e) => setSyncFrequency(parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value={5}>Every 5 minutes</option>
                <option value={10}>Every 10 minutes</option>
                <option value={15}>Every 15 minutes</option>
                <option value={30}>Every 30 minutes</option>
                <option value={60}>Every hour</option>
              </select>
              <p className="text-xs text-gray-600 mt-1">
                How often to check for new emails and sync them to requirements
              </p>
            </div>

            {/* Confidence level */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Auto-Link Confidence Level
              </label>
              <select
                value={confidenceLevel}
                onChange={(e) => setConfidenceLevel(e.target.value as 'high' | 'medium' | 'low')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="high">
                  High (95%+) - Only very confident matches are auto-linked
                </option>
                <option value="medium">
                  Medium (70%+) - Good matches are auto-linked, others flagged for review
                </option>
                <option value="low">
                  Low (50%+) - Most matches are auto-linked, low confidence ones flagged
                </option>
              </select>
              <p className="text-xs text-gray-600 mt-1">
                How confident the system should be before automatically linking emails to
                requirements
              </p>
            </div>

            {/* Update button */}
            <button
              onClick={handleSettingsUpdate}
              disabled={loading}
              className="w-full px-4 py-2 bg-primary-800 text-white rounded-lg font-medium hover:bg-primary-900 transition-colors disabled:opacity-50"
            >
              {loading ? 'Updating...' : 'Update Settings'}
            </button>
          </div>

          {/* Disconnect button */}
          <button
            onClick={handleDisconnect}
            disabled={loading}
            className="w-full px-4 py-2 border border-red-300 text-red-700 rounded-lg font-medium hover:bg-red-50 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <LogOut className="w-4 h-4" />
            Disconnect Gmail Account
          </button>
        </div>
      ) : (
        // Not connected state
        <div className="text-center py-8">
          <Mail className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h4 className="text-lg font-semibold text-gray-900 mb-2">Gmail Not Connected</h4>
          <p className="text-gray-600 mb-6">
            Connect your Gmail account to automatically sync and track emails sent for your
            requirements. We'll only read your sent emails and never modify anything.
          </p>
          <button
            onClick={handleConnect}
            disabled={connecting}
            className="px-6 py-3 bg-primary-800 text-white rounded-lg font-medium hover:bg-primary-900 transition-colors inline-flex items-center gap-2 disabled:opacity-50"
          >
            <Mail className="w-4 h-4" />
            {connecting ? 'Connecting...' : 'Connect Gmail Account'}
          </button>
        </div>
      )}
    </div>
  );
};

export default GmailSyncSettings;
