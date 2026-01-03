import { useState, useMemo, memo, useRef } from 'react';
import { 
  Eye, 
  Calendar, 
  Trash2, 
  CheckSquare, 
  Square, 
} from 'lucide-react';
import { useVirtualizer } from '@tanstack/react-virtual';
import type { Database, RequirementStatus } from '../../lib/database.types';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';


type Requirement = Database['public']['Tables']['requirements']['Row'];
type RequirementWithLogs = Requirement & { logs?: { action: string; timestamp: string }[] };

type SortField = 'title' | 'company' | 'status' | 'created_at' | 'rate';
type SortOrder = 'asc' | 'desc';

interface RequirementsTableProps {
  requirements: RequirementWithLogs[];
  onViewDetails: (req: Requirement) => void;
  onCreateInterview?: (id: string) => void;
  onDelete: (id: string) => void;
  statusColors: Record<RequirementStatus, { badge: string; label: string }>;
  badge: string;
  label: string;
  isAdmin: boolean;
  serverSortField?: string;
  serverSortOrder?: 'asc' | 'desc';
  onSortChange?: (field: SortField, order: 'asc' | 'desc') => void;
  page: number;
  hasNextPage: boolean;
  isFetchingPage: boolean;
  onPageChange: (page: number) => void;
  headerSearch?: JSX.Element | null;
  selectedStatusFilter?: RequirementStatus | 'ALL';
  onStatusFilterChange?: (status: RequirementStatus | 'ALL') => void;
}

