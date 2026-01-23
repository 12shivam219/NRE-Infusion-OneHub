import { useState, useMemo, memo, useRef } from 'react';
import { Eye, Trash2, CheckSquare, Square } from 'lucide-react';
import { useVirtualizer } from '@tanstack/react-virtual';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';

export type SortField = string;
export type SortOrder = 'asc' | 'desc';

export interface Column<T> {
  key: keyof T | string;
  label: string;
  width: string;
  render?: (item: T, key: string) => React.ReactNode;
  sortable?: boolean;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface DataTableProps<T extends { id: string } = any> {
  data: T[];
  columns: Column<T>[];
  onViewDetails: (item: T) => void;
  onDelete: (id: string) => void;
  onActionClick?: (action: string, item: T) => void;
  onRowClick?: (item: T) => void; // Direct row click handler
  isAdmin: boolean;
  title: string;
  serverSortField?: string;
  serverSortOrder?: 'asc' | 'desc';
  onSortChange?: (field: string, order: 'asc' | 'desc') => void;
  page: number;
  hasNextPage: boolean;
  isFetchingPage: boolean;
  onPageChange: (page: number) => void;
  headerSearch?: JSX.Element | null;
  emptyStateIcon?: React.FC<{ className?: string }>;
  emptyStateMessage?: string;
}

const DataTableRow = memo(({
  item,
  isSelected,
  columns,
  toggleRowSelected,
  onViewDetails,
  onDelete,
  onRowClick,
  isAdmin,
  rowIndex,
  rowRef,
  dataIndex,
}: {
  item: { id: string };
  isSelected: boolean;
  columns: Column<{ id: string }>[];
  toggleRowSelected: (id: string) => void;
  onViewDetails: (item: { id: string }) => void;
  onDelete: (id: string) => void;
  onRowClick?: (item: { id: string }) => void;
  isAdmin: boolean;
  rowIndex: number;
  rowRef?: (el: HTMLTableRowElement | null) => void;
  dataIndex?: number;
}) => {
  return (
    <tr
      ref={rowRef}
      data-index={dataIndex}
      onClick={() => onRowClick?.(item)}
      className={`${rowIndex % 2 === 0 ? 'bg-[color:var(--darkbg-surface)]' : 'bg-[color:var(--darkbg-surface-light)]'} hover:bg-[color:var(--gold)] hover:bg-opacity-10 transition-colors duration-150 ${onRowClick ? 'cursor-pointer' : ''}`}
    >
      <td className="px-2 py-3 text-center align-middle border-b border-r border-[color:var(--gold)] border-opacity-10" style={{ width: '40px' }}>
        <div className="flex items-center justify-center">
          <button
            onClick={() => toggleRowSelected(item.id)}
            className="p-1 hover:bg-[color:var(--gold)] hover:bg-opacity-20 rounded-lg focus:outline-none focus:ring-2 focus:ring-[color:var(--gold)] focus:ring-offset-1"
            aria-pressed={isSelected}
            title={isSelected ? 'Deselect item' : 'Select item'}
            aria-label={isSelected ? 'Deselect' : 'Select'}
          >
            {isSelected ? (
              <CheckSquare className="w-4 h-4 text-[color:var(--gold)]" />
            ) : (
              <Square className="w-4 h-4 text-[color:var(--text-secondary)] hover:text-[color:var(--gold)]" />
            )}
          </button>
        </div>
      </td>

      {columns.map((col) => (
        <td
          key={String(col.key)}
          className="px-2 py-3 text-left align-top whitespace-normal break-words border-b border-r border-[color:var(--gold)] border-opacity-10"
          style={{ width: col.width }}
        >
          <div className="min-w-0">
            {col.render ? col.render(item, String(col.key)) : String(item[col.key as keyof typeof item] || '—')}
          </div>
        </td>
      ))}

      <td className="px-2 py-3 text-left align-middle border-b border-r border-[color:var(--gold)] border-opacity-10" style={{ width: '140px' }}>
        <div className="flex gap-1 justify-end items-center">
          <button
            onClick={() => onViewDetails(item)}
            className="p-1.5 text-[color:var(--gold)] hover:bg-[color:var(--gold)] hover:bg-opacity-10 hover:text-[color:var(--gold)] focus:ring-2 focus:ring-[color:var(--gold)] focus:ring-opacity-30 rounded-lg transition-all"
            title="View details"
            aria-label="View details"
          >
            <Eye className="w-4 h-4" />
          </button>
          {isAdmin && (
            <button
              onClick={() => onDelete(item.id)}
              className="p-1.5 text-red-600 hover:bg-red-500 hover:bg-opacity-10 hover:text-red-600 focus:ring-2 focus:ring-red-500 focus:ring-opacity-30 rounded-lg transition-all"
              title="Delete item"
              aria-label="Delete"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </td>
    </tr>
  );
});

export const DataTable = memo(({
  data,
  columns,
  onViewDetails,
  onDelete,
  onRowClick,
  isAdmin,
  title,
  page,
  hasNextPage,
  isFetchingPage,
  onPageChange,
  headerSearch,
  emptyStateIcon: EmptyStateIcon,
  emptyStateMessage,
  // serverSortField and serverSortOrder are available for future sorting implementation
  onSortChange,
}: DataTableProps) => {
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());

  const parentRef = useRef<HTMLDivElement | null>(null);

  const sortedData = useMemo(() => {
    if (onSortChange) return data;
    return data;
  }, [data, onSortChange]);

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
    if (selectedRows.size === sortedData.length) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(sortedData.map(item => item.id)));
    }
  };

