import React from 'react';

interface BrandInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  helperText?: string;
  error?: string;
  required?: boolean;
}

/**
 * Brand Input Component
 * Accessible form input with gold focus states and dark theme
 */
export const BrandInput = React.forwardRef<HTMLInputElement, BrandInputProps>(
  (
    { label, helperText, error, required, className = '', id, ...props },
    ref
  ) => {
    const generatedId = React.useId();
    const inputId = id || `input-${generatedId}`;

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label htmlFor={inputId} className="label-brand">
            {label}
            {required && <span className="label-required" />}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={`input-brand ${error ? 'border-red-500 focus:ring-red-500' : ''} ${className}`}
          required={required}
          {...props}
        />
        {error ? (
          <p className="text-xs text-red-400 mt-1">{error}</p>
        ) : helperText ? (
          <p className="text-xs text-text-secondary mt-1">{helperText}</p>
        ) : null}
      </div>
    );
  }
);

BrandInput.displayName = 'BrandInput';

interface BrandTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  helperText?: string;
  error?: string;
  required?: boolean;
}

/**
 * Brand Textarea Component
 * Large text input with consistent styling
 */
export const BrandTextarea = React.forwardRef<HTMLTextAreaElement, BrandTextareaProps>(
  (
    { label, helperText, error, required, className = '', id, ...props },
    ref
  ) => {
    const generatedId = React.useId();
    const textareaId = id || `textarea-${generatedId}`;

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label htmlFor={textareaId} className="label-brand">
            {label}
            {required && <span className="label-required" />}
          </label>
        )}
        <textarea
          ref={ref}
          id={textareaId}
          className={`input-brand resize-none ${error ? 'border-red-500 focus:ring-red-500' : ''} ${className}`}
          required={required}
          {...props}
        />
        {error ? (
          <p className="text-xs text-red-400 mt-1">{error}</p>
        ) : helperText ? (
          <p className="text-xs text-text-secondary mt-1">{helperText}</p>
        ) : null}
      </div>
    );
  }
);

BrandTextarea.displayName = 'BrandTextarea';

interface BrandSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  helperText?: string;
  error?: string;
  required?: boolean;
  options: Array<{ value: string; label: string }>;
}

/**
 * Brand Select Component
 * Dropdown with accessible labeling
 */
export const BrandSelect = React.forwardRef<HTMLSelectElement, BrandSelectProps>(
  (
    { label, helperText, error, required, className = '', id, options, ...props },
    ref
  ) => {
    const generatedId = React.useId();
    const selectId = id || `select-${generatedId}`;

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label htmlFor={selectId} className="label-brand">
            {label}
            {required && <span className="label-required" />}
          </label>
        )}
        <select
          ref={ref}
          id={selectId}
          className={`input-brand cursor-pointer appearance-none ${error ? 'border-red-500 focus:ring-red-500' : ''} ${className}`}
          required={required}
          {...props}
        >
          <option value="">Select an option</option>
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {error ? (
          <p className="text-xs text-red-400 mt-1">{error}</p>
        ) : helperText ? (
          <p className="text-xs text-text-secondary mt-1">{helperText}</p>
        ) : null}
      </div>
    );
  }
);

BrandSelect.displayName = 'BrandSelect';

interface BrandCheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  helperText?: string;
}

/**
 * Brand Checkbox Component
 * Accessible checkbox with consistent styling
 */
export const BrandCheckbox = React.forwardRef<HTMLInputElement, BrandCheckboxProps>(
  ({ label, helperText, className = '', id, ...props }, ref) => {
    const generatedId = React.useId();
    const checkboxId = id || `checkbox-${generatedId}`;

    return (
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-2">
          <input
            ref={ref}
            type="checkbox"
            id={checkboxId}
            className={`w-4 h-4 rounded border-gold border accent-gold cursor-pointer ${className}`}
            {...props}
          />
          {label && (
            <label htmlFor={checkboxId} className="text-sm text-text cursor-pointer">
              {label}
            </label>
          )}
        </div>
        {helperText && <p className="text-xs text-text-secondary ml-6">{helperText}</p>}
      </div>
    );
  }
);

BrandCheckbox.displayName = 'BrandCheckbox';

/**
 * Brand Form Container
 * Wrapper for consistent form spacing and layout
 */
export const BrandForm = React.forwardRef<
  HTMLFormElement,
  React.FormHTMLAttributes<HTMLFormElement>
>(({ className = '', children, ...props }, ref) => {
  return (
    <form ref={ref} className={`space-y-6 ${className}`} {...props}>
      {children}
    </form>
  );
});

BrandForm.displayName = 'BrandForm';

/**
 * Brand Form Group
 * Wrapper for multiple related form fields
 */
export const BrandFormGroup = ({
  children,
  className = '',
  legend,
}: {
  children: React.ReactNode;
  className?: string;
  legend?: string;
}) => {
  return (
    <fieldset className={`space-y-4 ${className}`}>
      {legend && (
        <legend className="font-heading font-semibold text-text text-sm uppercase letter-spacing-wide">
          {legend}
        </legend>
      )}
      <div className="space-y-4">{children}</div>
    </fieldset>
  );
};
