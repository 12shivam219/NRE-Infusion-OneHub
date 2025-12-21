/** @type {import('tailwindcss').Config} */

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      // NRETech Brand Typography
      fontFamily: {
        heading: ['"Poppins"', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'sans-serif'],
        body: ['"Inter"', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'sans-serif'],
        mono: ['"Fira Code"', '"Monaco"', 'monospace'],
      },
      // Letter spacing utilities
      letterSpacing: {
        tighter: '-0.05em',
        tight: '-0.02em',
        normal: '0em',
        wide: '0.05em',
        wider: '0.1em',
        widest: '0.2em',
      },
      colors: {
        // Brand Primary - Amber Gold
        gold: {
          50: '#fffef2',
          100: '#fffde6',
          200: '#fffacc',
          300: '#fff8b3',
          400: '#fff499',
          500: '#EAB308', // Primary brand gold
          600: '#ca8a04',
          700: '#a16207',
          800: '#854d0e',
          900: '#713f12',
        },
        // Dark Theme Background Gradient
        darkbg: {
          DEFAULT: '#0D1117',
          deep: '#05070A',
          surface: '#161B22',
          surface_light: '#1C2128',
        },
        // Enterprise Color Palette - Charcoal Primary + Gold Accent
        // Primary - Charcoal
        primary: {
          50: '#f9fafb',
          100: '#f3f4f6',
          200: '#e5e7eb',
          300: '#d1d5db',
          400: '#9ca3af',
          500: '#6b7280', // Base charcoal
          600: '#4b5563',
          700: '#374151', // Dark charcoal
          800: '#1f2937',
          900: '#111827', // Deep charcoal
        },
        // Accent - Gold (Legacy, maps to new gold)
        accent: {
          50: '#fffef2',
          100: '#fffde6',
          200: '#fffacc',
          300: '#fff8b3',
          400: '#fff499',
          500: '#EAB308',
          600: '#ca8a04',
          700: '#a16207',
          800: '#854d0e',
          900: '#713f12',
        },
        // Neutral grayscale
        neutral: {
          50: '#f9fafb',
          100: '#f3f4f6',
          200: '#e5e7eb',
          300: '#d1d5db',
          400: '#9ca3af',
          500: '#6b7280',
          600: '#4b5563',
          700: '#374151',
          800: '#1f2937',
          900: '#111827',
        },
      },
      boxShadow: {
        // Gold glow effects
        'gold-glow': '0 0 20px rgba(234, 179, 8, 0.15)',
        'gold-glow-hover': '0 0 30px rgba(234, 179, 8, 0.25)',
        'gold-glow-active': '0 0 40px rgba(234, 179, 8, 0.35)',
        // Subtle and soft shadows for depth
        xs: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
        sm: '0 1px 3px 0 rgb(0 0 0 / 0.08), 0 1px 2px -1px rgb(0 0 0 / 0.08)',
        base: '0 4px 6px -1px rgb(0 0 0 / 0.08), 0 2px 4px -2px rgb(0 0 0 / 0.08)',
        md: '0 10px 15px -3px rgb(0 0 0 / 0.08), 0 4px 6px -4px rgb(0 0 0 / 0.08)',
        lg: '0 20px 25px -5px rgb(0 0 0 / 0.08), 0 8px 10px -6px rgb(0 0 0 / 0.08)',
        xl: '0 25px 50px -12px rgb(0 0 0 / 0.1)',
        'card': '0 1px 3px 0 rgb(0 0 0 / 0.06), 0 1px 2px -1px rgb(0 0 0 / 0.06)',
        'card-hover': '0 10px 20px -5px rgb(0 0 0 / 0.1)',
        // Focus states
        'focus-gold': '0 0 0 3px rgba(234, 179, 8, 0.1), 0 0 0 1px rgba(234, 179, 8, 0.5)',
      },
      borderRadius: {
        'card': '1rem',
        'button': '0.75rem',
        'input': '0.5rem',
      },
      transitionDuration: {
        '150': '150ms',
        '200': '200ms',
        '300': '300ms',
        '500': '500ms',
      },
      transitionTimingFunction: {
        'brand': 'cubic-bezier(0.4, 0, 0.2, 1)',
        'bounce': 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
      },
      spacing: {
        'card-p': '1.5rem',
        'card-p-sm': '1rem',
        'card-p-lg': '2rem',
      },
      animation: {
        'spin-slow': 'spin 4s linear infinite',
        'pulse-gold': 'pulse-gold 3s ease-in-out infinite',
        'scale-subtle': 'scale-subtle 0.3s ease-out',
        'glow-pulse': 'glow-pulse 2s ease-in-out infinite',
      },
      keyframes: {
        'pulse-gold': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' },
        },
        'scale-subtle': {
          '0%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.05)' },
          '100%': { transform: 'scale(1)' },
        },
        'glow-pulse': {
          '0%, 100%': { 
            boxShadow: '0 0 20px rgba(234, 179, 8, 0.15)',
            opacity: '1',
          },
          '50%': { 
            boxShadow: '0 0 30px rgba(234, 179, 8, 0.25)',
            opacity: '0.9',
          },
        },
      },
    },
  },
  plugins: [],
};

