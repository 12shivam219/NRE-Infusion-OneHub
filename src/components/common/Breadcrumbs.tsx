import { Link, useLocation } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';

interface BreadcrumbItem {
  label: string;
  path?: string;
}

interface BreadcrumbsProps {
  items?: BreadcrumbItem[];
  className?: string;
}

/**
 * Breadcrumb Navigation Component
 * Automatically generates breadcrumbs from route or accepts custom items
 */
export const Breadcrumbs = ({ items, className = '' }: BreadcrumbsProps) => {
  const location = useLocation();
  
  // Auto-generate breadcrumbs from pathname if items not provided
  const generateBreadcrumbs = (): BreadcrumbItem[] => {
    const pathSegments = location.pathname.split('/').filter(Boolean);
    const breadcrumbs: BreadcrumbItem[] = [{ label: 'Home', path: '/' }];
    
    let currentPath = '';
    pathSegments.forEach((segment, index) => {
      currentPath += `/${segment}`;
      const label = segment
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
      
      // Don't add link to current page
      const isLast = index === pathSegments.length - 1;
      breadcrumbs.push({
        label,
        path: isLast ? undefined : currentPath,
      });
    });
    
    return breadcrumbs;
  };

  const breadcrumbItems = items || generateBreadcrumbs();

  if (breadcrumbItems.length <= 1) return null;

  return (
    <nav 
      aria-label="Breadcrumb" 
      className={`flex items-center gap-2 text-sm font-body text-[color:var(--text-secondary)] mb-4 letter-spacing-wide ${className}`}
    >
      <ol className="flex items-center gap-2 flex-wrap">
        {breadcrumbItems.map((item, index) => {
          const isLast = index === breadcrumbItems.length - 1;
          
          return (
            <li key={index} className="flex items-center gap-2">
              {index === 0 ? (
                <Home className="w-4 h-4 text-[color:var(--text-secondary)]" aria-hidden="true" />
              ) : (
                <ChevronRight className="w-4 h-4 text-slate-500" aria-hidden="true" />
              )}
              
              {isLast || !item.path ? (
                <span 
                  className="text-[color:var(--text)] font-medium font-heading"
                  aria-current="page"
                >
                  {item.label}
                </span>
              ) : (
                <Link
                  to={item.path}
                  className="text-slate-500 hover:text-blue-600 transition-colors focus-ring rounded px-1"
                >
                  {item.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
};

