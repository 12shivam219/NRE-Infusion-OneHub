import { NavigationItem } from './navConfig';

interface GlassCommandDockProps {
  items: NavigationItem[];
  activeId: string | null;
  onNavigate: (item: NavigationItem) => void;
  onPreview: (item: NavigationItem) => void;
  onPreviewEnd: () => void;
}

export const GlassCommandDock = ({ items, activeId, onNavigate, onPreview, onPreviewEnd }: GlassCommandDockProps) => {
  if (!items.length) return null;

  return (
    <nav
      aria-label="Primary navigation"
      className="md:hidden"
    >
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 h-32 bg-gradient-to-t from-[color-mix(in_srgb,var(--nre-gradient-start)80%,#000)] via-[color-mix(in_srgb,var(--nre-gradient-start)45%,#000)] to-transparent transition-all duration-500" />

      <div className="fixed inset-x-0 bottom-0 z-50 pb-6">
        <div className="mx-auto w-full max-w-lg px-4">
          <div className="relative overflow-hidden rounded-3xl border border-white/12 bg-white/8 shadow-[0_30px_60px_rgba(0,0,0,0.45)] backdrop-blur-2xl transition-all duration-500" style={{ boxShadow: '0 26px 60px color-mix(in srgb, var(--nre-accent-glow) 45%, rgba(0,0,0,0.32))' }}>
            <div className="pointer-events-none absolute inset-0 rounded-3xl opacity-80 transition-all duration-500" style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.18), rgba(255,255,255,0.04))' }} />
            <div className="pointer-events-none absolute -left-10 top-1/2 h-32 w-32 -translate-y-1/2 rounded-full blur-3xl transition-colors duration-500" style={{ backgroundColor: 'var(--nre-accent-soft)' }} />
            <div className="pointer-events-none absolute -right-6 top-0 h-24 w-24 rounded-full blur-2xl transition-colors duration-500" style={{ backgroundColor: 'color-mix(in srgb, var(--nre-accent) 35%, transparent)' }} />

            <ul className="relative z-10 flex items-center justify-between px-4 py-3">
              {items.map((item) => {
                const Icon = item.icon;
                const isActive = activeId === item.id;

                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      aria-label={item.label}
                      aria-current={isActive ? 'page' : undefined}
                      onClick={() => onNavigate(item)}
                      onMouseEnter={() => onPreview(item)}
                      onMouseLeave={onPreviewEnd}
                      onFocus={() => onPreview(item)}
                      onBlur={onPreviewEnd}
                      onTouchStart={() => onPreview(item)}
                      onTouchEnd={onPreviewEnd}
                      className={`group relative flex h-[58px] w-[58px] items-center justify-center rounded-2xl border border-white/5 bg-white/8 text-amber-100 transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0d1117] ${
                        isActive
                          ? 'border-amber-400/90 bg-amber-400/90 text-[#11161f] shadow-[0_12px_40px_rgba(234,179,8,0.45)]'
                          : 'hover:-translate-y-1 hover:border-amber-300/60 hover:bg-amber-300/15 hover:text-amber-100 active:translate-y-0'
                      }`}
                      style={{
                        touchAction: 'manipulation',
                        borderColor: isActive ? 'var(--nre-accent)' : 'rgba(255,255,255,0.12)',
                        backgroundColor: isActive
                          ? 'var(--nre-accent)'
                          : 'color-mix(in srgb, rgba(255,255,255,0.12) 55%, var(--nre-accent-glass) 45%)',
                        color: '#FFFFFF',
                        boxShadow: isActive
                          ? '0 12px 40px color-mix(in srgb, var(--nre-accent-glow) 70%, rgba(0,0,0,0.25))'
                          : undefined,
                      }}
                    >
                      <span
                        className="absolute inset-0 rounded-2xl opacity-0 transition-opacity duration-300 group-hover:opacity-60 group-focus-visible:opacity-70"
                        style={{ backgroundColor: 'var(--nre-accent-soft)' }}
                      />
                      <span className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/35 via-transparent to-transparent opacity-70 mix-blend-overlay" />
                      <Icon
                        aria-hidden="true"
                        className={`relative h-6 w-6 transition-transform duration-300 ${
                          isActive ? 'scale-105' : 'group-active:scale-95 group-hover:scale-110'
                        }`}
                      />
                      <span
                        className="pointer-events-none absolute -top-10 left-1/2 -translate-x-1/2 rounded-full bg-black/80 px-2 py-1 text-[10px] uppercase tracking-[0.16em] text-white opacity-0 shadow-[0_8px_24px_rgba(0,0,0,0.45)] transition-all duration-300 group-focus-visible:-top-12 group-focus-visible:opacity-100"
                        style={{ fontFamily: '"Poppins", sans-serif', letterSpacing: '0.16em' }}
                      >
                        {item.label}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </div>
    </nav>
  );
};
