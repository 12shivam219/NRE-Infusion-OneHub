import { cn } from '../../lib/utils';

interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular';
  width?: string | number;
  height?: string | number;
  animation?: 'pulse' | 'wave' | 'none';
}

/**
 * SkeletonLoader - A flexible skeleton loading component
 * Provides visual placeholders while content is loading
 */
export const Skeleton = ({ 
  className, 
  variant = 'rectangular',
  width,
  height,
  animation = 'pulse'
}: SkeletonProps) => {
  const baseClasses = 'bg-blue-100 rounded';
  const variantClasses = {
    text: 'h-4',
    circular: 'rounded-full',
    rectangular: 'rounded-lg',
  };
  const animationClasses = {
    pulse: 'animate-pulse',
    wave: 'animate-shimmer',
    none: '',
  };

  const style: React.CSSProperties = {};
  if (width) style.width = typeof width === 'number' ? `${width}px` : width;
  if (height) style.height = typeof height === 'number' ? `${height}px` : height;

  return (
    <div
      className={cn(
        baseClasses,
        variantClasses[variant],
        animationClasses[animation],
        className
      )}
      style={style}
      aria-hidden="true"
    />
  );
};

/**
 * SkeletonCard - Pre-configured skeleton for card layouts
 */
export const SkeletonCard = ({ className }: { className?: string }) => (
  <div className={cn('bg-white rounded-xl shadow-sm border border-gray-200 p-6', className)}>
    <Skeleton variant="text" width="60%" className="mb-4" />
    <Skeleton variant="text" width="40%" className="mb-2" />
    <Skeleton variant="text" width="80%" />
  </div>
);

/**
 * SkeletonTable - Pre-configured skeleton for table layouts
 */
export const SkeletonTable = ({ rows = 5, columns = 4 }: { rows?: number; columns?: number }) => (
  <div className="space-y-3">
    {Array.from({ length: rows }).map((_, rowIdx) => (
      <div key={rowIdx} className="flex gap-4">
        {Array.from({ length: columns }).map((_, colIdx) => (
          <Skeleton key={colIdx} variant="text" width={`${100 / columns}%`} height={20} />
        ))}
      </div>
    ))}
  </div>
);

/**
 * SkeletonGrid - Pre-configured skeleton for grid layouts
 */
export const SkeletonGrid = ({ 
  items = 6, 
  columns = 3,
  className 
}: { 
  items?: number; 
  columns?: number;
  className?: string;
}) => {
  const gridCols = {
    1: 'grid-cols-1',
    2: 'sm:grid-cols-2',
    3: 'lg:grid-cols-3',
    4: 'lg:grid-cols-4',
  };
  
  return (
    <div className={cn(`grid grid-cols-1 ${gridCols[columns as keyof typeof gridCols] || 'lg:grid-cols-3'} gap-6`, className)}>
      {Array.from({ length: items }).map((_, idx) => (
        <SkeletonCard key={idx} />
      ))}
    </div>
  );
};

/**
 * SkeletonList - Pre-configured skeleton for list layouts
 */
export const SkeletonList = ({ items = 5 }: { items?: number }) => (
  <div className="space-y-4">
    {Array.from({ length: items }).map((_, idx) => (
      <div key={idx} className="flex items-center gap-4 p-4 bg-white rounded-lg border border-gray-200">
        <Skeleton variant="circular" width={40} height={40} />
        <div className="flex-1 space-y-2">
          <Skeleton variant="text" width="60%" />
          <Skeleton variant="text" width="40%" />
        </div>
      </div>
    ))}
  </div>
);

/**
 * SkeletonStatCard - Pre-configured skeleton for stat cards
 */
export const SkeletonStatCard = () => (
  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
    <div className="flex items-center justify-between mb-4">
      <Skeleton variant="text" width="40%" />
      <Skeleton variant="circular" width={48} height={48} />
    </div>
    <Skeleton variant="text" width="30%" height={32} className="mb-2" />
    <Skeleton variant="text" width="50%" />
  </div>
);
