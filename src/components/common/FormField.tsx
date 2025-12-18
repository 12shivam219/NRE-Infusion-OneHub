import React, { ReactNode } from 'react';

interface FormFieldProps {
  label: string;
  htmlFor?: string;
  required?: boolean;
  error?: string;
  helpText?: string;
  children: ReactNode;
  className?: string;
}

/**
 * Accessible Form Field Wrapper
 * Ensures proper label associations and error announcements
 */
export const FormField = ({
  label,
  htmlFor,
  required = false,
  error,
  helpText,
  children,
  className = '',
}: FormFieldProps) => {
  const reactId = React.useId();
  const fieldId = htmlFor || `field-${reactId}`;
  const errorId = error ? `${fieldId}-error` : undefined;
  const helpId = helpText ? `${fieldId}-help` : undefined;

  return (
    <div className={`space-y-1 ${className}`}>
      <label
        htmlFor={fieldId}
        className="block text-sm font-medium text-gray-700"
      >
        {label}
        {required && <span className="text-red-600 ml-1" aria-label="required">*</span>}
      </label>
      
      {helpText && (
        <p id={helpId} className="text-xs text-gray-500">
          {helpText}
        </p>
      )}

      <div>
        {React.isValidElement(children)
          ? React.cloneElement(children as React.ReactElement<Record<string, unknown>>, {
              id: fieldId,
              'aria-describedby': [errorId, helpId].filter(Boolean).join(' ') || undefined,
              'aria-invalid': error ? 'true' : undefined,
              'aria-required': required ? 'true' : undefined,
            })
          : children
        }
      </div>

      {error && (
        <p
          id={errorId}
          className="text-sm text-red-600"
          role="alert"
          aria-live="polite"
        >
          {error}
        </p>
      )}
    </div>
  );
};

