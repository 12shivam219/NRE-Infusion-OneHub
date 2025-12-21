import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

export type ThemeKey = 'dashboard' | 'crm' | 'requirements' | 'interviews' | 'consultants' | 'ai';

type ThemeSoundProfile = {
  frequency: number;
  type?: OscillatorType;
  gain?: number;
  duration?: number;
};

type ThemeProfile = {
  key: ThemeKey;
  name: string;
  accent: string;
  accentSoft: string;
  accentGlow: string;
  accentGlass: string;
  onAccent: string;
  gradientFrom: string;
  gradientTo: string;
  ambient: string;
  ambientSecondary: string;
  ring: string;
  nucleusSurface: string;
  headerBackground: string;
  headerBorder: string;
  iconHover: string;
  cardTint: string;
  particleTint: string;
  pulseDuration: number;
  gradientDuration: number;
  sound?: ThemeSoundProfile;
};

const THEME_PROFILES: Record<ThemeKey, ThemeProfile> = {
  dashboard: {
    key: 'dashboard',
    name: 'Dashboard',
    accent: '#EAB308',
    accentSoft: 'rgba(234,179,8,0.18)',
    accentGlow: 'rgba(234,179,8,0.55)',
    accentGlass: 'rgba(234,179,8,0.12)',
    onAccent: '#11161F',
    gradientFrom: '#0D1117',
    gradientTo: '#1A1F27',
    ambient: 'rgba(234,179,8,0.18)',
    ambientSecondary: 'rgba(234,179,8,0.08)',
    ring: 'rgba(234,179,8,0.38)',
    nucleusSurface: 'rgba(24,22,14,0.7)',
    headerBackground: 'linear-gradient(135deg, rgba(13,17,23,0.92) 0%, rgba(19,25,33,0.94) 60%), radial-gradient(circle at 12% -18%, rgba(234,179,8,0.22) 0%, transparent 60%)',
    headerBorder: 'rgba(234,179,8,0.35)',
    iconHover: 'rgba(234,179,8,0.16)',
    cardTint: '#FFFFFF',
    particleTint: 'rgba(234,179,8,0.28)',
    pulseDuration: 3.1,
    gradientDuration: 160,
    sound: { frequency: 660, type: 'triangle', gain: 0.055, duration: 0.45 },
  },
  crm: {
    key: 'crm',
    name: 'CRM / Marketing',
    accent: '#14B8A6',
    accentSoft: 'rgba(20,184,166,0.16)',
    accentGlow: 'rgba(20,184,166,0.52)',
    accentGlass: 'rgba(20,184,166,0.14)',
    onAccent: '#061013',
    gradientFrom: '#07161D',
    gradientTo: '#0B2A35',
    ambient: 'rgba(20,184,166,0.24)',
    ambientSecondary: 'rgba(6,148,136,0.12)',
    ring: 'rgba(20,184,166,0.4)',
    nucleusSurface: 'rgba(10,25,30,0.78)',
    headerBackground: 'linear-gradient(135deg, rgba(7,23,28,0.94) 0%, rgba(10,32,40,0.96) 65%), radial-gradient(circle at 8% -20%, rgba(20,184,166,0.28) 0%, transparent 55%)',
    headerBorder: 'rgba(20,184,166,0.38)',
    iconHover: 'rgba(20,184,166,0.18)',
    cardTint: '#FFFFFF',
    particleTint: 'rgba(20,184,166,0.3)',
    pulseDuration: 4,
    gradientDuration: 200,
    sound: { frequency: 520, type: 'sine', gain: 0.045, duration: 0.5 },
  },
  requirements: {
    key: 'requirements',
    name: 'Requirements',
    accent: '#22C55E',
    accentSoft: 'rgba(34,197,94,0.16)',
    accentGlow: 'rgba(34,197,94,0.5)',
    accentGlass: 'rgba(34,197,94,0.12)',
    onAccent: '#0C1B0F',
    gradientFrom: '#08171F',
    gradientTo: '#123024',
    ambient: 'rgba(34,197,94,0.22)',
    ambientSecondary: 'rgba(34,197,94,0.12)',
    ring: 'rgba(34,197,94,0.42)',
    nucleusSurface: 'rgba(8,26,22,0.74)',
    headerBackground: 'linear-gradient(135deg, rgba(8,24,19,0.92) 0%, rgba(14,35,24,0.95) 70%), radial-gradient(circle at 10% -18%, rgba(34,197,94,0.26) 0%, transparent 60%)',
    headerBorder: 'rgba(34,197,94,0.36)',
    iconHover: 'rgba(34,197,94,0.18)',
    cardTint: '#FFFFFF',
    particleTint: 'rgba(34,197,94,0.28)',
    pulseDuration: 3.4,
    gradientDuration: 185,
    sound: { frequency: 580, type: 'sawtooth', gain: 0.04, duration: 0.38 },
  },
  interviews: {
    key: 'interviews',
    name: 'Interviews',
    accent: '#F97316',
    accentSoft: 'rgba(249,115,22,0.18)',
    accentGlow: 'rgba(249,115,22,0.55)',
    accentGlass: 'rgba(249,115,22,0.14)',
    onAccent: '#1A1008',
    gradientFrom: '#1B0E09',
    gradientTo: '#2B1C12',
    ambient: 'rgba(249,115,22,0.22)',
    ambientSecondary: 'rgba(249,115,22,0.12)',
    ring: 'rgba(249,115,22,0.4)',
    nucleusSurface: 'rgba(32,18,10,0.78)',
    headerBackground: 'linear-gradient(135deg, rgba(24,12,8,0.94) 0%, rgba(34,18,12,0.96) 65%), radial-gradient(circle at 8% -18%, rgba(249,115,22,0.32) 0%, transparent 60%)',
    headerBorder: 'rgba(249,115,22,0.4)',
    iconHover: 'rgba(249,115,22,0.2)',
    cardTint: '#FFFFFF',
    particleTint: 'rgba(249,115,22,0.32)',
    pulseDuration: 2.8,
    gradientDuration: 150,
    sound: { frequency: 720, type: 'square', gain: 0.035, duration: 0.3 },
  },
  consultants: {
    key: 'consultants',
    name: 'Consultants',
    accent: '#8B5CF6',
    accentSoft: 'rgba(139,92,246,0.18)',
    accentGlow: 'rgba(139,92,246,0.6)',
    accentGlass: 'rgba(139,92,246,0.15)',
    onAccent: '#130C25',
    gradientFrom: '#120A1F',
    gradientTo: '#28184A',
    ambient: 'rgba(139,92,246,0.24)',
    ambientSecondary: 'rgba(139,92,246,0.14)',
    ring: 'rgba(139,92,246,0.48)',
    nucleusSurface: 'rgba(20,12,31,0.78)',
    headerBackground: 'linear-gradient(135deg, rgba(18,12,33,0.94) 0%, rgba(26,16,48,0.96) 65%), radial-gradient(circle at 10% -18%, rgba(139,92,246,0.3) 0%, transparent 60%)',
    headerBorder: 'rgba(139,92,246,0.42)',
    iconHover: 'rgba(139,92,246,0.2)',
    cardTint: '#FFFFFF',
    particleTint: 'rgba(139,92,246,0.34)',
    pulseDuration: 3.2,
    gradientDuration: 190,
    sound: { frequency: 640, type: 'sine', gain: 0.04, duration: 0.42 },
  },
  ai: {
    key: 'ai',
    name: 'Automation',
    accent: '#3B82F6',
    accentSoft: 'rgba(59,130,246,0.18)',
    accentGlow: 'rgba(59,130,246,0.58)',
    accentGlass: 'rgba(59,130,246,0.14)',
    onAccent: '#0A1020',
    gradientFrom: '#050A1C',
    gradientTo: '#0E1A3C',
    ambient: 'rgba(59,130,246,0.26)',
    ambientSecondary: 'rgba(37,99,235,0.16)',
    ring: 'rgba(59,130,246,0.5)',
    nucleusSurface: 'rgba(6,16,38,0.8)',
    headerBackground: 'linear-gradient(135deg, rgba(5,10,28,0.94) 0%, rgba(10,22,48,0.96) 70%), radial-gradient(circle at 12% -18%, rgba(59,130,246,0.32) 0%, transparent 65%)',
    headerBorder: 'rgba(59,130,246,0.46)',
    iconHover: 'rgba(59,130,246,0.22)',
    cardTint: '#FFFFFF',
    particleTint: 'rgba(59,130,246,0.36)',
    pulseDuration: 2.6,
    gradientDuration: 140,
    sound: { frequency: 780, type: 'sawtooth', gain: 0.038, duration: 0.36 },
  },
};

