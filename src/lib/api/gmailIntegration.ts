/**
 * Gmail OAuth and API utilities
 * Handles authentication, token management, and API communication
 */

import { supabase } from '../supabase';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = import.meta.env.VITE_GOOGLE_CLIENT_SECRET;
const GOOGLE_REDIRECT_URI = import.meta.env.VITE_GOOGLE_REDIRECT_URI || `${window.location.origin}/oauth/callback`;

interface GmailToken {
  access_token: string;
  refresh_token: string;
  expires_at: number;
}

interface GmailMessage {
  id: string;
  threadId: string;
  labelIds: string[];
  snippet: string;
  payload: {
    partId: string;
    mimeType: string;
    filename: string;
    headers: Array<{
      name: string;
      value: string;
    }>;
    body: {
      size: number;
      data?: string;
    };
    parts?: unknown[];
  };
  internalDate: string;
  historyId: string;
  sizeEstimate: number;
}

/**
 * Generate OAuth authorization URL
 */
function getGmailAuthUrl(): string {
  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: GOOGLE_REDIRECT_URI,
    response_type: 'code',
    scope: 'https://www.googleapis.com/auth/gmail.readonly',
    access_type: 'offline',
    prompt: 'consent', // Force consent screen to get refresh token
  });

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

/**
 * Exchange authorization code for tokens
 */
async function exchangeCodeForToken(code: string): Promise<GmailToken> {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      code,
      grant_type: 'authorization_code',
      redirect_uri: GOOGLE_REDIRECT_URI,
    }).toString(),
  });

  if (!response.ok) {
    throw new Error(`Failed to exchange code for token: ${response.status}`);
  }

  const data = (await response.json()) as {
    access_token: string;
    refresh_token?: string;
    expires_in: number;
  };

  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token || '',
    expires_at: Date.now() + data.expires_in * 1000,
  };
}

/**
 * Refresh access token using refresh token
 */
async function refreshAccessToken(refreshToken: string): Promise<GmailToken> {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }).toString(),
  });

  if (!response.ok) {
    throw new Error(`Failed to refresh token: ${response.status}`);
  }

  const data = (await response.json()) as {
    access_token: string;
    expires_in: number;
  };

  return {
    access_token: data.access_token,
    refresh_token: refreshToken, // Refresh token stays the same
    expires_at: Date.now() + data.expires_in * 1000,
  };
}

/**
 * Get user's Gmail profile info
 */
async function getGmailProfile(accessToken: string): Promise<{ emailAddress: string }> {
  const response = await fetch('https://www.googleapis.com/gmail/v1/users/me/profile', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to get Gmail profile: ${response.status}`);
  }

  return response.json();
}

/**
 * List Gmail messages
 */
async function listGmailMessages(
  accessToken: string,
  options: {
    query?: string;
    maxResults?: number;
    pageToken?: string;
  } = {}
): Promise<{
  messages: Array<{ id: string; threadId: string }>;
  nextPageToken?: string;
  resultSizeEstimate: number;
}> {
  const params = new URLSearchParams({
    maxResults: (options.maxResults || 100).toString(),
    q: options.query || 'from:me', // Only sent emails by default
  });

  if (options.pageToken) {
    params.append('pageToken', options.pageToken);
  }

  const response = await fetch(
    `https://www.googleapis.com/gmail/v1/users/me/messages?${params.toString()}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to list Gmail messages: ${response.status}`);
  }

  return response.json();
}

/**
 * Get full Gmail message details
 */
async function getGmailMessage(
  accessToken: string,
  messageId: string
): Promise<GmailMessage> {
  const response = await fetch(
    `https://www.googleapis.com/gmail/v1/users/me/messages/${messageId}?format=full`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to get Gmail message: ${response.status}`);
  }

  return response.json();
}

/**
 * Save Gmail token to database
 */
async function saveGmailToken(
  userId: string,
  gmailToken: GmailToken,
  gmailEmail: string,
  syncFrequencyMinutes: number = 15
): Promise<void> {
  const { error } = await supabase.from('gmail_sync_tokens').upsert(
    {
      user_id: userId,
      access_token: gmailToken.access_token,
      refresh_token: gmailToken.refresh_token,
      token_expires_at: new Date(gmailToken.expires_at).toISOString(),
      gmail_email: gmailEmail,
      is_active: true,
      sync_frequency_minutes: syncFrequencyMinutes,
    },
    { onConflict: 'user_id' }
  );

  if (error) {
    throw new Error(`Failed to save Gmail token: ${error.message}`);
  }
}

/**
 * Get stored Gmail token for user
 */
async function getStoredGmailToken(userId: string): Promise<GmailToken | null> {
  const { data, error } = await supabase
    .from('gmail_sync_tokens')
    .select('access_token, refresh_token, token_expires_at')
    .eq('user_id', userId)
    .eq('is_active', true)
    .single();

  if (error || !data) {
    return null;
  }

  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: new Date(data.token_expires_at).getTime(),
  };
}

/**
 * Check if token needs refresh
 */
function isTokenExpired(expiresAt: number): boolean {
  // Consider token expired if less than 5 minutes remaining
  return expiresAt - Date.now() < 5 * 60 * 1000;
}

/**
 * Disconnect Gmail account
 */
async function disconnectGmailAccount(userId: string): Promise<void> {
  const { error } = await supabase
    .from('gmail_sync_tokens')
    .update({ is_active: false })
    .eq('user_id', userId);

  if (error) {
    throw new Error(`Failed to disconnect Gmail account: ${error.message}`);
  }
}

/**
 * Check if user has Gmail account connected
 */
async function hasGmailConnected(userId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('gmail_sync_tokens')
    .select('id')
    .eq('user_id', userId)
    .eq('is_active', true)
    .single();

  return !error && !!data;
}

export {
  getGmailAuthUrl,
  exchangeCodeForToken,
  refreshAccessToken,
  getGmailProfile,
  listGmailMessages,
  getGmailMessage,
  saveGmailToken,
  getStoredGmailToken,
  isTokenExpired,
  disconnectGmailAccount,
  hasGmailConnected,
};

export type { GmailToken, GmailMessage };
