/**
 * Centralized Validation System
 * All validators in one place for consistency and easy maintenance
 */

/**
 * Form validators
 */
export { isValidUrl, isValidPhone, isValidRate } from './formValidation';

/**
 * Email validators and parsers
 */
export { isValidEmail, parseEmailList, deduplicateEmails } from './emailParser';

/**
 * Full form validation
 */
export { validateRequirementForm } from './formValidation';

/**
 * Unified validation result interface
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Validate a single field with custom rule
 */
export function validateField(
  value: unknown,
  fieldName: string,
  rules: {
    required?: boolean;
    minLength?: number;
    maxLength?: number;
    pattern?: RegExp;
    custom?: (val: unknown) => boolean;
  }
): ValidationResult {
  const errors: string[] = [];

  if (rules.required && !value) {
    errors.push(`${fieldName} is required`);
    return { valid: false, errors };
  }

  if (value === null || value === undefined) {
    return { valid: true, errors: [] };
  }

  const stringValue = String(value);

  if (rules.minLength && stringValue.length < rules.minLength) {
    errors.push(`${fieldName} must be at least ${rules.minLength} characters`);
  }

  if (rules.maxLength && stringValue.length > rules.maxLength) {
    errors.push(`${fieldName} must not exceed ${rules.maxLength} characters`);
  }

  if (rules.pattern && !rules.pattern.test(stringValue)) {
    errors.push(`${fieldName} format is invalid`);
  }

  if (rules.custom && !rules.custom(value)) {
    errors.push(`${fieldName} validation failed`);
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Validate multiple fields
 */
export function validateFields(
  data: Record<string, unknown>,
  fieldRules: Record<string, Parameters<typeof validateField>[2]>
): Record<string, ValidationResult> {
  const results: Record<string, ValidationResult> = {};

  for (const [fieldName, rules] of Object.entries(fieldRules)) {
    results[fieldName] = validateField(data[fieldName], fieldName, rules);
  }

  return results;
}

/**
 * Check if all validations passed
 */
export function isAllValid(results: Record<string, ValidationResult>): boolean {
  return Object.values(results).every((result) => result.valid);
}

/**
 * Collect all errors from validation results
 */
export function collectErrors(results: Record<string, ValidationResult>): string[] {
  return Object.values(results)
    .flatMap((result) => result.errors)
    .filter((error) => error);
}
