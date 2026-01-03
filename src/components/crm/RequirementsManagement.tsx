import { useState, useEffect, useCallback, useMemo, memo, lazy, useRef } from 'react';
import { Download, XCircle, ArrowUpDown, X, SlidersHorizontal, Zap, Settings, Filter } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useOfflineCache } from '../../hooks/useOfflineCache';
import { useToast } from '../../contexts/ToastContext';
import { useSearchFilters } from '../../hooks/useSearchFilters';
import { useRequirementsPage } from '../../hooks/useRequirementsPage';
import { deleteRequirement, type RequirementWithLogs } from '../../lib/api/requirements';
import type { Database, RequirementStatus } from '../../lib/database.types';
import { subscribeToRequirements, type RealtimeUpdate } from '../../lib/api/realtimeSync';
import { ErrorAlert } from '../common/ErrorAlert';
import { RequirementsTable } from './RequirementsTable';
import { JDParserDialog } from './JDParserDialog';
import { BatchJDParserDialog } from './BatchJDParserDialog';
import { useSyncQueue } from '../../hooks/useSyncStatus';
import { processSyncQueue } from '../../lib/offlineDB';
import type { JdExtractionResult } from '../../lib/jdParser';
import SearchIcon from '@mui/icons-material/Search';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import InputBase from '@mui/material/InputBase';
import Button from '@mui/material/Button';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import Chip from '@mui/material/Chip';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import Divider from '@mui/material/Divider';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Popover from '@mui/material/Popover';
import Portal from '@mui/material/Portal';
import Tooltip from '@mui/material/Tooltip';
import { styled } from '@mui/material/styles';

const RequirementsReport = lazy(() => import('./RequirementsReport').then((m) => ({ default: m.RequirementsReport })));
const RequirementDetailModal = lazy(() => import('./RequirementDetailModal').then((m) => ({ default: m.RequirementDetailModal })));
const ConfirmDialog = lazy(() => import('../common/ConfirmDialog').then((m) => ({ default: m.ConfirmDialog })));

type Requirement = Database['public']['Tables']['requirements']['Row'];

const statusColors: Record<RequirementStatus, { badge: string; label: string }> = {
  NEW: { badge: 'bg-primary-50 text-primary-800', label: 'New' },
  IN_PROGRESS: { badge: 'bg-yellow-100 text-yellow-800', label: 'In Progress' },
  SUBMITTED: { badge: 'bg-cyan-100 text-cyan-800', label: 'Submitted' },
  INTERVIEW: { badge: 'bg-purple-100 text-purple-800', label: 'Interview' },
  OFFER: { badge: 'bg-green-100 text-green-800', label: 'Offer' },
  REJECTED: { badge: 'bg-red-100 text-red-800', label: 'Rejected' },
  CLOSED: { badge: 'bg-gray-100 text-gray-800', label: 'Closed' },
};

interface RequirementsManagementProps {
  onCreateInterview?: (requirementId: string) => void;
  onParsedJDData?: (extraction: JdExtractionResult, cleanedText: string) => void;
  toolbarPortalTargetId?: string;
}

const Search = styled('div')({
  position: 'relative',
  display: 'flex',
  alignItems: 'center',
  maxWidth: 280,
  width: '100%',
  height: 36,
  borderRadius: 6,
  backgroundColor: '#ffffff',
  border: '1px solid #d1d5db',
  transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
  paddingLeft: 8,
  '&:focus-within': {
    borderColor: '#007bff',
    boxShadow: '0 0 0 3px rgba(0, 123, 255, 0.1)',
  },
});

const SearchIconWrapper = styled('div')({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: '#6b7280',
  marginRight: 6,
  '& svg': {
    width: 18,
    height: 18,
  },
});

const SearchClearWrapper = styled('div')({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  marginLeft: 'auto',
  marginRight: 3,
  '& button': {
    color: '#6b7280',
    width: 28,
    height: 28,
    transition: 'color 0.2s ease',
  },
  '& button:hover': {
    color: '#007bff',
  },
  '& svg': {
    width: 16,
    height: 16,
  },
});

const StyledInputBase = styled(InputBase)({
  flex: 1,
  height: '100%',
  backgroundColor: 'transparent',
  color: '#1f2937',
  '& .MuiInputBase-input': {
    padding: '6px 8px',
    fontSize: 13,
    fontWeight: 400,
    color: 'inherit',
    '::placeholder': {
      color: '#9ca3af',
      opacity: 1,
    },
  },
});

