/**
 * NRETech Brand System
 * Comprehensive design tokens for unified, premium UI across all components
 */

// ========== BRAND COLORS ==========
export const BRAND_COLORS = {
  // Primary: Amber Gold - Premium, modern, tech-forward
  gold: '#EAB308',
  goldLight: '#fef08a',
  goldDark: '#ca8a04',
  
  // Dark Gradient Base - Sophisticated dark theme
  darkBg: '#0D1117',
  darkBgDeep: '#05070A',
  darkSurface: '#161B22',
  darkSurfaceLight: '#1C2128',
  
  // Neutral grayscale for text and borders
  textPrimary: '#FFFFFF',
  textSecondary: 'rgba(255, 255, 255, 0.7)',
  textMuted: 'rgba(255, 255, 255, 0.5)',
  borderDefault: 'rgba(255, 255, 255, 0.1)',
  borderHover: 'rgba(255, 255, 255, 0.2)',
};

// ========== TYPOGRAPHY SYSTEM ==========
export const TYPOGRAPHY = {
  // Font families
  families: {
    heading: '"Poppins", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    body: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    mono: '"Fira Code", "Monaco", monospace',
  },
  // Font sizes (rem)
  sizes: {
    xs: '0.75rem',      // 12px
    sm: '0.875rem',     // 14px
    base: '1rem',       // 16px
    lg: '1.125rem',     // 18px
    xl: '1.25rem',      // 20px
    '2xl': '1.5rem',    // 24px
    '3xl': '1.875rem',  // 30px
    '4xl': '2.25rem',   // 36px
  },
  // Font weights
  weights: {
    light: 300,
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
    extrabold: 800,
  },
  // Letter spacing (em)
  letterSpacing: {
    tight: '-0.02em',
    normal: '0em',
    wide: '0.05em',
    wider: '0.1em',
  },
};

// ========== SPACING SYSTEM ==========
export const SPACING_TOKENS = {
  xs: '0.25rem',   // 4px
  sm: '0.5rem',    // 8px
  md: '1rem',      // 16px
  lg: '1.5rem',    // 24px
  xl: '2rem',      // 32px
  '2xl': '3rem',   // 48px
  '3xl': '4rem',   // 64px
};

// Component-specific padding
export const COMPONENT_PADDING = {
  button: {
    sm: '0.5rem 1rem',      // py-2 px-4
    md: '0.75rem 1.5rem',   // py-3 px-6
    lg: '1rem 2rem',        // py-4 px-8
  },
  card: {
    sm: '1rem',             // 16px
    md: '1.5rem',           // 24px
    lg: '2rem',             // 32px
  },
  input: '0.75rem 1rem',    // Consistent form input padding
};

// ========== BORDER RADIUS ==========
export const BORDER_RADIUS = {
  none: '0',
  sm: '0.25rem',    // 4px
  md: '0.5rem',     // 8px
  lg: '0.75rem',    // 12px
  xl: '1rem',       // 16px
  full: '9999px',
  
  // Component-specific
  button: '0.75rem',
  card: '1rem',
  input: '0.5rem',
  avatar: '9999px',
};

// ========== SHADOWS & ELEVATION ==========
export const ELEVATION = {
  // Glow effects for gold accent
  goldGlow: '0 0 20px rgba(234, 179, 8, 0.15)',
  goldGlowHover: '0 0 30px rgba(234, 179, 8, 0.25)',
  goldGlowActive: '0 0 40px rgba(234, 179, 8, 0.35)',
  
  // Standard shadows
  sm: '0 1px 2px rgba(0, 0, 0, 0.05)',
  md: '0 4px 12px rgba(0, 0, 0, 0.1)',
  lg: '0 10px 25px rgba(0, 0, 0, 0.15)',
  xl: '0 20px 40px rgba(0, 0, 0, 0.2)',
  
  // Card shadows
  card: '0 2px 8px rgba(0, 0, 0, 0.1)',
  cardHover: '0 8px 24px rgba(0, 0, 0, 0.15)',
  
  // Input/focus shadows
  focus: '0 0 0 3px rgba(234, 179, 8, 0.1), 0 0 0 1px rgba(234, 179, 8, 0.5)',
};

