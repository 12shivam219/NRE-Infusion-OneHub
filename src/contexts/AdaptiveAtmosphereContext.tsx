import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useThemeSync } from './ThemeSyncContext';

export type TimePeriod = 'morning' | 'afternoon' | 'evening' | 'night';
export type ActivityLevel = 'idle' | 'focused' | 'active';
export type SystemMood = 'normal' | 'syncing' | 'alert';

type AdaptiveAtmosphereSnapshot = {
  timePeriod: TimePeriod;
  activityLevel: ActivityLevel;
  systemMood: SystemMood;
  glowScale: number;
  ambientStrength: number;
  vignetteOpacity: number;
  orbitDurations: {
    outer: number;
    inner: number;
  };
  particleDensity: number;
  particleSpeed: number;
  temperatureColor: string;
  haloColor: string;
};

type AdaptiveAtmosphereContextValue = AdaptiveAtmosphereSnapshot & {
  lastInteraction: number;
};

const AdaptiveAtmosphereContext = createContext<AdaptiveAtmosphereContextValue | undefined>(undefined);

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const hexToRgb = (hex: string) => {
  const normalized = hex.replace('#', '');
  const chunk = normalized.length === 3 ? normalized.split('').map((c) => c + c).join('') : normalized;
  const int = parseInt(chunk, 16);
  return {
    r: (int >> 16) & 255,
    g: (int >> 8) & 255,
    b: int & 255,
  };
};

const rgbToHex = ({ r, g, b }: { r: number; g: number; b: number }) => {
  const toHex = (value: number) => clamp(Math.round(value), 0, 255).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
};

const mixHexColors = (hexA: string, hexB: string, ratio: number) => {
  const weight = clamp(ratio, 0, 1);
  const a = hexToRgb(hexA);
  const b = hexToRgb(hexB);
  return rgbToHex({
    r: a.r * (1 - weight) + b.r * weight,
    g: a.g * (1 - weight) + b.g * weight,
    b: a.b * (1 - weight) + b.b * weight,
  });
};

const TIME_PERIOD_PRESETS: Record<TimePeriod, {
  glowScale: number;
  ambientStrength: number;
  vignetteOpacity: number;
  orbitOuter: number;
  orbitInner: number;
  particleDensity: number;
  particleSpeed: number;
  temperatureTint: string;
  haloTint: string;
}> = {
  morning: {
    glowScale: 1.15,
    ambientStrength: 0.96,
    vignetteOpacity: 0.16,
    orbitOuter: 18,
    orbitInner: 22,
    particleDensity: 0.7,
    particleSpeed: 1.25,
    temperatureTint: '#9DD5FF',
    haloTint: '#FCD581',
  },
  afternoon: {
    glowScale: 1,
    ambientStrength: 0.92,
    vignetteOpacity: 0.14,
    orbitOuter: 20,
    orbitInner: 24,
    particleDensity: 0.55,
    particleSpeed: 1,
    temperatureTint: '#F6E7C1',
    haloTint: '#FFE9A0',
  },
  evening: {
    glowScale: 0.9,
    ambientStrength: 0.85,
    vignetteOpacity: 0.22,
    orbitOuter: 24,
    orbitInner: 28,
    particleDensity: 0.45,
    particleSpeed: 0.85,
    temperatureTint: '#F29B6D',
    haloTint: '#FFB55E',
  },
  night: {
    glowScale: 0.7,
    ambientStrength: 0.75,
    vignetteOpacity: 0.3,
    orbitOuter: 30,
    orbitInner: 38,
    particleDensity: 0.3,
    particleSpeed: 0.65,
    temperatureTint: '#6A8CFF',
    haloTint: '#A3B5FF',
  },
};

const ACTIVITY_MODIFIERS: Record<ActivityLevel, {
  glowScale: number;
  orbitMultiplier: number;
  ambientMultiplier: number;
  particleDensity: number;
  particleSpeed: number;
}> = {
  idle: {
    glowScale: 0.45,
    orbitMultiplier: 1.35,
    ambientMultiplier: 0.8,
    particleDensity: 0.5,
    particleSpeed: 0.5,
  },
  focused: {
    glowScale: 1,
    orbitMultiplier: 1,
    ambientMultiplier: 1,
    particleDensity: 1,
    particleSpeed: 1,
  },
  active: {
    glowScale: 1.25,
    orbitMultiplier: 0.82,
    ambientMultiplier: 1.08,
    particleDensity: 1.25,
    particleSpeed: 1.4,
  },
};