const DEFAULT_KEY: ThemeKey = 'dashboard';

type ThemeSyncContextValue = {
  themeKey: ThemeKey;
  previewKey: ThemeKey | null;
  theme: ThemeProfile;
  setTheme: (key: ThemeKey) => void;
  previewTheme: (key: ThemeKey) => void;
  clearPreview: () => void;
};

const ThemeSyncContext = createContext<ThemeSyncContextValue | undefined>(undefined);

export const ThemeSyncProvider = ({ children }: { children: ReactNode }) => {
  const [themeKey, setThemeKey] = useState<ThemeKey>(DEFAULT_KEY);
  const [previewKey, setPreviewKey] = useState<ThemeKey | null>(null);

  const displayTheme = useMemo(() => {
    const key = previewKey ?? themeKey;
    return THEME_PROFILES[key];
  }, [previewKey, themeKey]);

  const setTheme = useCallback((key: ThemeKey) => {
    setThemeKey((prev) => (prev === key ? prev : key));
  }, []);

  const previewTheme = useCallback((key: ThemeKey) => {
    setPreviewKey((prev) => (prev === key ? prev : key));
  }, []);

  const clearPreview = useCallback(() => {
    setPreviewKey(null);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    const profile = displayTheme;

    root.style.setProperty('--nre-accent', profile.accent);
    root.style.setProperty('--nre-accent-soft', profile.accentSoft);
    root.style.setProperty('--nre-accent-glow', profile.accentGlow);
    root.style.setProperty('--nre-accent-glass', profile.accentGlass);
    root.style.setProperty('--nre-on-accent', profile.onAccent);
    root.style.setProperty('--nre-gradient-start', profile.gradientFrom);
    root.style.setProperty('--nre-gradient-end', profile.gradientTo);
    root.style.setProperty('--nre-ambient', profile.ambient);
    root.style.setProperty('--nre-ambient-secondary', profile.ambientSecondary);
    root.style.setProperty('--nre-orbit-ring', profile.ring);
    root.style.setProperty('--nre-nucleus-surface', profile.nucleusSurface);
    root.style.setProperty('--nre-header-bg', profile.headerBackground);
    root.style.setProperty('--nre-header-border', profile.headerBorder);
    root.style.setProperty('--nre-icon-hover', profile.iconHover);
    root.style.setProperty('--nre-card-tint', profile.cardTint);
    root.style.setProperty('--nre-particle-tint', profile.particleTint);
    root.style.setProperty('--nre-pulse-duration', `${profile.pulseDuration}s`);
    root.style.setProperty('--nre-gradient-duration', `${profile.gradientDuration}s`);
  }, [displayTheme]);

  const audioContextRef = useRef<AudioContext | null>(null);
  const lastPlayedKeyRef = useRef<ThemeKey>(themeKey);

  useEffect(() => {
    const enableAudio = () => {
      if (!audioContextRef.current) {
        try {
          audioContextRef.current = new AudioContext();
        } catch (error) {
          console.warn('AudioContext unavailable', error);
        }
      } else if (audioContextRef.current.state === 'suspended') {
        void audioContextRef.current.resume().catch(() => undefined);
      }
      window.removeEventListener('pointerdown', enableAudio);
      window.removeEventListener('keydown', enableAudio);
    };

    window.addEventListener('pointerdown', enableAudio, { once: true });
    window.addEventListener('keydown', enableAudio, { once: true });

    return () => {
      window.removeEventListener('pointerdown', enableAudio);
      window.removeEventListener('keydown', enableAudio);
    };
  }, []);

  useEffect(() => {
    if (previewKey !== null) {
      return;
    }
    if (lastPlayedKeyRef.current === themeKey) {
      return;
    }

    lastPlayedKeyRef.current = themeKey;
    const profile = THEME_PROFILES[themeKey];
    if (!profile.sound) {
      return;
    }

    const ctx = audioContextRef.current;
    if (!ctx || ctx.state === 'suspended') {
      return;
    }

    const { frequency, type = 'sine', gain = 0.04, duration = 0.35 } = profile.sound;
    const now = ctx.currentTime;

    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, now);

    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(gain, now + 0.05);
    gainNode.gain.linearRampToValueAtTime(0, now + duration);

    oscillator.connect(gainNode).connect(ctx.destination);
    oscillator.start(now);
    oscillator.stop(now + duration + 0.05);

    const cleanup = () => {
      oscillator.disconnect();
      gainNode.disconnect();
    };

    oscillator.addEventListener('ended', cleanup, { once: true });

    return () => {
      oscillator.removeEventListener('ended', cleanup);
      cleanup();
    };
  }, [themeKey, previewKey]);

  const value = useMemo<ThemeSyncContextValue>(() => ({
    themeKey,
    previewKey,
    theme: displayTheme,
    setTheme,
    previewTheme,
    clearPreview,
  }), [themeKey, previewKey, displayTheme, setTheme, previewTheme, clearPreview]);

  return <ThemeSyncContext.Provider value={value}>{children}</ThemeSyncContext.Provider>;
};

export const useThemeSync = () => {
  const ctx = useContext(ThemeSyncContext);
  if (!ctx) {
    throw new Error('useThemeSync must be used within a ThemeSyncProvider');
  }
  return ctx;
};

export const resolveThemeKeyFromRoute = (pathname: string, search: string): ThemeKey => {
  const cleanPath = pathname.split('?')[0];

  if (cleanPath === '/' || cleanPath === '/dashboard') {
    return 'dashboard';
  }

  if (cleanPath === '/crm') {
    const params = new URLSearchParams(search);
    const view = params.get('view');
    switch (view) {
      case 'requirements':
        return 'requirements';
      case 'interviews':
        return 'interviews';
      case 'consultants':
        return 'consultants';
      case 'dashboard':
      default:
        return 'crm';
    }
  }

  if (cleanPath === '/documents') {
    return 'crm';
  }

  if (cleanPath === '/admin') {
    return 'ai';
  }

  return 'dashboard';
};

export type { ThemeProfile };
export { THEME_PROFILES };
