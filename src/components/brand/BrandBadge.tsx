import React from 'react';

type BadgeVariant = 'default' | 'gold' | 'success' | 'warning' | 'danger' | 'info';

interface BrandBadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  size?: 'sm' | 'md';
  icon?: React.ReactNode;
  className?: string;
}

const variantClasses: Record<BadgeVariant, string> = {
  default: 'badge-status-new',
  gold: 'bg-gold bg-opacity-20 text-gold border-gold border-opacity-40',
  success: 'bg-green-500 bg-opacity-20 text-green-400 border-green-500 border-opacity-40',
  warning: 'bg-yellow-500 bg-opacity-20 text-yellow-400 border-yellow-500 border-opacity-40',
  danger: 'bg-red-500 bg-opacity-20 text-red-400 border-red-500 border-opacity-40',
  info: 'bg-blue-500 bg-opacity-20 text-blue-400 border-blue-500 border-opacity-40',
};

const sizeClasses = {
  sm: 'px-2 py-1 text-xs',
  md: 'px-3 py-1.5 text-sm',
};

/**
 * Brand Badge Component
 * Versatile badge with multiple variants and sizes
 */
export const BrandBadge: React.FC<BrandBadgeProps> = ({
  children,
  variant = 'default',
  size = 'md',
  icon,
  className = '',
}) => {
  return (
    <span
      className={`
        inline-flex items-center gap-1.5
        rounded-full
        font-semibold
        border
        transition-all duration-200
        ${variantClasses[variant]}
        ${sizeClasses[size]}
        ${className}
      `}
    >
      {icon && <span className="flex-shrink-0">{icon}</span>}
      {children}
    </span>
  );
};

/**
 * Brand Status Badge
 * Specialized badge for status indicators
 */
export const BrandStatusBadge: React.FC<{
  status: 'new' | 'in-progress' | 'submitted' | 'interview' | 'offer' | 'rejected' | 'closed';
  className?: string;
}> = ({ status, className = '' }) => {
  const statusVariantMap = {
    new: { variant: 'gold' as BadgeVariant, label: 'New' },
    'in-progress': { variant: 'warning' as BadgeVariant, label: 'In Progress' },
    submitted: { variant: 'info' as BadgeVariant, label: 'Submitted' },
    interview: { variant: 'info' as BadgeVariant, label: 'Interview' },
    offer: { variant: 'success' as BadgeVariant, label: 'Offer' },
    rejected: { variant: 'danger' as BadgeVariant, label: 'Rejected' },
    closed: { variant: 'default' as BadgeVariant, label: 'Closed' },
  };

  const { variant, label } = statusVariantMap[status];

  return (
    <BrandBadge variant={variant} className={className}>
      {label}
    </BrandBadge>
  );
};

/**
 * Brand Dot Badge
 * Small indicator dot, useful for status indicators
 */
export const BrandDotBadge: React.FC<{
  variant?: BadgeVariant;
  label?: string;
  className?: string;
}> = ({ variant = 'default', label, className = '' }) => {
  const colorMap: Record<BadgeVariant, string> = {
    default: 'bg-gold',
    gold: 'bg-gold',
    success: 'bg-green-500',
    warning: 'bg-yellow-500',
    danger: 'bg-red-500',
    info: 'bg-blue-500',
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className={`w-2 h-2 rounded-full ${colorMap[variant]}`} />
      {label && <span className="text-sm text-text-secondary">{label}</span>}
    </div>
  );
};
