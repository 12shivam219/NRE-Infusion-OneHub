import { createContext, useState, useEffect, ReactNode } from 'react';
import { getCurrentUser, isAuthenticated, logout as authLogout, type User } from '../lib/auth';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAdmin: boolean;
  isMarketing: boolean;
  logout: () => Promise<void>;
  refreshUser: () => void;
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

  useEffect(() => {
    loadUser();
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
    <AuthContext.Provider value={{ user, isLoading, isAdmin, isMarketing, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export { AuthContext, AuthProvider };
