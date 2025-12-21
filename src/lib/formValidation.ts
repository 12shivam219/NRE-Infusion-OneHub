/**
 * Form validation utilities for marketing section
 */

import { VALIDATION_RULES } from './constants';

export interface ValidationError {
  isValid: boolean;
  errors: Record<string, string>;
}

export interface PasswordValidationResult {
  isValid: boolean;
  errors: string[];
  isLeaked?: boolean;
  leakCount?: number;
}

/**
 * Validate email format - stricter validation
 */
export const isValidEmail = (email: string): boolean => {
  if (!email || typeof email !== 'string') return false;
  // RFC 5322 simplified regex - ensures proper domain structure
  const emailRegex = /^[a-zA-Z0-9._%-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  // Additional checks: no consecutive dots, no leading/trailing dots
  const isValid = emailRegex.test(email);
  if (!isValid) return false;
  // Ensure no double dots or consecutive special characters
  return !email.includes('..') && !email.startsWith('.') && !email.endsWith('.');
};

/**
 * Validate URL format with security checks
 */
export const isValidUrl = (url: string): boolean => {
  if (!url || typeof url !== 'string') return false;
  try {
    const urlObj = new URL(url);
    // Whitelist safe protocols
    const safeProtocols = ['http:', 'https:'];
    if (!safeProtocols.includes(urlObj.protocol)) return false;
    // Ensure hostname exists
    if (!urlObj.hostname) return false;
    // Prevent javascript: and data: URLs (XSS prevention)
    if (url.includes('javascript:') || url.includes('data:')) return false;
    return true;
  } catch {
    return false;
  }
};

/**
 * Validate phone number format
 */
export const isValidPhone = (phone: string): boolean => {
  const cleaned = phone.replace(/[\s\-()]/g, '');
  return cleaned.length >= 10 && cleaned.length <= 15 && /^\d+$/.test(cleaned);
};

/**
 * Validate rate format (e.g., "80k", "$80k-120k", "80000")
 */
export const isValidRate = (rate: string): boolean => {
  if (!rate.trim()) return false;
  return /^\$?\d+k?(-\$?\d+k?)?$/.test(rate.replace(/\s/g, ''));
};

/**
 * Validate requirement form data
 */
export const validateRequirementForm = (data: {
  title: string;
  company: string;
  vendor_email?: string;
  client_website?: string;
  imp_website?: string;
  vendor_website?: string;
  rate?: string;
}): ValidationError => {
  const errors: Record<string, string> = {};

  if (!data.title?.trim()) {
    errors.title = 'Job title is required';
  } else if (data.title.trim().length < 3) {
    errors.title = 'Job title must be at least 3 characters';
  }

  if (!data.company?.trim()) {
    errors.company = 'Company name is required';
  }

  if (data.vendor_email && !isValidEmail(data.vendor_email)) {
    errors.vendor_email = 'Invalid email format';
  }

  if (data.client_website && !isValidUrl(data.client_website)) {
    errors.client_website = 'Invalid URL format';
  }

  if (data.imp_website && !isValidUrl(data.imp_website)) {
    errors.imp_website = 'Invalid URL format';
  }

  if (data.vendor_website && !isValidUrl(data.vendor_website)) {
    errors.vendor_website = 'Invalid URL format';
  }

  if (data.rate && !isValidRate(data.rate)) {
    errors.rate = 'Invalid rate format (e.g., 80k or $80k-120k)';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};

/**
 * Validate consultant form data
 */
export const validateConsultantForm = (data: {
  name: string;
  email?: string;
  phone?: string;
  date_of_birth?: string;
  expected_rate?: string;
}): ValidationError => {
  const errors: Record<string, string> = {};

  if (!data.name?.trim()) {
    errors.name = 'Name is required';
  }

  if (data.email && !isValidEmail(data.email)) {
    errors.email = 'Invalid email format';
  }

  if (data.phone && !isValidPhone(data.phone)) {
    errors.phone = 'Invalid phone format (10-15 digits)';
  }

  if (data.date_of_birth) {
    const dob = new Date(data.date_of_birth);
    const age = new Date().getFullYear() - dob.getFullYear();
    if (age < VALIDATION_RULES.MIN_AGE) {
      errors.date_of_birth = `Must be at least ${VALIDATION_RULES.MIN_AGE} years old`;
    }
    if (age > VALIDATION_RULES.MAX_AGE) {
      errors.date_of_birth = 'Invalid date of birth';
    }
  }

  if (data.expected_rate && !isValidRate(data.expected_rate)) {
    errors.expected_rate = 'Invalid rate format';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};

/**
 * Validate password strength (minimum 8 characters)
 * Checks for: uppercase, lowercase, number, special character
 */
export const validatePasswordStrength = (password: string): PasswordValidationResult => {
  const errors: string[] = [];

  // Length check (minimum 8 characters)
  if (!password || password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }

  // Uppercase check
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }

  // Lowercase check
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }

  // Number check
  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  // Special character check
  if (!/[@$!%*?&]/.test(password)) {
    errors.push('Password must contain at least one special character (@$!%*?&)');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};
