import { useMemo } from 'react';
import { NavigationItem } from './navConfig';
import { Logo } from '../common/Logo';
import { AdaptiveParticleField } from './AdaptiveParticleField';

interface OrbitalCommandBarProps {
  items: NavigationItem[];
  activeId: string | null;
  onNavigate: (item: NavigationItem) => void;
  onPreview: (item: NavigationItem) => void;
  onPreviewEnd: () => void;
}

const ORBIT_RADIUS = 180;

export const OrbitalCommandBar = ({ items, activeId, onNavigate, onPreview, onPreviewEnd }: OrbitalCommandBarProps) => {
  const polarPositions = useMemo(() => {
    const total = items.length;
    return items.map((item, index) => {
      const angle = (index / total) * 360;
      return { item, angle };
    });
  }, [items]);

  return (
    <nav
      aria-label="Primary navigation"
      className="relative flex w-full max-w-5xl items-center justify-center"
      onMouseLeave={onPreviewEnd}
      onFocusCapture={(event) => {
        if (!event.currentTarget.contains(event.target as Node)) {
          onPreviewEnd();
        }
      }}
    >
      <div className="relative h-[26rem] w-[26rem]">
        <div
          className="absolute inset-0 rounded-full opacity-90 blur-3xl transition-colors duration-500"
          style={{
            background: 'radial-gradient(circle at 50% 45%, var(--nre-ambient) 0%, transparent 65%)',
            opacity: 'var(--nre-ambient-strength)',
            animation: 'nretech-ambient-breath 14s ease-in-out infinite',
          }}
        />

        <div
          className="absolute inset-0 rounded-full border transition-colors duration-500"
          style={{
            animation: 'nretech-orbit-rotation var(--nre-orbit-duration, 20s) linear infinite',
            borderColor: 'var(--nre-orbit-ring)',
            boxShadow: '0 0 calc(32px * var(--nre-glow-scale, 1)) rgba(17, 23, 34, 0.45)',
          }}
        />
        <div
          className="absolute inset-8 rounded-full border transition-colors duration-500"
          style={{
            animation: 'nretech-orbit-rotation-reverse var(--nre-orbit-inner-duration, 24s) linear infinite',
            borderColor: 'color-mix(in srgb, var(--nre-orbit-ring) 65%, transparent)',
          }}
        />

        <div className="absolute left-1/2 top-1/2 flex h-36 w-36 -translate-x-1/2 -translate-y-1/2 items-center justify-center">
          <div
            className="absolute inset-[-25%] rounded-full blur-2xl transition-all duration-500"
            style={{ backgroundColor: 'var(--nre-accent-soft)' }}
          />
          <div
            className="absolute inset-[-38%] rounded-full blur-3xl transition-all duration-500"
            style={{ backgroundColor: 'var(--nre-accent-glow)' }}
          />

          <div
            className="relative flex h-full w-full items-center justify-center overflow-hidden rounded-full transition-all duration-500"
            style={{
              background:
                'radial-gradient(circle at 32% 30%, color-mix(in srgb, var(--nre-temperature-color) 48%, rgba(13,17,23,0.82)) 0%, rgba(13,17,23,0.92) 65%)',
              boxShadow: '0 0 calc(45px * var(--nre-glow-scale, 1)) var(--nre-accent-glow)',
            }}
          >
            <div
              className="absolute inset-[-18%] rounded-full opacity-60"
              style={{
                background:
                  'radial-gradient(circle at 30% 30%, color-mix(in srgb, var(--nre-halo-color) 65%, transparent) 0%, transparent 65%)',
                mixBlendMode: 'screen',
              }}
            />
            <Logo variant="icon" style="circular" className="h-16 w-16" animate />
          </div>
        </div>

        <AdaptiveParticleField />

        {polarPositions.map(({ item, angle }) => {
          const Icon = item.icon;
          const isActive = activeId === item.id;
          const transform = `rotate(${angle}deg) translateX(${ORBIT_RADIUS}px) rotate(-${angle}deg)`;

          return (
            <button
              key={item.id}
              type="button"
              title={item.label}
              aria-label={item.label}
              aria-current={isActive ? 'page' : undefined}
              onClick={() => onNavigate(item)}
              onMouseEnter={() => onPreview(item)}
              onFocus={() => onPreview(item)}
              onMouseLeave={onPreviewEnd}
              onBlur={onPreviewEnd}
              className={`group absolute left-1/2 top-1/2 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-4 focus-visible:ring-offset-[#0d1117] text-white`}
              style={{
                transform,
                borderColor: isActive ? 'var(--nre-accent)' : 'rgba(255,255,255,0.08)',
                backgroundColor: isActive ? 'var(--nre-accent)' : 'rgba(17, 22, 31, 0.72)',
                boxShadow: isActive
                  ? '0 0 calc(32px * var(--nre-glow-scale, 1)) var(--nre-accent-glow)'
                  : '0 12px calc(32px * var(--nre-glow-scale, 1)) rgba(10, 14, 24, 0.55)',
              }}
            >
              <span
                className="absolute inset-0 rounded-full opacity-0 transition-opacity duration-300 group-hover:opacity-35 group-focus-visible:opacity-45"
                style={{ backgroundColor: 'var(--nre-accent-soft)' }}
              />
              <span
                className="absolute inset-[-18px] rounded-full blur-xl opacity-0 transition-opacity duration-300 group-hover:opacity-60 group-focus-visible:opacity-70"
                style={{ backgroundColor: 'var(--nre-accent-glow)' }}
              />
              <Icon
                className={`relative h-6 w-6 transition-transform duration-300 ${
                  isActive ? 'scale-110' : 'group-hover:scale-110'
                }`}
                aria-hidden="true"
              />
              <span
                className="pointer-events-none absolute -translate-x-1/2 select-none whitespace-nowrap rounded-full bg-black/80 px-3 py-1 text-xs tracking-[0.18em] text-white opacity-0 shadow-[0_8px_24px_rgba(0,0,0,0.45)] transition-all duration-300 group-hover:-top-16 group-hover:opacity-100 group-focus-visible:-top-16 group-focus-visible:opacity-100"
                style={{ fontFamily: '"Poppins", sans-serif' }}
              >
                {item.label.toUpperCase()}
              </span>
            </button>
          );
        })}

      </div>
    </nav>
  );
};
