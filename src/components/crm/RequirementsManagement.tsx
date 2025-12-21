import { useState, useEffect, useCallback, useMemo, useRef, memo } from 'react';
import { Plus, Download, XCircle, ArrowUpDown, X, SlidersHorizontal } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useOfflineCache } from '../../hooks/useOfflineCache';
import { useToast } from '../../contexts/ToastContext';
import { useSearchFilters } from '../../hooks/useSearchFilters';
import { useRequirementsPage } from '../../hooks/useRequirementsPage';
import { debounce } from '../../lib/utils';
import { deleteRequirement, type RequirementWithLogs } from '../../lib/api/requirements';
import type { Database, RequirementStatus } from '../../lib/database.types';
import { subscribeToRequirements, type RealtimeUpdate } from '../../lib/api/realtimeSync';
import { ErrorAlert } from '../common/ErrorAlert';
import { RequirementsReport } from './RequirementsReport';
import { RequirementDetailModal } from './RequirementDetailModal';
import { RequirementsTable } from './RequirementsTable';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { BrandButton } from '../brand';
import { useSyncQueue } from '../../hooks/useSyncStatus';
import { processSyncQueue } from '../../lib/offlineDB';
import SearchIcon from '@mui/icons-material/Search';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import InputBase from '@mui/material/InputBase';
import Button from '@mui/material/Button';
import ClickAwayListener from '@mui/material/ClickAwayListener';
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
import { alpha, styled } from '@mui/material/styles';

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
  onQuickAdd?: () => void;
  onCreateInterview?: (requirementId: string) => void;
  toolbarPortalTargetId?: string;
}

const Search = styled('div')(({ theme }) => ({
  position: 'relative',
  borderRadius: 10,
  backgroundColor:
    theme.palette.mode === 'dark'
      ? alpha(theme.palette.common.white, 0.12)
      : alpha(theme.palette.common.black, 0.06),
  '&:hover': {
    backgroundColor:
      theme.palette.mode === 'dark'
        ? alpha(theme.palette.common.white, 0.16)
        : alpha(theme.palette.common.black, 0.09),
  },
  width: '100%',
  height: 40,
  display: 'flex',
  alignItems: 'center',
}));

const CollapsedSearchButton = styled(IconButton)(({ theme }) => ({
  width: 40,
  height: 40,
  borderRadius: 10,
  backgroundColor:
    theme.palette.mode === 'dark'
      ? alpha(theme.palette.common.white, 0.12)
      : alpha(theme.palette.common.black, 0.06),
  color: theme.palette.text.secondary,
  '&:hover': {
    backgroundColor:
      theme.palette.mode === 'dark'
        ? alpha(theme.palette.common.white, 0.16)
        : alpha(theme.palette.common.black, 0.09),
  },
  '&.Mui-focusVisible': {
    boxShadow: `0 0 0 3px ${alpha(theme.palette.primary.main, 0.25)}`,
  },
}));

const SearchIconWrapper = styled('div')(({ theme }) => ({
  padding: theme.spacing(0, 1),
  height: '100%',
  position: 'absolute',
  pointerEvents: 'none',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: theme.palette.text.secondary,
}));

const SearchClearWrapper = styled('div')(({ theme }) => ({
  padding: theme.spacing(0, 0.25),
  height: '100%',
  position: 'absolute',
  right: theme.spacing(0.5),
  top: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
}));

const StyledInputBase = styled(InputBase)(({ theme }) => ({
  color: 'inherit',
  width: '100%',
  '& .MuiInputBase-input': {
    padding: theme.spacing(1, 1, 1, 0),
    paddingLeft: `calc(1em + ${theme.spacing(3)})`,
    paddingRight: `calc(1em + ${theme.spacing(4)})`,
    fontSize: theme.typography.pxToRem(14),
  },
}));


