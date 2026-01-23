import {
  LayoutDashboard,
  FileText,
  Briefcase,
  Users,
  User,
  LogOut,
  Menu,
  X,
  ChevronDown,
  Shield,
} from 'lucide-react';
import { useState, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

interface MenuItem {
  id: string;
  label: string;
  icon: React.ElementType;
  path: string;
  roles: string[];
  children?: MenuItem[];
}

const MENU_ITEMS: MenuItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
    path: '/dashboard',
    roles: ['user', 'marketing', 'admin'],
  },
  {
    id: 'crm',
    label: 'Marketing & CRM',
    icon: Briefcase,
    path: '/crm',
    roles: ['user', 'marketing', 'admin'],
    children: [
      {
        id: 'requirements',
        label: 'Requirements',
        icon: FileText,
        path: '/crm?view=requirements',
        roles: ['user', 'marketing', 'admin'],
      },
      {
        id: 'interviews',
        label: 'Interviews',
        icon: FileText,
        path: '/crm?view=interviews',
        roles: ['user', 'marketing', 'admin'],
      },
      {
        id: 'consultants',
        label: 'Consultants',
        icon: Users,
        path: '/crm?view=consultants',
        roles: ['user', 'marketing', 'admin'],
      },
    ],
  },
  {
    id: 'documents',
    label: 'Resume Editor',
    icon: FileText,
    path: '/documents',
    roles: ['user', 'admin'],
  },
  {
    id: 'admin',
    label: 'Admin Panel',
    icon: Shield,
    path: '/admin',
    roles: ['admin'],
  },
];

export const ModernSidebar = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set(['crm']));

  // Filter menu items based on user role
  const filteredItems = useMemo(() => {
    if (!user?.role) return [];
    return MENU_ITEMS.filter((item) => item.roles.includes(user.role));
  }, [user]);

  const isItemActive = (path: string) => {
    const currentPath = location.pathname;
    const currentSearch = location.search;

    if (path.includes('?')) {
      return currentPath === path.split('?')[0] && currentSearch === '?' + path.split('?')[1];
    }
    return currentPath === path;
  };

  const toggleExpanded = (itemId: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(itemId)) {
      newExpanded.delete(itemId);
    } else {
      newExpanded.add(itemId);
    }
    setExpandedItems(newExpanded);
  };

  const handleNavigation = (path: string) => {
    navigate(path);
    setIsMobileOpen(false);
  };

  const handleLogout = async () => {
    await logout();
    setIsMobileOpen(false);
  };

  // Desktop sidebar
  const sidebarContent = (
    <div 
      className="flex flex-col h-full text-white"
      style={{
        background: 'linear-gradient(180deg, rgba(13, 17, 23, 0.92) 0%, rgba(9, 12, 18, 0.88) 100%)',
        backdropFilter: 'blur(10px)',
      }}
    >
      {/* Logo/Header */}
      <div className="flex items-center justify-between p-6 border-b border-slate-700/50">
        {/* Mobile close button */}
        <button
          onClick={() => setIsMobileOpen(false)}
          className="md:hidden p-1 hover:bg-slate-800 rounded-lg transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 overflow-y-auto py-6 px-4">
        {filteredItems.map((item) => {
          const Icon = item.icon;
          const isActive = isItemActive(item.path);
          const isExpanded = expandedItems.has(item.id);
          const hasChildren = item.children && item.children.length > 0;

          return (
            <div key={item.id}>
              <button
                onClick={() => {
                  if (hasChildren) {
                    toggleExpanded(item.id);
                  } else {
                    handleNavigation(item.path);
                  }
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg mb-1 transition-all duration-200 ${
                  isActive
                    ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                    : 'text-slate-300 hover:bg-slate-800/50 hover:text-white'
                }`}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                <span className="text-sm font-medium flex-1 text-left">{item.label}</span>
                {hasChildren && (
                  <ChevronDown
                    className={`w-4 h-4 flex-shrink-0 transition-transform duration-200 ${
                      isExpanded ? 'rotate-180' : ''
                    }`}
                  />
                )}
              </button>

              {/* Submenu items */}
              {hasChildren && isExpanded && (
                <div className="ml-6 space-y-1 mb-2">
                  {item.children!.map((child) => {
                    const ChildIcon = child.icon;
                    const isChildActive = isItemActive(child.path);

                    return (
                      <button
                        key={child.id}
                        onClick={() => handleNavigation(child.path)}
                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-200 ${
                          isChildActive
                            ? 'bg-blue-500/20 text-blue-300'
                            : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'
                        }`}
                      >
                        <ChildIcon className="w-4 h-4 flex-shrink-0" />
                        <span>{child.label}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Divider */}
      <div className="border-t border-slate-700/50" />

      {/* User Profile Section */}
      {user && (
        <div className="p-4 space-y-3">
          <div className="flex items-center gap-3 px-2">
            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center flex-shrink-0">
              <User className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-white truncate">
                {user.full_name || 'User'}
              </p>
              <p className="text-xs text-slate-400 truncate">{user.email}</p>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-2 rounded-lg text-slate-300 hover:bg-slate-800/50 hover:text-white transition-colors duration-200 text-sm"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex md:fixed md:left-0 md:top-0 md:h-screen md:w-64 md:z-40 md:pt-[72px]">
        {sidebarContent}
      </aside>

      {/* Mobile Header Menu Button */}
      <div className="md:hidden fixed top-20 left-4 z-40">
        <button
          onClick={() => setIsMobileOpen(!isMobileOpen)}
          className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
        >
          {isMobileOpen ? (
            <X className="w-6 h-6 text-white" />
          ) : (
            <Menu className="w-6 h-6 text-white" />
          )}
        </button>
      </div>

      {/* Mobile Sidebar */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-30 md:hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setIsMobileOpen(false)}
          />

          {/* Sidebar */}
          <div className="absolute left-0 top-0 h-screen w-64 overflow-y-auto mt-[72px]">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
};
