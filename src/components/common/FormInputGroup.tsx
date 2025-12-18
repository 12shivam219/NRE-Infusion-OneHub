import { ReactNode } from 'react';

interface FormInputGroupProps {
  title?: string;
  description?: string;
  children: ReactNode;
  className?: string;
}

/**
 * FormInputGroup - Groups related form inputs visually
 * Provides better form organization and spacing
 */
export const FormInputGroup = ({
  title,
  description,
  children,
  className = '',
}: FormInputGroupProps) => {
  return (
    <div className={`space-y-4 p-4 bg-gray-50 rounded-lg border border-gray-200 ${className}`}>
      {title && (
        <div className="mb-2">
          <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
          {description && (
            <p className="text-xs text-gray-600 mt-1">{description}</p>
          )}
        </div>
      )}
      <div className="space-y-4">{children}</div>
    </div>
  );
};

