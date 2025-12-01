import { createContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { getCurrentUser, isAuthenticated, logout as authLogout, type User, getFreshUserData } from '../lib/auth';

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

  const loadUser = () => {
    if (isAuthenticated()) {
      const currentUser = getCurrentUser();
      setUser(currentUser);
    } else {
      setUser(null);
    }
    setIsLoading(false);
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
    // Initial load
    loadUser();

    // Listen for Supabase auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event) => {
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          // User signed in or session refreshed
          loadUser();
        } else if (event === 'SIGNED_OUT') {
          // User signed out
          setUser(null);
          localStorage.removeItem('user');
        }
      }
    );

    // Refresh user data every 30 seconds to catch admin role/status changes
    const refreshInterval = setInterval(() => {
      if (isAuthenticated()) {
        refreshUserData();
      }
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
