import { supabase } from './supabase';
import type { UserRole, UserStatus } from './database.types';

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  status: UserStatus;
  email_verified: boolean;
  origin_ip: string | null;
}

export interface AuthResponse {
  success: boolean;
  user?: User;
  error?: string;
  requiresVerification?: boolean;
}

const hashPassword = async (password: string): Promise<string> => {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

const parseUserAgent = (userAgent: string) => {
  const ua = userAgent.toLowerCase();

  let browser = 'Unknown';
  if (ua.includes('firefox')) browser = 'Firefox';
  else if (ua.includes('chrome')) browser = 'Chrome';
  else if (ua.includes('safari')) browser = 'Safari';
  else if (ua.includes('edge')) browser = 'Edge';

  let os = 'Unknown';
  if (ua.includes('windows')) os = 'Windows';
  else if (ua.includes('mac')) os = 'macOS';
  else if (ua.includes('linux')) os = 'Linux';
  else if (ua.includes('android')) os = 'Android';
  else if (ua.includes('ios') || ua.includes('iphone')) os = 'iOS';

  let device = 'Desktop';
  if (ua.includes('mobile')) device = 'Mobile';
  else if (ua.includes('tablet')) device = 'Tablet';

  return { browser, os, device };
};

const getClientInfo = () => {
  const userAgent = navigator.userAgent;
  const { browser, os, device } = parseUserAgent(userAgent);
  return { userAgent, browser, os, device };
};

const fetchPublicIp = async (): Promise<string | null> => {
  try {
    const response = await fetch('https://api.ipify.org?format=json');
    if (!response.ok) return null;
    const data = await response.json();
    if (typeof data?.ip === 'string' && data.ip.trim().length > 0) {
      return data.ip.trim();
    }
    return null;
  } catch {
    return null;
  }
};

export const register = async (
  email: string,
  password: string,
  fullName: string
): Promise<AuthResponse> => {
  try {
    const passwordHash = await hashPassword(password);
    const originIp = await fetchPublicIp();

    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .maybeSingle();

    if (existingUser) {
      return { success: false, error: 'Email already registered' };
    }

    const { data: user, error } = await supabase
      .from('users')
      .insert({
        email,
        password_hash: passwordHash,
        full_name: fullName,
        role: 'user',
        status: 'pending_verification',
        origin_ip: originIp,
      })
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return {
      success: true,
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        status: user.status,
        email_verified: user.email_verified,
        origin_ip: user.origin_ip,
      },
      requiresVerification: true,
    };
  } catch (error) {
    return { success: false, error: 'Registration failed' };
  }
};

export const login = async (
  email: string,
  password: string
): Promise<AuthResponse> => {
  try {
    const clientInfo = getClientInfo();
    const passwordHash = await hashPassword(password);
    const clientIp = await fetchPublicIp();

    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .maybeSingle();

    const logLogin = async (success: boolean, userId?: string, reason?: string) => {
      await supabase.from('login_history').insert({
        user_id: userId || null,
        ip_address: clientIp || 'client',
        user_agent: clientInfo.userAgent,
        browser: clientInfo.browser,
        os: clientInfo.os,
        device: clientInfo.device,
        success,
        failure_reason: reason,
        suspicious: false,
      });
    };

    if (userError || !user) {
      await logLogin(false, undefined, 'User not found');
      return { success: false, error: 'Invalid credentials' };
    }

    if (user.locked_until && new Date(user.locked_until) > new Date()) {
      await logLogin(false, user.id, 'Account locked');
      return { success: false, error: 'Account temporarily locked' };
    }

    if (user.password_hash !== passwordHash) {
      const newAttempts = user.failed_login_attempts + 1;
      const updates: any = { failed_login_attempts: newAttempts };

      if (newAttempts >= 5) {
        const lockUntil = new Date();
        lockUntil.setMinutes(lockUntil.getMinutes() + 30);
        updates.locked_until = lockUntil.toISOString();
      }

      await supabase
        .from('users')
        .update(updates)
        .eq('id', user.id);

      await logLogin(false, user.id, 'Invalid password');
      return { success: false, error: 'Invalid credentials' };
    }

    if (user.status !== 'approved') {
      await logLogin(false, user.id, 'Account not approved');
      return {
        success: false,
        error: `Account ${user.status.replace('_', ' ')}`
      };
    }

    await supabase
      .from('users')
      .update({
        failed_login_attempts: 0,
        locked_until: null,
      })
      .eq('id', user.id);

    const accessToken = crypto.randomUUID();
    const refreshToken = crypto.randomUUID();

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const { data: refreshTokenData } = await supabase
      .from('refresh_tokens')
      .insert({
        user_id: user.id,
        token: refreshToken,
        expires_at: expiresAt.toISOString(),
      })
      .select()
      .single();

    await supabase.from('user_sessions').insert({
      user_id: user.id,
      access_token: accessToken,
      refresh_token_id: refreshTokenData?.id,
      ip_address: clientIp || 'client',
      user_agent: clientInfo.userAgent,
      browser: clientInfo.browser,
      os: clientInfo.os,
      device: clientInfo.device,
    });

    await logLogin(true, user.id);

    await supabase.from('activity_logs').insert({
      user_id: user.id,
      action: 'login',
      resource_type: 'auth',
      ip_address: clientIp || 'client',
    });

    localStorage.setItem('access_token', accessToken);
    localStorage.setItem('refresh_token', refreshToken);
    localStorage.setItem('user', JSON.stringify({
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      role: user.role,
      status: user.status,
      email_verified: user.email_verified,
      origin_ip: user.origin_ip,
    }));

    return {
      success: true,
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        status: user.status,
        email_verified: user.email_verified,
        origin_ip: user.origin_ip,
      },
    };
  } catch (error) {
    return { success: false, error: 'Login failed' };
  }
};

export const logout = async (): Promise<void> => {
  const accessToken = localStorage.getItem('access_token');

  if (accessToken) {
    await supabase
      .from('user_sessions')
      .update({ revoked: true })
      .eq('access_token', accessToken);
  }

  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
  localStorage.removeItem('user');
};

export const getCurrentUser = (): User | null => {
  const userStr = localStorage.getItem('user');
  if (!userStr) return null;

  try {
    return JSON.parse(userStr);
  } catch {
    return null;
  }
};

export const isAuthenticated = (): boolean => {
  return !!localStorage.getItem('access_token');
};