const statusColorMap: Record<RequirementStatus, { bg: string; text: string; border: string; dot: string }> = {
  'NEW': { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border border-blue-200', dot: 'bg-blue-500' },
  'IN_PROGRESS': { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border border-amber-200', dot: 'bg-amber-500' },
  'INTERVIEW': { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border border-purple-200', dot: 'bg-purple-500' },
  'OFFER': { bg: 'bg-green-50', text: 'text-green-700', border: 'border border-green-200', dot: 'bg-green-500' },
  'CLOSED': { bg: 'bg-gray-50', text: 'text-gray-700', border: 'border border-gray-200', dot: 'bg-gray-500' },
  'REJECTED': { bg: 'bg-red-50', text: 'text-red-700', border: 'border border-red-200', dot: 'bg-red-500' },
  'SUBMITTED': { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border border-indigo-200', dot: 'bg-indigo-500' },
};

const TableRow = memo(({
  req,
  isSelected,
  colors,
  toggleRowSelected,
  onViewDetails,
  onCreateInterview,
  onDelete,
  isAdmin,
  rowIndex,
  rowRef,
  dataIndex,
  selectedStatusFilter,
  onStatusFilterChange,
}: {
  req: RequirementWithLogs;
  isSelected: boolean;
  colors: { bg: string; text: string; border: string; dot: string };
  toggleRowSelected: (id: string) => void;
  onViewDetails: (req: Requirement) => void;
  onCreateInterview?: (id: string) => void;
  onDelete: (id: string) => void;
  isAdmin: boolean;
  rowIndex: number;
  rowRef?: (el: HTMLTableRowElement | null) => void;
  dataIndex?: number;
  selectedStatusFilter?: RequirementStatus | 'ALL';
  onStatusFilterChange?: (status: RequirementStatus | 'ALL') => void;
}) => {
  return (
    <tr
      ref={rowRef}
      data-index={dataIndex}
        className={`transition-all duration-150 ${rowIndex % 2 === 0 ? 'bg-[color:var(--darkbg-surface)]' : 'bg-[color:var(--darkbg-surface-light)]'} hover:bg-[color:var(--gold)] hover:bg-opacity-10`}
    > 
      <td className="px-2 py-3 text-center align-middle border-b border-r border-[color:var(--gold)] border-opacity-10" style={{ width: '40px' }}>
        <div className="flex items-center justify-center">
          <button
            onClick={() => toggleRowSelected(req.id)}
            className="p-1 hover:bg-[color:var(--gold)] hover:bg-opacity-20 rounded-lg focus:outline-none focus:ring-2 focus:ring-[color:var(--gold)] focus:ring-offset-1"
            aria-pressed={isSelected}
            title={isSelected ? 'Deselect requirement' : 'Select requirement'}
            aria-label={isSelected ? `Deselect ${req.title}` : `Select ${req.title}`}
          >
            {isSelected ? (
              <CheckSquare className="w-4 h-4 text-[color:var(--gold)]" />
            ) : (
              <Square className="w-4 h-4 text-[color:var(--text-secondary)] hover:text-[color:var(--gold)]" />
            )}
          </button>
        </div>
      </td>
      
      {/* Requirement Number */}
      <td className="px-2 py-3 text-left align-middle font-mono text-xs font-medium text-[color:var(--text-secondary)] border-b border-r border-[color:var(--gold)] border-opacity-10" style={{ width: '50px' }}>
        {String(req.requirement_number || 1).padStart(3, '0')}
      </td>
      
      {/* Title */}
      <td className="px-2 py-3 text-left align-top whitespace-normal break-words border-b border-r border-[color:var(--gold)] border-opacity-10" style={{ width: '20%' }}>
        <div className="min-w-0">
          <button
            onClick={() => onViewDetails(req)}
            className="text-left w-full hover:text-[color:var(--gold)] focus:outline-none focus:ring-2 focus:ring-[color:var(--gold)] focus:ring-opacity-30 focus:ring-offset-1 rounded px-1 -mx-1 transition-colors duration-150 group"
            title={`${req.title}${req.company ? ` - ${req.company}` : ''}`}
            aria-label={`View details for ${req.title}`}
          >
            <div className="font-heading font-bold text-xs text-[color:var(--text)] group-hover:text-[color:var(--gold)] leading-relaxed break-words pr-1 xs:pr-2">
              {req.title}
            </div>
            {req.company && (
              <div className="text-xs font-body text-[color:var(--text-secondary)] mt-0.5 xs:mt-1 sm:mt-1.5 break-words pr-1 xs:pr-2" title={req.company}>
                {req.company}
              </div>
            )}
          </button>
        </div>
      </td>
      
      {/* Status */}
      <td className="px-2 py-3 text-left align-middle whitespace-normal break-words border-b border-r border-[color:var(--gold)] border-opacity-10" style={{ width: '15%' }}>
        <div className="flex items-center">
          <button
            onClick={() => {
              if (onStatusFilterChange) {
                // Toggle behavior: click same status to clear, click different to select
                onStatusFilterChange(req.status === selectedStatusFilter ? 'ALL' : req.status);
              }
            }}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold font-heading transition-all duration-150 cursor-pointer ${colors.bg} ${colors.text} hover:shadow-md ${
              req.status === selectedStatusFilter ? 'ring-2 ring-[color:var(--gold)] ring-offset-1' : 'hover:shadow-sm'
            }`}
            title={`Click to filter by ${req.status} status`}
            aria-label={`Filter by ${req.status} status`}
          >
            <span className={`w-2 h-2 rounded-full ${colors.dot} flex-shrink-0 animate-pulse`} />
            <span className="whitespace-nowrap">{req.status}</span>
          </button>
        </div>
      </td>
      
      {/* Vendor Company */}
      <td className="px-2 py-3 text-left align-top font-medium whitespace-normal break-words border-b border-r border-[color:var(--gold)] border-opacity-10" style={{ width: '18%' }}>
        <div className="min-w-0">
          {req.vendor_company ? (
            <div 
              className="text-xs font-body text-[color:var(--text)] break-words leading-relaxed pr-1 xs:pr-2" 
              title={req.vendor_company}
            >
              {req.vendor_company}
            </div>
          ) : (
            <span className="text-xs font-body text-[color:var(--text-secondary)] italic">—</span>
          )}
        </div>
      </td>
      
      {/* Vendor Person */}
      <td className="px-2 py-3 text-left align-top font-medium whitespace-normal break-words border-b border-r border-[color:var(--gold)] border-opacity-10" style={{ width: '15%' }}>
        <div className="min-w-0">
          {req.vendor_person_name ? (
            <div 
              className="text-xs font-body text-[color:var(--text)] break-words leading-relaxed pr-1 xs:pr-2" 
              title={req.vendor_person_name}
            >
              {req.vendor_person_name}
            </div>
          ) : (
            <span className="text-xs font-body text-[color:var(--text-secondary)] italic">—</span>
          )}
        </div>
      </td>
      
      {/* Vendor Phone */}
      <td className="px-2 py-3 text-left align-top font-mono text-xs whitespace-normal break-words border-b border-r border-[color:var(--gold)] border-opacity-10" style={{ width: '15%' }}>
        <div className="min-w-0 max-w-full">
          {req.vendor_phone ? (
            <a 
              href={`tel:${req.vendor_phone}`}
              className="text-xs font-body text-[color:var(--text)] hover:text-[color:var(--gold)] hover:underline block break-words max-w-full transition-colors"
              title={`Call ${req.vendor_phone}`}
              onClick={(e) => e.stopPropagation()}
            >
              {req.vendor_phone}
            </a>
          ) : (
            <span className="text-xs font-body text-[color:var(--text-secondary)] italic">—</span>
          )}
        </div>
      </td>
      
      {/* Vendor Email */}
      <td className="px-2 py-3 text-left align-top text-xs whitespace-normal break-words border-b border-r border-[color:var(--gold)] border-opacity-10" style={{ width: '20%' }}>
        <div className="min-w-0 max-w-full">
          {req.vendor_email ? (
            <a 
              href={`mailto:${req.vendor_email}`}
              className="text-xs font-body text-[color:var(--text)] hover:text-[color:var(--gold)] hover:underline break-words max-w-full transition-colors"
              title={`Email ${req.vendor_email}`}
              onClick={(e) => e.stopPropagation()}
            >
              {req.vendor_email}
            </a>
          ) : (
            <span className="text-xs font-body text-[color:var(--text-secondary)] italic">—</span>
          )}
        </div>
      </td>
      
      {/* Actions */}
      <td className="px-2 py-3 text-left align-middle border-b border-r border-[color:var(--gold)] border-opacity-10" style={{ width: '140px' }}>
        <div className="flex gap-1 justify-end items-center">
          <button
            onClick={() => onViewDetails(req)}
            className="p-1.5 text-[color:var(--gold)] hover:bg-[color:var(--gold)] hover:bg-opacity-10 hover:text-[color:var(--gold)] focus:ring-2 focus:ring-[color:var(--gold)] focus:ring-opacity-30 rounded-lg transition-all"
            title="View details"
            aria-label={`View details for ${req.title}`}
          >
            <Eye className="w-4 h-4" />
          </button>
          <button
            onClick={() => onCreateInterview?.(req.id)}
            className="p-1.5 text-green-600 hover:bg-green-500 hover:bg-opacity-10 hover:text-green-600 focus:ring-2 focus:ring-green-500 focus:ring-opacity-30 rounded-lg transition-all"
            title="Create interview"
            aria-label={`Create interview for ${req.title}`}
          >
            <Calendar className="w-4 h-4" />
          </button>
          {isAdmin && (
            <button
              onClick={() => onDelete(req.id)}
              className="p-1.5 text-red-600 hover:bg-red-500 hover:bg-opacity-10 hover:text-red-600 focus:ring-2 focus:ring-red-500 focus:ring-opacity-30 rounded-lg transition-all"
              title="Delete requirement"
              aria-label={`Delete ${req.title}`}
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </td>
    </tr>
  );
});


export const RequirementsTable = memo(({
  requirements,
  onViewDetails,
  onCreateInterview,
  onDelete,
  isAdmin,
  serverSortField,
  serverSortOrder,
  onSortChange,
  page,
  hasNextPage,
  isFetchingPage,
  onPageChange,
  headerSearch,
  selectedStatusFilter,
  onStatusFilterChange,
}: RequirementsTableProps) => {
  // State for table functionality
  const sortField: SortField = 'created_at';
  const sortOrder: SortOrder = 'desc';
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());

  const parentRef = useRef<HTMLDivElement | null>(null);

  const effectiveSortField = (onSortChange ? (serverSortField as SortField | undefined) : undefined) ?? sortField;
  const effectiveSortOrder = (onSortChange ? (serverSortOrder as SortOrder | undefined) : undefined) ?? sortOrder;

  // Sorting logic (client-side for demo)
  const sortedRequirements = useMemo(() => {
    if (onSortChange) return requirements;

    const sorted = [...requirements].sort((a, b) => {
      let aVal: string | number | Date = '';
      let bVal: string | number | Date = '';
      switch (effectiveSortField) {
        case 'title':
          aVal = (a.title || '').toLowerCase();
          bVal = (b.title || '').toLowerCase();
          break;
        case 'company':
          aVal = (a.company || '').toLowerCase();
          bVal = (b.company || '').toLowerCase();
          break;
        case 'status':
          aVal = a.status || '';
          bVal = b.status || '';
          break;
        case 'rate':
          aVal = a.rate ? parseInt(a.rate.match(/\d+/)?.[0] || '0') : 0;
          bVal = b.rate ? parseInt(b.rate.match(/\d+/)?.[0] || '0') : 0;
          break;
        case 'created_at':
        default:
          aVal = new Date(a.created_at).getTime();
          bVal = new Date(b.created_at).getTime();
      }
      if (aVal < bVal) return effectiveSortOrder === 'asc' ? -1 : 1;
      if (aVal > bVal) return effectiveSortOrder === 'asc' ? 1 : -1;
      return 0;
    });
    return sorted;
  }, [requirements, effectiveSortField, effectiveSortOrder, onSortChange]);

  const toggleRowSelected = (id: string) => {
    const newSelected = new Set(selectedRows);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedRows(newSelected);
  };
  const toggleSelectAll = () => {
    if (selectedRows.size === sortedRequirements.length) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(sortedRequirements.map(r => r.id)));
    }
  };

  const rowVirtualizer = useVirtualizer({
    count: sortedRequirements.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 72,
    overscan: 10,
    measureElement: typeof window !== 'undefined' && navigator.userAgent.indexOf('jsdom') === -1 ? element => element?.getBoundingClientRect().height : undefined,
  });

  const virtualItems = rowVirtualizer.getVirtualItems();
  const paddingTop = virtualItems.length > 0 ? virtualItems[0].start : 0;
  const paddingBottom =
    virtualItems.length > 0
      ? rowVirtualizer.getTotalSize() - virtualItems[virtualItems.length - 1].end
      : 0;

  return (
    <Paper
      variant="outlined"
      sx={{
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(234,179,8,0.2)',
        borderRadius: 2,
        bgcolor: 'var(--darkbg-surface)',
      }}
    >
      <div className="bg-white">
        {/* Header Row - Title and Search */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between px-4 py-3 border-b border-gray-200 gap-3">
          <h3 className="text-xs font-heading font-bold text-[color:var(--gold)] uppercase letter-spacing-wide">Requirements</h3>
          
          {/* Search Bar - Right */}
          <div className="flex-shrink-0 min-w-0">
            {headerSearch ?? null}
          </div>
        </div>
      </div>

      <Box
        ref={parentRef}
        sx={{
          overflow: 'auto',
          overflowX: { xs: 'auto', sm: 'auto', md: 'auto' },
          overflowY: 'auto',
          maxHeight: { xs: '60vh', sm: '65vh', md: '70vh' },
          pb: 1,
          scrollbarGutter: 'stable',
          width: '100%',
          WebkitOverflowScrolling: 'touch',
          '& table': {
            width: '100%',
            minWidth: { xs: '1200px', sm: '1200px', md: '100%' },
            tableLayout: 'fixed',
            borderCollapse: 'collapse',
          },
          '& thead': {
            position: 'sticky',
            top: 0,
            zIndex: 10,
            boxShadow: `0 2px 0 0 rgba(234, 179, 8, 0.3)`,
          },
          '& thead tr': {
            borderBottom: '2px solid rgba(234, 179, 8, 0.3)',
          },
        }}
      >
        <table className="min-w-full border border-[color:var(--gold)] border-opacity-20 rounded-lg">
          <thead className="bg-white">
            <tr>
              
              <th className="px-2 py-3 text-center text-xs font-heading font-bold text-[color:var(--gold)] uppercase letter-spacing-wide border-r border-[color:var(--gold)] border-opacity-10" style={{ width: '40px' }}>
                <button
                  onClick={toggleSelectAll}
                  className="p-1 hover:bg-[color:var(--gold)] hover:bg-opacity-10 rounded-lg focus:outline-none focus:ring-2 focus:ring-[color:var(--gold)] focus:ring-opacity-30 focus:ring-offset-1 transition-all"
                  title={selectedRows.size === sortedRequirements.length ? 'Deselect all' : 'Select all'}
                >
                  {selectedRows.size === sortedRequirements.length && sortedRequirements.length > 0 ? (
                    <CheckSquare className="w-4 h-4 text-[color:var(--gold)]" />
                  ) : (
                    <Square className="w-4 h-4 text-[color:var(--text-secondary)] hover:text-[color:var(--gold)]" />
                  )}
                </button>
              </th>
              <th className="px-2 py-3 text-left text-xs font-heading font-bold text-[color:var(--gold)] uppercase letter-spacing-wide border-r border-[color:var(--gold)] border-opacity-10" style={{ width: '50px' }}>REQ</th>
              <th className="px-2 py-3 text-left text-xs font-heading font-bold text-[color:var(--gold)] uppercase letter-spacing-wide border-r border-[color:var(--gold)] border-opacity-10" style={{ width: '20%' }}>Title</th>
              <th className="px-2 py-3 text-left text-xs font-heading font-bold text-[color:var(--gold)] uppercase letter-spacing-wide border-r border-[color:var(--gold)] border-opacity-10" style={{ width: '15%' }}>Status</th>
              <th className="px-2 py-3 text-left text-xs font-heading font-bold text-[color:var(--gold)] uppercase letter-spacing-wide border-r border-[color:var(--gold)] border-opacity-10" style={{ width: '18%' }}>Vendor Company</th>
              <th className="px-2 py-3 text-left text-xs font-heading font-bold text-[color:var(--gold)] uppercase letter-spacing-wide border-r border-[color:var(--gold)] border-opacity-10" style={{ width: '15%' }}>Contact Person</th>
              <th className="px-2 py-3 text-left text-xs font-heading font-bold text-[color:var(--gold)] uppercase letter-spacing-wide border-r border-[color:var(--gold)] border-opacity-10" style={{ width: '15%' }}>Phone</th>
              <th className="px-2 py-3 text-left text-xs font-heading font-bold text-[color:var(--gold)] uppercase letter-spacing-wide border-r border-[color:var(--gold)] border-opacity-10" style={{ width: '20%' }}>Email</th>
              <th className="px-2 py-3 text-right text-xs font-heading font-bold text-[color:var(--gold)] uppercase letter-spacing-wide border-r border-[color:var(--gold)] border-opacity-10" style={{ width: '140px' }}>Actions</th>
            </tr>
          </thead>
          <tbody
            className="bg-white"
          >
            {sortedRequirements.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-2 py-12 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-14 h-14 rounded-full bg-[color:var(--gold)] bg-opacity-10 flex items-center justify-center">
                      <Calendar className="w-8 h-8 text-[color:var(--gold)]" />
                    </div>
                    <div>
                      <p className="text-[color:var(--text)] font-medium text-xs">No requirements found</p>
                      <p className="text-[color:var(--text-secondary)] text-xs mt-2">Try adjusting your filters or create a new requirement</p>
                    </div>
                  </div>
                </td>
              </tr>
            ) : (
              <>
                {paddingTop > 0 ? (
                  <tr aria-hidden="true">
                    <td colSpan={9} style={{ height: paddingTop }} />
                  </tr>
                ) : null}

                {virtualItems.map(virtualRow => {
                  const req = sortedRequirements[virtualRow.index];
                  const isSelected = selectedRows.has(req.id);
                  const colors = statusColorMap[req.status as RequirementStatus];
                  return (
                    <TableRow
                      key={req.id}
                      req={req}
                      isSelected={isSelected}
                      colors={colors}
                      toggleRowSelected={toggleRowSelected}
                      onViewDetails={onViewDetails}
                      onCreateInterview={onCreateInterview}
                      onDelete={onDelete}
                      isAdmin={isAdmin}
                      rowIndex={virtualRow.index}
                      dataIndex={virtualRow.index}
                      selectedStatusFilter={selectedStatusFilter}
                      onStatusFilterChange={onStatusFilterChange}
                    />
                  );
                })}

                {paddingBottom > 0 ? (
                  <tr aria-hidden="true">
                    <td colSpan={9} style={{ height: paddingBottom }} />
                  </tr>
                ) : null}
              </>
            )}
          </tbody>
        </table>
      </Box>

      {/* Footer - Pagination and Stats */}
      <div className="bg-white border-t border-gray-200">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between px-4 py-3 gap-3">
          <div className="flex items-center space-x-2 text-xs font-body text-gray-600">
            <span>Page: <strong>{page + 1}</strong></span>
            <span className="text-gray-300">|</span>
            <span>Rows: <strong>{sortedRequirements.length}</strong></span>
            <span className="text-gray-300">|</span>
            <span>Selected: <strong>{selectedRows.size}</strong></span>
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={() => onPageChange(page - 1)}
              disabled={page === 0 || isFetchingPage}
              className="px-3 py-1.5 text-xs font-body text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-[color:var(--gold)] focus:ring-opacity-30 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              Prev
            </button>
            <button
              onClick={() => onPageChange(page + 1)}
              disabled={!hasNextPage || isFetchingPage}
              className="px-3 py-1.5 text-xs font-body text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-[color:var(--gold)] focus:ring-opacity-30 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </Paper>
  );
});
