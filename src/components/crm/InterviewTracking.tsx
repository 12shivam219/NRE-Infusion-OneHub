import { useState, useEffect, useCallback, useRef, memo } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Search, X } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { getInterviews, updateInterview, deleteInterview } from '../../lib/api/interviews';
import { getRequirements } from '../../lib/api/requirements';
import { subscribeToInterviews } from '../../lib/api/realtimeSync';
import type { Database } from '../../lib/database.types';
import { useToast } from '../../contexts/ToastContext';
import InterviewCard from './InterviewCard';
import { InterviewDetailModal } from './InterviewDetailModal';
import { ErrorAlert } from '../common/ErrorAlert';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { EmptyStateNoData } from '../common/EmptyState';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Chip from '@mui/material/Chip';
import Pagination from '@mui/material/Pagination';
import Divider from '@mui/material/Divider';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Skeleton from '@mui/material/Skeleton';

type Interview = Database['public']['Tables']['interviews']['Row'];
type Requirement = Database['public']['Tables']['requirements']['Row'];

type RealtimeUpdate<T> = { type: 'INSERT' | 'UPDATE' | 'DELETE'; record: T };

const ITEMS_PER_PAGE = 12;

export const InterviewTracking = memo(() => {
  const { user, isAdmin } = useAuth();
  const { showToast } = useToast();
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<{ title: string; message: string } | null>(null);
  const [activeTab, setActiveTab] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [selectedInterview, setSelectedInterview] = useState<Interview | null>(null);
  const [selectedCreatedBy, setSelectedCreatedBy] = useState<string | null>(null);
  const [selectedUpdatedBy, setSelectedUpdatedBy] = useState<string | null>(null);
  const [jumpToPageInput, setJumpToPageInput] = useState('');
  const [interviewToDelete, setInterviewToDelete] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const loadData = useCallback(async () => {
    if (!user) return;
    
    try {
      setError(null);
      const interviewsResult = await getInterviews(user.id);
      if (interviewsResult.success && interviewsResult.interviews) {
        setInterviews(interviewsResult.interviews);
        
        // Update the selected interview if it exists with the new data
        setSelectedInterview(prev => {
          if (prev && interviewsResult.interviews) {
            const updatedInterview = interviewsResult.interviews.find(i => i.id === prev.id);
            return updatedInterview || prev;
          }
          return null;
        });
      } else if (interviewsResult.error) {
        setError({ title: 'Failed to load interviews', message: interviewsResult.error });
      }
      
      const reqResult = await getRequirements(user.id);
      if (reqResult.success && reqResult.requirements) {
        setRequirements(reqResult.requirements);
      } else if (reqResult.error) {
        setError({ title: 'Failed to load requirements', message: reqResult.error });
      }
    } catch {
      setError({ title: 'Error loading data', message: 'An unexpected error occurred' });
    } finally {
      setLoading(false);
      // Only reset page on initial load, not on data refresh
      // This prevents pagination reset interrupting user navigation
    }
  }, [user]);

  useEffect(() => {
    // Initial load only - reset page on first mount
    setCurrentPage(1);
    loadData();
    let unsubscribe: (() => void) | undefined;
    if (user) {
      unsubscribe = subscribeToInterviews(user.id, (update: RealtimeUpdate<Interview>) => {
        if (update.type === 'INSERT') {
          setInterviews(prev => [update.record, ...prev]);
        } else if (update.type === 'UPDATE') {
          setInterviews(prev =>
            prev.map(i => (i.id === update.record.id ? update.record : i))
          );
          // Update selected interview if it matches
          setSelectedInterview(prev =>
            prev?.id === update.record.id ? update.record : prev
          );
        } else if (update.type === 'DELETE') {
          setInterviews(prev => prev.filter(i => i.id !== update.record.id));
          // Clear selected interview if it was deleted
          setSelectedInterview(prev =>
            prev?.id === update.record.id ? null : prev
          );
        }
      });
    }
    return () => { unsubscribe?.(); };
  }, [loadData, user]);

  const handleDeleteClick = useCallback((id: string) => {
    if (!isAdmin) {
      showToast({
        type: 'error',
        title: 'Permission denied',
        message: 'Only admins can delete interviews.',
      });
      return;
    }
    setInterviewToDelete(id);
    setShowDeleteConfirm(true);
  }, [isAdmin, showToast]);

  const handleDelete = useCallback(async () => {
    if (!interviewToDelete) return;
    try {
      const result = await deleteInterview(interviewToDelete, user?.id);
      if (result.success) {
        showToast({ type: 'success', title: 'Interview deleted', message: 'The interview has been removed.' });
        setShowDeleteConfirm(false);
        setInterviewToDelete(null);
        await loadData();
      } else if (result.error) {
        setError({ title: 'Failed to delete', message: result.error });
      }
    } catch {
      setError({ title: 'Error', message: 'Failed to delete interview' });
    }
  }, [interviewToDelete, loadData, showToast, user?.id]);

  const handleStatusChange = useCallback(async (id: string, status: string) => {
    if (!user) return;
    const result = await updateInterview(id, { status }, user?.id);
    if (result.success) {
      await loadData();
      showToast({ type: 'success', title: 'Status updated', message: `Interview marked as ${status}` });
    } else if (result.error) {
      showToast({ type: 'error', title: 'Failed to update interview', message: result.error });
    }
  }, [loadData, user, showToast]);

  const handleViewDetails = (interview: Interview) => {
    setSelectedInterview(interview);
    // Interviews table doesn't currently have created_by/updated_by fields
    setSelectedCreatedBy(null);
    setSelectedUpdatedBy(null);
  };

  const getRequirementTitle = (requirementId: string | null) => {
    if (!requirementId) return 'Unknown';
    const req = requirements.find(r => r.id === requirementId);
    return req ? `${req.title} - ${req.company}` : 'Unknown';
  };

  const filterInterviews = (status: string) => {
    let filtered = status === 'all' 
      ? interviews 
      : interviews.filter(i => {
          const lowerStatus = i.status.toLowerCase();
          return lowerStatus.includes(status.toLowerCase());
        });

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(i => {
        const candidateName = i.interview_with?.toLowerCase() || '';
        const requirementInfo = getRequirementTitle(i.requirement_id).toLowerCase();
        const company = requirementInfo.split(' - ')[1]?.toLowerCase() || '';
        return candidateName.includes(term) || requirementInfo.includes(term) || company.includes(term);
      });
    }

    if (filterDateFrom || filterDateTo) {
      filtered = filtered.filter(i => {
        const interviewDate = new Date(i.scheduled_date).getTime();
        const fromDate = filterDateFrom ? new Date(filterDateFrom).getTime() : 0;
        const toDate = filterDateTo ? new Date(filterDateTo).getTime() + 86400000 : Infinity;
        return interviewDate >= fromDate && interviewDate <= toDate;
      });
    }

    return filtered;
  };

  const filteredInterviews = filterInterviews(activeTab);
  const totalPages = Math.ceil(filteredInterviews.length / ITEMS_PER_PAGE);
  const paginatedInterviews = filteredInterviews.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const handlePageChange = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' },
            gap: 2,
          }}
        >
          {[...Array(6)].map((_, i) => (
            <Card key={i}>
              <CardContent>
                <Skeleton variant="text" width="60%" />
                <Skeleton variant="text" width="45%" />
                <Skeleton variant="rounded" height={140} sx={{ mt: 1 }} />
                <Skeleton variant="text" sx={{ mt: 1 }} />
                <Skeleton variant="text" width="80%" />
              </CardContent>
            </Card>
          ))}
        </Box>
      </Box>
    );
  }

  const tabs = [
    { id: 'all', label: 'All Interviews', count: interviews.length },
    { id: 'confirmed', label: 'Confirmed', count: interviews.filter(i => i.status.toLowerCase().includes('confirmed')).length },
    { id: 'rescheduled', label: 'Re-Scheduled', count: interviews.filter(i => i.status.toLowerCase().includes('rescheduled')).length },
    { id: 'cancelled', label: 'Cancelled', count: interviews.filter(i => i.status.toLowerCase().includes('cancelled')).length },
    { id: 'completed', label: 'Completed', count: interviews.filter(i => i.status.toLowerCase().includes('completed')).length },
  ];

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {error && (
        <ErrorAlert
          title={error.title}
          message={error.message}
          onRetry={loadData}
          onDismiss={() => setError(null)}
        />
      )}

      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        alignItems={{ xs: 'flex-start', sm: 'center' }}
        justifyContent="space-between"
        spacing={2}
      >
        <Typography variant="h5" sx={{ fontWeight: 800, color: 'var(--text)', fontFamily: 'var(--font-heading)' }}>
          Interview Tracking
        </Typography>
      </Stack>

      <Paper variant="outlined" sx={{ p: 2, bgcolor: 'var(--darkbg-surface)', borderColor: 'rgba(234,179,8,0.2)' }}>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' },
            gap: 2,
          }}
        >
          <TextField
            size="small"
            label="Search Candidate or Company"
            placeholder="Search..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search className="w-4 h-4" />
                </InputAdornment>
              ),
            }}
            sx={{ '& .MuiOutlinedInput-root': { color: 'var(--text)', borderColor: 'rgba(234,179,8,0.2)', '&:hover': { borderColor: 'rgba(234,179,8,0.4)' } }, '& .MuiInputBase-input::placeholder': { color: 'var(--text-secondary)', opacity: 0.7 } }}
          />

          <TextField
            size="small"
            label="From Date"
            type="date"
            value={filterDateFrom}
            onChange={(e) => {
              setFilterDateFrom(e.target.value);
              setCurrentPage(1);
            }}
            InputLabelProps={{ shrink: true }}
            sx={{ '& .MuiOutlinedInput-root': { color: 'var(--text)', borderColor: 'rgba(234,179,8,0.2)', '&:hover': { borderColor: 'rgba(234,179,8,0.4)' } } }}
          />

          <TextField
            size="small"
            label="To Date"
            type="date"
            value={filterDateTo}
            onChange={(e) => {
              setFilterDateTo(e.target.value);
              setCurrentPage(1);
            }}
            InputLabelProps={{ shrink: true }}
            sx={{ '& .MuiOutlinedInput-root': { color: 'var(--text)', borderColor: 'rgba(234,179,8,0.2)', '&:hover': { borderColor: 'rgba(234,179,8,0.4)' } } }}
          />
        </Box>

        {(searchTerm || filterDateFrom || filterDateTo) ? (
          <button
            onClick={() => {
              setSearchTerm('');
              setFilterDateFrom('');
              setFilterDateTo('');
              setCurrentPage(1);
            }}
            className="mt-1 text-xs font-body text-[color:var(--text-secondary)] hover:text-[color:var(--gold)] transition-colors flex items-center gap-1"
          >
            <X className="w-3 h-3" />
            Clear Filters
          </button>
        ) : null}
      </Paper>

      <Paper variant="outlined" sx={{ overflow: 'hidden', bgcolor: 'var(--darkbg-surface)', borderColor: 'rgba(234,179,8,0.2)' }}>
        <Tabs
          value={activeTab}
          onChange={(_, value) => {
            setActiveTab(value);
            setCurrentPage(1);
          }}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            '& .MuiTab-root': { color: 'var(--text-secondary)', '&.Mui-selected': { color: 'var(--gold)' } },
            '& .MuiTabs-indicator': { backgroundColor: 'var(--gold)' },
          }}
        >
          {tabs.map((tab) => (
            <Tab
              key={tab.id}
              value={tab.id}
              label={
                <Stack direction="row" spacing={1} alignItems="center">
                  <Box component="span">{tab.label}</Box>
                  <Chip size="small" label={tab.count} variant="outlined" sx={{ borderColor: 'rgba(234,179,8,0.3)', color: 'var(--gold)' }} />
                </Stack>
              }
            />
          ))}
        </Tabs>
        <Divider sx={{ borderColor: 'rgba(234,179,8,0.1)' }} />

        <Box sx={{ p: 2 }}>
          {filteredInterviews.length === 0 ? (
            <Paper variant="outlined" sx={{ p: 3, bgcolor: 'var(--darkbg-surface-light)', borderColor: 'rgba(234,179,8,0.2)' }}>
              <EmptyStateNoData type="interviews" />
            </Paper>
          ) : (
            <Stack spacing={2}>
              <InterviewListVirtualizer
                interviews={paginatedInterviews}
                getRequirementTitle={getRequirementTitle}
                onStatusChange={handleStatusChange}
                onDelete={async (id: string) => {
                  handleDeleteClick(id);
                  return Promise.resolve();
                }}
                onViewDetails={handleViewDetails}
              />

              {totalPages > 1 ? (
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center" justifyContent="space-between">
                  <Pagination
                    count={totalPages}
                    page={currentPage}
                    onChange={(_, page) => handlePageChange(page)}
                    sx={{
                      '& .MuiPaginationItem-root': { color: 'var(--text-secondary)', '&.Mui-selected': { bgcolor: 'var(--gold)', color: 'var(--dark-bg)' }, '&:hover': { bgcolor: 'rgba(234,179,8,0.1)' } },
                    }}
                    showFirstButton
                    showLastButton
                    siblingCount={1}
                    boundaryCount={1}
                  />

                  {totalPages > 5 ? (
                    <TextField
                      size="small"
                      label="Go to"
                      type="number"
                      inputProps={{ min: 1, max: totalPages }}
                      value={jumpToPageInput}
                      onChange={(e) => setJumpToPageInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          const page = parseInt(jumpToPageInput) || currentPage;
                          handlePageChange(page);
                          setJumpToPageInput('');
                        }
                      }}
                      sx={{ width: 120 }}
                    />
                  ) : null}
                </Stack>
              ) : null}

              {totalPages > 1 ? (
                <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center' }}>
                  Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1} - {Math.min(currentPage * ITEMS_PER_PAGE, filteredInterviews.length)} of {filteredInterviews.length} interviews ({totalPages} page{totalPages !== 1 ? 's' : ''})
                </Typography>
              ) : null}
            </Stack>
          )}
        </Box>
      </Paper>

      <InterviewDetailModal
        isOpen={selectedInterview !== null}
        interview={selectedInterview}
        onClose={() => setSelectedInterview(null)}
        onUpdate={loadData}
        createdBy={selectedCreatedBy}
        updatedBy={selectedUpdatedBy}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => {
          setShowDeleteConfirm(false);
          setInterviewToDelete(null);
        }}
        onConfirm={handleDelete}
        title="Delete Interview"
        message="Are you sure you want to delete this interview? This action cannot be undone."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
      />
    </Box>
  );
});

