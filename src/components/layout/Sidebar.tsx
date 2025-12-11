import {
  LayoutDashboard,
  FileText,
  Briefcase,
  LogOut,
  Shield,
  ChevronRight,
  ChevronLeft
} from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
}

export const Sidebar = ({ isOpen, onToggle }: SidebarProps) => {
  const { user, logout } = useAuth();
  const location = useLocation();

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard', roles: ['user', 'marketing', 'admin'] },
    { id: 'documents', label: 'Resume Editor', icon: FileText, path: '/documents', roles: ['user', 'admin'] },
    { id: 'crm', label: 'Marketing & CRM', icon: Briefcase, path: '/crm', roles: ['user', 'marketing', 'admin'] },
    { id: 'admin', label: 'Admin Panel', icon: Shield, path: '/admin', roles: ['admin'] },
  ];

  const filteredItems = menuItems.filter(item => {
    // Check if the current user's role is in the item's allowed roles
    const userRole = user?.role;
    return item.roles.includes(userRole as string);
  });

  const getIsActive = (path: string) => {
    return location.pathname === path;
  };

  return (
    <>
      {/* Desktop Sidebar - Collapsible */}
      <div className={`hidden md:flex md:flex-col bg-slate-900 text-white h-screen transition-all duration-300 ease-in-out ${isOpen ? 'md:w-64' : 'md:w-20'}`}>
        {/* Header */}
        <div className="relative p-4 border-b border-slate-800">
          {isOpen && (
            <>
              <h1 className="text-lg font-bold">NRE Infusion</h1>
              <p className="text-xs text-slate-400">OneHub Suite</p>
            </>
          )}
          {!isOpen && (
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">NI</span>
            </div>
          )}
          
          {/* Collapse/Expand Button */}
          <button
            onClick={onToggle}
            className="absolute -right-3 top-10 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-full p-1 transition"
            title={isOpen ? 'Collapse sidebar' : 'Expand sidebar'}
          >
            {isOpen ? (
              <ChevronLeft className="w-4 h-4 text-white" />
            ) : (
              <ChevronRight className="w-4 h-4 text-white" />
            )}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-2">
          {filteredItems.map((item) => {
            const Icon = item.icon;
            const isActive = getIsActive(item.path);

            return (
              <Link
                key={item.id}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition ${
                  isActive
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-300 hover:bg-slate-800'
                }`}
                title={!isOpen ? item.label : ''}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                {isOpen && <span className="font-medium">{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-3 border-t border-slate-800">
          {isOpen ? (
            <>
              <div className="px-4 py-3 bg-slate-800 rounded-lg mb-2">
                <p className="text-sm font-medium truncate">{user?.full_name}</p>
                <p className="text-xs text-slate-400 truncate">{user?.email}</p>
                <p className="text-xs text-slate-400 mt-1 capitalize">{user?.role}</p>
              </div>

              <button
                onClick={() => logout()}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-slate-300 hover:bg-slate-800 transition"
              >
                <LogOut className="w-5 h-5 flex-shrink-0" />
                <span className="font-medium">Sign Out</span>
              </button>
            </>
          ) : (
            <button
              onClick={() => logout()}
              className="w-full flex items-center justify-center p-3 rounded-lg text-slate-300 hover:bg-slate-800 transition"
              title="Sign Out"
            >
              <LogOut className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Mobile Sidebar - Slide from left */}
      {isOpen && (
        <div className="fixed md:hidden left-0 top-0 w-64 bg-slate-900 text-white h-screen flex flex-col z-50 overflow-y-auto">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <div>
              <h1 className="text-lg font-bold">NRE Infusion</h1>
              <p className="text-xs text-slate-400">OneHub Suite</p>
            </div>
            <button
              onClick={onToggle}
              className="p-1 hover:bg-slate-800 rounded-lg transition"
              title="Close sidebar"
            >
              <ChevronLeft className="w-5 h-5 text-white" />
            </button>
          </div>

          <nav className="flex-1 p-3 space-y-2">
            {filteredItems.map((item) => {
              const Icon = item.icon;
              const isActive = getIsActive(item.path);

              return (
                <Link
                  key={item.id}
                  to={item.path}
                  onClick={onToggle}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition ${
                    isActive
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  <span className="font-medium">{item.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="p-3 border-t border-slate-800">
            <div className="px-4 py-3 bg-slate-800 rounded-lg mb-2">
              <p className="text-sm font-medium truncate">{user?.full_name}</p>
              <p className="text-xs text-slate-400 truncate">{user?.email}</p>
              <p className="text-xs text-slate-400 mt-1 capitalize">{user?.role}</p>
            </div>

            <button
              onClick={() => {
                logout();
                onToggle();
              }}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-slate-300 hover:bg-slate-800 transition"
            >
              <LogOut className="w-5 h-5 flex-shrink-0" />
              <span className="font-medium">Sign Out</span>
            </button>
          </div>
        </div>
      )}
    </>
  );
};
