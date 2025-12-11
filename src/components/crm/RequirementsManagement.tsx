import { useState, useEffect, useCallback, useMemo, useRef, memo } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Search, Plus, Trash2, Download, Eye, Sparkles, Cog, Calendar, CheckCircle, XCircle, Lock, ArrowUpDown, X } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../contexts/ToastContext';
import { useSearchFilters } from '../../hooks/useSearchFilters';
import { debounce } from '../../lib/utils';
import { getRequirementsPage, deleteRequirement, type RequirementWithLogs } from '../../lib/api/requirements';
import type { Database, RequirementStatus } from '../../lib/database.types';
import { subscribeToRequirements, type RealtimeUpdate } from '../../lib/api/realtimeSync';
import { ErrorAlert } from '../common/ErrorAlert';
import { RequirementsReport } from './RequirementsReport';
import { RequirementDetailModal } from './RequirementDetailModal';

type Requirement = Database['public']['Tables']['requirements']['Row'];

// Icon components for status
const getStatusIcon = (status: RequirementStatus) => {
  const iconProps = 'w-4 h-4';
  switch (status) {
    case 'NEW': return <Sparkles className={iconProps} />;
    case 'IN_PROGRESS': return <Cog className={iconProps} />;
    case 'INTERVIEW': return <Calendar className={iconProps} />;
    case 'OFFER': return <CheckCircle className={iconProps} />;
    case 'REJECTED': return <XCircle className={iconProps} />;
    case 'CLOSED': return <Lock className={iconProps} />;
  }
};

const statusColors: Record<RequirementStatus, { badge: string; label: string }> = {
  NEW: { badge: 'bg-blue-100 text-blue-800', label: 'New' },
  IN_PROGRESS: { badge: 'bg-yellow-100 text-yellow-800', label: 'In Progress' },
  SUBMITTED: { badge: 'bg-cyan-100 text-cyan-800', label: 'Submitted' },
  INTERVIEW: { badge: 'bg-purple-100 text-purple-800', label: 'Interview' },
  OFFER: { badge: 'bg-green-100 text-green-800', label: 'Offer' },
  REJECTED: { badge: 'bg-red-100 text-red-800', label: 'Rejected' },
  CLOSED: { badge: 'bg-gray-100 text-gray-800', label: 'Closed' },
};

interface RequirementsManagementProps {
  onQuickAdd?: () => void;
  onCreateInterview?: (requirementId: string) => void;
}

// HighlightedText component
const HighlightedText = ({ text, searchTerm }: { text: string; searchTerm: string }) => {
  if (!searchTerm.trim()) return <>{text}</>;
  
  const parts = text.split(new RegExp(`(${searchTerm})`, 'gi'));
  return (
    <>
      {parts.map((part, index) =>
        part.toLowerCase() === searchTerm.toLowerCase() ? (
          <mark key={index} className="bg-yellow-200 font-semibold">
            {part}
          </mark>
        ) : (
          <span key={index}>{part}</span>
        )
      )}
    </>
  );
};

