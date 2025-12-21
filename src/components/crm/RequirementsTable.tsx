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
}

const statusColorMap: Record<RequirementStatus, { bg: string; text: string; border: string; dot: string }> = {
  'NEW': { bg: 'bg-[color:var(--gold)] bg-opacity-10', text: 'text-[color:var(--gold)]', border: 'border-[color:var(--gold)] border-opacity-30', dot: 'bg-[color:var(--gold)]' },
  'IN_PROGRESS': { bg: 'bg-amber-500 bg-opacity-10', text: 'text-amber-600', border: 'border-amber-500 border-opacity-30', dot: 'bg-amber-600' },
  'INTERVIEW': { bg: 'bg-purple-500 bg-opacity-10', text: 'text-purple-600', border: 'border-purple-500 border-opacity-30', dot: 'bg-purple-600' },
  'OFFER': { bg: 'bg-green-500 bg-opacity-10', text: 'text-green-600', border: 'border-green-500 border-opacity-30', dot: 'bg-green-600' },
  'CLOSED': { bg: 'bg-[color:var(--text-secondary)] bg-opacity-10', text: 'text-[color:var(--text-secondary)]', border: 'border-[color:var(--text-secondary)] border-opacity-30', dot: 'bg-[color:var(--text-secondary)]' },
  'REJECTED': { bg: 'bg-red-500 bg-opacity-10', text: 'text-red-600', border: 'border-red-500 border-opacity-30', dot: 'bg-red-600' },
  'SUBMITTED': { bg: 'bg-indigo-500 bg-opacity-10', text: 'text-indigo-600', border: 'border-indigo-500 border-opacity-30', dot: 'bg-indigo-600' },
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
}) => {
  return (
    <tr
      ref={rowRef}
      data-index={dataIndex}
        className={`transition-all duration-150 ${rowIndex % 2 === 0 ? 'bg-[color:var(--darkbg-surface)]' : 'bg-[color:var(--darkbg-surface-light)]'} hover:bg-[color:var(--gold)] hover:bg-opacity-10`}
    > 
      <td className="px-2 py-3 text-center align-middle w-8 border-b border-r border-[color:var(--gold)] border-opacity-10">
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
      <td className="px-2 py-3 text-left align-middle w-14 font-mono text-xs font-medium text-[color:var(--text-secondary)] border-b border-r border-[color:var(--gold)] border-opacity-10">
        {String(req.requirement_number || 1).padStart(3, '0')}
      </td>
      
      {/* Title */}
      <td className="px-2 py-3 text-left align-top min-w-[160px] max-w-[320px] whitespace-normal break-words border-b border-r border-[color:var(--gold)] border-opacity-10">
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
      <td className="px-2 py-3 text-left align-middle min-w-[100px] whitespace-normal break-words border-b border-r border-[color:var(--gold)] border-opacity-10">
        <div className="flex items-center">
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-bold font-heading border ${colors.bg} ${colors.text} ${colors.border}`}>
            <span className={`w-2 h-2 rounded-full ${colors.dot} flex-shrink-0 mr-1`} />
            <span>{req.status}</span>
          </span>
        </div>
      </td>
      
      {/* Vendor Company */}
      <td className="px-2 py-3 text-left align-top min-w-[140px] max-w-[220px] font-medium whitespace-normal break-words border-b border-r border-[color:var(--gold)] border-opacity-10">
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
      <td className="px-2 py-3 text-left align-top min-w-[120px] max-w-[180px] font-medium whitespace-normal break-words border-b border-r border-[color:var(--gold)] border-opacity-10">
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
      <td className="px-2 py-3 text-left align-top min-w-[120px] max-w-[160px] font-mono text-xs whitespace-normal break-words border-b border-r border-[color:var(--gold)] border-opacity-10">
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
      <td className="px-2 py-3 text-left align-top min-w-[140px] max-w-[200px] text-xs whitespace-normal break-words border-b border-r border-[color:var(--gold)] border-opacity-10">
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
      <td className="px-2 py-3 text-left align-middle min-w-[80px] border-b border-r border-[color:var(--gold)] border-opacity-10">
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
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between px-4 py-3 border-b border-[color:var(--gold)] border-opacity-10 bg-[color:var(--darkbg-surface)]">
        <h3 className="text-xs font-heading font-bold text-[color:var(--gold)] uppercase letter-spacing-wide">Results</h3>
        <div className="flex items-center space-x-2 mt-2 sm:mt-0">
          <span className="text-xs font-body text-[color:var(--text-secondary)]">Page: {page + 1}</span>
          <span className="text-xs font-body text-[color:var(--text-secondary)]">|</span>
          <span className="text-xs font-body text-[color:var(--text-secondary)]">Rows: {sortedRequirements.length}</span>
          <span className="text-xs font-body text-[color:var(--text-secondary)]">|</span>
          <span className="text-xs font-body text-[color:var(--text-secondary)]">Selected: {selectedRows.size}</span>
          
          <button
            onClick={() => onPageChange(page - 1)}
            disabled={page === 0 || isFetchingPage}
            className="px-3 py-1 text-xs font-body text-[color:var(--text)] bg-[color:var(--darkbg-surface)] border border-[color:var(--gold)] border-opacity-20 rounded-lg hover:bg-[color:var(--darkbg-surface-light)] focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-[color:var(--gold)] focus:ring-opacity-30 disabled:opacity-50 transition-all"
          >
            Prev
          </button>
          <button
            onClick={() => onPageChange(page + 1)}
            disabled={!hasNextPage || isFetchingPage}
            className="px-3 py-1 text-xs font-body text-[color:var(--text)] bg-[color:var(--darkbg-surface)] border border-[color:var(--gold)] border-opacity-20 rounded-lg hover:bg-[color:var(--darkbg-surface-light)] focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-[color:var(--gold)] focus:ring-opacity-30 disabled:opacity-50 transition-all"
          >
            Next
          </button>
        </div>
      </div>

      <Box
        ref={parentRef}
        sx={{
          overflow: 'auto',
          maxHeight: { xs: '60vh', sm: '65vh', md: '70vh' },
          pb: 1,
        }}
      >
        <table className="min-w-full w-max border-separate border-spacing-0 border border-[color:var(--gold)] border-opacity-20 rounded-lg">
          <thead className="bg-[color:var(--darkbg-surface-light)] sticky top-0 z-10">
            <tr>
              
              <th className="px-2 py-3 text-center text-xs font-heading font-bold text-[color:var(--gold)] uppercase letter-spacing-wide w-10 border-b border-r border-[color:var(--gold)] border-opacity-10">
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
              <th className="px-2 py-3 text-left text-xs font-heading font-bold text-[color:var(--gold)] uppercase letter-spacing-wide border-b border-r border-[color:var(--gold)] border-opacity-10">REQ</th>
              <th className="px-2 py-3 text-left text-xs font-heading font-bold text-[color:var(--gold)] uppercase letter-spacing-wide border-b border-r border-[color:var(--gold)] border-opacity-10">Title</th>
              <th className="px-2 py-3 text-left text-xs font-heading font-bold text-[color:var(--gold)] uppercase letter-spacing-wide border-b border-r border-[color:var(--gold)] border-opacity-10">Status</th>
              <th className="px-2 py-3 text-left text-xs font-heading font-bold text-[color:var(--gold)] uppercase letter-spacing-wide border-b border-r border-[color:var(--gold)] border-opacity-10">Vendor Company</th>
              <th className="px-2 py-3 text-left text-xs font-heading font-bold text-[color:var(--gold)] uppercase letter-spacing-wide border-b border-r border-[color:var(--gold)] border-opacity-10">Contact Person</th>
              <th className="px-2 py-3 text-left text-xs font-heading font-bold text-[color:var(--gold)] uppercase letter-spacing-wide border-b border-r border-[color:var(--gold)] border-opacity-10">Phone</th>
              <th className="px-2 py-3 text-left text-xs font-heading font-bold text-[color:var(--gold)] uppercase letter-spacing-wide border-b border-r border-[color:var(--gold)] border-opacity-10">Email</th>
              <th className="px-2 py-3 text-right text-xs font-heading font-bold text-[color:var(--gold)] uppercase letter-spacing-wide border-b border-r border-[color:var(--gold)] border-opacity-10">Actions</th>
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
                      rowRef={rowVirtualizer.measureElement}
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
    </Paper>
  );
});
