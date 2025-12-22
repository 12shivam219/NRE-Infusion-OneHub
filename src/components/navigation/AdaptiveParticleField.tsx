import { useMemo } from 'react';
import { useAdaptiveAtmosphere } from '../../contexts/AdaptiveAtmosphereContext';

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

// Pre-generate random seed for particle generation
const generateRandomSeed = () => {
  const seeds: number[] = [];
  for (let i = 0; i < 100; i++) {
    seeds.push(Math.random());
  }
  return seeds;
};

const seedCache = generateRandomSeed();

export const AdaptiveParticleField = () => {
  const { particleDensity, particleSpeed, temperatureColor, haloColor } = useAdaptiveAtmosphere();

  const particles = useMemo(() => {
    const baseCount = 26;
    const count = clamp(Math.round(baseCount * particleDensity), 10, 42);
    return Array.from({ length: count }).map((_, index) => {
      const seedIndex = index % seedCache.length;
      const baseSeed = seedCache[seedIndex];
      
      const size = 2.8 + (baseSeed * 5.4);
      const blur = ((baseSeed + 0.1) % 1) * 8;
      const horizontal = ((baseSeed + 0.2) % 1) * 100;
      const duration = (16 + ((baseSeed + 0.3) % 1) * 12) / clamp(particleSpeed, 0.35, 1.8);
      const delay = -((baseSeed + 0.4) % 1) * 24;
      return {
        id: `adaptive-particle-${index}`,
        size,
        blur,
        horizontal,
        duration,
        delay,
        opacity: 0.35 + ((baseSeed + 0.5) % 1) * 0.45,
      };
    });
  }, [particleDensity, particleSpeed]);

  return (
    <div className="adaptive-particle-field pointer-events-none" aria-hidden="true">
      {particles.map((particle) => (
        <span
          key={particle.id}
          className="adaptive-particle"
          style={{
            left: `${particle.horizontal}%`,
            width: `${particle.size}px`,
            height: `${particle.size}px`,
            filter: `blur(${particle.blur.toFixed(2)}px)`,
            animationDuration: `${particle.duration}s`,
            animationDelay: `${particle.delay}s`,
            opacity: particle.opacity,
            top: '105%',
            background: `radial-gradient(circle, ${haloColor} 0%, transparent 70%)`,
            boxShadow: `0 0 ${Math.max(18, particle.size * 3.4)}px ${temperatureColor}`,
          }}
        />
      ))}
    </div>
  );
};