export const RequirementsManagement = memo(({ onCreateInterview, onParsedJDData, toolbarPortalTargetId }: RequirementsManagementProps) => {
  const { user, isAdmin } = useAuth();
  const { isOnline, queueOfflineOperation } = useOfflineCache();
  const { showToast } = useToast();
  const { filters: savedFilters, updateFilters, clearFilters, isLoaded } = useSearchFilters();

  const [searchTerm, setSearchTerm] = useState(savedFilters?.searchTerm || '');
  const abortControllerRef = useRef<AbortController | null>(null);
  const [filterStatus, setFilterStatus] = useState<RequirementStatus | 'ALL'>((savedFilters?.filterStatus as RequirementStatus | 'ALL') || 'ALL');
  const [sortBy, setSortBy] = useState<'date' | 'company' | 'daysOpen'>((savedFilters?.sortBy as 'date' | 'company' | 'daysOpen') || 'date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>((savedFilters?.sortOrder as 'asc' | 'desc') || 'desc');
  const [page, setPage] = useState(0);
  const [isErrorDismissed, setIsErrorDismissed] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [selectedRequirement, setSelectedRequirement] = useState<Requirement | null>(null);
  const [selectedJDRequirement, setSelectedJDRequirement] = useState<Requirement | null>(null);
  const [selectedCreatedBy, setSelectedCreatedBy] = useState<string | null>(null);
  const [selectedUpdatedBy, setSelectedUpdatedBy] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [requirementToDelete, setRequirementToDelete] = useState<Requirement | null>(null);
  const [showJDParser, setShowJDParser] = useState(false);
  const [showBatchJDParser, setShowBatchJDParser] = useState(false);

  // Sync queue UI state
  const { pendingItems, updateItemStatus, clearSynced, pendingCount } = useSyncQueue();
  const [isProcessingQueue, setIsProcessingQueue] = useState(false);
  const [showSyncPanel, setShowSyncPanel] = useState(false);

  useEffect(() => {
    const openHandler = () => setShowSyncPanel(true);
    window.addEventListener('open-sync-queue', openHandler);
    return () => window.removeEventListener('open-sync-queue', openHandler);
  }, []);

  // Advanced filtering state
  const [minRate, setMinRate] = useState(savedFilters?.minRate || '');
  const [maxRate, setMaxRate] = useState(savedFilters?.maxRate || '');
  const [remoteFilter, setRemoteFilter] = useState<'ALL' | 'REMOTE' | 'ONSITE'>((savedFilters?.remoteFilter as 'ALL' | 'REMOTE' | 'ONSITE') || 'ALL');
  const [dateRange, setDateRange] = useState<{ from: string; to: string }>({
    from: savedFilters?.dateRangeFrom || '',
    to: savedFilters?.dateRangeTo || ''
  });
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [rowsPerPage, setRowsPerPage] = useState<number>(100);
  const pageSize = rowsPerPage;

  const dateFromIso = useMemo(() => {
    return dateRange.from ? new Date(`${dateRange.from}T00:00:00`).toISOString() : undefined;
  }, [dateRange.from]);

  const dateToIso = useMemo(() => {
    return dateRange.to ? new Date(`${dateRange.to}T23:59:59.999`).toISOString() : undefined;
  }, [dateRange.to]);

  const requirementsSWR = useRequirementsPage({
    userId: user?.id,
    page,
    pageSize,
    search: searchTerm,
    status: filterStatus,
    dateFrom: dateFromIso,
    dateTo: dateToIso,
    sortBy,
    sortOrder,
    minRate,
    maxRate,
    remoteFilter,
  });

  const mutateRequirements = requirementsSWR.mutate;

  const requirements = useMemo(
    () => (requirementsSWR.data?.requirements || []) as RequirementWithLogs[],
    [requirementsSWR.data?.requirements]
  );
  const hasNextPage = requirementsSWR.data?.hasNextPage || false;
  const isFetchingPage = requirementsSWR.isValidating;
  const loading = requirementsSWR.isLoading;
  const error = !isErrorDismissed && requirementsSWR.error
    ? {
      title: 'Failed to load requirements',
      message: requirementsSWR.error instanceof Error ? requirementsSWR.error.message : String(requirementsSWR.error),
    }
    : null;

  useEffect(() => {
    if (requirementsSWR.error) {
      setIsErrorDismissed(false);
    }
  }, [requirementsSWR.error]);

  const [toolsAnchorEl, setToolsAnchorEl] = useState<HTMLElement | null>(null);
  const toolsOpen = Boolean(toolsAnchorEl);
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<RequirementStatus | 'ALL'>('ALL');
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const [toolbarTarget, setToolbarTarget] = useState<HTMLElement | null>(() => {
    if (!toolbarPortalTargetId || typeof document === 'undefined') return null;
    return document.getElementById(toolbarPortalTargetId) as HTMLElement | null;
  });

  useEffect(() => {
    if (!toolbarPortalTargetId) {
      setToolbarTarget(null);
      return;
    }
    setToolbarTarget(document.getElementById(toolbarPortalTargetId) as HTMLElement | null);
  }, [toolbarPortalTargetId]);

  const isToolbarPortaled = Boolean(toolbarTarget);

  const toolbar = (
    <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ width: { xs: '100%', sm: 'auto' } }}>
      <Box sx={{ flex: { xs: 1, sm: 'unset' } }} />
    </Stack>
  );

  const tableSearch = (
    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
      <Search role="search" aria-label="Search requirements">
        <SearchIconWrapper>
          <SearchIcon fontSize="small" />
        </SearchIconWrapper>
        <StyledInputBase
          inputRef={searchInputRef}
          value={searchTerm}
          onChange={(e) => {
            handleSearchChange(e.target.value);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              e.stopPropagation();
            }
            if (e.key === 'Escape') {
              if (searchTerm) {
                setSearchTerm('');
              }
              searchInputRef.current?.blur();
            }
          }}
          placeholder="Search…"
          inputProps={{
            'aria-label': 'Search requirements',
          }}
        />

        {searchTerm && (
          <SearchClearWrapper>
            <IconButton
              size="small"
              onClick={() => {
                if (searchTerm) {
                  setSearchTerm('');
                }
              }}
              aria-label="Clear search"
              title="Clear search"
            >
              <X className="w-5 h-5" />
            </IconButton>
          </SearchClearWrapper>
        )}
      </Search>
      <Tooltip title="Tools">
        <IconButton
          color="inherit"
          onClick={(e) => setToolsAnchorEl(e.currentTarget)}
          size="small"
        >
          <SlidersHorizontal className="w-4 h-4" />
        </IconButton>
      </Tooltip>
    </Box>
  );

  // ⚡ OPTIMIZATION: Instant search with request cancellation (AbortController)
  // - Updates UI immediately (no debounce delay)
  // - Cancels outdated requests automatically
  // - Prevents race conditions
  // - Much better UX than debounce
  const handleSearchChange = useCallback((value: string) => {
    // Cancel any previous search requests
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    // Create new abort controller for this search
    abortControllerRef.current = new AbortController();

    // Update search immediately (no delay)
    setSearchTerm(value);
    setPage(0);
  }, []);

  // Initialize search with saved value
  useEffect(() => {
    if (isLoaded && savedFilters?.searchTerm) {
      setSearchTerm(savedFilters.searchTerm);
    }
  }, [isLoaded, savedFilters]);

  // Save filters with search term changes (no debounce delay)
  useEffect(() => {
    if (!isLoaded) return;

    updateFilters({
      searchTerm: searchTerm,
      sortBy,
      sortOrder,
      filterStatus: filterStatus.toString(),
      minRate,
      maxRate,
      remoteFilter,
      dateRangeFrom: dateRange.from,
      dateRangeTo: dateRange.to,
    });
  }, [searchTerm, sortBy, sortOrder, filterStatus, minRate, maxRate, remoteFilter, dateRange, isLoaded, updateFilters]);

  // ⚡ OPTIMIZATION: Client-side filters removed - now handled server-side in getRequirementsPage()
  // This eliminates the overhead of filtering potentially 50K+ records in JavaScript
  // Filters (rate, date, remote) are now pushed to the database query for better performance

  // Effect to handle filter changes - resets to page 0
  useEffect(() => {
    setPage(0);
  }, [searchTerm, filterStatus, sortBy, sortOrder, minRate, maxRate, remoteFilter, dateRange.from, dateRange.to, rowsPerPage]);

  useEffect(() => {
    // Subscribe to real-time changes
    let unsubscribe: (() => void) | undefined;
    if (user) {
      const dateFrom = dateRange.from ? new Date(`${dateRange.from}T00:00:00`).getTime() : null;
      const dateTo = dateRange.to ? new Date(`${dateRange.to}T23:59:59.999`).getTime() : null;
      const searchLower = searchTerm.trim().toLowerCase();
      const matchesServerSideFilters = (record: Requirement) => {
        const matchesStatus = filterStatus === 'ALL' || record.status === filterStatus;

        const matchesSearch =
          !searchLower ||
          (record.title || '').toLowerCase().includes(searchLower) ||
          (record.company || '').toLowerCase().includes(searchLower) ||
          (record.primary_tech_stack || '').toLowerCase().includes(searchLower) ||
          (record.description || '').toLowerCase().includes(searchLower) ||
          (record.location || '').toLowerCase().includes(searchLower) ||
          (record.end_client || '').toLowerCase().includes(searchLower) ||
          (record.vendor_company || '').toLowerCase().includes(searchLower) ||
          (record.vendor_person_name || '').toLowerCase().includes(searchLower) ||
          (record.vendor_phone || '').toLowerCase().includes(searchLower) ||
          (record.vendor_email || '').toLowerCase().includes(searchLower) ||
          (record.vendor_website || '').toLowerCase().includes(searchLower) ||
          (record.imp_name || '').toLowerCase().includes(searchLower) ||
          (record.client_website || '').toLowerCase().includes(searchLower) ||
          (record.imp_website || '').toLowerCase().includes(searchLower) ||
          (record.next_step || '').toLowerCase().includes(searchLower) ||
          (record.status || '').toLowerCase().includes(searchLower);

        let matchesDate = true;
        if (dateFrom || dateTo) {
          const createdMs = new Date(record.created_at).getTime();
          if (!Number.isNaN(createdMs)) {
            if (dateFrom && createdMs < dateFrom) matchesDate = false;
            if (dateTo && createdMs > dateTo) matchesDate = false;
          }
        }

        return matchesStatus && matchesSearch && matchesDate;
      };

      unsubscribe = subscribeToRequirements(user.id, (update: RealtimeUpdate<Requirement>) => {
        if (update.type === 'INSERT') {
          if (page !== 0) {
            return;
          }
          // insert at front if it matches current search/status filters roughly
          // Server-side filtering is authoritative; here we add to current page if it appears relevant
          if (matchesServerSideFilters(update.record)) {
            void mutateRequirements((curr) => {
              if (!curr) return curr;
              return {
                ...curr,
                requirements: [update.record as unknown as RequirementWithLogs, ...curr.requirements].slice(0, pageSize),
              };
            }, { revalidate: false });
          }
          showToast({
            type: 'info',
            title: 'New requirement',
            message: `"${update.record.title}" has been added`,
          });
        } else if (update.type === 'UPDATE') {
          void mutateRequirements((curr) => {
            if (!curr) return curr;
            const exists = curr.requirements.some(r => r.id === update.record.id);
            const shouldInclude = matchesServerSideFilters(update.record);

            if (exists) {
              if (!shouldInclude) {
                return { ...curr, requirements: curr.requirements.filter(r => r.id !== update.record.id) };
              }
              return {
                ...curr,
                requirements: curr.requirements.map(r => (r.id === update.record.id ? (update.record as unknown as RequirementWithLogs) : r)),
              };
            }

            if (page === 0 && shouldInclude) {
              return {
                ...curr,
                requirements: [update.record as unknown as RequirementWithLogs, ...curr.requirements].slice(0, pageSize),
              };
            }

            return curr;
          }, { revalidate: false });
          // Show notification if not the current user editing
          if (selectedRequirement?.id !== update.record.id) {
            showToast({
              type: 'info',
              title: 'Requirement updated',
              message: 'Changes have been made to a requirement',
            });
          }
        } else if (update.type === 'DELETE') {
          void mutateRequirements((curr) => {
            if (!curr) return curr;
            return { ...curr, requirements: curr.requirements.filter(r => r.id !== update.record.id) };
          }, { revalidate: false });
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
  }, [user, selectedRequirement?.id, showToast, searchTerm, filterStatus, dateRange.from, dateRange.to, page, pageSize, mutateRequirements]);

  // Listen for requirement creation event to immediately reload
  useEffect(() => {
    const handleRequirementCreated = () => {
      // Reload requirements from current page to show the newly created one
      void mutateRequirements();
    };

    window.addEventListener('requirement-created', handleRequirementCreated as EventListener);
    return () => {
      window.removeEventListener('requirement-created', handleRequirementCreated as EventListener);
    };
  }, [mutateRequirements]);

  const handleDeleteClick = useCallback((requirementOrId: Requirement | string) => {
    if (!isAdmin) {
      showToast({
        type: 'error',
        title: 'Permission denied',
        message: 'Only admins can delete requirements.',
      });
      return;
    }
    // Handle both Requirement object and string ID
    const requirement = typeof requirementOrId === 'string'
      ? requirements.find(r => r.id === requirementOrId)
      : requirementOrId;
    if (requirement) {
      setRequirementToDelete(requirement);
      setShowDeleteConfirm(true);
    }
  }, [isAdmin, showToast, requirements]);

  const handleDelete = useCallback(async () => {
    const requirement = requirementToDelete;
    if (!requirement || !user) return;

    try {
      // Check if offline - queue operation
      if (!isOnline) {
        await queueOfflineOperation('DELETE', 'requirement', requirement.id, {});
        await mutateRequirements((curr) => {
          if (!curr) return curr;
          return { ...curr, requirements: curr.requirements.filter(r => r.id !== requirement.id) };
        }, { revalidate: false });
        setSelectedRequirement(null);
        setShowDeleteConfirm(false);
        setRequirementToDelete(null);
        showToast({
          type: 'info',
          title: 'Queued for Sync',
          message: 'Requirement will be deleted when you come back online'
        });
        // Reload to show updated list
        setPage(0);
        await mutateRequirements();
        return;
      }

      // Online - delete normally
      const result = await deleteRequirement(requirement.id, user.id);
      if (result.success) {
        await mutateRequirements((curr) => {
          if (!curr) return curr;
          return { ...curr, requirements: curr.requirements.filter(r => r.id !== requirement.id) };
        }, { revalidate: false });
        setSelectedRequirement(null);
        setShowDeleteConfirm(false);
        setRequirementToDelete(null);
        showToast({ type: 'success', title: 'Requirement deleted', message: 'The requirement has been removed.' });
        // reload first page
        setPage(0);
        await mutateRequirements();
      } else {
        showToast({ type: 'error', title: 'Failed to delete', message: result.error || 'Unknown error' });
      }
    } catch {
      showToast({ type: 'error', title: 'Error', message: 'Failed to delete requirement' });
    }
  }, [requirementToDelete, showToast, user, isOnline, queueOfflineOperation, mutateRequirements]);

  const handleViewDetails = (req: Requirement) => {
    setSelectedRequirement(req);
    setSelectedCreatedBy(req.created_by || null);
    setSelectedUpdatedBy(req.updated_by || null);
  };

  // ⚡ OPTIMIZATION: No client-side filtering needed - all filters are applied server-side
  // This means requirements from API are already filtered by rate, date, and remote preference
  const filteredRequirements = useMemo(() => {
    let filtered = requirements;
    
    // Apply status filter if selected
    if (selectedStatusFilter !== 'ALL') {
      filtered = filtered.filter(req => req.status === selectedStatusFilter);
    }
    
    return filtered;
  }, [requirements, selectedStatusFilter]);

  // Handle sort changes for server-side sorting
  const handleSortChange = useCallback((field: 'title' | 'company' | 'status' | 'created_at' | 'rate', order: 'asc' | 'desc') => {
    // Map client sort fields to server sort fields
    const serverField = field === 'created_at' ? 'created_at' : field === 'company' ? 'company' : 'created_at';
    setSortBy(serverField === 'created_at' ? 'date' : serverField === 'company' ? 'company' : 'date');
    setSortOrder(order);
    // Reset to first page when sorting changes
    setPage(0);
  }, []);

  if (loading && requirements.length === 0) {
    return (
      <div className="space-y-6">
        <div className="sticky top-0 z-40 bg-white pb-6 -mx-6 px-6 pt-6 border-b border-gray-200 shadow-sm">
          <div className="h-8 bg-gray-200 rounded w-64 mb-6 animate-pulse" />
          <div className="h-10 bg-gray-200 rounded w-full max-w-md animate-pulse" />
        </div>
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
          <div className="px-4 py-3 bg-gradient-to-r from-white to-primary-50 border-b border-gray-100">
            <div className="h-6 bg-gray-200 rounded w-32 mb-2 animate-pulse" />
          </div>
          <div className="p-4">
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-12 bg-gray-200 rounded animate-pulse" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <ErrorAlert
          title={error.title}
          message={error.message}
          onRetry={() => void mutateRequirements()}
          onDismiss={() => setIsErrorDismissed(true)}
          retryLabel="Try Again"
          technical={error.message}
        />
      </div>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {isToolbarPortaled ? <Portal container={toolbarTarget}>{toolbar}</Portal> : null}

      <Popover
        open={toolsOpen && Boolean(toolsAnchorEl)}
        anchorEl={toolsAnchorEl}
        onClose={() => setToolsAnchorEl(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        disableAutoFocus
        disableEnforceFocus
        disableScrollLock
        disablePortal={false}
        slotProps={{
          paper: {
            sx: {
              p: 0,
              width: { xs: 'calc(100vw - 32px)', sm: 480 },
              maxWidth: 'calc(100vw - 32px)',
              borderRadius: '12px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
            },
          },
          backdrop: {
            sx: { backgroundColor: 'transparent' },
            onClick: () => setToolsAnchorEl(null),
          },
        }}
      >
        <Box sx={{ overflow: 'hidden' }}>
          {/* Header */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              px: 2,
              py: 1.5,
              borderBottom: '1px solid',
              borderColor: 'divider',
              bgcolor: 'background.paper',
            }}
          >
            <Stack direction="row" spacing={1} alignItems="center">
              <SlidersHorizontal className="w-4 h-4" style={{ color: 'var(--gold)' }} />
              <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: '0.75rem' }}>
                Tools & Settings
              </Typography>
            </Stack>
            <IconButton size="small" onClick={() => setToolsAnchorEl(null)} aria-label="Close tools" sx={{ color: 'text.secondary' }}>
              <X className="w-4 h-4" />
            </IconButton>
          </Box>

          <Box sx={{ p: 2 }}>
            <Stack spacing={3}>
              {/* Data Tools Section */}
              <Box>
                <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mb: 1.5 }}>
                  <Zap className="w-3.5 h-3.5" style={{ color: 'var(--gold)' }} />
                  <Typography
                    variant="caption"
                    sx={{
                      fontWeight: 700,
                      fontSize: '0.75rem',
                      letterSpacing: '0.5px',
                      textTransform: 'uppercase',
                      color: 'text.secondary',
                    }}
                  >
                    Data Tools
                  </Typography>
                </Stack>
                <Stack spacing={1}>
                  <Button
                    fullWidth
                    variant="outlined"
                    color="inherit"
                    onClick={() => {
                      setShowJDParser(true);
                      setToolsAnchorEl(null);
                    }}
                    sx={{
                      justifyContent: 'flex-start',
                      textTransform: 'none',
                      fontWeight: 500,
                      fontSize: '0.75rem',
                      py: 1,
                      border: '1px solid',
                      borderColor: 'divider',
                      '&:hover': { bgcolor: 'action.hover', borderColor: 'primary.main' },
                    }}
                  >
                    📄 JD Parser
                  </Button>

                  <Button
                    fullWidth
                    variant="outlined"
                    color="inherit"
                    onClick={() => {
                      setShowBatchJDParser(true);
                      setToolsAnchorEl(null);
                    }}
                    sx={{
                      justifyContent: 'flex-start',
                      textTransform: 'none',
                      fontWeight: 500,
                      fontSize: '0.75rem',
                      py: 1,
                      border: '1px solid',
                      borderColor: 'divider',
                      '&:hover': { bgcolor: 'action.hover', borderColor: 'primary.main' },
                    }}
                  >
                    📑 Batch JD Parser
                  </Button>

                  <Button
                    fullWidth
                    variant="outlined"
                    color="inherit"
                    startIcon={<Download className="w-4 h-4" />}
                    onClick={() => {
                      setShowReport(true);
                      setToolsAnchorEl(null);
                    }}
                    sx={{
                      justifyContent: 'flex-start',
                      textTransform: 'none',
                      fontWeight: 500,
                      fontSize: '0.75rem',
                      py: 1,
                      border: '1px solid',
                      borderColor: 'divider',
                      '&:hover': { bgcolor: 'action.hover', borderColor: 'primary.main' },
                    }}
                  >
                    Export Report
                  </Button>
                </Stack>
              </Box>

              {/* Display Settings Section */}
              <Box>
                <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mb: 1.5 }}>
                  <Settings className="w-3.5 h-3.5" style={{ color: 'var(--gold)' }} />
                  <Typography
                    variant="caption"
                    sx={{
                      fontWeight: 700,
                      fontSize: '0.75rem',
                      letterSpacing: '0.5px',
                      textTransform: 'uppercase',
                      color: 'text.secondary',
                    }}
                  >
                    Display Settings
                  </Typography>
                </Stack>
                <Stack spacing={1.5}>
                  <Box>
                    <FormControl size="small" fullWidth>
                      <InputLabel id="req-rowsperpage-label" sx={{ fontSize: '0.75rem' }}>
                        Rows Per Page
                      </InputLabel>
                      <Select
                        labelId="req-rowsperpage-label"
                        value={String(rowsPerPage)}
                        label="Rows Per Page"
                        onChange={(e) => setRowsPerPage(parseInt(e.target.value, 10))}
                        title="Rows per page"
                        sx={{ fontSize: '0.75rem' }}
                      >
                        <MenuItem value="100" sx={{ fontSize: '0.75rem' }}>100 rows</MenuItem>
                        <MenuItem value="200" sx={{ fontSize: '0.75rem' }}>200 rows</MenuItem>
                        <MenuItem value="500" sx={{ fontSize: '0.75rem' }}>500 rows</MenuItem>
                        <MenuItem value="1000" sx={{ fontSize: '0.75rem' }}>1000 rows</MenuItem>
                      </Select>
                    </FormControl>
                  </Box>

                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                    <FormControl size="small" sx={{ flex: 1 }}>
                      <InputLabel id="req-sortby-label" sx={{ fontSize: '0.75rem' }}>
                        Sort By
                      </InputLabel>
                      <Select
                        labelId="req-sortby-label"
                        value={sortBy}
                        label="Sort By"
                        onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                        title="Sort requirements by selected criteria"
                        sx={{ fontSize: '0.75rem' }}
                      >
                        <MenuItem value="date" sx={{ fontSize: '0.75rem' }}>📅 Date (newest first)</MenuItem>
                        <MenuItem value="company" sx={{ fontSize: '0.75rem' }}>🏢 Company Name</MenuItem>
                        <MenuItem value="daysOpen" sx={{ fontSize: '0.75rem' }}>⏱️ Days Open</MenuItem>
                      </Select>
                    </FormControl>

                    <Button
                      variant="outlined"
                      color="inherit"
                      onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                      startIcon={<ArrowUpDown className="w-4 h-4" />}
                      title={`Sort ${sortOrder === 'asc' ? 'descending' : 'ascending'}`}
                      sx={{
                        textTransform: 'none',
                        fontWeight: 500,
                        fontSize: '0.75rem',
                        whiteSpace: 'nowrap',
                        border: '1px solid',
                        borderColor: 'divider',
                        '&:hover': { bgcolor: 'action.hover', borderColor: 'primary.main' },
                      }}
                    >
                      {sortOrder === 'asc' ? 'Ascending' : 'Descending'}
                    </Button>
                  </Stack>
                </Stack>
              </Box>

              {/* Advanced Filters Section */}
              <Box>
                <Button
                  fullWidth
                  variant={showAdvancedFilters ? 'contained' : 'outlined'}
                  color={showAdvancedFilters ? 'primary' : 'inherit'}
                  onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                  startIcon={<Filter className="w-4 h-4" />}
                  title="Toggle advanced filters"
                  sx={{
                    justifyContent: 'flex-start',
                    textTransform: 'none',
                    fontWeight: 600,
                    fontSize: '0.75rem',
                    py: 1,
                    mb: 1,
                    borderColor: 'divider',
                  }}
                >
                  Advanced Filters {(minRate || maxRate || remoteFilter !== 'ALL' || dateRange.from || dateRange.to) ? '✓' : ''}
                </Button>

                {showAdvancedFilters ? (
                  <Paper
                    variant="outlined"
                    sx={{
                      p: 1.5,
                      bgcolor: 'rgba(212,175,55,0.08)',
                      borderColor: 'rgba(212,175,55,0.25)',
                      borderRadius: '8px',
                    }}
                  >
                    <Box
                      sx={{
                        display: 'grid',
                        gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' },
                        gap: 1.5,
                      }}
                    >
                      <TextField
                        size="small"
                        label="Min Rate"
                        placeholder="e.g., 50"
                        value={minRate}
                        onChange={(e) => setMinRate(e.target.value)}
                        title="Minimum hourly/daily rate"
                        sx={{ fontSize: '0.75rem' }}
                      />
                      <TextField
                        size="small"
                        label="Max Rate"
                        placeholder="e.g., 150"
                        value={maxRate}
                        onChange={(e) => setMaxRate(e.target.value)}
                        title="Maximum hourly/daily rate"
                        sx={{ fontSize: '0.75rem' }}
                      />

                      <FormControl size="small">
                        <InputLabel id="req-worktype-label" sx={{ fontSize: '0.75rem' }}>
                          Work Type
                        </InputLabel>
                        <Select
                          labelId="req-worktype-label"
                          value={remoteFilter}
                          label="Work Type"
                          onChange={(e) => setRemoteFilter(e.target.value as typeof remoteFilter)}
                          title="Filter by remote/onsite preference"
                          sx={{ fontSize: '0.75rem' }}
                        >
                          <MenuItem value="ALL" sx={{ fontSize: '0.75rem' }}>All Types</MenuItem>
                          <MenuItem value="REMOTE" sx={{ fontSize: '0.75rem' }}>🌐 Remote</MenuItem>
                          <MenuItem value="ONSITE" sx={{ fontSize: '0.75rem' }}>🏢 On-site</MenuItem>
                        </Select>
                      </FormControl>

                      <TextField
                        size="small"
                        label="From Date"
                        type="date"
                        value={dateRange.from}
                        onChange={(e) => setDateRange({ ...dateRange, from: e.target.value })}
                        title="Filter requirements created from this date"
                        InputLabelProps={{ shrink: true }}
                        sx={{ fontSize: '0.75rem' }}
                      />

                      <TextField
                        size="small"
                        label="To Date"
                        type="date"
                        value={dateRange.to}
                        onChange={(e) => setDateRange({ ...dateRange, to: e.target.value })}
                        title="Filter requirements created until this date"
                        InputLabelProps={{ shrink: true }}
                        sx={{ fontSize: '0.75rem' }}
                      />
                    </Box>

                    {(minRate || maxRate || remoteFilter !== 'ALL' || dateRange.from || dateRange.to || searchTerm || filterStatus !== 'ALL') ? (
                      <Button
                        variant="text"
                        color="primary"
                        size="small"
                        onClick={() => {
                          setSearchTerm('');
                          setFilterStatus('ALL');
                          setMinRate('');
                          setMaxRate('');
                          setRemoteFilter('ALL');
                          setDateRange({ from: '', to: '' });
                          clearFilters();
                        }}
                        sx={{ mt: 1, px: 0, fontSize: '0.75rem', fontWeight: 500 }}
                        title="Reset all advanced filters"
                      >
                        ↺ Clear all filters
                      </Button>
                    ) : null}
                  </Paper>
                ) : null}
              </Box>
            </Stack>
          </Box>
        </Box>
      </Popover>

      {/* Search and Filter */}
      <Stack spacing={2}>
        {/* Active Filters Summary */}
        {(searchTerm || filterStatus !== 'ALL' || (minRate || maxRate || remoteFilter !== 'ALL' || dateRange.from || dateRange.to)) ? (
          <Paper variant="outlined" sx={{ p: 1.5, bgcolor: 'var(--darkbg-surface-light)', borderColor: 'rgba(234,179,8,0.2)' }}>
            <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" alignItems="center">
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500 }}>
                Active filters:
              </Typography>
              {searchTerm ? <Chip size="small" label={`Search: "${searchTerm}"`} /> : null}
              {filterStatus !== 'ALL' ? <Chip size="small" label={`Status: ${filterStatus}`} /> : null}
              {minRate ? <Chip size="small" label={`Min: $${minRate}`} /> : null}
              {maxRate ? <Chip size="small" label={`Max: $${maxRate}`} /> : null}
              {remoteFilter !== 'ALL' ? <Chip size="small" label={remoteFilter} /> : null}
              {dateRange.from ? <Chip size="small" label={`From: ${dateRange.from}`} /> : null}
              {dateRange.to ? <Chip size="small" label={`To: ${dateRange.to}`} /> : null}
              <Box sx={{ flexGrow: 1 }} />
              {filteredRequirements.length > 0 ? (
                <Typography variant="caption" sx={{ fontWeight: 500, color: 'text.primary' }}>
                  {filteredRequirements.length} result{filteredRequirements.length !== 1 ? 's' : ''}
                </Typography>
              ) : null}
              <Button
                variant="text"
                color="error"
                size="small"
                onClick={() => {
                  setSearchTerm('');
                  setFilterStatus('ALL');
                  setMinRate('');
                  setMaxRate('');
                  setRemoteFilter('ALL');
                  setDateRange({ from: '', to: '' });
                  clearFilters();
                  setShowAdvancedFilters(false);
                }}
                title="Clear all filters and reset search"
              >
                ✕ Clear All
              </Button>
            </Stack>
          </Paper>
        ) : null}
      </Stack>

      {/* Sync Queue Panel (collapsible) */}
      {showSyncPanel ? (
        <Paper variant="outlined" sx={{ p: 1.5, bgcolor: 'var(--darkbg-surface)', borderColor: 'rgba(234,179,8,0.2)' }}>
          <Stack direction={{ xs: 'column', md: 'row' }} alignItems={{ xs: 'flex-start', md: 'center' }} justifyContent="space-between" spacing={1.5}>
            <Typography variant="subtitle2" sx={{ fontWeight: 500 }}>
              Offline Sync Queue
            </Typography>
            <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" alignItems="center">
              <Tooltip title={`${pendingCount} operations waiting to sync. Click 'Process Queue' to sync when online.`} arrow>
                <Chip size="small" label={`Pending: ${pendingCount}`} />
              </Tooltip>
              <Button
                variant="contained"
                color="primary"
                size="small"
                onClick={async () => {
                  setIsProcessingQueue(true);
                  try {
                    await processSyncQueue(20);
                    window.dispatchEvent(new CustomEvent('sync-complete'));
                  } finally {
                    setIsProcessingQueue(false);
                  }
                }}
                disabled={isProcessingQueue || pendingItems.length === 0}
                startIcon={isProcessingQueue ? <CircularProgress size={16} color="inherit" /> : undefined}
              >
                {isProcessingQueue ? 'Processing...' : 'Process Queue'}
              </Button>
              <Button
                variant="outlined"
                color="inherit"
                size="small"
                onClick={async () => {
                  await clearSynced();
                  window.dispatchEvent(new CustomEvent('sync-complete'));
                }}
              >
                Clear Synced
              </Button>
              <Button
                variant="text"
                color="inherit"
                size="small"
                onClick={() => setShowSyncPanel(false)}
              >
                Close
              </Button>
            </Stack>
          </Stack>

          {pendingItems.length === 0 ? (
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
              No items in queue
            </Typography>
          ) : (
            <Box sx={{ mt: 1 }}>
              <List dense disablePadding>
                {pendingItems.slice(0, 10).map((item, idx) => (
                  <Box key={item.id}>
                    <ListItem
                      disableGutters
                      secondaryAction={
                        <Stack direction="row" spacing={1}>
                          <Button
                            size="small"
                            variant="outlined"
                            color="primary"
                            onClick={async () => {
                              setIsProcessingQueue(true);
                              try {
                                await processSyncQueue(1);
                                window.dispatchEvent(new CustomEvent('sync-complete'));
                              } finally {
                                setIsProcessingQueue(false);
                              }
                            }}
                          >
                            Retry
                          </Button>
                          <Button
                            size="small"
                            variant="outlined"
                            color="inherit"
                            onClick={async () => {
                              await updateItemStatus(item.id, 'failed', 'Marked failed via UI');
                              window.dispatchEvent(new CustomEvent('sync-complete'));
                            }}
                          >
                            Mark Failed
                          </Button>
                        </Stack>
                      }
                    >
                      <ListItemText
                        primary={`${item.entityType} · ${item.operation}`}
                        secondary={`Entity ID: ${item.entityId} • Retries: ${item.retries}${item.lastError ? ` • Error: ${item.lastError}` : ''}`}
                        primaryTypographyProps={{ variant: 'body2', sx: { fontWeight: 700 } }}
                        secondaryTypographyProps={{ variant: 'caption' }}
                      />
                    </ListItem>
                    {idx < Math.min(10, pendingItems.length) - 1 ? <Divider /> : null}
                  </Box>
                ))}
              </List>
              {pendingItems.length > 10 ? (
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                  Showing 10 of {pendingItems.length} pending items
                </Typography>
              ) : null}
            </Box>
          )}
        </Paper>
      ) : null}

      {/* Requirements Display - Table View Only */}
      <div className="w-full">
        {/* Active Status Filter Chip */}
        {selectedStatusFilter !== 'ALL' && (
          <Box sx={{ mb: 2 }}>
            <Chip
              label={`Status: ${selectedStatusFilter}`}
              onDelete={() => setSelectedStatusFilter('ALL')}
              color="primary"
              variant="outlined"
              size="small"
            />
          </Box>
        )}

        {/* Empty State - When no requirements match filters */}
        {requirements.length === 0 && !loading && (
          <Paper
            variant="outlined"
            sx={{
              p: 3,
              mb: 3,
              bgcolor: 'rgba(59, 130, 246, 0.05)',
              borderColor: 'rgba(59, 130, 246, 0.3)',
              borderRadius: 2,
              textAlign: 'center'
            }}
          >
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
              {searchTerm ? '🔍 No requirements found' : '📝 No requirements yet'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {searchTerm 
                ? `No requirements match "${searchTerm}". Try a different search term or adjust filters.`
                : 'You haven\'t added any requirements yet. Click "New Requirement" to get started.'}
            </Typography>
          </Paper>
        )}

        {/* Performance Info - When showing results without explicit search */}
        {/* Removed: Showing recent requirements info message */}

        <RequirementsTable
          requirements={filteredRequirements}
          onViewDetails={handleViewDetails}
          onCreateInterview={onCreateInterview}
          onDelete={handleDeleteClick}
          statusColors={statusColors}
          headerSearch={tableSearch}
          isAdmin={isAdmin}
          serverSortField={sortBy === 'date' ? 'created_at' : sortBy}
          serverSortOrder={sortOrder}
          onSortChange={handleSortChange}
          page={page}
          hasNextPage={hasNextPage}
          isFetchingPage={isFetchingPage}
          onPageChange={setPage}
          selectedStatusFilter={selectedStatusFilter}
          onStatusFilterChange={setSelectedStatusFilter}
          badge={''} label={''} />
      </div>



      {/* JD Modal */}
      {selectedJDRequirement && (
        <Dialog
          open={Boolean(selectedJDRequirement)}
          onClose={() => setSelectedJDRequirement(null)}
          fullWidth
          maxWidth="lg"
          scroll="paper"
        >
          <DialogTitle sx={{ pr: 7 }}>
            <Typography variant="h6" sx={{ fontWeight: 800 }} noWrap>
              {selectedJDRequirement.title}
            </Typography>
            <Stack direction="row" spacing={1} alignItems="center" useFlexGap flexWrap="wrap" sx={{ mt: 1 }}>
              <Chip
                size="small"
                label={statusColors[selectedJDRequirement.status].label}
                variant="outlined"
              />
              {selectedJDRequirement.company ? (
                <Typography variant="caption" color="text.secondary" noWrap>
                  {selectedJDRequirement.company}
                </Typography>
              ) : null}
            </Stack>
            <IconButton
              onClick={() => setSelectedJDRequirement(null)}
              title="Close modal"
              sx={{ position: 'absolute', right: 8, top: 8 }}
            >
              <XCircle className="w-5 h-5" />
            </IconButton>
          </DialogTitle>

          <DialogContent dividers>
            <Typography
              variant="body2"
              sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.7, color: 'text.primary' }}
            >
              {selectedJDRequirement.description}
            </Typography>
          </DialogContent>

          <DialogActions>
            <Button variant="outlined" color="inherit" onClick={() => setSelectedJDRequirement(null)}>
              Close
            </Button>
          </DialogActions>
        </Dialog>
      )}

      <JDParserDialog
        open={showJDParser}
        onClose={() => setShowJDParser(false)}
        onParsedData={onParsedJDData}
      />

      <BatchJDParserDialog
        open={showBatchJDParser}
        onClose={() => setShowBatchJDParser(false)}
        onParsedData={onParsedJDData}
      />

      {/* Detail Modal */}
      <RequirementDetailModal
        isOpen={selectedRequirement !== null}
        requirement={selectedRequirement}
        onClose={() => setSelectedRequirement(null)}
        onUpdate={() => void mutateRequirements()}
        createdBy={selectedCreatedBy}
        updatedBy={selectedUpdatedBy}
      />

      {/* Report Modal */}
      {showReport && <RequirementsReport onClose={() => setShowReport(false)} />}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => {
          setShowDeleteConfirm(false);
          setRequirementToDelete(null);
        }}
        onConfirm={handleDelete}
        title="Delete Requirement"
        message={`Are you sure you want to delete "${requirementToDelete?.title || 'this requirement'}"? This action cannot be undone.`}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
      />
    </Box>
  );
});