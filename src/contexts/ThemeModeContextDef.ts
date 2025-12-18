import { createContext } from 'react';

export type ThemeMode = 'light' | 'dark';

export interface ThemeModeContextType {
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
  toggleThemeMode: () => void;
}

export const ThemeModeContext = createContext<ThemeModeContextType | undefined>(undefined);