interface InterviewListVirtualizerProps {
  interviews: Interview[];
  getRequirementTitle: (id: string | null) => string;
  onStatusChange: (id: string, newStatus: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onViewDetails: (interview: Interview) => void;
}

const InterviewListVirtualizer = ({ interviews, getRequirementTitle, onStatusChange, onDelete, onViewDetails }: InterviewListVirtualizerProps) => {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: interviews.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 280,
    overscan: 10,
  });

  const virtualItems = virtualizer.getVirtualItems();

  return (
    <Paper variant="outlined" ref={parentRef} sx={{ maxHeight: 700, overflowY: 'auto', bgcolor: 'var(--darkbg-surface)', borderColor: 'rgba(234,179,8,0.2)' }}>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
          gap: '1rem',
          padding: '0.5rem',
          height: `${virtualizer.getTotalSize()}px`,
        }}
      >
        {virtualItems.map((virtualItem) => (
          <div
            key={virtualItem.key}
            data-index={virtualItem.index}
          >
            <InterviewCard
              interview={interviews[virtualItem.index]}
              requirementTitle={getRequirementTitle(interviews[virtualItem.index].requirement_id)}
              onStatusChange={onStatusChange}
              onDelete={onDelete}
              onViewDetails={onViewDetails}
            />
          </div>
        ))}
      </div>
    </Paper>
  );
};
