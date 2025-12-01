import { useState, useEffect } from 'react';
import { AuthProvider } from './contexts/AuthContext';
import { useAuth } from './hooks/useAuth';
import { LoginForm } from './components/auth/LoginForm';
import { RegisterForm } from './components/auth/RegisterForm';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { Dashboard } from './components/dashboard/Dashboard';
import { DocumentsPage } from './components/documents/DocumentsPage';
import { CRMPage } from './components/crm/CRMPage';
import { AdminPage } from './components/admin/AdminPage';

type AuthView = 'login' | 'register';
type AppPage = 'dashboard' | 'documents' | 'crm' | 'admin';

const AppContent = () => {
  const { user, isLoading, refreshUser, isAdmin, isMarketing } = useAuth();
  const [authView, setAuthView] = useState<AuthView>('login');
  const [currentPage, setCurrentPage] = useState<AppPage>(() => {
    // Load page preference from localStorage
    const saved = localStorage.getItem('currentPage');
    return (saved as AppPage) || 'dashboard';
  });
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    // Load sidebar preference from localStorage
    const saved = localStorage.getItem('sidebarCollapsed');
    return saved ? JSON.parse(saved) : true; // Default: expanded (true means visible)
  });

  useEffect(() => {
    if (user) {
      // Only set default page on first login, not on every user refresh
      const savedPage = localStorage.getItem('currentPage');
      if (!savedPage) {
        // First login - set default landing page based on role
        const role = (user as any).role;
        if (role === 'marketing' || role === 'user') {
          // Marketing and user roles land on CRM
          setCurrentPage('crm');
        } else {
          // Admin lands on dashboard
          setCurrentPage('dashboard');
        }
      }
    }
  }, [user?.id]); // Only run when user ID changes (login), not on every user refresh

  // Save page preference to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('currentPage', currentPage);
  }, [currentPage]);

  // Save sidebar preference to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('sidebarCollapsed', JSON.stringify(sidebarOpen));
  }, [sidebarOpen]);

  // Prevent non-admin users from navigating to Admin page
  useEffect(() => {
    if (currentPage === 'admin' && !isAdmin) {
      setCurrentPage(isMarketing ? 'crm' : 'dashboard');
    }
  }, [isAdmin, isMarketing]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    if (authView === 'login') {
      return (
        <LoginForm
          onSuccess={() => refreshUser()}
          onSwitchToRegister={() => setAuthView('register')}
        />
      );
    } else {
      return (
        <RegisterForm
          onSwitchToLogin={() => setAuthView('login')}
        />
      );
    }
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar 
        currentPage={currentPage} 
        onNavigate={setCurrentPage} 
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
      />

      <div className="flex-1 flex flex-col overflow-hidden">
        <Header onMenuClick={() => setSidebarOpen(!sidebarOpen)} currentPage={currentPage} />

        <main className="flex-1 overflow-y-auto">
          {currentPage === 'dashboard' && <Dashboard />}
          {currentPage === 'documents' && <DocumentsPage />}
          {currentPage === 'crm' && <CRMPage />}
          {currentPage === 'admin' && <AdminPage />}
        </main>
      </div>

      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
};

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
