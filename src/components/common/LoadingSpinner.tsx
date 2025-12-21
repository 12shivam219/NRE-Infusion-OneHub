/**
 * Loading Spinner Component
 * Brand-styled loader with gold accent
 */
interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  label?: string;
}

export const LoadingSpinner = ({ size = 'md', className = '', label = 'Loading' }: LoadingSpinnerProps) => {
  const sizeClasses = {
    sm: 'w-4 h-4 border-2',
    md: 'w-8 h-8 border-3',
    lg: 'w-12 h-12 border-4',
  };

  return (
    <div
      role="status"
      aria-label={label}
      className={`${sizeClasses[size]} border-gold border-opacity-30 border-t-gold rounded-full animate-spin ${className}`}
      style={{
        borderTopColor: '#EAB308',
      }}
    ></div>
  );
};
