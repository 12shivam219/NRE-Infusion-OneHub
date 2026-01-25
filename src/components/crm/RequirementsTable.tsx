import { useState, useMemo, memo, useRef } from 'react';
import { 
  Eye, 
  Calendar, 
  Trash2, 
  CheckSquare, 
  Square,
  MoreHorizontal,
} from 'lucide-react';
import { useVirtualizer } from '@tanstack/react-virtual';
import type { Database, RequirementStatus } from '../../lib/database.types';
import Box from '@mui/material/Box';
import Tooltip from '@mui/material/Tooltip';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';


type Requirement = Database['public']['Tables']['requirements']['Row'];
type RequirementWithLogs = Requirement & { logs?: { action: string; timestamp: string }[] };

type SortField = 'title' | 'company' | 'status' | 'created_at' | 'rate';
type SortOrder = 'asc' | 'desc';

interface RequirementsTableProps {
  requirements: RequirementWithLogs[];
  onViewDetails: (req: Requirement) => void;
  onRowClick?: (req: Requirement) => void; // Direct row click handler
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

// Enhanced status color map with compact styling
const enhancedStatusColors: Record<RequirementStatus, { bg: string; text: string }> = {
  'NEW': { bg: 'bg-blue-100', text: 'text-blue-700' },
  'IN_PROGRESS': { bg: 'bg-amber-100', text: 'text-amber-700' },
  'INTERVIEW': { bg: 'bg-purple-100', text: 'text-purple-700' },
  'OFFER': { bg: 'bg-green-100', text: 'text-green-700' },
  'CLOSED': { bg: 'bg-gray-100', text: 'text-gray-700' },
  'REJECTED': { bg: 'bg-red-100', text: 'text-red-700' },
  'SUBMITTED': { bg: 'bg-indigo-100', text: 'text-indigo-700' },
};

const TableRow = memo(({
  req,
  isSelected,
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
  const isAlternate = rowIndex % 2 === 1;
  const statusColor = enhancedStatusColors[req.status as RequirementStatus];
  const [actionMenuAnchorEl, setActionMenuAnchorEl] = useState<HTMLElement | null>(null);
  const actionMenuOpen = Boolean(actionMenuAnchorEl);
  
  const handleActionMenuOpen = (e: React.MouseEvent<HTMLElement>) => {
    e.stopPropagation();
    setActionMenuAnchorEl(e.currentTarget);
  };
  
  const handleActionMenuClose = () => {
    setActionMenuAnchorEl(null);
  };
  
  const handleView = () => {
    handleActionMenuClose();
    onViewDetails(req);
  };
  
  const handleCreateInterview = () => {
    handleActionMenuClose();
    onCreateInterview?.(req.id);
  };
  
  const handleDelete = () => {
    handleActionMenuClose();
    onDelete(req.id);
  };
  
  return (
    <tr
      ref={rowRef}
      data-index={dataIndex}
      className={`
        transition-colors duration-150
        border-b border-[#EAECEF]
        ${isAlternate ? 'bg-[#FAFBFC]' : 'bg-white'}
        hover:bg-[#F5F7FA]
        h-14
      `}
    >
      {/* Checkbox */}
      <td className="px-4 py-0 text-center align-middle bg-white" style={{ width: '44px', position: 'sticky', left: 0, zIndex: 20 }}>
        <div className="flex items-center justify-center">
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleRowSelected(req.id);
            }}
            className="p-1.5 hover:bg-gray-200 hover:bg-opacity-50 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 transition-colors"
            aria-pressed={isSelected}
            title={isSelected ? 'Deselect requirement' : 'Select requirement'}
            aria-label={isSelected ? `Deselect ${req.title}` : `Select ${req.title}`}
          >
            {isSelected ? (
              <CheckSquare className="w-4 h-4 text-blue-600" />
            ) : (
              <Square className="w-4 h-4 text-[#9CA3AF] hover:text-gray-600" />
            )}
          </button>
        </div>
      </td>
      
      {/* Requirement ID */}
      <td className="px-4 py-0 text-left align-middle bg-white" style={{ width: '60px', position: 'sticky', left: '44px', zIndex: 20 }}>
        <span className="font-mono font-medium text-[#6B7280]" style={{ fontSize: '0.8125rem' }}>
          REQ-{String(req.requirement_number || 1).padStart(3, '0')}
        </span>
      </td>
      
      {/* Title & Company */}
      <td className="px-4 py-0 text-left align-middle" style={{ width: '24%' }}>
        <div className="w-full text-left">
          <div className="font-semibold text-[#0F172A] leading-tight truncate" style={{ fontSize: '0.8125rem' }}>
            {req.title}
          </div>
          {req.company && (
            <div className="font-normal text-[#64748B] mt-1 truncate" style={{ fontSize: '0.75rem' }}>
              {req.company}
            </div>
          )}
        </div>
      </td>
      
      {/* Status Badge */}
      <td className="px-4 py-0 text-left align-middle" style={{ width: '15%' }}>
        <div className="flex items-center">
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (onStatusFilterChange) {
                onStatusFilterChange(req.status === selectedStatusFilter ? 'ALL' : req.status);
              }
            }}
            className={`
              inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full
              font-semibold transition-all duration-150 uppercase
              ${statusColor.bg} ${statusColor.text}
              hover:shadow-sm hover:opacity-80
              ${req.status === selectedStatusFilter ? 'ring-2 ring-blue-500 ring-offset-1' : ''}
            `}
            style={{ fontSize: '0.6875rem' }}
            title={`Click to filter by ${req.status} status`}
            aria-label={`Filter by ${req.status} status`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-current flex-shrink-0" />
            <span className="whitespace-nowrap">{req.status}</span>
          </button>
        </div>
      </td>
      
      {/* Vendor Company */}
      <td className="px-4 py-0 text-left align-middle" style={{ width: '18%' }}>
        <div className="font-normal text-[#475569] truncate" style={{ fontSize: '0.8125rem' }}>
          {req.vendor_company ? (
            <span title={req.vendor_company}>{req.vendor_company}</span>
          ) : (
            <span className="text-[#9CA3AF] italic">—</span>
          )}
        </div>
      </td>
      
      {/* Vendor Person */}
      <td className="px-4 py-0 text-left align-middle" style={{ width: '15%' }}>
        <div className="font-normal text-[#475569] truncate" style={{ fontSize: '0.8125rem' }}>
          {req.vendor_person_name ? (
            <span title={req.vendor_person_name}>{req.vendor_person_name}</span>
          ) : (
            <span className="text-[#9CA3AF] italic">—</span>
          )}
        </div>
      </td>
      
      {/* Vendor Phone */}
      <td className="px-4 py-0 text-left align-middle" style={{ width: '15%' }}>
        <div className="font-mono text-[#475569] truncate" style={{ fontSize: '0.8125rem' }}>
          {req.vendor_phone ? (
            <a 
              href={`tel:${req.vendor_phone}`}
              className="text-blue-600 hover:text-blue-700 hover:underline transition-colors"
              title={`Call ${req.vendor_phone}`}
              onClick={(e) => e.stopPropagation()}
            >
              {req.vendor_phone}
            </a>
          ) : (
            <span className="text-[#9CA3AF] italic">—</span>
          )}
        </div>
      </td>
      
      {/* Vendor Email */}
      <td className="px-4 py-0 text-left align-middle" style={{ width: '18%' }}>
        <div className="font-normal text-[#475569] truncate" style={{ fontSize: '0.8125rem' }}>
          {req.vendor_email ? (
            <a 
              href={`mailto:${req.vendor_email}`}
              className="text-blue-600 hover:text-blue-700 hover:underline transition-colors"
              title={`Email ${req.vendor_email}`}
              onClick={(e) => e.stopPropagation()}
            >
              {req.vendor_email}
            </a>
          ) : (
            <span className="text-[#9CA3AF] italic">—</span>
          )}
        </div>
      </td>
      
      {/* Actions */}
      <td className="px-4 py-0 text-center align-middle bg-white" style={{ width: '56px', position: 'sticky', right: 0, zIndex: 20 }}>
        <div className="flex items-center justify-center h-14">
          <Tooltip title="Actions">
            <button
              onClick={handleActionMenuOpen}
              className="p-0 w-8 h-8 text-[#475569] bg-white border border-[#E5E7EB] rounded-lg hover:bg-[#F8FAFC] hover:border-[#CBD5E1] transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-opacity-30 flex items-center justify-center"
              aria-label={`Actions for ${req.title}`}
              aria-haspopup="true"
              aria-expanded={actionMenuOpen}
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>
          </Tooltip>
        </div>
        
        <Menu
          anchorEl={actionMenuAnchorEl}
          open={actionMenuOpen}
          onClose={handleActionMenuClose}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          transformOrigin={{ vertical: 'top', horizontal: 'right' }}
          slotProps={{
            paper: {
              sx: {
                backgroundColor: '#FFFFFF',
                borderRadius: '8px',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
                border: '1px solid #E5E7EB',
                minWidth: '180px',
              },
            },
          }}
        >
          <MenuItem
            onClick={handleView}
            sx={{
              py: 1.25,
              px: 2,
              fontSize: '0.8125rem',
              color: '#1F2937',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              '&:hover': {
                backgroundColor: '#F1F5F9',
              },
            }}
          >
            <Eye className="w-4 h-4" />
            View
          </MenuItem>
          
          <MenuItem
            onClick={handleCreateInterview}
            sx={{
              py: 1.25,
              px: 2,
              fontSize: '0.8125rem',
              color: '#2563EB',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              '&:hover': {
                backgroundColor: '#F1F5F9',
              },
            }}
          >
            <Calendar className="w-4 h-4" />
            Create Interview
          </MenuItem>
          
          {isAdmin && (
            <MenuItem
              onClick={handleDelete}
              sx={{
                py: 1.25,
                px: 2,
                fontSize: '0.8125rem',
                color: '#DC2626',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                '&:hover': {
                  backgroundColor: '#F1F5F9',
                },
              }}
            >
              <Trash2 className="w-4 h-4" />
              Delete
            </MenuItem>
          )}
        </Menu>
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
    <div className="w-full bg-white rounded-lg border border-[#E5E7EB] pt-0">
      {/* Toolbar - Search & Filters */}
      <div className="px-6 py-4 border-b border-[#EAECEF] bg-white">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-[16px] font-semibold text-[#0F172A]">Requirements</h3>
            <p className="text-[12px] text-[#64748B] mt-1">{sortedRequirements.length} requirements total</p>
          </div>
          
          {/* Search Bar */}
          <div className="w-full sm:w-auto">
            {headerSearch ?? null}
          </div>
        </div>
      </div>

      {/* Table */}
      <Box
        ref={parentRef}
        sx={{
          overflow: 'auto',
          overflowX: { xs: 'auto', sm: 'auto', md: 'auto' },
          overflowY: 'auto',
          maxHeight: { xs: '60vh', sm: '65vh', md: '70vh' },
          pb: 0,
          scrollbarGutter: 'stable',
          width: '100%',
          willChange: 'transform',
          contain: 'content',
          fontFamily: '"Instrument Sans", sans-serif',
          '& table': {
            width: '100%',
            minWidth: { xs: '1200px', sm: '1200px', md: '100%' },
            tableLayout: 'auto',
            borderCollapse: 'collapse',
            fontFamily: '"Instrument Sans", sans-serif',
          },
          '& thead': {
            position: 'sticky',
            top: 0,
            zIndex: 10,
          },
        }}
      >
        <table className="w-full">
          <thead>
            <tr className="bg-[#F8FAFC] border-b border-[#EAECEF]">
              {/* Checkbox Header */}
              <th className="px-4 py-3 text-center align-middle bg-[#F8FAFC]" style={{ width: '44px', position: 'sticky', left: 0, zIndex: 30 }}>
                <button
                  onClick={toggleSelectAll}
                  className="p-1.5 hover:bg-gray-200 hover:bg-opacity-50 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 transition-colors"
                  title={selectedRows.size === sortedRequirements.length ? 'Deselect all' : 'Select all'}
                  aria-label={selectedRows.size === sortedRequirements.length ? 'Deselect all' : 'Select all'}
                  style={{ fontSize: '0.75rem' }}
                >
                  {selectedRows.size === sortedRequirements.length && sortedRequirements.length > 0 ? (
                    <CheckSquare className="w-4 h-4 text-blue-600" />
                  ) : (
                    <Square className="w-4 h-4 text-[#9CA3AF] hover:text-gray-600" />
                  )}
                </button>
              </th>
              
              <th className="px-4 py-3 text-left align-middle bg-[#F8FAFC]" style={{ width: '60px', position: 'sticky', left: '44px', zIndex: 30, fontSize: '0.75rem', fontWeight: 600 }}>
                <span className="text-[#475569] uppercase tracking-wide">ID</span>
              </th>
              
              <th className="px-4 py-3 text-left align-middle" style={{ width: '24%', fontSize: '0.75rem', fontWeight: 600 }}>
                <span className="text-[#475569] uppercase tracking-wide">Title</span>
              </th>
              
              <th className="px-4 py-3 text-left align-middle" style={{ width: '15%', fontSize: '0.75rem', fontWeight: 600 }}>
                <span className="text-[#475569] uppercase tracking-wide">Status</span>
              </th>
              
              <th className="px-4 py-3 text-left align-middle" style={{ width: '18%', fontSize: '0.75rem', fontWeight: 600 }}>
                <span className="text-[#475569] uppercase tracking-wide">Vendor Company</span>
              </th>
              
              <th className="px-4 py-3 text-left align-middle" style={{ width: '15%', fontSize: '0.75rem', fontWeight: 600 }}>
                <span className="text-[#475569] uppercase tracking-wide">Contact</span>
              </th>
              
              <th className="px-4 py-3 text-left align-middle" style={{ width: '15%', fontSize: '0.75rem', fontWeight: 600 }}>
                <span className="text-[#475569] uppercase tracking-wide">Phone</span>
              </th>
              
              <th className="px-4 py-3 text-left align-middle" style={{ width: '18%', fontSize: '0.75rem', fontWeight: 600 }}>
                <span className="text-[#475569] uppercase tracking-wide">Email</span>
              </th>
              
              <th className="px-4 py-3 text-center align-middle bg-[#F8FAFC]" style={{ width: '56px', position: 'sticky', right: 0, zIndex: 30, fontSize: '0.75rem', fontWeight: 600 }}>
                <span className="text-[#475569] uppercase tracking-wide">Actions</span>
              </th>
            </tr>
          </thead>
          
          <tbody>
            {sortedRequirements.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-6 py-12 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center">
                      <Calendar className="w-7 h-7 text-gray-400" />
                    </div>
                    <div>
                      <p className="text-[14px] font-semibold text-[#0F172A]">No requirements found</p>
                      <p className="text-[13px] text-[#64748B] mt-1">Try adjusting your filters or create a new requirement</p>
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

      {/* Footer - Pagination */}
      <div className="px-6 py-4 border-t border-[#EAECEF] bg-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4 text-[13px] text-[#64748B]">
          <span>
            Page: <span className="font-semibold text-[#0F172A]">{page + 1}</span>
          </span>
          <span className="w-px h-4 bg-[#E5E7EB]" />
          <span>
            Rows: <span className="font-semibold text-[#0F172A]">{sortedRequirements.length}</span>
          </span>
          <span className="w-px h-4 bg-[#E5E7EB]" />
          <span>
            Selected: <span className="font-semibold text-[#0F172A]">{selectedRows.size}</span>
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => onPageChange(page - 1)}
            disabled={page === 0 || isFetchingPage}
            className="px-4 py-2 text-[13px] font-medium text-[#475569] bg-white border border-[#D1D5DB] rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white transition-all"
          >
            ← Previous
          </button>
          <button
            onClick={() => onPageChange(page + 1)}
            disabled={!hasNextPage || isFetchingPage}
            className="px-4 py-2 text-[13px] font-medium text-[#475569] bg-white border border-[#D1D5DB] rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white transition-all"
          >
            Next →
          </button>
        </div>
      </div>
    </div>
  );
});