// ========== TRANSITIONS & ANIMATIONS ==========
export const MOTION = {
  // Timing functions
  easing: {
    default: 'cubic-bezier(0.4, 0, 0.2, 1)',
    subtle: 'cubic-bezier(0.4, 0, 0.6, 1)',
    bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
  },
  // Durations (ms)
  duration: {
    fast: '100ms',
    normal: '200ms',
    slow: '300ms',
    slower: '500ms',
  },
};

// Status Colors - Unified across all components
export const STATUS_COLORS = {
  // Requirement Statuses
  requirement: {
    NEW: { badge: 'bg-primary-50 text-primary-800', label: 'New', icon: 'sparkles' },
    IN_PROGRESS: { badge: 'bg-yellow-100 text-yellow-800', label: 'In Progress', icon: 'cog' },
    SUBMITTED: { badge: 'bg-cyan-100 text-cyan-800', label: 'Submitted', icon: 'send' },
    INTERVIEW: { badge: 'bg-purple-100 text-purple-800', label: 'Interview', icon: 'calendar' },
    OFFER: { badge: 'bg-green-100 text-green-800', label: 'Offer', icon: 'check-circle' },
    REJECTED: { badge: 'bg-red-100 text-red-800', label: 'Rejected', icon: 'x-circle' },
    CLOSED: { badge: 'bg-gray-100 text-gray-800', label: 'Closed', icon: 'lock' },
  },
  // Interview Statuses
  interview: {
    Confirmed: { badge: 'bg-green-50 text-green-700 border-green-200', dot: 'bg-green-500', label: 'Confirmed' },
    Pending: { badge: 'bg-yellow-50 text-yellow-700 border-yellow-200', dot: 'bg-yellow-500', label: 'Pending' },
    Scheduled: { badge: 'bg-primary-50 text-primary-800 border-primary-200', dot: 'bg-primary-500', label: 'Scheduled' },
    Completed: { badge: 'bg-purple-50 text-purple-700 border-purple-200', dot: 'bg-purple-500', label: 'Completed' },
    Cancelled: { badge: 'bg-red-50 text-red-700 border-red-200', dot: 'bg-red-500', label: 'Cancelled' },
    'Re-Scheduled': { badge: 'bg-orange-50 text-orange-700 border-orange-200', dot: 'bg-orange-500', label: 'Re-Scheduled' },
  },
  // Consultant Statuses
  consultant: {
    Active: { badge: 'bg-green-100 text-green-700', label: 'Active' },
    'Recently Placed': { badge: 'bg-blue-100 text-blue-700', label: 'Recently Placed' },
    Inactive: { badge: 'bg-gray-100 text-gray-700', label: 'Inactive' },
  },
  // Error Statuses
  error: {
    new: { badge: 'bg-red-100 text-red-700', label: 'New' },
    in_progress: { badge: 'bg-primary-100 text-primary-800', label: 'In Progress' },
    resolved: { badge: 'bg-green-100 text-green-700', label: 'Resolved' },
    closed: { badge: 'bg-gray-200 text-gray-700', label: 'Closed' },
  },
} as const;

// Button Variants - Unified styles
export const BUTTON_VARIANTS = {
  primary: 'btn-primary',
  secondary: 'btn-secondary',
  outline: 'btn-outline',
  icon: 'btn-icon',
  'icon-sm': 'btn-icon-sm',
  danger: 'btn-danger',
  success: 'btn-success',
} as const;

// Shadow System - Unified
export const SHADOWS = {
  xs: 'shadow-xs',
  sm: 'shadow-sm',
  base: 'shadow-base',
  md: 'shadow-md',
  lg: 'shadow-lg',
  xl: 'shadow-xl',
  card: 'shadow-card',
  'card-hover': 'shadow-card-hover',
} as const;

// Breakpoints (matching Tailwind)
export const BREAKPOINTS = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
} as const;

// Spacing System
export const SPACING = {
  xs: '0.25rem',
  sm: '0.5rem',
  md: '1rem',
  lg: '1.5rem',
  xl: '2rem',
  '2xl': '3rem',
} as const;

// Animation Durations
export const ANIMATION = {
  fast: '150ms',
  normal: '200ms',
  slow: '300ms',
  slower: '500ms',
} as const;

// Z-Index Layers
export const Z_INDEX = {
  base: 0,
  dropdown: 1000,
  sticky: 1020,
  fixed: 1030,
  modalBackdrop: 1040,
  modal: 1050,
  popover: 1060,
  tooltip: 1070,
} as const;

