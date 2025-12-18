import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { ThemeModeContext, type ThemeMode } from './ThemeModeContextDef';

const THEME_MODE_STORAGE_KEY = 'themeMode';

const isThemeMode = (value: unknown): value is ThemeMode => value === 'light' || value === 'dark';

export const ThemeModeProvider = ({ children }: { children: ReactNode }) => {
  const [themeMode, setThemeModeState] = useState<ThemeMode>(() => {
    try {
      const stored = localStorage.getItem(THEME_MODE_STORAGE_KEY);
      if (isThemeMode(stored)) return stored;
    } catch {
      // Ignore
    }
    return 'light';
  });

  const setThemeMode = useCallback((mode: ThemeMode) => {
    setThemeModeState(mode);
  }, []);

  const toggleThemeMode = useCallback(() => {
    setThemeModeState((prev) => (prev === 'dark' ? 'light' : 'dark'));
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(THEME_MODE_STORAGE_KEY, themeMode);
    } catch {
      // Ignore
    }

    document.documentElement.dataset.theme = themeMode;
  }, [themeMode]);

  const value = useMemo(
    () => ({
      themeMode,
      setThemeMode,
      toggleThemeMode,
    }),
    [themeMode, setThemeMode, toggleThemeMode]
  );

  return <ThemeModeContext.Provider value={value}>{children}</ThemeModeContext.Provider>;
};
