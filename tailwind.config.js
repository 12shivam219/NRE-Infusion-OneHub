/** @type {import('tailwindcss').Config} */

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial'],
      },
      colors: {
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
        // Accent - Gold
        accent: {
          50: '#fffdf5',
          100: '#fff9e6',
          200: '#fff2cc',
          300: '#ffe7a3',
          400: '#ffd866',
          500: '#d4af37', // Primary gold
          600: '#b88a00',
          700: '#9c6c00',
          800: '#7a5500',
          900: '#4a3400',
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
        // Subtle and soft shadows for depth
        xs: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
        sm: '0 1px 3px 0 rgb(0 0 0 / 0.08), 0 1px 2px -1px rgb(0 0 0 / 0.08)',
        base: '0 4px 6px -1px rgb(0 0 0 / 0.08), 0 2px 4px -2px rgb(0 0 0 / 0.08)',
        md: '0 10px 15px -3px rgb(0 0 0 / 0.08), 0 4px 6px -4px rgb(0 0 0 / 0.08)',
        lg: '0 20px 25px -5px rgb(0 0 0 / 0.08), 0 8px 10px -6px rgb(0 0 0 / 0.08)',
        xl: '0 25px 50px -12px rgb(0 0 0 / 0.1)',
        'card': '0 1px 3px 0 rgb(0 0 0 / 0.06), 0 1px 2px -1px rgb(0 0 0 / 0.06)',
        'card-hover': '0 10px 20px -5px rgb(0 0 0 / 0.1)',
      },
      borderRadius: {
        'card': '0.75rem',
      },
      transitionDuration: {
        '200': '200ms',
        '300': '300ms',
      },
      spacing: {
        'card-p': '1.5rem',
        'card-p-sm': '1rem',
      },
    },
  },
  plugins: [],
};