const SYSTEM_MODIFIERS: Record<SystemMood, {
  glowScale: number;
  orbitMultiplier: number;
  overlay?: string | null;
}> = {
  normal: {
    glowScale: 1,
    orbitMultiplier: 1,
    overlay: null,
  },
  syncing: {
    glowScale: 1.1,
    orbitMultiplier: 0.92,
    overlay: 'rgba(96, 165, 250, 0.35)',
  },
  alert: {
    glowScale: 1.35,
    orbitMultiplier: 0.78,
    overlay: 'rgba(251, 191, 36, 0.45)',
  },
};

const MORNING_START = 5;
const AFTERNOON_START = 11;
const EVENING_START = 17;
const NIGHT_START = 21;

const getTimePeriod = (date: Date): TimePeriod => {
  const hour = date.getHours();
  if (hour >= MORNING_START && hour < AFTERNOON_START) return 'morning';
  if (hour >= AFTERNOON_START && hour < EVENING_START) return 'afternoon';
  if (hour >= EVENING_START && hour < NIGHT_START) return 'evening';
  return 'night';
};

const evaluateActivityLevel = (lastInteraction: number, recentInteractions: number[]): ActivityLevel => {
  const now = Date.now();
  if (now - lastInteraction >= 120_000) {
    return 'idle';
  }
  const windowStart = now - 12_000;
  const burstCount = recentInteractions.filter((timestamp) => timestamp >= windowStart).length;
  if (burstCount >= 22) {
    return 'active';
  }
  return 'focused';
};

const createAudioCue = (
  ctx: AudioContext,
  {
    frequency,
    gain,
    duration,
    type,
  }: { frequency: number; gain: number; duration: number; type?: OscillatorType },
) => {
  const oscillator = ctx.createOscillator();
  const gainNode = ctx.createGain();
  oscillator.type = type ?? 'sine';
  oscillator.frequency.setValueAtTime(frequency, ctx.currentTime);

  gainNode.gain.setValueAtTime(0, ctx.currentTime);
  gainNode.gain.linearRampToValueAtTime(gain, ctx.currentTime + 0.05);
  gainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + duration);

  oscillator.connect(gainNode).connect(ctx.destination);
  oscillator.start();
  oscillator.stop(ctx.currentTime + duration + 0.05);
};

