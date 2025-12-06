/**
 * Form validation utilities for marketing section
 */

export interface ValidationError {
  isValid: boolean;
  errors: Record<string, string>;
}

/**
 * Validate email format
 */
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validate URL format
 */
export const isValidUrl = (url: string): boolean => {
  try {
    new URL(url);
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
    if (age < 18) {
      errors.date_of_birth = 'Must be at least 18 years old';
    }
    if (age > 120) {
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
