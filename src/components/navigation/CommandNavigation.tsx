import { useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { NAV_ITEMS, type NavigationItem } from './navConfig';
import { OrbitalCommandBar } from './OrbitalCommandBar';
import { GlassCommandDock } from './GlassCommandDock';
import { useThemeSync } from '../../contexts/ThemeSyncContext';

interface CommandNavigationProps {
  onNavigate?: () => void;
  forceHidden?: boolean;
}

const matchesLocation = (item: NavigationItem, pathname: string, search: string) => {
  const url = new URL(item.href, 'http://localhost');

  if (pathname !== url.pathname) {
    return false;
  }

  const itemSearch = url.search ?? '';
  if (!itemSearch) {
    return search === '' || search === itemSearch;
  }

  return search === itemSearch;
};

export const CommandNavigation = ({ onNavigate, forceHidden = false }: CommandNavigationProps) => {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { setTheme, previewTheme, clearPreview } = useThemeSync();

  const items = useMemo(() => {
    if (!user?.role) return NAV_ITEMS;
    return NAV_ITEMS.filter((item) => !item.roles || item.roles.includes(user.role));
  }, [user?.role]);

  const activeId = useMemo(() => {
    const { pathname, search } = location;

    const matched = items.find((item) => matchesLocation(item, pathname, search));
    if (matched) return matched.id;

    // Handle CRM default route without explicit view query
    if (pathname === '/crm' && search === '') {
      const crmDefault = items.find((item) => item.id === 'crm');
      if (crmDefault) return crmDefault.id;
    }

    return null;
  }, [items, location]);

  const handleNavigate = (item: NavigationItem) => {
    setTheme(item.themeKey);
    clearPreview();
    const url = new URL(item.href, window.location.origin);
    navigate({ pathname: url.pathname, search: url.search });
    onNavigate?.();
  };

  const handlePreview = (item: NavigationItem) => {
    previewTheme(item.themeKey);
  };

  const handlePreviewEnd = () => {
    clearPreview();
  };

  if (!items.length) return null;

  return (
    <div className="relative z-30 flex flex-col items-center justify-start">
      <div className={`hidden w-full max-w-6xl justify-center md:flex ${forceHidden ? 'pointer-events-none opacity-0' : 'opacity-100'} transition-opacity duration-400`}> 
        {!forceHidden && (
          <OrbitalCommandBar
            items={items}
            activeId={activeId}
            onNavigate={handleNavigate}
            onPreview={handlePreview}
            onPreviewEnd={handlePreviewEnd}
          />
        )}
      </div>
      <div className={`${forceHidden ? 'pointer-events-none opacity-0' : 'opacity-100'} transition-opacity duration-300`}> 
        {!forceHidden && (
          <GlassCommandDock
            items={items}
            activeId={activeId}
            onNavigate={handleNavigate}
            onPreview={handlePreview}
            onPreviewEnd={handlePreviewEnd}
          />
        )}
      </div>
    </div>
  );
};