  const rowVirtualizer = useVirtualizer({
    count: sortedData.length,
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

  const totalWidth = columns.reduce((sum, col) => {
    const width = parseFloat(col.width);
    return sum + width;
  }, 40 + 140); // checkbox + actions

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
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between px-4 py-3 border-b border-gray-200 gap-3">
          <h3 className="text-xs font-heading font-bold text-[color:var(--gold)] uppercase letter-spacing-wide">{title}</h3>
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
          willChange: 'transform',
          contain: 'content',
          '& table': {
            width: '100%',
            minWidth: { xs: `${Math.max(totalWidth, 1200)}px`, sm: `${Math.max(totalWidth, 1200)}px`, md: '100%' },
            tableLayout: 'auto',
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
                  title={selectedRows.size === sortedData.length ? 'Deselect all' : 'Select all'}
                >
                  {selectedRows.size === sortedData.length && sortedData.length > 0 ? (
                    <CheckSquare className="w-4 h-4 text-[color:var(--gold)]" />
                  ) : (
                    <Square className="w-4 h-4 text-[color:var(--text-secondary)] hover:text-[color:var(--gold)]" />
                  )}
                </button>
              </th>
              {columns.map((col) => (
                <th
                  key={String(col.key)}
                  className="px-2 py-3 text-left text-xs font-heading font-bold text-[color:var(--gold)] uppercase letter-spacing-wide border-r border-[color:var(--gold)] border-opacity-10"
                  style={{ width: col.width }}
                >
                  {col.label}
                </th>
              ))}
              <th className="px-2 py-3 text-right text-xs font-heading font-bold text-[color:var(--gold)] uppercase letter-spacing-wide border-r border-[color:var(--gold)] border-opacity-10" style={{ width: '140px' }}>
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white">
            {sortedData.length === 0 ? (
              <tr>
                <td colSpan={columns.length + 2} className="px-2 py-12 text-center">
                  <div className="flex flex-col items-center gap-3">
                    {EmptyStateIcon && (
                      <div className="w-14 h-14 rounded-full bg-[color:var(--gold)] bg-opacity-10 flex items-center justify-center">
                        <EmptyStateIcon className="w-8 h-8 text-[color:var(--gold)]" />
                      </div>
                    )}
                    <div>
                      <p className="text-[color:var(--text)] font-medium text-xs">
                        {emptyStateMessage || 'No data found'}
                      </p>
                    </div>
                  </div>
                </td>
              </tr>
            ) : (
              <>
                {paddingTop > 0 ? (
                  <tr aria-hidden="true">
                    <td colSpan={columns.length + 2} style={{ height: paddingTop }} />
                  </tr>
                ) : null}

                {virtualItems.map((virtualRow) => {
                  const item = sortedData[virtualRow.index];
                  const isSelected = selectedRows.has(item.id);
                  return (
                    <DataTableRow
                      key={item.id}
                      item={item}
                      isSelected={isSelected}
                      columns={columns}
                      toggleRowSelected={toggleRowSelected}
                      onViewDetails={onViewDetails}
                      onDelete={onDelete}
                      onRowClick={onRowClick}
                      isAdmin={isAdmin}
                      rowIndex={virtualRow.index}
                      dataIndex={virtualRow.index}
                    />
                  );
                })}

                {paddingBottom > 0 ? (
                  <tr aria-hidden="true">
                    <td colSpan={columns.length + 2} style={{ height: paddingBottom }} />
                  </tr>
                ) : null}
              </>
            )}
          </tbody>
        </table>
      </Box>

      <div className="bg-white border-t border-gray-200">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between px-4 py-3 gap-3">
          <div className="flex items-center space-x-2 text-xs font-body text-gray-600">
            <span>Page: <strong>{page + 1}</strong></span>
            <span className="text-gray-300">|</span>
            <span>Rows: <strong>{sortedData.length}</strong></span>
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
