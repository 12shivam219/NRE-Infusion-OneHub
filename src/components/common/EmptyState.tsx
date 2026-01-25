import { ReactNode } from 'react';
import { FileText, Inbox, Search } from 'lucide-react';
import { BrandButton } from '../brand/BrandButton';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  message: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

/**
 * Standardized Empty State Component
 * Provides consistent empty state messaging with NRETech brand system
 */
export const EmptyState = ({ icon, title, message, action, className = '' }: EmptyStateProps) => {
  const defaultIcon = <Inbox className="w-12 h-12 text-blue-600" />;
  
  return (
    <div className={`flex flex-col items-center justify-center py-12 px-4 text-center ${className}`}>
      <div className="mb-4 text-blue-600">
        {icon || defaultIcon}
      </div>
      <h3 className="text-lg font-bold font-heading text-slate-900 mb-2">{title}</h3>
      <p className="text-slate-500 mb-6 max-w-md">{message}</p>
      {action && (
        <BrandButton
          variant="primary"
          onClick={action.onClick}
          aria-label={action.label}
        >
          {action.label}
        </BrandButton>
      )}
    </div>
  );
};

// Pre-configured empty states
export const EmptyStateNoResults = ({ searchTerm, onClear }: { searchTerm?: string; onClear?: () => void }) => (
  <EmptyState
    icon={<Search className="w-12 h-12 text-blue-600" />}
    title="No results found"
    message={searchTerm ? `No items match "${searchTerm}". Try adjusting your search or filters.` : 'No items match your current filters.'}
    action={onClear ? { label: 'Clear filters', onClick: onClear } : undefined}
  />
);

export const EmptyStateNoData = ({ 
  type, 
  onCreate 
}: { 
  type: string; 
  onCreate?: () => void;
}) => (
  <EmptyState
    icon={<FileText className="w-12 h-12 text-blue-600" />}
    title={`No ${type} yet`}
    message={`Get started by creating your first ${type.toLowerCase()}.`}
    action={onCreate ? { label: `Create ${type}`, onClick: onCreate } : undefined}
  />
);
