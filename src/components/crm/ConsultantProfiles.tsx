import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Search, Plus, Trash2 } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { updateConsultant, deleteConsultant, getConsultantsPage } from '../../lib/api/consultants';
import { subscribeToConsultants } from '../../lib/api/realtimeSync';
import { debounce } from '../../lib/utils';
import { SkeletonCard } from '../common/SkeletonCard';
import { ConsultantDetailModal } from './ConsultantDetailModal';
import { ErrorAlert } from '../common/ErrorAlert';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { EmptyStateNoData } from '../common/EmptyState';
import type { Database } from '../../lib/database.types';
import { useToast } from '../../contexts/ToastContext';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import Pagination from '@mui/material/Pagination';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import Divider from '@mui/material/Divider';

type Consultant = Database['public']['Tables']['consultants']['Row'];

type RealtimeUpdate<T> = { type: 'INSERT' | 'UPDATE' | 'DELETE'; record: T };

interface ConsultantProfilesProps {
  onQuickAdd?: () => void;
}

export const ConsultantProfiles = ({ onQuickAdd }: ConsultantProfilesProps) => {
  const { user, isAdmin } = useAuth();
  const { showToast } = useToast();
  const [consultants, setConsultants] = useState<Consultant[]>([]);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<{ title: string; message: string } | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedValue, setDebouncedValue] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [selectedConsultant, setSelectedConsultant] = useState<Consultant | null>(null);
  const [selectedCreatedBy, setSelectedCreatedBy] = useState<string | null>(null);
  const [selectedUpdatedBy, setSelectedUpdatedBy] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalResults, setTotalResults] = useState<number | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [consultantToDelete, setConsultantToDelete] = useState<string | null>(null);
  const itemsPerPage = 9;

  const handleDebouncedSearch = useMemo(
    () => debounce((value: unknown) => {
      setDebouncedValue(value as string);
      setCurrentPage(0);
    }, 300),
    []
  );

  // Server-side pagination & filtering
  const loadConsultants = useCallback(async (page: number = 0) => {
    if (!user) return;
    try {
      setLoading(true);
      setError(null);

      // Use server-side pagination with filtering
      const result = await getConsultantsPage({
        userId: user.id,
        limit: itemsPerPage,
        offset: page * itemsPerPage,
        search: debouncedValue || undefined,
        status: filterStatus !== 'ALL' ? filterStatus : undefined,
      });

      if (result.success && result.consultants) {
        setConsultants(result.consultants);
        setTotalResults(result.total ?? null);
        setSelectedConsultant(prev => {
          if (prev && result.consultants) {
            const updated = result.consultants.find(c => c.id === prev.id);
            return updated || prev;
          }
          return null;
        });
      } else if (result.error) {
        setError({ title: 'Failed to load consultants', message: result.error });
      }
    } catch {
      setError({ title: 'Error loading consultants', message: 'An unexpected error occurred' });
    } finally {
      setLoading(false);
    }
  }, [user, debouncedValue, filterStatus, itemsPerPage]);

  // Load consultants when filters change
  useEffect(() => {
    loadConsultants(0);
  }, [loadConsultants]);

  // Realtime subscription
  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    if (user) {
      unsubscribe = subscribeToConsultants(user.id, (update: RealtimeUpdate<Consultant>) => {
        if (update.type === 'INSERT') {
          // Refresh to include new item
          loadConsultants(0);
          showToast({
            type: 'info',
            title: 'New consultant',
            message: `"${update.record.name}" has been added`,
          });
        } else if (update.type === 'UPDATE') {
          setConsultants(prev =>
            prev.map(c => (c.id === update.record.id ? update.record : c))
          );
          setSelectedConsultant(prev =>
            prev?.id === update.record.id ? update.record : prev
          );
        } else if (update.type === 'DELETE') {
          setConsultants(prev => prev.filter(c => c.id !== update.record.id));
          setSelectedConsultant(prev => 
            prev?.id === update.record.id ? null : prev
          );
        }
      });
    }
    return () => { unsubscribe?.(); };
  }, [user, loadConsultants, showToast]);

  const handleDeleteClick = useCallback((id: string) => {
    if (!isAdmin) {
      showToast({
        type: 'error',
        title: 'Permission denied',
        message: 'Only admins can delete consultants.',
      });
      return;
    }
    setConsultantToDelete(id);
    setShowDeleteConfirm(true);
  }, [isAdmin, showToast]);

  const handleDelete = useCallback(async () => {
    if (!consultantToDelete) return;
    try {
      const result = await deleteConsultant(consultantToDelete, user?.id);
      if (result.success) {
        showToast({ type: 'success', title: 'Consultant deleted', message: 'The consultant has been removed.' });
        setShowDeleteConfirm(false);
        setConsultantToDelete(null);
        await loadConsultants(0);
      } else if (result.error) {
        setError({ title: 'Failed to delete', message: result.error });
      }
    } catch {
      setError({ title: 'Error', message: 'Failed to delete consultant' });
    }
  }, [consultantToDelete, loadConsultants, showToast, user?.id]);

  const handleStatusChange = useCallback(async (id: string, newStatus: string) => {
    try {
      const result = await updateConsultant(id, { status: newStatus }, user?.id);
      if (result.success) {
        await loadConsultants(currentPage);
        showToast({ type: 'success', title: 'Status updated', message: `Consultant marked as ${newStatus}` });
      } else if (result.error) {
        setError({ title: 'Failed to update', message: result.error });
      }
    } catch {
      setError({ title: 'Error', message: 'Failed to update consultant' });
    }
  }, [loadConsultants, currentPage, showToast, user?.id]);

  const handleViewDetails = (consultant: Consultant) => {
    setSelectedConsultant(consultant);
    setSelectedCreatedBy(null);
    setSelectedUpdatedBy(null);
  };

  const totalPages = totalResults ? Math.ceil(totalResults / itemsPerPage) : 1;

  if (loading) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Typography variant="h5" sx={{ fontWeight: 800 }}>
          Consultant Profiles
        </Typography>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' },
            gap: 2,
          }}
        >
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {/* Error Alert */}
      {error && (
        <ErrorAlert
          title={error.title}
          message={error.message}
          onRetry={loadConsultants}
          onDismiss={() => setError(null)}
        />
      )}

      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        alignItems={{ xs: 'flex-start', sm: 'center' }}
        justifyContent="space-between"
        spacing={2}
      >
        <Typography variant="h5" sx={{ fontWeight: 800 }}>
          Consultant Profiles
        </Typography>
        <Button
          variant="contained"
          color="primary"
          onClick={onQuickAdd}
          startIcon={<Plus className="w-4 h-4" />}
          sx={{ width: { xs: '100%', sm: 'auto' } }}
        >
          Quick Add
        </Button>
      </Stack>

      {/* Search and Filter */}
      <Paper variant="outlined" sx={{ p: 2 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ xs: 'stretch', sm: 'flex-start' }}>
          <Box sx={{ flex: 1 }}>
            <TextField
              fullWidth
              size="small"
              label="Search"
              placeholder="Search by name or email..."
              value={searchTerm}
              onChange={(e) => {
                const value = e.target.value;
                setSearchTerm(value);
                if (value.length > 100) {
                  setSearchError('Search term too long.');
                } else {
                  setSearchError(null);
                  handleDebouncedSearch(value);
                }
              }}
              error={Boolean(searchError)}
              helperText={searchError ?? ' '}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search className="w-5 h-5" />
                  </InputAdornment>
                ),
              }}
              aria-label="Search consultants"
            />
          </Box>

          <FormControl size="small" sx={{ minWidth: 180 }}>
            <InputLabel id="consultant-status-label">Status</InputLabel>
            <Select
              labelId="consultant-status-label"
              value={filterStatus}
              label="Status"
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <MenuItem value="ALL">All Status</MenuItem>
              <MenuItem value="Active">Active</MenuItem>
              <MenuItem value="Not Active">Not Active</MenuItem>
              <MenuItem value="Recently Placed">Recently Placed</MenuItem>
            </Select>
          </FormControl>
        </Stack>
      </Paper>

      {/* Consultant Cards Grid with Scrolling Container */}
      {consultants.length === 0 ? (
        <EmptyStateNoData type="consultants" onCreate={onQuickAdd} />
      ) : (
        <ConsultantGridVirtualizer 
          consultants={consultants}
          onViewDetails={handleViewDetails}
          onDelete={async (id: string) => {
            handleDeleteClick(id);
            // Return promise to match expected type
            return Promise.resolve();
          }}
          onStatusChange={handleStatusChange}
        />
      )}

      {/* Pagination Controls */}
      {totalResults && totalResults > itemsPerPage && (
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center" justifyContent="space-between">
            <Typography variant="body2" color="text.secondary">
              Showing {currentPage * itemsPerPage + 1} to {Math.min((currentPage + 1) * itemsPerPage, totalResults)} of {totalResults}
            </Typography>
            <Pagination
              count={totalPages}
              page={currentPage + 1}
              onChange={(_, page) => {
                const nextPage = Math.max(1, Math.min(page, totalPages));
                setCurrentPage(nextPage - 1);
                loadConsultants(nextPage - 1);
              }}
              color="primary"
              showFirstButton
              showLastButton
            />
          </Stack>
        </Paper>
      )}

      {/* Detail Modal */}
      <ConsultantDetailModal
        isOpen={selectedConsultant !== null}
        consultant={selectedConsultant}
        onClose={() => setSelectedConsultant(null)}
        onUpdate={loadConsultants}
        createdBy={selectedCreatedBy}
        updatedBy={selectedUpdatedBy}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => {
          setShowDeleteConfirm(false);
          setConsultantToDelete(null);
        }}
        onConfirm={handleDelete}
        title="Delete Consultant"
        message="Are you sure you want to delete this consultant? This action cannot be undone."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
      />
    </Box>
  );
};

