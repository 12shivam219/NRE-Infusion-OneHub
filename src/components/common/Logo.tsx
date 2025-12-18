import { useState } from 'react';

interface LogoProps {
  variant?: 'full' | 'icon' | 'text';
  className?: string;
  showTagline?: boolean;
}

// Professional gear SVG fallback that matches the image design
const GearSVG = ({ size = 40 }: { size?: number }) => (
  <svg
    viewBox="0 0 200 200"
    width={size}
    height={size}
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <defs>
      <linearGradient id="mainGold" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#f5e6c8" />
        <stop offset="20%" stopColor="#e8d4a0" />
        <stop offset="50%" stopColor="#d4af37" />
        <stop offset="80%" stopColor="#b8960f" />
        <stop offset="100%" stopColor="#8a7a0a" />
      </linearGradient>

      <radialGradient id="highlight" cx="35%" cy="35%">
        <stop offset="0%" stopColor="#ffffff" stopOpacity="0.6" />
        <stop offset="50%" stopColor="#ffffff" stopOpacity="0.1" />
        <stop offset="100%" stopColor="#000000" stopOpacity="0" />
      </radialGradient>

      <filter id="shadow3d">
        <feDropShadow dx="3" dy="3" stdDeviation="4" floodOpacity="0.4" />
      </filter>
    </defs>

    {/* Outer gear ring with teeth */}
    <g filter="url(#shadow3d)">
      {/* Main circular body */}
      <circle cx="100" cy="100" r="85" fill="url(#mainGold)" />

      {/* Inner dark circle for depth */}
      <circle cx="100" cy="100" r="82" fill="url(#highlight)" opacity="0.8" />

      {/* Gear teeth - 8 prominent teeth */}
      {/* Top tooth */}
      <path d="M 100 12 L 112 35 L 88 35 Z" fill="url(#mainGold)" />
      {/* Top-right tooth */}
      <path d="M 160 40 L 170 62 L 145 55 Z" fill="url(#mainGold)" />
      {/* Right tooth */}
      <path d="M 188 100 L 165 112 L 165 88 Z" fill="url(#mainGold)" />
      {/* Bottom-right tooth */}
      <path d="M 160 160 L 145 145 L 170 138 Z" fill="url(#mainGold)" />
      {/* Bottom tooth */}
      <path d="M 100 188 L 88 165 L 112 165 Z" fill="url(#mainGold)" />
      {/* Bottom-left tooth */}
      <path d="M 40 160 L 55 145 L 30 138 Z" fill="url(#mainGold)" />
      {/* Left tooth */}
      <path d="M 12 100 L 35 112 L 35 88 Z" fill="url(#mainGold)" />
      {/* Top-left tooth */}
      <path d="M 40 40 L 30 62 L 55 55 Z" fill="url(#mainGold)" />

      {/* Center hub */}
      <circle cx="100" cy="100" r="45" fill="url(#mainGold)" />

      {/* Center hub inner shadow */}
      <circle cx="100" cy="100" r="42" fill="url(#highlight)" opacity="0.7" />

      {/* Highlight reflection */}
      <circle cx="85" cy="85" r="35" fill="none" stroke="#ffffff" strokeWidth="2" opacity="0.3" />

      {/* Center inner circle */}
      <circle cx="100" cy="100" r="30" fill="#1a1a1a" opacity="0.3" />
      <circle cx="100" cy="100" r="28" fill="none" stroke="#d4af37" strokeWidth="1.5" opacity="0.6" />
    </g>
  </svg>
);

export const Logo = ({ variant = 'full', className = '', showTagline = false }: LogoProps) => {
  const [imageError, setImageError] = useState(false);

  if (variant === 'icon') {
    return (
      <>
        {!imageError ? (
          <img 
            src="/images/nretech-logo.png" 
            alt="NRETech Logo" 
            className={`${className}`}
            style={{ maxWidth: '100%', height: 'auto' }}
            onError={() => setImageError(true)}
          />
        ) : (
          <GearSVG size={40} />
        )}
      </>
    );
  }

  if (variant === 'text') {
    return (
      <div className={className}>
        <div 
          className="font-bold text-xl tracking-tight"
          style={{ 
            background: 'linear-gradient(135deg, var(--color-primary), var(--color-primary-dark))', 
            WebkitBackgroundClip: 'text', 
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text'
          }}
        >
          NRETech
        </div>
        {showTagline && (
          <div className="text-xs tracking-widest text-gray-400" style={{ letterSpacing: '0.15em' }}>
            IT'S TIME TO MAKE IT
          </div>
        )}
      </div>
    );
  }

  // Full variant - logo + text
  return (
    <div className={`flex items-center gap-2 sm:gap-3 ${className}`}>
      {!imageError ? (
        <img 
          src="/images/nretech-logo.png" 
          alt="NRETech Logo" 
          className="w-10 h-10 sm:w-12 sm:h-12"
          style={{ maxWidth: '100%', height: 'auto' }}
          onError={() => setImageError(true)}
        />
      ) : (
        <GearSVG size={40} />
      )}
      <div>
        <div 
          className="font-bold text-lg sm:text-xl tracking-tight leading-none"
          style={{ 
            background: 'linear-gradient(135deg, var(--color-primary), var(--color-primary-dark))', 
            WebkitBackgroundClip: 'text', 
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text'
          }}
        >
          NRETech
        </div>
        {showTagline && (
          <div className="text-xs tracking-widest text-gray-400" style={{ letterSpacing: '0.15em' }}>
            IT'S TIME TO MAKE IT
          </div>
        )}
      </div>
    </div>
  );
};
