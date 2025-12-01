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

/**
 * Register a new user using Supabase Auth (server-side password hashing)
 * Password is hashed securely by Supabase with bcrypt + salt
 */
export const register = async (
  email: string,
  password: string,
  fullName: string
): Promise<AuthResponse> => {
  try {
    const originIp = await fetchPublicIp();

    // Sign up with Supabase Auth (handles password hashing securely server-side)
    const { data: authData, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    });

    if (signUpError) {
      return { success: false, error: signUpError.message };
    }

    if (!authData.user) {
      return { success: false, error: 'User creation failed' };
    }

    // Create user profile in public users table
    const { data: user, error: profileError } = await supabase
      .from('users')
      .insert({
        id: authData.user.id,
        email,
        full_name: fullName,
        role: 'user',
        status: 'pending_verification',
        origin_ip: originIp,
        email_verified: false,
      })
      .select()
      .single();

    if (profileError) {
      console.error('Profile creation error:', profileError);
      return { success: false, error: 'Failed to create user profile' };
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
    const errorMessage = error instanceof Error ? error.message : 'Registration failed';
    return { success: false, error: errorMessage };
  }
};

/**
 * Login user with Supabase Auth (server-side password verification)
 * Password verification is handled securely by Supabase
 */
export const login = async (
  email: string,
  password: string
): Promise<AuthResponse> => {
  try {
    const clientInfo = getClientInfo();
    const clientIp = await fetchPublicIp();

    // Authenticate with Supabase Auth (server-side password verification with bcrypt)
    const { data: authData, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      console.error('Supabase Auth Error:', signInError);
      // Log failed login attempt
      await logFailedLogin(email, clientIp, clientInfo, signInError.message || 'Invalid credentials');
      return { success: false, error: signInError.message || 'Invalid credentials' };
    }

    if (!authData.user) {
      await logFailedLogin(email, clientIp, clientInfo, 'Authentication failed');
      return { success: false, error: 'Authentication failed' };
    }

    // Get user profile (silently fail and continue if not found)
    let user = null;
    try {
      const { data: userData, error: profileError } = await supabase
        .from('users')
        .select('*')
        .eq('id', authData.user.id)
        .maybeSingle();

      if (!profileError && userData) {
        user = userData;
      }
    } catch {
      // Continue even if user profile lookup fails
    }

    // Check account status only if user profile exists
    if (user && user.status && user.status !== 'approved' && user.status !== 'pending_verification') {
      await logFailedLogin(authData.user.id, clientIp, clientInfo, `Account ${user.status}`);
      return {
        success: false,
        error: `Account ${user.status.replace('_', ' ')}`
      };
    }

    // Reset failed login attempts (silently fail if columns don't exist)
    try {
      await supabase
        .from('users')
        .update({
          failed_login_attempts: 0,
          locked_until: null,
        })
        .eq('id', authData.user.id);
    } catch {
      // Continue even if this fails - these columns might not exist
    }

    // Log successful login (silently fail if table doesn't exist)
    try {
      await supabase.from('login_history').insert({
        user_id: authData.user.id,
        ip_address: clientIp || 'client',
        user_agent: clientInfo.userAgent,
        browser: clientInfo.browser,
        os: clientInfo.os,
        device: clientInfo.device,
        success: true,
        failure_reason: null,
        suspicious: false,
      });
    } catch {
      // Continue even if login_history doesn't exist or fails
    }

    // Log activity (silently fail if table doesn't exist)
    try {
      await supabase.from('activity_logs').insert({
        user_id: authData.user.id,
        action: 'login',
        resource_type: 'auth',
        ip_address: clientIp || 'client',
      });
    } catch {
      // Continue even if activity_logs doesn't exist or fails
    }

    // Store user data locally (Supabase session is managed automatically)
    // Use auth user data if profile doesn't exist yet
    const userData = user || {
      id: authData.user.id,
      email: authData.user.email || '',
      full_name: authData.user.user_metadata?.full_name || '',
      role: 'user',
      status: 'pending_verification',
      email_verified: authData.user.email_confirmed_at ? true : false,
      origin_ip: clientIp || null,
    };

    localStorage.setItem('user', JSON.stringify({
      id: userData.id,
      email: userData.email,
      full_name: userData.full_name,
      role: userData.role,
      status: userData.status,
      email_verified: userData.email_verified,
      origin_ip: userData.origin_ip,
    }));

    return {
      success: true,
      user: {
        id: userData.id,
        email: userData.email,
        full_name: userData.full_name,
        role: userData.role,
        status: userData.status,
        email_verified: userData.email_verified,
        origin_ip: userData.origin_ip,
      },
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Login failed';
    return { success: false, error: errorMessage };
  }
};

const logFailedLogin = async (
  _email: string,
  clientIp: string | null,
  clientInfo: ReturnType<typeof getClientInfo>,
  reason: string
): Promise<void> => {
  try {
    await supabase.from('login_history').insert({
      user_id: null,
      ip_address: clientIp || 'client',
      user_agent: clientInfo.userAgent,
      browser: clientInfo.browser,
      os: clientInfo.os,
      device: clientInfo.device,
      success: false,
      failure_reason: reason,
      suspicious: false,
    });
  } catch {
    // Silently fail - don't interrupt login flow, table might not exist yet
  }
};

export const logout = async (): Promise<void> => {
  try {
    // Sign out from Supabase (clears session)
    await supabase.auth.signOut();
  } catch {
    // Continue with local cleanup even if Supabase signout fails
  }

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

/**
 * Fetch fresh user data from database (bypasses cache)
 * Use this to get updated role/status after admin changes
 */
export const getFreshUserData = async (): Promise<User | null> => {
  try {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) return null;

    // Fetch user profile from database
    const { data: userData, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', authUser.id)
      .single();

    if (error || !userData) {
      console.error('Error fetching fresh user data:', error);
      return null;
    }

    // Update localStorage with fresh data
    const user: User = {
      id: userData.id,
      email: userData.email,
      full_name: userData.full_name,
      role: userData.role,
      status: userData.status,
      email_verified: userData.email_verified,
      origin_ip: userData.origin_ip,
    };

    localStorage.setItem('user', JSON.stringify(user));
    return user;
  } catch (error) {
    console.error('Exception fetching fresh user data:', error);
    return null;
  }
};

export const isAuthenticated = (): boolean => {
  return !!localStorage.getItem('user');
};

/**
 * Get the current Supabase session
 * Useful for getting access tokens for API calls
 */
export const getCurrentSession = async () => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    return session;
  } catch {
    return null;
  }
};