// RequirementCard component
const RequirementCardComponent = ({
  req,
  onViewDetails,
  onCreateInterview,
  onSetSelectedJD,
  onDelete,
  debouncedValue,
  statusBgMap,
  statusColors,
  getStatusIcon,
  isAdmin,
  measureElement,
}: {
  req: RequirementWithLogs;
  onViewDetails: (req: Requirement) => void;
  onCreateInterview?: (id: string) => void;
  onSetSelectedJD: (req: Requirement) => void;
  onDelete: () => void;
  debouncedValue: string;
  statusBgMap: Record<RequirementStatus, string>;
  statusColors: Record<RequirementStatus, { badge: string; label: string }>;
  getStatusIcon: (status: RequirementStatus) => JSX.Element | undefined;
  isAdmin: boolean;
  measureElement?: (el: HTMLElement | null) => void;
}) => {
  const reqNumber = req.requirement_number || 1;
  const cardRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!measureElement) return;
    // initial measure
    measureElement(cardRef.current);
    const ro = new ResizeObserver(() => {
      measureElement(cardRef.current);
    });
    if (cardRef.current) ro.observe(cardRef.current);
    return () => ro.disconnect();
  }, [measureElement, req.id]);

  return (
    <div
      ref={cardRef}
      className={`card-base overflow-hidden flex flex-col h-full animate-fade-in ${statusBgMap[req.status]}`}
    >
      {/* HEADER: Job Title & Status */}
      <div className="card-p-md pb-3 sm:pb-4 border-b border-gray-200">
        {/* Title with Requirement Number */}
        <div className="flex items-start gap-3 mb-3">
          <div className="flex-shrink-0 text-gray-400 mt-0.5">
            {getStatusIcon(req.status)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs sm:text-sm text-gray-500 font-semibold mb-1">
              Req No: <span className="font-bold text-blue-600">{reqNumber}</span>
            </p>
            <h3 className="card-title">
              <HighlightedText text={req.title} searchTerm={debouncedValue} />
            </h3>
          </div>
        </div>

        {/* Status Badge - Refined */}
        <div className="flex flex-wrap gap-2 mb-3">
          <span className="badge-primary">
            {statusColors[req.status].label}
          </span>
        </div>

        {/* Company - Secondary Info */}
        <p className="text-xs sm:text-sm text-gray-600">
          <span className="text-gray-500">Company:</span> <span className="font-semibold text-gray-800"><HighlightedText text={req.company || 'N/A'} searchTerm={debouncedValue} /></span>
        </p>
      </div>

      {/* KEY INFORMATION SECTION */}
      <div className="card-p-md py-3 sm:py-4 bg-white bg-opacity-50 border-b border-gray-100">
        <div className="grid grid-cols-2 gap-3">
          {/* Vendor Name */}
          {req.vendor_company && (
            <div className="flex flex-col min-w-0">
              <span className="text-xs text-gray-500 font-semibold mb-1 uppercase tracking-tight">Vendor</span>
              <span className="text-xs sm:text-sm font-semibold text-gray-900 truncate"><HighlightedText text={req.vendor_company} searchTerm={debouncedValue} /></span>
            </div>
          )}

          {/* Vendor Email */}
          {req.vendor_email && (
            <div className="flex flex-col min-w-0">
              <span className="text-xs text-gray-500 font-semibold mb-1 uppercase tracking-tight">Email</span>
              <span className="text-xs sm:text-sm font-semibold text-gray-900 truncate"><HighlightedText text={req.vendor_email} searchTerm={debouncedValue} /></span>
            </div>
          )}

          {/* Vendor Phone */}
          {req.vendor_phone && (
            <div className="flex flex-col min-w-0">
              <span className="text-xs text-gray-500 font-semibold mb-1 uppercase tracking-tight">Phone</span>
              <span className="text-xs sm:text-sm font-semibold text-gray-900 truncate"><HighlightedText text={req.vendor_phone} searchTerm={debouncedValue} /></span>
            </div>
          )}

          {/* Tech Stack */}
          {req.primary_tech_stack && (
            <div className="flex flex-col min-w-0">
              <span className="text-xs text-gray-500 font-semibold mb-1 uppercase tracking-tight">Tech</span>
              <span className="text-xs sm:text-sm font-semibold text-gray-900 truncate"><HighlightedText text={req.primary_tech_stack.split(',')[0].trim()} searchTerm={debouncedValue} /></span>
            </div>
          )}
        </div>
      </div>

      {/* METADATA SECTION */}
      <div className="card-p-md py-3 sm:py-4 border-b border-gray-100 flex-1">
        <div className="space-y-2 text-xs sm:text-sm">
          {req.duration && (
            <div className="flex items-center gap-2 text-gray-700">
              <span className="text-gray-400 text-sm">⏳</span>
              <span className="font-medium">{req.duration}</span>
            </div>
          )}
          {req.remote && (
            <div className="flex items-center gap-2 text-gray-700">
              <span className="text-gray-400 text-sm">🏠</span>
              <span className="font-medium">{req.remote}</span>
            </div>
          )}
          {req.rate && (
            <div className="flex items-center gap-2 text-gray-700">
              <span className="text-gray-400 text-sm">💰</span>
              <span className="font-medium">{req.rate}</span>
            </div>
          )}
        </div>
      </div>

      {/* ACTION BUTTONS - Equal Size, Aligned Horizontally */}
      <div className="card-p-md pt-3 sm:pt-4 bg-white bg-opacity-50">
        <div className="flex flex-col sm:flex-row gap-2 w-full">
          <button
            onClick={() => onViewDetails(req)}
            className="flex-1 h-9 sm:h-10 flex items-center justify-center gap-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 active:bg-blue-800 transition-all duration-200 shadow-sm hover:shadow-md text-xs font-semibold min-w-0"
            title="View full details"
          >
            <Eye className="w-4 h-4 flex-shrink-0" />
            <span className="hidden sm:inline truncate">View</span>
          </button>

          <button
            onClick={() => onCreateInterview?.(req.id)}
            className="flex-1 h-9 sm:h-10 flex items-center justify-center gap-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 active:bg-green-800 transition-all duration-200 shadow-sm hover:shadow-md text-xs font-semibold min-w-0"
            title="Create interview for this requirement"
          >
            <Calendar className="w-4 h-4 flex-shrink-0" />
            <span className="hidden sm:inline truncate">Interview</span>
          </button>

          {req.description && (
            <button
              onClick={() => onSetSelectedJD(req)}
              className="flex-1 h-9 sm:h-10 flex items-center justify-center gap-1.5 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 text-xs font-semibold min-w-0"
              title="View job description"
            >
              <span className="text-sm flex-shrink-0">📄</span>
              <span className="hidden sm:inline truncate">JD</span>
            </button>
          )}

          {isAdmin && (
            <button
              onClick={onDelete}
              className="flex-1 h-9 sm:h-10 flex items-center justify-center gap-1.5 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-red-50 hover:border-red-300 hover:text-red-700 transition-all duration-200 text-xs font-semibold min-w-0"
              title="Delete requirement"
            >
              <Trash2 className="w-4 h-4 flex-shrink-0" />
              <span className="hidden sm:inline truncate">Delete</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

const RequirementCard = memo(RequirementCardComponent);

// ⚡ Virtualized Requirements List using TanStack React Virtual
// Row-based multi-column virtualization: each virtual item is a "row" containing N cards
const VirtualizedRequirementsList = ({
  requirements,
  onViewDetails,
  onCreateInterview,
  onSetSelectedJD,
  onDelete,
  debouncedValue,
  statusBgMap,
  statusColors,
  getStatusIcon,
  isAdmin,
  loadMore,
  hasMore,
  isLoading,
}: {
  requirements: RequirementWithLogs[];
  onViewDetails: (req: Requirement) => void;
  onCreateInterview?: (id: string) => void;
  onSetSelectedJD: (req: Requirement) => void;
  onDelete: () => void;
  debouncedValue: string;
  statusBgMap: Record<RequirementStatus, string>;
  statusColors: Record<RequirementStatus, { badge: string; label: string }>;
  getStatusIcon: (status: RequirementStatus) => JSX.Element | undefined;
  isAdmin: boolean;
  loadMore: () => void;
  hasMore: boolean;
  isLoading: boolean;
}) => {
  const parentRef = useRef<HTMLDivElement>(null);

  // Responsive column detection to match the grid used in non-virtualized mode
  const [columns, setColumns] = useState<number>(1);
  useEffect(() => {
    const calcColumns = () => {
      const w = typeof window !== 'undefined' ? window.innerWidth : 1024;
      if (w >= 1280) setColumns(4);
      else if (w >= 1024) setColumns(3);
      else if (w >= 640) setColumns(2);
      else setColumns(1);
    };
    calcColumns();
    window.addEventListener('resize', calcColumns);
    return () => window.removeEventListener('resize', calcColumns);
  }, []);

  const itemsPerRow = Math.max(1, columns);
  const rowCount = Math.max(0, Math.ceil(requirements.length / itemsPerRow));
  const estimatedRowHeight = 560;

  const virtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: () => parentRef.current,
    estimateSize: () => estimatedRowHeight,
    measureElement: (el: Element | null) => {
      if (!el) return estimatedRowHeight;
      return (el as HTMLElement).getBoundingClientRect().height || estimatedRowHeight;
    },
    overscan: 6,
  });

  const virtualItems = virtualizer.getVirtualItems();

  // Keep a map of ResizeObservers for each virtual row so we can re-measure when size changes
  const rowObserversRef = useRef<Map<number, ResizeObserver>>(new Map());

  // Cleanup observers on unmount
  useEffect(() => {
    const observers = rowObserversRef.current;
    return () => {
      observers.forEach((ro) => ro.disconnect());
      observers.clear();
    };
  }, []);

  // Infinite load: when the last visible row approaches the end, trigger loadMore
  useEffect(() => {
    if (!hasMore || isLoading) return;
    if (!virtualItems.length) return;
    const lastVisible = virtualItems[virtualItems.length - 1];
    if (lastVisible && lastVisible.index >= rowCount - 1 - 2) {
      loadMore();
    }
  }, [virtualItems, rowCount, hasMore, isLoading, loadMore]);

  return (
    <div ref={parentRef} className="w-full max-h-[calc(100vh-200px)] overflow-y-auto overflow-x-hidden">
      <div style={{ height: `${virtualizer.getTotalSize()}px`, width: '100%', position: 'relative' }}>
        {virtualItems.map((virtualRow) => {
          const rowIndex = virtualRow.index;
          const startIdx = rowIndex * itemsPerRow;

          return (
            <div
              key={virtualRow.key}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                transform: `translateY(${virtualRow.start}px)`,
              }}
              className="px-4 py-4"
              ref={(el) => {
                // Attach a ResizeObserver to each virtual row so we re-measure when its height changes
                const existing = rowObserversRef.current.get(rowIndex);
                if (!el) {
                  if (existing) {
                    existing.disconnect();
                    rowObserversRef.current.delete(rowIndex);
                  }
                  return;
                }

                // Measure immediately
                virtualizer.measureElement(el as HTMLElement | null);

                // Disconnect previous observer for this row (if any)
                if (existing) existing.disconnect();

                // Create new ResizeObserver and observe
                const ro = new ResizeObserver(() => {
                  virtualizer.measureElement(el as HTMLElement | null);
                });
                ro.observe(el);
                rowObserversRef.current.set(rowIndex, ro);
              }}
            >
              <div style={{ display: 'grid', gridTemplateColumns: `repeat(${itemsPerRow}, minmax(0, 1fr))`, gap: '1rem' }}>
                {Array.from({ length: itemsPerRow }).map((_, colIndex) => {
                  const idx = startIdx + colIndex;
                  const req = requirements[idx];
                  if (!req) {
                    return <div key={`empty-${rowIndex}-${colIndex}`} />;
                  }

                  return (
                    <div key={req.id} className="w-full h-full">
                      <RequirementCard
                        req={req}
                        onViewDetails={onViewDetails}
                        onCreateInterview={onCreateInterview}
                        onSetSelectedJD={onSetSelectedJD}
                        onDelete={onDelete}
                        debouncedValue={debouncedValue}
                        statusBgMap={statusBgMap}
                        statusColors={statusColors}
                        getStatusIcon={getStatusIcon}
                        isAdmin={isAdmin}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export const RequirementsManagement = ({ onQuickAdd, onCreateInterview }: RequirementsManagementProps) => {
  const { user, isAdmin } = useAuth();
  const { showToast } = useToast();
  const { filters: savedFilters, updateFilters, clearFilters, isLoaded } = useSearchFilters();
  
  const [requirements, setRequirements] = useState<RequirementWithLogs[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<{ title: string; message: string } | null>(null);
  const [searchTerm, setSearchTerm] = useState(savedFilters?.searchTerm || '');
  const [debouncedValue, setDebouncedValue] = useState('');
  const [filterStatus, setFilterStatus] = useState<RequirementStatus | 'ALL'>((savedFilters?.filterStatus as RequirementStatus | 'ALL') || 'ALL');
  const [sortBy, setSortBy] = useState<'date' | 'company' | 'daysOpen'>((savedFilters?.sortBy as 'date' | 'company' | 'daysOpen') || 'date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>((savedFilters?.sortOrder as 'asc' | 'desc') || 'desc');
  const [page, setPage] = useState(0);
  const [totalResults, setTotalResults] = useState<number | null>(null);
  const [useSyntheticData, setUseSyntheticData] = useState(false);
  const [syntheticCount] = useState(10000);
  const [showReport, setShowReport] = useState(false);
  const [selectedRequirement, setSelectedRequirement] = useState<Requirement | null>(null);
  const [selectedJDRequirement, setSelectedJDRequirement] = useState<Requirement | null>(null);
  const [selectedCreatedBy, setSelectedCreatedBy] = useState<string | null>(null);
  const [selectedUpdatedBy, setSelectedUpdatedBy] = useState<string | null>(null);
  // Advanced filtering state
  const [minRate, setMinRate] = useState(savedFilters?.minRate || '');
  const [maxRate, setMaxRate] = useState(savedFilters?.maxRate || '');
  const [remoteFilter, setRemoteFilter] = useState<'ALL' | 'REMOTE' | 'ONSITE'>((savedFilters?.remoteFilter as 'ALL' | 'REMOTE' | 'ONSITE') || 'ALL');
  const [dateRange, setDateRange] = useState<{ from: string; to: string }>({ 
    from: savedFilters?.dateRangeFrom || '', 
    to: savedFilters?.dateRangeTo || '' 
  });
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const pageSize = 50;

  // Dev helper: generate synthetic requirements for stress testing
  const generateSyntheticRequirements = useCallback((count: number) => {
    const statuses: RequirementStatus[] = ['NEW','IN_PROGRESS','SUBMITTED','INTERVIEW','OFFER','REJECTED','CLOSED'];
    return Array.from({ length: count }).map((_, i) => {
      const id = `synthetic-${i}`;
      const status = statuses[i % statuses.length];
      const title = `Synthetic Requirement ${i + 1}`;
      const company = `Company ${Math.floor(i % 500) + 1}`;
      const createdAt = new Date(Date.now() - (i * 1000 * 60)).toISOString();
      return ({
        id,
        user_id: 'synthetic',
        requirement_number: i + 1,
        title,
        company,
        description: `This is a synthetic description for ${title}`,
        location: 'Remote',
        status: status as RequirementStatus,
        vendor_company: `Vendor ${i % 50}`,
        vendor_email: `vendor${i}@example.com`,
        vendor_phone: `+1-555-${String(1000 + (i % 9000)).padStart(4,'0')}`,
        primary_tech_stack: ['React','TypeScript','Node.js','AWS'][i % 4],
        duration: '3 months',
        remote: 'Yes',
        rate: `$${50 + (i % 150)}`,
        created_at: createdAt,
        updated_at: createdAt,
        created_by: 'synthetic',
        updated_by: 'synthetic',
        logs: [],
      } as unknown) as RequirementWithLogs;
    });
  }, []);

  // Initialize debounced search with saved value
  useEffect(() => {
    if (isLoaded && savedFilters?.searchTerm) {
      setDebouncedValue(savedFilters.searchTerm);
    }
  }, [isLoaded, savedFilters]);

  // If synthetic mode is enabled, ensure loadRequirements doesn't overwrite synthetic data
  useEffect(() => {
    if (!useSyntheticData) return;
    // keep totalResults in sync if requirements length changes
    setTotalResults(requirements.length);
  }, [useSyntheticData, requirements.length]);

  // Save filters only on debounced search changes - cleanup timeout properly
  useEffect(() => {
    if (!isLoaded) return;
    
    const timeoutId = setTimeout(() => {
      updateFilters({
        searchTerm: debouncedValue,
        sortBy,
        sortOrder,
        filterStatus: filterStatus.toString(),
        minRate,
        maxRate,
        remoteFilter,
        dateRangeFrom: dateRange.from,
        dateRangeTo: dateRange.to,
      });
    }, 100);

    return () => clearTimeout(timeoutId);
  }, [debouncedValue, sortBy, sortOrder, filterStatus, minRate, maxRate, remoteFilter, dateRange, isLoaded, updateFilters]);

  const handleDebouncedSearch = useMemo(
    () => debounce((value: unknown) => {
      setDebouncedValue(value as string);
      setPage(0);
    }, 300),
    []
  );

  // Enhanced search function - searches across multiple fields including phone numbers and requirement number
  const isRateInRange = useCallback((rate: string | null): boolean => {
    if (!rate) return true;
    const rateNum = parseFloat(rate.replace(/[^0-9.-]/g, ''));
    if (isNaN(rateNum)) return true;
    
    if (minRate && parseFloat(minRate) > rateNum) return false;
    if (maxRate && parseFloat(maxRate) < rateNum) return false;
    return true;
  }, [minRate, maxRate]);

  // Helper to check if date is in range - with validation
  const isDateInRange = useCallback((createdAt: string): boolean => {
    if (!dateRange.from && !dateRange.to) return true;
    
    try {
      const created = new Date(createdAt).getTime();
      if (isNaN(created)) return true; // Skip invalid dates
      
      if (dateRange.from) {
        const fromDate = new Date(dateRange.from).getTime();
        if (!isNaN(fromDate) && fromDate > created) return false;
      }
      
      if (dateRange.to) {
        const toDate = new Date(dateRange.to).getTime();
        if (!isNaN(toDate) && toDate < created) return false;
      }
      
      return true;
    } catch {
      return true; // Skip if there's an error
    }
  }, [dateRange]);

  // Helper to check remote preference
  const matchesRemoteFilter = useCallback((remote: string | null): boolean => {
    if (remoteFilter === 'ALL') return true;
    if (!remote) return true;
    
    const isRemote = remote.toLowerCase().includes('remote') || remote.toLowerCase().includes('yes');
    return remoteFilter === 'REMOTE' ? isRemote : !isRemote;
  }, [remoteFilter]);

  const lastQueryKeyRef = useRef<string>('');

  const loadRequirements = useCallback(async (opts?: { newPage?: number; force?: boolean; isLoadMore?: boolean }) => {
    if (!user) return;
    const requestedPage = opts?.newPage ?? page;
    const isLoadMore = opts?.isLoadMore ?? false;
    const queryKey = JSON.stringify({
      page: requestedPage,
      search: debouncedValue,
      status: filterStatus,
      dateFrom: dateRange.from,
      dateTo: dateRange.to,
      sortBy,
      sortOrder,
      userId: user.id,
      // include client-side advanced filters in the query key so changes force a reload
      minRate,
      maxRate,
      remoteFilter,
    });

    if (!opts?.force && lastQueryKeyRef.current === queryKey) {
      return; // Skip duplicate fetch when nothing changed
    }

    try {
      if (requestedPage === 0) {
        setLoading(true);
      }

      setError(null);
      lastQueryKeyRef.current = queryKey;

      const orderByColumn = sortBy === 'date' ? 'created_at' : sortBy === 'company' ? 'company' : 'created_at';

      const result = await getRequirementsPage({
        userId: user.id,
        limit: pageSize,
        offset: requestedPage * pageSize,
        search: debouncedValue,
        status: filterStatus,
        dateFrom: dateRange.from || undefined,
        dateTo: dateRange.to || undefined,
        orderBy: orderByColumn,
        orderDir: sortOrder,
      });

      if (result.success && result.requirements) {
        // If this is a "Load More" action, append results; otherwise replace
        if (isLoadMore) {
          setRequirements(prev => [...prev, ...(result.requirements || [])]);
        } else {
          setRequirements(result.requirements || []);
        }
        setTotalResults(result.total ?? null);
      } else {
        setError({ title: 'Failed to load requirements', message: result.error || 'An unexpected error occurred' });
      }
    } catch (err) {
      setError({ title: 'Error', message: err instanceof Error ? err.message : 'Failed to load requirements' });
    } finally {
      setLoading(false);
    }
  }, [user, pageSize, debouncedValue, filterStatus, dateRange.from, dateRange.to, sortBy, sortOrder, page, minRate, maxRate, remoteFilter]);

  // Effect to handle filter changes - resets to page 0
  useEffect(() => {
    setPage(0);
  }, [debouncedValue, filterStatus, sortBy, sortOrder, minRate, maxRate, remoteFilter, dateRange.from, dateRange.to]);

  // Effect to handle page changes (for Load More functionality)
  useEffect(() => {
    if (useSyntheticData) return; // skip server loads when using synthetic data
    loadRequirements({ newPage: page, isLoadMore: page > 0 });
  }, [page, loadRequirements, useSyntheticData]);

  useEffect(() => {
    // Subscribe to real-time changes
    let unsubscribe: (() => void) | undefined;
    if (user) {
      unsubscribe = subscribeToRequirements(user.id, (update: RealtimeUpdate<Requirement>) => {
        if (update.type === 'INSERT') {
          // insert at front if it matches current search/status filters roughly
          // Server-side filtering is authoritative; here we add to current page if it appears relevant
          const matchesSearch = !debouncedValue || (update.record.title || '').toLowerCase().includes(debouncedValue.toLowerCase());
          const matchesStatus = filterStatus === 'ALL' || update.record.status === filterStatus;
          if (matchesSearch && matchesStatus) {
            setRequirements(prev => [update.record, ...prev]);
            setTotalResults(prev => (prev !== null ? prev + 1 : null));
          }
          showToast({
            type: 'info',
            title: 'New requirement',
            message: `"${update.record.title}" has been added`,
          });
        } else if (update.type === 'UPDATE') {
          setRequirements(prev => prev.map(r => (r.id === update.record.id ? update.record : r)));
          // Show notification if not the current user editing
          if (selectedRequirement?.id !== update.record.id) {
            showToast({
              type: 'info',
              title: 'Requirement updated',
              message: 'Changes have been made to a requirement',
            });
          }
        } else if (update.type === 'DELETE') {
          setRequirements(prev => prev.filter(r => r.id !== update.record.id));
          setTotalResults(prev => (prev !== null ? Math.max(0, prev - 1) : null));
          if (selectedRequirement?.id === update.record.id) {
            setSelectedRequirement(null);
          }
          showToast({
            type: 'info',
            title: 'Requirement deleted',
            message: 'A requirement has been removed',
          });
        }
      });
    }

    return () => {
      unsubscribe?.();
    };
  }, [user, selectedRequirement?.id, showToast, debouncedValue, filterStatus]);

  const handleDelete = useCallback(async () => {
    const requirement = selectedRequirement;
    if (!requirement) return;

    if (!isAdmin) {
      showToast({
        type: 'error',
        title: 'Permission denied',
        message: 'Only admins can delete requirements.',
      });
      return;
    }

    if (confirm('Are you sure you want to delete this requirement? This action cannot be undone.')) {
      try {
        const result = await deleteRequirement(requirement.id, user?.id);
        if (result.success) {
            setSelectedRequirement(null);
            showToast({ type: 'success', title: 'Requirement deleted', message: 'The requirement has been removed.' });
            // reload first page
            setPage(0);
            await loadRequirements({ newPage: 0 });
        } else {
          showToast({ type: 'error', title: 'Failed to delete', message: result.error || 'Unknown error' });
        }
      } catch {
        showToast({ type: 'error', title: 'Error', message: 'Failed to delete requirement' });
      }
    }
  }, [selectedRequirement, isAdmin, showToast, loadRequirements, user?.id]);

  const handleViewDetails = (req: Requirement) => {
    setSelectedRequirement(req);
    setSelectedCreatedBy(req.created_by || null);
    setSelectedUpdatedBy(req.updated_by || null);
  };

  const filteredRequirements = useMemo(() => {
    // After switching to server-side pagination, `requirements` contains the current pages fetched.
    // We still apply lightweight client-side filters that aren't yet supported server-side (min/max rate, remote)
    const filtered = requirements.filter(req => {
      if (!req) return false;
      // Apply client-side advanced filters not handled by server
      const rateMatches = isRateInRange(req.rate);
      const dateMatches = isDateInRange(req.created_at);
      const remoteMatches = matchesRemoteFilter(req.remote);
      return rateMatches && dateMatches && remoteMatches;
    });

    return filtered;
  }, [requirements, isRateInRange, isDateInRange, matchesRemoteFilter]);

  const hasMoreRequirements = totalResults !== null ? requirements.length < totalResults : false;

  const handleLoadMore = () => {
    // Load next page using server-side pagination
    // The effect above will listen to page changes and call loadRequirements
    setPage(prevPage => prevPage + 1);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Requirements Management</h2>
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <p className="text-gray-500">Loading requirements...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Requirements Management</h2>
        <ErrorAlert
          title={error.title}
          message={error.message}
          onRetry={() => loadRequirements()}
          onDismiss={() => setError(null)}
          retryLabel="Try Again"
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Sticky Header Section */}
      <div className="sticky top-0 z-40 bg-white pb-6 -mx-6 px-6 pt-6 border-b border-gray-200 shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Requirements Management</h2>
          <div className="flex gap-2 w-full sm:w-auto">
            <button
              onClick={() => setShowReport(true)}
              className="flex-1 sm:flex-none px-4 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 hover:border-gray-400 transition-all shadow-sm hover:shadow-md flex items-center justify-center gap-2 text-sm"
            >
              <Download className="w-4 h-4" />
              Report
            </button>
            <button
              onClick={onQuickAdd}
              className="flex-1 sm:flex-none px-4 py-2.5 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 active:bg-blue-800 transition-all shadow-sm hover:shadow-md flex items-center justify-center gap-2 text-sm"
            >
              <Plus className="w-4 h-4" />
              Create Requirement
            </button>
            {/* Dev-only synthetic data toggle */}
            <button
              onClick={() => {
                if (!useSyntheticData) {
                  const items = generateSyntheticRequirements(syntheticCount);
                  setRequirements(items);
                  setTotalResults(items.length);
                  setUseSyntheticData(true);
                  setPage(0);
                } else {
                  setUseSyntheticData(false);
                  setPage(0);
                  // reload from server
                  loadRequirements({ newPage: 0, force: true });
                }
              }}
              title="Toggle synthetic 10K test data"
              className={`px-3 py-2 sm:py-2.5 border rounded-lg text-sm font-medium ${useSyntheticData ? 'bg-yellow-100 border-yellow-300 text-yellow-800' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}
            >
              Dev: Synthetic
            </button>
          </div>
        </div>

        {/* Search and Filter */}
        <div className="flex flex-col gap-4">
          {/* Main Search Bar with Status Indicator */}
          <div className="flex flex-col sm:flex-row gap-4 flex-wrap">
            <div className="flex-1 min-w-[250px] relative">
              <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by title, company, tech stack, vendor, phone..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  handleDebouncedSearch(e.target.value);
                }}
                className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg text-sm"
                title="Search across title, company, tech stack, vendor name, phone number, email, and job description"
              />
              {searchTerm && (
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setDebouncedValue('');
                  }}
                  className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                  title="Clear search"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
              {debouncedValue && (
                <div className="absolute -bottom-7 left-0 text-xs text-gray-500">
                  Searching for: <span className="font-semibold text-gray-700">"{debouncedValue}"</span>
                </div>
              )}
            </div>
            <select
              value={filterStatus}
              onChange={(e) => {
                setFilterStatus(e.target.value as RequirementStatus | 'ALL');
              }}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm"
              title="Filter requirements by status"
            >
              <option value="ALL">All Statuses</option>
              <option value="NEW">New</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="SUBMITTED">Submitted</option>
              <option value="INTERVIEW">Interview</option>
              <option value="OFFER">Offer</option>
              <option value="REJECTED">Rejected</option>
              <option value="CLOSED">Closed</option>
            </select>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm"
              title="Sort requirements by selected criteria"
            >
              <option value="date">Sort by Date</option>
              <option value="company">Sort by Company</option>
              <option value="daysOpen">Sort by Days Open</option>
            </select>
            <button
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 flex items-center gap-1"
              title={`Sort ${sortOrder === 'asc' ? 'descending' : 'ascending'}`}
            >
              <ArrowUpDown className="w-4 h-4" />
              {sortOrder === 'asc' ? 'Asc' : 'Desc'}
            </button>
            <button
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className={`px-4 py-2 border rounded-lg text-sm font-medium transition-all ${
                showAdvancedFilters
                  ? 'bg-blue-50 border-blue-300 text-blue-700'
                  : 'border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
              title="Toggle advanced filters"
            >
              ⚙️ Filters {(minRate || maxRate || remoteFilter !== 'ALL' || dateRange.from || dateRange.to) && '✓'}
            </button>
          </div>

          {/* Advanced Filters Panel */}
          {showAdvancedFilters && (
            <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Rate Range */}
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-semibold text-gray-700 uppercase tracking-tight">Min Rate</label>
                  <input
                    type="text"
                    placeholder="e.g., 50"
                    value={minRate}
                    onChange={(e) => setMinRate(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    title="Minimum hourly/daily rate"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-semibold text-gray-700 uppercase tracking-tight">Max Rate</label>
                  <input
                    type="text"
                    placeholder="e.g., 150"
                    value={maxRate}
                    onChange={(e) => setMaxRate(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    title="Maximum hourly/daily rate"
                  />
                </div>

                {/* Remote Filter */}
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-semibold text-gray-700 uppercase tracking-tight">Work Type</label>
                  <select
                    value={remoteFilter}
                    onChange={(e) => setRemoteFilter(e.target.value as typeof remoteFilter)}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    title="Filter by remote/onsite preference"
                  >
                    <option value="ALL">All Types</option>
                    <option value="REMOTE">Remote</option>
                    <option value="ONSITE">On-site</option>
                  </select>
                </div>

                {/* Date Range - From */}
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-semibold text-gray-700 uppercase tracking-tight">From Date</label>
                  <input
                    type="date"
                    value={dateRange.from}
                    onChange={(e) => setDateRange({ ...dateRange, from: e.target.value })}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    title="Filter requirements created from this date"
                  />
                </div>

                {/* Date Range - To */}
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-semibold text-gray-700 uppercase tracking-tight">To Date</label>
                  <input
                    type="date"
                    value={dateRange.to}
                    onChange={(e) => setDateRange({ ...dateRange, to: e.target.value })}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    title="Filter requirements created until this date"
                  />
                </div>
              </div>

              {/* Clear Filters Button */}
              {(minRate || maxRate || remoteFilter !== 'ALL' || dateRange.from || dateRange.to || debouncedValue || filterStatus !== 'ALL') && (
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setDebouncedValue('');
                    setFilterStatus('ALL');
                    setMinRate('');
                    setMaxRate('');
                    setRemoteFilter('ALL');
                    setDateRange({ from: '', to: '' });
                    clearFilters();
                  }}
                  className="text-xs font-medium text-blue-600 hover:text-blue-700 underline"
                  title="Reset all advanced filters"
                >
                  Clear all filters
                </button>
              )}
            </div>
          )}

          {/* Active Filters Summary */}
          {(debouncedValue || filterStatus !== 'ALL' || (minRate || maxRate || remoteFilter !== 'ALL' || dateRange.from || dateRange.to)) && (
            <div className="text-xs text-gray-600 bg-gray-50 p-3 rounded flex items-center gap-2 flex-wrap">
              <span className="text-gray-500 font-medium">Active filters:</span>
              {debouncedValue && (
                <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded font-medium">
                  Search: "{debouncedValue}"
                </span>
              )}
              {filterStatus !== 'ALL' && (
                <span className="bg-indigo-100 text-indigo-800 px-2 py-1 rounded font-medium">
                  Status: {filterStatus}
                </span>
              )}
              {minRate && (
                <span className="bg-green-100 text-green-800 px-2 py-1 rounded font-medium">
                  Min: ${minRate}
                </span>
              )}
              {maxRate && (
                <span className="bg-green-100 text-green-800 px-2 py-1 rounded font-medium">
                  Max: ${maxRate}
                </span>
              )}
              {remoteFilter !== 'ALL' && (
                <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded font-medium">
                  {remoteFilter}
                </span>
              )}
              {dateRange.from && (
                <span className="bg-orange-100 text-orange-800 px-2 py-1 rounded font-medium">
                  From: {dateRange.from}
                </span>
              )}
              {dateRange.to && (
                <span className="bg-orange-100 text-orange-800 px-2 py-1 rounded font-medium">
                  To: {dateRange.to}
                </span>
              )}
              {filteredRequirements.length > 0 && (
                <span className="ml-auto font-semibold text-gray-700">
                  {filteredRequirements.length} result{filteredRequirements.length !== 1 ? 's' : ''}
                </span>
              )}
              <button
                onClick={() => {
                  setSearchTerm('');
                  setDebouncedValue('');
                  setFilterStatus('ALL');
                  setMinRate('');
                  setMaxRate('');
                  setRemoteFilter('ALL');
                  setDateRange({ from: '', to: '' });
                  clearFilters();
                  setShowAdvancedFilters(false);
                }}
                className="ml-auto text-xs font-medium text-red-600 hover:text-red-700 hover:bg-red-50 px-2 py-1 rounded transition"
                title="Clear all filters and reset search"
              >
                ✕ Clear All
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Requirements Grid - Virtualized when there are many items */}
      <div className="w-full">
        {filteredRequirements.length === 0 ? (
          <div className="text-center py-16 bg-gradient-to-b from-gray-50 to-white rounded-lg border border-gray-100 shadow-card">
            <Sparkles className="w-12 h-12 mx-auto text-gray-300 mb-4" />
            <p className="text-gray-700 font-semibold mb-2 text-lg">No requirements found</p>
            <p className="text-sm text-gray-500 mb-6">Create your first requirement to get started tracking job opportunities.</p>
            <button
              onClick={onQuickAdd}
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 active:bg-blue-800 transition-all shadow-sm hover:shadow-md"
            >
              <Plus className="w-5 h-5" />
              Create First Requirement
            </button>
          </div>
        ) : requirements.length > 100 ? (
          // Use virtualized list for large datasets
          <VirtualizedRequirementsList
            requirements={requirements}
            onViewDetails={handleViewDetails}
            onCreateInterview={onCreateInterview}
            onSetSelectedJD={setSelectedJDRequirement}
            onDelete={handleDelete}
            debouncedValue={debouncedValue}
            statusBgMap={{
              'NEW': 'status-new',
              'IN_PROGRESS': 'status-in-progress',
              'SUBMITTED': 'status-submitted',
              'INTERVIEW': 'status-interview',
              'OFFER': 'status-offer',
              'REJECTED': 'status-rejected',
              'CLOSED': 'status-closed',
            }}
            statusColors={statusColors}
            getStatusIcon={getStatusIcon}
            isAdmin={isAdmin}
            loadMore={handleLoadMore}
            hasMore={hasMoreRequirements}
            isLoading={loading}
          />
        ) : (
          // Standard grid for smaller datasets
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-responsive">
            {requirements.map((req: RequirementWithLogs) => (
              <RequirementCard
                key={req.id}
                req={req}
                onViewDetails={handleViewDetails}
                onCreateInterview={onCreateInterview}
                onSetSelectedJD={setSelectedJDRequirement}
                onDelete={handleDelete}
                debouncedValue={debouncedValue}
                statusBgMap={{
                  'NEW': 'status-new',
                  'IN_PROGRESS': 'status-in-progress',
                  'SUBMITTED': 'status-submitted',
                  'INTERVIEW': 'status-interview',
                  'OFFER': 'status-offer',
                  'REJECTED': 'status-rejected',
                  'CLOSED': 'status-closed',
                }}
                statusColors={statusColors}
                getStatusIcon={getStatusIcon}
                isAdmin={isAdmin}
              />
            ))}
          </div>
        )}
      </div>


      {/* Load More Section */}
      {hasMoreRequirements && (
        <div className="flex flex-col items-center gap-4 py-8">
          <p className="text-sm text-gray-600">
            Showing <span className="font-semibold">{requirements.length}</span> of <span className="font-semibold">{totalResults ?? 0}</span> requirements
          </p>
          <button
            onClick={handleLoadMore}
            disabled={loading}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 active:bg-blue-800 transition-all shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Loading...
              </>
            ) : (
              <>
                Load More
              </>
            )}
          </button>
        </div>
      )}

      {/* JD Modal */}
      {selectedJDRequirement && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-2 sm:p-4 lg:p-6">
          <div className="bg-white rounded-lg sm:rounded-2xl shadow-2xl max-w-2xl sm:max-w-3xl lg:max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 sm:p-6 lg:p-8 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
              <div className="flex-1 pr-3 sm:pr-4 min-w-0">
                <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 mb-1 truncate">{selectedJDRequirement.title}</h2>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full text-xs font-semibold ${statusColors[selectedJDRequirement.status].badge}`}>
                    {statusColors[selectedJDRequirement.status].label}
                  </span>
                  {selectedJDRequirement.company && (
                    <span className="text-xs sm:text-sm text-gray-600 truncate">{selectedJDRequirement.company}</span>
                  )}
                </div>
              </div>
              <button
                onClick={() => setSelectedJDRequirement(null)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded-lg transition flex-shrink-0 ml-2"
                title="Close modal"
              >
                <XCircle className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
              <div className="prose prose-sm max-w-none">
                <div className="text-gray-700 whitespace-pre-wrap leading-relaxed text-xs sm:text-sm lg:text-base">
                  {selectedJDRequirement.description}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-3 sm:p-4 lg:p-6 border-t border-gray-200 bg-gray-50 flex justify-end">
              <button
                onClick={() => setSelectedJDRequirement(null)}
                className="px-4 sm:px-6 py-2 sm:py-2.5 bg-gray-300 text-gray-800 rounded-lg font-medium hover:bg-gray-400 transition text-xs sm:text-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      <RequirementDetailModal
        isOpen={selectedRequirement !== null}
        requirement={selectedRequirement}
        onClose={() => setSelectedRequirement(null)}
        onUpdate={loadRequirements}
        createdBy={selectedCreatedBy}
        updatedBy={selectedUpdatedBy}
      />

      {/* Report Modal */}
      {showReport && <RequirementsReport onClose={() => setShowReport(false)} />}
    </div>
  );
};
