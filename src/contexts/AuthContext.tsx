import { createContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { getCurrentUser, logout as authLogout, type User, getFreshUserData } from '../lib/auth';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAdmin: boolean;
  isMarketing: boolean;
  logout: () => Promise<void>;
  refreshUser: () => void;
  refreshUserData: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load the current user, preferring fresh data from Supabase over any cached localStorage copy.
  const loadUser = async () => {
    try {
      // Try to get a fresh user profile from the database first.
      const freshUser = await getFreshUserData();
      if (freshUser) {
        setUser(freshUser);
        return;
      }

      // Fall back to any cached user stored locally (from a previous login).
      const cachedUser = getCurrentUser();
      if (cachedUser) {
        setUser(cachedUser);
        return;
      }

      // As a final check, see if Supabase still has an auth user; if not, clear stale state.
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) {
        setUser(null);
        localStorage.removeItem('user');
        return;
      }

      // Construct a minimal user shape from the auth user if the profile row is not yet available.
      setUser({
        id: authUser.id,
        email: authUser.email || '',
        full_name: authUser.user_metadata?.full_name || '',
        role: 'user',
        status: 'pending_verification',
        email_verified: authUser.email_confirmed_at ? true : false,
        origin_ip: null,
      });
    } catch (error) {
      if (import.meta.env.DEV) console.error('Error loading authenticated user:', error);
      setUser(null);
      localStorage.removeItem('user');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Refresh user data from database (use when role/status changes by admin)
   */
  const refreshUserData = async () => {
    const freshUser = await getFreshUserData();
    if (freshUser) {
      setUser(freshUser);
    }
  };

  useEffect(() => {
    // Initial load (async; we intentionally don't await inside useEffect)
    void loadUser();

    // Listen for Supabase auth changes so UI stays in sync with session events.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event) => {
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          // User signed in or session refreshed
          void loadUser();
        } else if (event === 'SIGNED_OUT') {
          // User signed out
          setUser(null);
          localStorage.removeItem('user');
        }
      }
    );

    // Refresh user data every 30 seconds to catch admin role/status changes.
    // getFreshUserData will no-op when there is no active Supabase session.
    const refreshInterval = setInterval(() => {
      void refreshUserData();
    }, 30000); // 30 seconds

    return () => {
      subscription?.unsubscribe();
      clearInterval(refreshInterval);
    };
  }, []);

  const logout = async () => {
    await authLogout();
    setUser(null);
  };

  const refreshUser = () => {
    loadUser();
  };

  const isAdmin = user?.role === 'admin';
  const isMarketing = user?.role === 'marketing' || user?.role === 'admin';

  return (
    <AuthContext.Provider value={{ user, isLoading, isAdmin, isMarketing, logout, refreshUser, refreshUserData }}>
      {children}
    </AuthContext.Provider>
  );
};

export { AuthContext, AuthProvider };
