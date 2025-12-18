/**
 * Centralized Design Tokens
 * Single source of truth for all design system values
 */

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

