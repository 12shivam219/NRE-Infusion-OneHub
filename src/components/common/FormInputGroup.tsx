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
    <div className={`space-y-4 p-4 bg-[color:var(--darkbg-surface)] rounded-lg border border-[color:var(--gold)] border-opacity-20 ${className}`}>
      {title && (
        <div className="mb-2">
          <h3 className="text-sm font-heading font-bold text-[color:var(--text)] uppercase letter-spacing-wide">{title}</h3>
          {description && (
            <p className="text-xs font-body text-[color:var(--text-secondary)] mt-2 letter-spacing-wide">{description}</p>
          )}
        </div>
      )}
      <div className="space-y-4">{children}</div>
    </div>
  );
};