export const RequirementsManagement = memo(({ onQuickAdd, onCreateInterview, toolbarPortalTargetId }: RequirementsManagementProps) => {
  const { user, isAdmin } = useAuth();
  const { isOnline, queueOfflineOperation } = useOfflineCache();
  const { showToast } = useToast();
  const { filters: savedFilters, updateFilters, clearFilters, isLoaded } = useSearchFilters();

  const [searchTerm, setSearchTerm] = useState(savedFilters?.searchTerm || '');
  const [debouncedValue, setDebouncedValue] = useState('');
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
    search: debouncedValue,
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
  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(() => Boolean(savedFilters?.searchTerm));
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
      <Box
        sx={{
          flex: { xs: 1, sm: isSearchOpen ? 1 : 'unset' },
          minWidth: { xs: '100%', sm: isSearchOpen ? 280 : 'unset' },
        }}
      >
        <ClickAwayListener
          onClickAway={() => {
            if (!searchTerm) {
              setIsSearchOpen(false);
            }
          }}
        >
          <Box>
            {!isSearchOpen ? (
              <CollapsedSearchButton
                onClick={() => setIsSearchOpen(true)}
                aria-label="Open search"
                title="Search"
              >
                <SearchIcon fontSize="small" />
              </CollapsedSearchButton>
            ) : (
              <Search sx={{ maxWidth: { xs: '100%', sm: 560 } }}>
                <SearchIconWrapper>
                  <SearchIcon fontSize="small" />
                </SearchIconWrapper>
                <StyledInputBase
                  inputRef={searchInputRef}
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    handleDebouncedSearch(e.target.value);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      e.stopPropagation();
                    }
                    if (e.key === 'Escape' && !searchTerm) {
                      setIsSearchOpen(false);
                    }
                  }}
                  placeholder="Search..."
                  inputProps={{
                    'aria-label': 'Search requirements',
                  }}
                />

                <SearchClearWrapper>
                  <IconButton
                    size="small"
                    onClick={() => {
                      if (searchTerm) {
                        setSearchTerm('');
                        setDebouncedValue('');
                      }
                      setIsSearchOpen(false);
                    }}
                    aria-label={searchTerm ? 'Clear search' : 'Close search'}
                    title={searchTerm ? 'Clear search' : 'Close search'}
                  >
                    <X className="w-5 h-5" />
                  </IconButton>
                </SearchClearWrapper>
              </Search>
            )}
          </Box>
        </ClickAwayListener>
      </Box>
      <Button
        variant="outlined"
        color="inherit"
        startIcon={<SlidersHorizontal className="w-4 h-4" />}
        onClick={(e) => setToolsAnchorEl(e.currentTarget)}
        sx={{ flex: { xs: 1, sm: 'unset' } }}
      >
        Tools
      </Button>
      <BrandButton
        variant="primary"
        size="md"
        onClick={onQuickAdd}
        className="flex-1 sm:flex-none"
      >
        <Plus className="w-4 h-4 mr-2" />
        Create Requirement
      </BrandButton>
    </Stack>
  );

  useEffect(() => {
    if (searchTerm || debouncedValue) {
      setIsSearchOpen(true);
    }
  }, [searchTerm, debouncedValue]);

  useEffect(() => {
    if (isSearchOpen) {
      searchInputRef.current?.focus();
    }
  }, [isSearchOpen]);

  // Initialize debounced search with saved value
  useEffect(() => {
    if (isLoaded && savedFilters?.searchTerm) {
      setDebouncedValue(savedFilters.searchTerm);
    }
  }, [isLoaded, savedFilters]);

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

  // Effect to handle filter changes - resets to page 0
  useEffect(() => {
    setPage(0);
  }, [debouncedValue, filterStatus, sortBy, sortOrder, minRate, maxRate, remoteFilter, dateRange.from, dateRange.to, rowsPerPage]);

  useEffect(() => {
    // Subscribe to real-time changes
    let unsubscribe: (() => void) | undefined;
    if (user) {
      const dateFrom = dateRange.from ? new Date(`${dateRange.from}T00:00:00`).getTime() : null;
      const dateTo = dateRange.to ? new Date(`${dateRange.to}T23:59:59.999`).getTime() : null;
      const searchLower = debouncedValue.trim().toLowerCase();
      const matchesServerSideFilters = (record: Requirement) => {
        const matchesStatus = filterStatus === 'ALL' || record.status === filterStatus;

        const matchesSearch =
          !searchLower ||
          (record.title || '').toLowerCase().includes(searchLower) ||
          (record.company || '').toLowerCase().includes(searchLower) ||
          (record.primary_tech_stack || '').toLowerCase().includes(searchLower) ||
          (record.vendor_company || '').toLowerCase().includes(searchLower);

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
  }, [user, selectedRequirement?.id, showToast, debouncedValue, filterStatus, dateRange.from, dateRange.to, page, pageSize, mutateRequirements]);

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


  // Handle sort changes for server-side sorting
  const handleSortChange = useCallback((field: 'title' | 'company' | 'status' | 'created_at' | 'rate', order: 'asc' | 'desc') => {
    // Map client sort fields to server sort fields
    const serverField = field === 'created_at' ? 'created_at' : field === 'company' ? 'company' : 'created_at';
    setSortBy(serverField === 'created_at' ? 'date' : serverField === 'company' ? 'company' : 'date');
    setSortOrder(order);
    // Reset to first page when sorting changes
    setPage(0);
  }, []);

  if (loading) {
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
        open={toolsOpen}
        anchorEl={toolsAnchorEl}
        onClose={() => setToolsAnchorEl(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{
          paper: {
            sx: {
              p: 2,
              width: { xs: 'calc(100vw - 32px)', sm: 460 },
              maxWidth: 'calc(100vw - 32px)',
            },
          },
        }}
      >
        <Stack spacing={2}>
          <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
            <Typography variant="subtitle2" sx={{ fontWeight: 900 }}>
              Tools
            </Typography>
            <IconButton size="small" onClick={() => setToolsAnchorEl(null)} aria-label="Close tools">
              <X className="w-4 h-4" />
            </IconButton>
          </Stack>

          <Button
            variant="outlined"
            color="inherit"
            startIcon={<Download className="w-4 h-4" />}
            onClick={() => {
              setShowReport(true);
              setToolsAnchorEl(null);
            }}
          >
            Report
          </Button>

          <FormControl size="small" fullWidth>
            <InputLabel id="req-status-label">Status</InputLabel>
            <Select
              labelId="req-status-label"
              value={filterStatus}
              label="Status"
              onChange={(e) => {
                setFilterStatus(e.target.value as RequirementStatus | 'ALL');
              }}
              title="Filter requirements by status"
            >
              <MenuItem value="ALL">All Statuses</MenuItem>
              <MenuItem value="NEW">New</MenuItem>
              <MenuItem value="IN_PROGRESS">In Progress</MenuItem>
              <MenuItem value="SUBMITTED">Submitted</MenuItem>
              <MenuItem value="INTERVIEW">Interview</MenuItem>
              <MenuItem value="OFFER">Offer</MenuItem>
              <MenuItem value="REJECTED">Rejected</MenuItem>
              <MenuItem value="CLOSED">Closed</MenuItem>
            </Select>
          </FormControl>

          <FormControl size="small" fullWidth>
            <InputLabel id="req-rowsperpage-label">Rows</InputLabel>
            <Select
              labelId="req-rowsperpage-label"
              value={String(rowsPerPage)}
              label="Rows"
              onChange={(e) => setRowsPerPage(parseInt(e.target.value, 10))}
              title="Rows per page"
            >
              <MenuItem value="100">100</MenuItem>
              <MenuItem value="200">200</MenuItem>
              <MenuItem value="500">500</MenuItem>
              <MenuItem value="1000">1000</MenuItem>
            </Select>
          </FormControl>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
            <FormControl size="small" sx={{ flex: 1, minWidth: 200 }}>
              <InputLabel id="req-sortby-label">Sort By</InputLabel>
              <Select
                labelId="req-sortby-label"
                value={sortBy}
                label="Sort By"
                onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                title="Sort requirements by selected criteria"
              >
                <MenuItem value="date">Sort by Date</MenuItem>
                <MenuItem value="company">Sort by Company</MenuItem>
                <MenuItem value="daysOpen">Sort by Days Open</MenuItem>
              </Select>
            </FormControl>

            <Button
              variant="outlined"
              color="inherit"
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              startIcon={<ArrowUpDown className="w-4 h-4" />}
              title={`Sort ${sortOrder === 'asc' ? 'descending' : 'ascending'}`}
              sx={{ whiteSpace: 'nowrap' }}
            >
              {sortOrder === 'asc' ? 'Asc' : 'Desc'}
            </Button>
          </Stack>

          <Button
            variant={showAdvancedFilters ? 'contained' : 'outlined'}
            color={showAdvancedFilters ? 'primary' : 'inherit'}
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            title="Toggle advanced filters"
          >
            Advanced Filters {(minRate || maxRate || remoteFilter !== 'ALL' || dateRange.from || dateRange.to) ? '✓' : ''}
          </Button>

          {showAdvancedFilters ? (
            <Paper
              variant="outlined"
              sx={{
                p: 2,
                bgcolor: 'rgba(212,175,55,0.10)',
                borderColor: 'rgba(212,175,55,0.35)',
              }}
            >
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' },
                  gap: 2,
                }}
              >
                <TextField
                  size="small"
                  label="Min Rate"
                  placeholder="e.g., 50"
                  value={minRate}
                  onChange={(e) => setMinRate(e.target.value)}
                  title="Minimum hourly/daily rate"
                />
                <TextField
                  size="small"
                  label="Max Rate"
                  placeholder="e.g., 150"
                  value={maxRate}
                  onChange={(e) => setMaxRate(e.target.value)}
                  title="Maximum hourly/daily rate"
                />

                <FormControl size="small">
                  <InputLabel id="req-worktype-label">Work Type</InputLabel>
                  <Select
                    labelId="req-worktype-label"
                    value={remoteFilter}
                    label="Work Type"
                    onChange={(e) => setRemoteFilter(e.target.value as typeof remoteFilter)}
                    title="Filter by remote/onsite preference"
                  >
                    <MenuItem value="ALL">All Types</MenuItem>
                    <MenuItem value="REMOTE">Remote</MenuItem>
                    <MenuItem value="ONSITE">On-site</MenuItem>
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
                />

                <TextField
                  size="small"
                  label="To Date"
                  type="date"
                  value={dateRange.to}
                  onChange={(e) => setDateRange({ ...dateRange, to: e.target.value })}
                  title="Filter requirements created until this date"
                  InputLabelProps={{ shrink: true }}
                />
              </Box>

              {(minRate || maxRate || remoteFilter !== 'ALL' || dateRange.from || dateRange.to || debouncedValue || filterStatus !== 'ALL') ? (
                <Button
                  variant="text"
                  color="primary"
                  size="small"
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
                  sx={{ mt: 1, px: 0 }}
                  title="Reset all advanced filters"
                >
                  Clear all filters
                </Button>
              ) : null}
            </Paper>
          ) : null}
        </Stack>
      </Popover>

      {!isToolbarPortaled ? (
        <Paper
          elevation={0}
          sx={{
            position: 'sticky',
            top: 0,
            zIndex: 40,
            p: { xs: 2, sm: 3 },
            borderBottom: 1,
            borderColor: 'divider',
          }}
        >
          {toolbar}
        </Paper>
      ) : null}

        {/* Search and Filter */}
        <Stack spacing={2}>
          {/* Active Filters Summary */}
          {(debouncedValue || filterStatus !== 'ALL' || (minRate || maxRate || remoteFilter !== 'ALL' || dateRange.from || dateRange.to)) ? (
            <Paper variant="outlined" sx={{ p: 1.5, bgcolor: 'var(--darkbg-surface-light)', borderColor: 'rgba(234,179,8,0.2)' }}>
              <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" alignItems="center">
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500 }}>
                  Active filters:
                </Typography>
                {debouncedValue ? <Chip size="small" label={`Search: "${debouncedValue}"`} /> : null}
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
                    setDebouncedValue('');
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
              <Chip size="small" label={`Pending: ${pendingCount}`} />
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
        <RequirementsTable
          requirements={filteredRequirements}
          onViewDetails={handleViewDetails}
          onCreateInterview={onCreateInterview}
          onDelete={handleDeleteClick}
          statusColors={statusColors}
          isAdmin={isAdmin}
          serverSortField={sortBy === 'date' ? 'created_at' : sortBy}
          serverSortOrder={sortOrder}
          onSortChange={handleSortChange}
          page={page}
          hasNextPage={hasNextPage}
          isFetchingPage={isFetchingPage}
          onPageChange={setPage} badge={''} label={''}        />
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