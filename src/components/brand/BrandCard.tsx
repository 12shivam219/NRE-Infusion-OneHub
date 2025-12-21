import React from 'react';

interface BrandCardProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'elevated' | 'interactive';
  padding?: 'sm' | 'md' | 'lg';
}

const paddingClasses = {
  sm: 'p-3 sm:p-4',
  md: 'p-4 sm:p-6',
  lg: 'p-6 sm:p-8',
};

const variantClasses = {
  default: 'card',
  elevated: 'card-elevated',
  interactive: 'card-interactive',
};

/**
 * Brand Card Component
 * Implements premium gold-accented design with dark theme
 * Features hover states and smooth transitions
 */
export const BrandCard = React.forwardRef<HTMLDivElement, BrandCardProps>(
  ({ children, className = '', variant = 'default', padding = 'md' }, ref) => {
    return (
      <div
        ref={ref}
        className={`
          ${variantClasses[variant]}
          ${paddingClasses[padding]}
          rounded-card
          ${className}
        `}
      >
        {children}
      </div>
    );
  }
);

BrandCard.displayName = 'BrandCard';

interface BrandCardHeaderProps {
  title: string | React.ReactNode;
  subtitle?: string | React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

/**
 * Card Header - Premium typography with optional action
 */
export const BrandCardHeader = ({
  title,
  subtitle,
  action,
  className = '',
}: BrandCardHeaderProps) => {
  return (
    <div className={`flex items-start justify-between gap-4 mb-4 ${className}`}>
      <div className="flex-1">
        <h3 className="font-heading font-bold text-xl text-text leading-tight">
          {title}
        </h3>
        {subtitle && (
          <p className="text-sm text-text-secondary mt-1 line-clamp-1">
            {subtitle}
          </p>
        )}
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  );
};

interface BrandCardBodyProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Card Body - Consistent padding and text styling
 */
export const BrandCardBody = ({ children, className = '' }: BrandCardBodyProps) => {
  return <div className={`space-y-4 ${className}`}>{children}</div>;
};

interface BrandCardFooterProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Card Footer - Sticky footer for actions
 */
export const BrandCardFooter = ({ children, className = '' }: BrandCardFooterProps) => {
  return (
    <div className={`flex items-center justify-end gap-3 mt-6 pt-4 border-t border-gold border-opacity-10 ${className}`}>
      {children}
    </div>
  );
};