export const AdaptiveAtmosphereProvider = ({ children }: { children: ReactNode }) => {
  const { theme } = useThemeSync();
  const [timePeriod, setTimePeriod] = useState<TimePeriod>(() => getTimePeriod(new Date()));
  const [activityLevel, setActivityLevel] = useState<ActivityLevel>('focused');
  const [systemMood, setSystemMood] = useState<SystemMood>('normal');
  const lastInteractionRef = useRef<number>(0);
  const interactionHistoryRef = useRef<number[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const lastCueRef = useRef<string>('');
  const lastCueTimestampRef = useRef<number>(0);

  const enableAudio = useCallback(() => {
    if (audioContextRef.current) {
      if (audioContextRef.current.state === 'suspended') {
        void audioContextRef.current.resume().catch(() => undefined);
      }
      return;
    }
    try {
      audioContextRef.current = new AudioContext();
    } catch (error) {
      console.warn('[AdaptiveAtmosphere] Audio context unavailable', error);
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    window.addEventListener('pointerdown', enableAudio, { once: true });
    window.addEventListener('keydown', enableAudio, { once: true });

    return () => {
      window.removeEventListener('pointerdown', enableAudio);
      window.removeEventListener('keydown', enableAudio);
    };
  }, [enableAudio]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const updateTimePeriod = () => {
      setTimePeriod(getTimePeriod(new Date()));
    };

    updateTimePeriod();

    // ✅ OPTIMIZATION: Only update on actual time changes (every hour), not every minute
    // This reduces CPU and re-renders significantly
    const now = new Date();
    const msUntilNextHour = (60 - now.getMinutes()) * 60 * 1000 - now.getMilliseconds();

    let hourlyIntervalId: number | null = null;

    const timeoutId = window.setTimeout(() => {
      updateTimePeriod();
      hourlyIntervalId = window.setInterval(updateTimePeriod, 60 * 60 * 1000);
    }, msUntilNextHour);

    return () => {
      window.clearTimeout(timeoutId);
      if (hourlyIntervalId !== null) {
        window.clearInterval(hourlyIntervalId);
      }
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    lastInteractionRef.current = Date.now();

    const registerInteraction = () => {
      const now = Date.now();
      lastInteractionRef.current = now;
      interactionHistoryRef.current = interactionHistoryRef.current
        .concat(now)
        .filter((timestamp) => timestamp >= now - 60_000);
    };

    const events: Array<keyof WindowEventMap> = ['pointermove', 'pointerdown', 'keydown', 'touchstart', 'wheel'];
    const passiveOptions = { passive: true } as unknown as AddEventListenerOptions;
    events.forEach((name) => window.addEventListener(name, registerInteraction, passiveOptions));

    const handleModuleChange = () => {
      const now = Date.now();
      lastInteractionRef.current = now;
      interactionHistoryRef.current.push(now);
    };

    const handleCommandInteraction = () => {
      const now = Date.now();
      lastInteractionRef.current = now;
      interactionHistoryRef.current.push(now);
    };

    window.addEventListener('adaptive-module-change', handleModuleChange as EventListener);
    window.addEventListener('adaptive-command-interaction', handleCommandInteraction as EventListener);

    // ✅ OPTIMIZATION: Removed 6-second polling interval. Activity level now updates on-demand
    // when interactions occur. This eliminates constant re-renders and CPU usage.
    // Activity evaluation happens reactively when user interacts, not on a timer.
    
    const updateActivityOnDemand = () => {
      setActivityLevel((current) => {
        const evaluated = evaluateActivityLevel(lastInteractionRef.current, interactionHistoryRef.current);
        return current === evaluated ? current : evaluated;
      });
    };

    // Update activity level when interactions are detected
    const origRegisterInteraction = registerInteraction;
    const wrappedRegisterInteraction = () => {
      origRegisterInteraction();
      updateActivityOnDemand(); // ← Update immediately on user action
    };

    events.forEach((name) => window.removeEventListener(name, registerInteraction, passiveOptions));
    events.forEach((name) => window.addEventListener(name, wrappedRegisterInteraction, passiveOptions));

    return () => {
      events.forEach((name) => window.removeEventListener(name, wrappedRegisterInteraction, passiveOptions));
      window.removeEventListener('adaptive-module-change', handleModuleChange as EventListener);
      window.removeEventListener('adaptive-command-interaction', handleCommandInteraction as EventListener);
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleSyncStart = () => setSystemMood('syncing');
    const handleSyncComplete = () => setSystemMood('normal');
    const handleSyncError = () => {
      setSystemMood('alert');
      window.setTimeout(() => setSystemMood((current) => (current === 'alert' ? 'normal' : current)), 4_000);
    };

    const passiveSyncOptions = { passive: true } as unknown as AddEventListenerOptions;

    window.addEventListener('start-sync', handleSyncStart);
    window.addEventListener('sync-queue-changed', handleSyncStart as EventListener, passiveSyncOptions);
    window.addEventListener('sync-complete', handleSyncComplete);
    window.addEventListener('sync-error', handleSyncError);

    return () => {
      window.removeEventListener('start-sync', handleSyncStart);
      window.removeEventListener('sync-queue-changed', handleSyncStart as EventListener);
      window.removeEventListener('sync-complete', handleSyncComplete);
      window.removeEventListener('sync-error', handleSyncError);
    };
  }, []);

  const snapshot = useMemo<AdaptiveAtmosphereSnapshot>(() => {
    const timePreset = TIME_PERIOD_PRESETS[timePeriod];
    const activityPreset = ACTIVITY_MODIFIERS[activityLevel];
    const systemPreset = SYSTEM_MODIFIERS[systemMood];

    const glowScale = clamp(
      timePreset.glowScale * activityPreset.glowScale * systemPreset.glowScale,
      0.25,
      1.6,
    );

    const outerDuration = clamp(
      timePreset.orbitOuter * activityPreset.orbitMultiplier * systemPreset.orbitMultiplier,
      12,
      42,
    );

    const innerDuration = clamp(
      timePreset.orbitInner * activityPreset.orbitMultiplier * systemPreset.orbitMultiplier,
      16,
      48,
    );

    const ambientStrength = clamp(
      timePreset.ambientStrength * activityPreset.ambientMultiplier,
      0.55,
      1.05,
    );

    const particleDensity = clamp(
      timePreset.particleDensity * activityPreset.particleDensity,
      0.2,
      1.3,
    );

    const particleSpeed = clamp(
      timePreset.particleSpeed * activityPreset.particleSpeed,
      0.4,
      1.6,
    );

    const vignetteOpacity = clamp(timePreset.vignetteOpacity, 0.1, 0.5);

    const temperatureColor = mixHexColors(theme.accent, timePreset.temperatureTint, 0.35);
    const accentGlowHex = (() => {
      const match = theme.accentGlow.match(/rgba?\(([^)]+)\)/);
      if (!match) {
        return theme.accent;
      }
      const [r, g, b] = match[1].split(',').map((component) => parseFloat(component.trim()));
      return rgbToHex({ r, g, b });
    })();

    const haloColor = mixHexColors(accentGlowHex, timePreset.haloTint, 0.4);

    return {
      timePeriod,
      activityLevel,
      systemMood,
      glowScale,
      ambientStrength,
      vignetteOpacity,
      orbitDurations: {
        outer: outerDuration,
        inner: innerDuration,
      },
      particleDensity,
      particleSpeed,
      temperatureColor,
      haloColor,
    };
  }, [timePeriod, activityLevel, systemMood, theme.accent, theme.accentGlow]);

  useEffect(() => {
    if (typeof document === 'undefined') return;

    const root = document.documentElement;
    root.style.setProperty('--nre-glow-scale', snapshot.glowScale.toFixed(3));
    root.style.setProperty('--nre-orbit-duration', `${snapshot.orbitDurations.outer}s`);
    root.style.setProperty('--nre-orbit-inner-duration', `${snapshot.orbitDurations.inner}s`);
    root.style.setProperty('--nre-ambient-strength', snapshot.ambientStrength.toFixed(3));
    root.style.setProperty('--nre-vignette-opacity', snapshot.vignetteOpacity.toFixed(3));
    root.style.setProperty('--nre-particle-density', snapshot.particleDensity.toFixed(3));
    root.style.setProperty('--nre-particle-speed', snapshot.particleSpeed.toFixed(3));
    root.style.setProperty('--nre-temperature-color', snapshot.temperatureColor);
    root.style.setProperty('--nre-halo-color', snapshot.haloColor);
    root.setAttribute('data-adaptive-period', snapshot.timePeriod);
    root.setAttribute('data-adaptive-activity', snapshot.activityLevel);
    root.setAttribute('data-adaptive-mood', snapshot.systemMood);

    const overlay = SYSTEM_MODIFIERS[snapshot.systemMood].overlay;
    if (overlay) {
      root.style.setProperty('--nre-system-overlay', overlay);
    } else {
      root.style.setProperty('--nre-system-overlay', 'transparent');
    }
  }, [snapshot]);

  useEffect(() => {
    const ctx = audioContextRef.current;
    if (!ctx || ctx.state === 'suspended') {
      return;
    }

    const now = Date.now();
    if (now - lastCueTimestampRef.current < 4_000) {
      return;
    }

    const cueKey = `${snapshot.timePeriod}-${snapshot.activityLevel}-${snapshot.systemMood}`;
    if (cueKey === lastCueRef.current) {
      return;
    }

    lastCueRef.current = cueKey;
    lastCueTimestampRef.current = now;

    const cues: Partial<Record<SystemMood | TimePeriod, { frequency: number; gain: number; duration: number; type?: OscillatorType }>> = {
      morning: { frequency: 420, gain: 0.035, duration: 0.28, type: 'triangle' },
      afternoon: { frequency: 360, gain: 0.028, duration: 0.24, type: 'sine' },
      evening: { frequency: 280, gain: 0.03, duration: 0.32, type: 'sine' },
      night: { frequency: 220, gain: 0.02, duration: 0.4, type: 'sine' },
      syncing: { frequency: 520, gain: 0.025, duration: 0.22, type: 'sine' },
      alert: { frequency: 610, gain: 0.045, duration: 0.18, type: 'sawtooth' },
    };

    const cue = cues[snapshot.systemMood] ?? cues[snapshot.timePeriod];
    if (cue) {
      try {
        createAudioCue(ctx, cue);
      } catch (error) {
        console.warn('[AdaptiveAtmosphere] Failed to play cue', error);
      }
    }
  }, [snapshot]);

  // Using ref.current in value object is intentional for performance
  const value: AdaptiveAtmosphereContextValue = {
    ...snapshot,
    // eslint-disable-next-line react-hooks/refs
    lastInteraction: lastInteractionRef.current,
  };

  return (
    <AdaptiveAtmosphereContext.Provider value={value}>
      {children}
    </AdaptiveAtmosphereContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAdaptiveAtmosphere = () => {
  const ctx = useContext(AdaptiveAtmosphereContext);
  if (!ctx) {
    throw new Error('useAdaptiveAtmosphere must be used within an AdaptiveAtmosphereProvider');
  }
  return ctx;
};
