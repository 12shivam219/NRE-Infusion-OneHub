import { ReactNode } from 'react';

interface TableWrapperProps {
  children: ReactNode;
  className?: string;
}

/**
 * Responsive Table Wrapper
 * Adds horizontal scroll on mobile devices
 */
export const TableWrapper = ({ children, className = '' }: TableWrapperProps) => {
  return (
    <div className={`overflow-x-auto -mx-4 sm:mx-0 ${className}`}>
      <div className="inline-block min-w-full align-middle">
        <div className="overflow-hidden border border-[color:var(--gold)] border-opacity-20 rounded-lg">
          {children}
        </div>
      </div>
    </div>
  );
};

