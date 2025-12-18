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
  'NEW': { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', dot: 'bg-blue-600' },
  'IN_PROGRESS': { bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200', dot: 'bg-yellow-600' },
  'INTERVIEW': { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200', dot: 'bg-purple-600' },
  'OFFER': { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200', dot: 'bg-green-600' },
  'CLOSED': { bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-200', dot: 'bg-gray-600' },
  'REJECTED': { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', dot: 'bg-red-600' },
  'SUBMITTED': { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200', dot: 'bg-indigo-600' },
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
      className={`transition-all duration-150 ${rowIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-primary-50`}
    > 
      
      {/* Checkbox */}
      <td className="px-2 py-3 text-center align-middle w-8 border-b border-r border-gray-200">
        <div className="flex items-center justify-center">
          <button
            onClick={() => toggleRowSelected(req.id)}
            className="p-1 hover:bg-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-300 focus:ring-offset-1"
            aria-pressed={isSelected}
            title={isSelected ? 'Deselect requirement' : 'Select requirement'}
            aria-label={isSelected ? `Deselect ${req.title}` : `Select ${req.title}`}
          >
            {isSelected ? (
              <CheckSquare className="w-4 h-4 text-primary-600" />
            ) : (
              <Square className="w-4 h-4 text-gray-400 hover:text-gray-600" />
            )}
          </button>
        </div>
      </td>
      
      {/* Requirement Number */}
      <td className="px-2 py-3 text-left align-middle w-14 font-mono text-xs sm:text-sm font-bold text-gray-700 border-b border-r border-gray-200">
        {String(req.requirement_number || 1).padStart(3, '0')}
      </td>
      
      {/* Title */}
      <td className="px-2 py-3 text-left align-top min-w-[160px] max-w-[320px] whitespace-normal break-words border-b border-r border-gray-200">
        <div className="min-w-0">
          <button
            onClick={() => onViewDetails(req)}
            className="text-left w-full hover:text-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-200 focus:ring-offset-1 rounded px-1 -mx-1 transition-colors duration-150 group"
            title={`${req.title}${req.company ? ` - ${req.company}` : ''}`}
            aria-label={`View details for ${req.title}`}
          >
            <div className="font-semibold text-xs xs:text-sm sm:text-base text-gray-900 group-hover:text-primary-600 leading-relaxed break-words pr-1 xs:pr-2">
              {req.title}
            </div>
            {req.company && (
              <div className="text-xs text-gray-500 mt-0.5 xs:mt-1 sm:mt-1.5 break-words pr-1 xs:pr-2" title={req.company}>
                {req.company}
              </div>
            )}
          </button>
        </div>
      </td>
      
      {/* Status */}
      <td className="px-2 py-3 text-left align-middle min-w-[100px] whitespace-normal break-words border-b border-r border-gray-200">
        <div className="flex items-center">
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold border ${colors.bg} ${colors.text} ${colors.border} shadow-sm`} style={{backgroundColor: 'rgba(0,0,0,0.03)'}}>
            <span className={`w-2 h-2 rounded-full ${colors.dot} flex-shrink-0 mr-1`} />
            <span>{req.status}</span>
          </span>
        </div>
      </td>
      
      {/* Vendor Company */}
      <td className="px-2 py-3 text-left align-top min-w-[140px] max-w-[220px] font-semibold whitespace-normal break-words border-b border-r border-gray-200">
        <div className="min-w-0">
          {req.vendor_company ? (
            <div 
              className="text-xs sm:text-sm text-gray-900 font-medium break-words leading-relaxed pr-1 xs:pr-2" 
              title={req.vendor_company}
            >
              {req.vendor_company}
            </div>
          ) : (
            <span className="text-xs sm:text-sm text-gray-400 italic">—</span>
          )}
        </div>
      </td>
      
      {/* Vendor Person */}
      <td className="px-2 py-3 text-left align-top min-w-[120px] max-w-[180px] font-medium whitespace-normal break-words border-b border-r border-gray-200">
        <div className="min-w-0">
          {req.vendor_person_name ? (
            <div 
              className="text-xs sm:text-sm text-gray-700 break-words leading-relaxed pr-1 xs:pr-2" 
              title={req.vendor_person_name}
            >
              {req.vendor_person_name}
            </div>
          ) : (
            <span className="text-xs sm:text-sm text-gray-400 italic">—</span>
          )}
        </div>
      </td>
      
      {/* Vendor Phone */}
      <td className="px-2 py-3 text-left align-top min-w-[120px] max-w-[160px] font-mono text-xs whitespace-normal break-words border-b border-r border-gray-200">
        <div className="min-w-0 max-w-full">
          {req.vendor_phone ? (
            <a 
              href={`tel:${req.vendor_phone}`}
              className="text-xs sm:text-sm text-gray-700 hover:text-primary-600 hover:underline block font-mono break-words max-w-full"
              title={`Call ${req.vendor_phone}`}
              onClick={(e) => e.stopPropagation()}
            >
              {req.vendor_phone}
            </a>
          ) : (
            <span className="text-xs sm:text-sm text-gray-400 italic">—</span>
          )}
        </div>
      </td>
      
      {/* Vendor Email */}
      <td className="px-2 py-3 text-left align-top min-w-[140px] max-w-[200px] text-xs whitespace-normal break-words border-b border-r border-gray-200">
        <div className="min-w-0 max-w-full">
          {req.vendor_email ? (
            <a 
              href={`mailto:${req.vendor_email}`}
              className="text-xs sm:text-sm text-gray-700 hover:text-primary-600 hover:underline break-words max-w-full"
              title={`Email ${req.vendor_email}`}
              onClick={(e) => e.stopPropagation()}
            >
              {req.vendor_email}
            </a>
          ) : (
            <span className="text-xs sm:text-sm text-gray-400 italic">—</span>
          )}
        </div>
      </td>
      
      {/* Actions */}
      <td className="px-2 py-3 text-left align-middle min-w-[80px] border-b border-r border-gray-200">
        <div className="flex gap-1 justify-end items-center">
          <button
            onClick={() => onViewDetails(req)}
            className="btn-icon-sm text-primary-600 hover:bg-primary-100 hover:text-primary-800 focus:ring-2 focus:ring-primary-300"
            title="View details"
            aria-label={`View details for ${req.title}`}
          >
            <Eye className="w-4 h-4" />
          </button>
          <button
            onClick={() => onCreateInterview?.(req.id)}
            className="btn-icon-sm text-green-600 hover:bg-green-100 hover:text-green-800 focus:ring-2 focus:ring-green-300"
            title="Create interview"
            aria-label={`Create interview for ${req.title}`}
          >
            <Calendar className="w-4 h-4" />
          </button>
          {isAdmin && (
            <button
              onClick={() => onDelete(req.id)}
              className="btn-icon-sm text-red-600 hover:bg-red-100 hover:text-red-800 focus:ring-2 focus:ring-red-300"
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


export const RequirementsTable = ({
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
        borderWidth: 2,
        borderColor: 'divider',
        borderRadius: 2,
      }}
    >
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between px-4 py-3 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">Results</h3>
        <div className="flex items-center space-x-2 mt-2 sm:mt-0">
          <span className="text-sm text-gray-600">Page: {page + 1}</span>
          <span className="text-sm text-gray-600">|</span>
          <span className="text-sm text-gray-600">Rows: {sortedRequirements.length}</span>
          <span className="text-sm text-gray-600">|</span>
          <span className="text-sm text-gray-600">Selected: {selectedRows.size}</span>
          
          <button
            onClick={() => onPageChange(page - 1)}
            disabled={page === 0 || isFetchingPage}
            className="px-3 py-1 text-sm text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-primary-500 disabled:opacity-50"
          >
            Prev
          </button>
          <button
            onClick={() => onPageChange(page + 1)}
            disabled={!hasNextPage || isFetchingPage}
            className="px-3 py-1 text-sm text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-primary-500 disabled:opacity-50"
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
        <table className="min-w-full w-max border-separate border-spacing-0 border border-gray-200">
          <thead className="bg-gray-50 sticky top-0 z-10">
            <tr>
              
              <th className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-10 border-b border-r border-gray-200">
                <button
                  onClick={toggleSelectAll}
                  className="p-1 hover:bg-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-300 focus:ring-offset-1"
                  title={selectedRows.size === sortedRequirements.length ? 'Deselect all' : 'Select all'}
                >
                  {selectedRows.size === sortedRequirements.length && sortedRequirements.length > 0 ? (
                    <CheckSquare className="w-4 h-4 text-primary-600" />
                  ) : (
                    <Square className="w-4 h-4 text-gray-400 hover:text-gray-600" />
                  )}
                </button>
              </th>
              <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-r border-gray-200">REQ</th>
              <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-r border-gray-200">Title</th>
              <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-r border-gray-200">Status</th>
              <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-r border-gray-200">Vendor Company</th>
              <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-r border-gray-200">Contact Person</th>
              <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-r border-gray-200">Phone</th>
              <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-r border-gray-200">Email</th>
              <th className="px-2 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-r border-gray-200">Actions</th>
            </tr>
          </thead>
          <tbody
            className="bg-white"
          >
            {sortedRequirements.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-2 py-12 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center">
                      <Calendar className="w-8 h-8 text-gray-400" />
                    </div>
                    <div>
                      <p className="text-gray-900 font-semibold text-lg">No requirements found</p>
                      <p className="text-gray-500 text-sm mt-2">Try adjusting your filters or create a new requirement</p>
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
};