interface ConsultantGridVirtualizerProps {
  consultants: Consultant[];
  onViewDetails: (consultant: Consultant) => void;
  onDelete: (id: string) => Promise<void>;
  onStatusChange: (id: string, status: string) => Promise<void>;
}

const ConsultantGridVirtualizer = ({ consultants, onViewDetails, onDelete, onStatusChange }: ConsultantGridVirtualizerProps) => {
  const { isAdmin } = useAuth();
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: consultants.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 350,
    overscan: 5,
  });

  const virtualItems = virtualizer.getVirtualItems();

  return (
    <Paper
      variant="outlined"
      ref={parentRef}
      sx={{ maxHeight: 600, overflowY: 'auto', p: 1 }}
    >
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: '1.5rem',
          height: `${virtualizer.getTotalSize()}px`,
        }}
      >
        {virtualItems.map((virtualItem) => {
          const consultant = consultants[virtualItem.index];
          const statusEmoji =
            consultant.status === 'Active'
              ? '🟢'
              : consultant.status === 'Recently Placed'
              ? '🔵'
              : '🔴';
          return (
            <div
              key={virtualItem.key}
              onClick={() => onViewDetails(consultant)}
            >
              <Card variant="outlined" sx={{ cursor: 'pointer', '&:hover': { boxShadow: 3 } }}>
                <CardContent>
                  <Stack direction="row" spacing={1} alignItems="flex-start" justifyContent="space-between">
                    <Typography variant="subtitle1" sx={{ fontWeight: 800, pr: 1, wordBreak: 'break-word' }}>
                      {consultant.name}
                    </Typography>
                    <Chip size="small" variant="outlined" label={`${statusEmoji} ${consultant.status ?? ''}`} />
                  </Stack>

                  <Stack spacing={0.5} sx={{ mt: 1 }}>
                    {consultant.email ? (
                      <Typography variant="body2" color="text.secondary" noWrap>
                        {consultant.email}
                      </Typography>
                    ) : null}
                    {consultant.primary_skills ? (
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {consultant.primary_skills}
                      </Typography>
                    ) : null}
                  </Stack>

                  <Divider sx={{ my: 2 }} />

                  <Stack direction="row" spacing={1} alignItems="center">
                    <FormControl size="small" sx={{ flex: 1 }}>
                      <InputLabel id={`consultant-status-${consultant.id}`}>Status</InputLabel>
                      <Select
                        labelId={`consultant-status-${consultant.id}`}
                        value={consultant.status ?? ''}
                        label="Status"
                        onChange={(e) => {
                          e.stopPropagation();
                          onStatusChange(consultant.id, String(e.target.value));
                        }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MenuItem value="Active">Active</MenuItem>
                        <MenuItem value="Not Active">Not Active</MenuItem>
                        <MenuItem value="Recently Placed">Recently Placed</MenuItem>
                      </Select>
                    </FormControl>
                    {isAdmin ? (
                      <IconButton
                        color="error"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDelete(consultant.id);
                        }}
                        title="Delete consultant"
                      >
                        <Trash2 className="w-4 h-4" />
                      </IconButton>
                    ) : null}
                  </Stack>
                </CardContent>
              </Card>
            </div>
          );
        })}
      </div>
    </Paper>
  );
};
