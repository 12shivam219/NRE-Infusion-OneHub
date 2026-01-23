import { useState, useEffect, useCallback, memo } from 'react';
import { Search, X, Calendar } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { getInterviewsPage, deleteInterview } from '../../lib/api/interviews';
import { getRequirements } from '../../lib/api/requirements';
import { subscribeToInterviews } from '../../lib/api/realtimeSync';
import type { Database } from '../../lib/database.types';
import { useToast } from '../../contexts/ToastContext';
import { DataTable, Column } from './DataTable';
import { InterviewDetailModal } from './InterviewDetailModal';
import { ErrorAlert } from '../common/ErrorAlert';
import { ConfirmDialog } from '../common/ConfirmDialog';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';

type Interview = Database['public']['Tables']['interviews']['Row'];
type Requirement = Database['public']['Tables']['requirements']['Row'];

export const InterviewTracking = memo(() => {
  const { user, isAdmin } = useAuth();
  const { showToast } = useToast();
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<{ title: string; message: string } | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalResults, setTotalResults] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [selectedInterview, setSelectedInterview] = useState<Interview | null>(null);
  const [selectedCreatedBy, setSelectedCreatedBy] = useState<string | null>(null);
  const [selectedUpdatedBy, setSelectedUpdatedBy] = useState<string | null>(null);
  const [interviewToDelete, setInterviewToDelete] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const itemsPerPage = 20;

  const loadInterviews = useCallback(async (page: number = 0) => {
    if (!user) return;
    
    try {
      setError(null);
      setLoading(true);
      
      const interviewsResult = await getInterviewsPage({
        userId: user.id,
        limit: itemsPerPage,
        offset: page * itemsPerPage,
        includeCount: true,
        scheduledFrom: filterDateFrom || undefined,
        scheduledTo: filterDateTo || undefined,
        orderBy: 'scheduled_date',
        orderDir: 'asc',
      });
      
      if (interviewsResult.success && interviewsResult.interviews) {
        setInterviews(interviewsResult.interviews as Interview[]);
        setTotalResults(interviewsResult.total ?? 0);
        
        // Update the selected interview if it exists with the new data
        setSelectedInterview(prev => {
          if (prev && interviewsResult.interviews) {
            const updatedInterview = interviewsResult.interviews.find(i => i.id === prev.id) as Interview | undefined;
            return updatedInterview || prev;
          }
          return null;
        });
      } else if (interviewsResult.error) {
        setError({ title: 'Failed to load interviews', message: interviewsResult.error });
      }
    } catch {
      setError({ title: 'Error loading interviews', message: 'An unexpected error occurred' });
    } finally {
      setLoading(false);
    }
  }, [user, itemsPerPage, filterDateFrom, filterDateTo]);

  const loadRequirements = useCallback(async () => {
    if (!user) return;
    
    try {
      const reqResult = await getRequirements(user.id);
      if (reqResult.success && reqResult.requirements) {
        setRequirements(reqResult.requirements);
      } else if (reqResult.error) {
        setError({ title: 'Failed to load requirements', message: reqResult.error });
      }
    } catch {
      setError({ title: 'Error loading requirements', message: 'An unexpected error occurred' });
    }
  }, [user]);

  useEffect(() => {
    // Initial load only
    setCurrentPage(0);
    loadInterviews(0);
    loadRequirements();
    
    let unsubscribe: (() => void) | undefined;
    if (user) {
      unsubscribe = subscribeToInterviews(user.id, () => {
        // Reload current page when changes occur to keep data fresh
        loadInterviews(currentPage);
      });
    }
    return () => { unsubscribe?.(); };
  }, [user, loadInterviews, loadRequirements, currentPage]);

  const handleViewDetails = (interview: Interview) => {
    setSelectedInterview(interview);
    setSelectedCreatedBy(null);
    setSelectedUpdatedBy(null);
  };

  const getRequirementTitle = (requirementId: string | null) => {
    if (!requirementId) return 'Unknown';
    const req = requirements.find(r => r.id === requirementId);
    return req ? `${req.title} - ${req.company}` : 'Unknown';
  };

  // Handle filter changes - reset to first page and reload
  useEffect(() => {
    setCurrentPage(0);
    loadInterviews(0);
  }, [filterDateFrom, filterDateTo, searchTerm, loadInterviews]);

  const columns: Column<Interview>[] = [
    {
      key: 'interview_with',
      label: 'Candidate Name',
      width: '20%',
      render: (item) => item.interview_with || '—',
    },
    {
      key: 'requirement_id',
      label: 'Job Requirement',
      width: '30%',
      render: (item) => getRequirementTitle(item.requirement_id),
    },
    {
      key: 'scheduled_date',
      label: 'Scheduled Date',
      width: '20%',
      render: (item) => item.scheduled_date ? new Date(item.scheduled_date).toLocaleDateString() : '—',
    },
    {
      key: 'status',
      label: 'Status',
      width: '15%',
      render: (item) => (
        <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold font-heading bg-blue-50 text-blue-700">
          <span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0 mr-1.5 animate-pulse" />
          {item.status}
        </span>
      ),
    },
  ];

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
        await loadInterviews(currentPage);
      } else if (result.error) {
        setError({ title: 'Failed to delete', message: result.error });
      }
    } catch {
      setError({ title: 'Error', message: 'Failed to delete interview' });
    }
  }, [interviewToDelete, loadInterviews, currentPage, showToast, user?.id]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Typography variant="h5" sx={{ fontWeight: 800, color: 'var(--text)', fontFamily: 'var(--font-heading)' }}>
          Interview Tracking
        </Typography>
        <Typography>Loading interviews...</Typography>
      </Box>
    );
  }

  const headerSearch = (
    <div className="flex-1 min-w-0 flex flex-col gap-2">
      <div className="flex flex-col sm:flex-row gap-2">
        <TextField
          size="small"
          label="Search Candidate or Company"
          placeholder="Search..."
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setCurrentPage(0);
          }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search className="w-4 h-4" />
              </InputAdornment>
            ),
          }}
          sx={{ flex: 1, '& .MuiOutlinedInput-root': { color: 'var(--text)', borderColor: 'rgba(234,179,8,0.2)', '&:hover': { borderColor: 'rgba(234,179,8,0.4)' } } }}
        />

        <TextField
          size="small"
          label="From Date"
          type="date"
          value={filterDateFrom}
          onChange={(e) => {
            setFilterDateFrom(e.target.value);
            setCurrentPage(0);
          }}
          InputLabelProps={{ shrink: true }}
          sx={{ flex: 1, '& .MuiOutlinedInput-root': { color: 'var(--text)', borderColor: 'rgba(234,179,8,0.2)', '&:hover': { borderColor: 'rgba(234,179,8,0.4)' } } }}
        />

        <TextField
          size="small"
          label="To Date"
          type="date"
          value={filterDateTo}
          onChange={(e) => {
            setFilterDateTo(e.target.value);
            setCurrentPage(0);
          }}
          InputLabelProps={{ shrink: true }}
          sx={{ flex: 1, '& .MuiOutlinedInput-root': { color: 'var(--text)', borderColor: 'rgba(234,179,8,0.2)', '&:hover': { borderColor: 'rgba(234,179,8,0.4)' } } }}
        />
      </div>

      {(searchTerm || filterDateFrom || filterDateTo) && (
        <button
          onClick={() => {
            setSearchTerm('');
            setFilterDateFrom('');
            setFilterDateTo('');
            setCurrentPage(0);
          }}
          className="text-xs font-body text-[color:var(--text-secondary)] hover:text-[color:var(--gold)] transition-colors flex items-center gap-1 w-fit"
        >
          <X className="w-3 h-3" />
          Clear Filters
        </button>
      )}
    </div>
  );

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {error && (
        <ErrorAlert
          title={error.title}
          message={error.message}
          onRetry={() => {
            setCurrentPage(0);
            loadInterviews(0);
            loadRequirements();
          }}
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

      <DataTable
        data={interviews}
        columns={columns}
        onViewDetails={handleViewDetails}
        onDelete={handleDeleteClick}
        onRowClick={handleViewDetails}
        isAdmin={isAdmin}
        title="Interviews"
        page={currentPage}
        hasNextPage={(totalResults ?? 0) > (currentPage + 1) * itemsPerPage}
        isFetchingPage={loading}
        onPageChange={(page) => {
          setCurrentPage(page);
          loadInterviews(page);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        headerSearch={headerSearch}
        emptyStateIcon={Calendar as React.FC<{ className?: string }>}
        emptyStateMessage="No interviews found"
      />

      <InterviewDetailModal
        isOpen={selectedInterview !== null}
        interview={selectedInterview}
        onClose={() => setSelectedInterview(null)}
        onUpdate={() => {
          setCurrentPage(0);
          loadInterviews(0);
        }}
        createdBy={selectedCreatedBy}
        updatedBy={selectedUpdatedBy}
      />

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
