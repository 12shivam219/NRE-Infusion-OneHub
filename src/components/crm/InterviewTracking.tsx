import { useState, useEffect, useCallback } from 'react';
import { Plus, Search, X } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { getInterviews, updateInterview, deleteInterview } from '../../lib/api/interviews';
import { getRequirements } from '../../lib/api/requirements';
import type { Database } from '../../lib/database.types';
import { useToast } from '../../contexts/ToastContext';
import InterviewCard from './InterviewCard';
import { InterviewDetailModal } from './InterviewDetailModal';

type Interview = Database['public']['Tables']['interviews']['Row'];
type Requirement = Database['public']['Tables']['requirements']['Row'];

const interviewStatusColors: Record<string, { badge: string; dot: string }> = {
  'Confirmed': { badge: 'bg-green-50 text-green-700 border-green-200', dot: 'bg-green-500' },
  'Pending': { badge: 'bg-yellow-50 text-yellow-700 border-yellow-200', dot: 'bg-yellow-500' },
  'Scheduled': { badge: 'bg-blue-50 text-blue-700 border-blue-200', dot: 'bg-blue-500' },
  'Completed': { badge: 'bg-purple-50 text-purple-700 border-purple-200', dot: 'bg-purple-500' },
  'Cancelled': { badge: 'bg-red-50 text-red-700 border-red-200', dot: 'bg-red-500' },
  'Re-Scheduled': { badge: 'bg-orange-50 text-orange-700 border-orange-200', dot: 'bg-orange-500' },
};

const ITEMS_PER_PAGE = 12;

interface InterviewTrackingProps {
  onQuickAdd?: () => void;
}

export const InterviewTracking = ({ onQuickAdd }: InterviewTrackingProps) => {
  const { user, isAdmin } = useAuth();
  const { showToast } = useToast();
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [selectedInterview, setSelectedInterview] = useState<Interview | null>(null);
  const [selectedCreatedBy, setSelectedCreatedBy] = useState<string | null>(null);
  const [selectedUpdatedBy, setSelectedUpdatedBy] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!user) return;
    
    const interviewsResult = await getInterviews(user.id);
    if (interviewsResult.success && interviewsResult.interviews) {
      setInterviews(interviewsResult.interviews);
    } else if (interviewsResult.error) {
      showToast({ type: 'error', title: 'Failed to load interviews', message: interviewsResult.error });
    }
    
    const reqResult = await getRequirements(user.id);
    if (reqResult.success && reqResult.requirements) {
      setRequirements(reqResult.requirements);
    } else if (reqResult.error) {
      showToast({ type: 'error', title: 'Failed to load requirements', message: reqResult.error });
    }
    setLoading(false);
    setCurrentPage(1);
  }, [user, showToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleDelete = useCallback(async (id: string) => {
    if (!isAdmin) {
      showToast({
        type: 'error',
        title: 'Permission denied',
        message: 'Only admins can delete interviews.',
      });
      return;
    }

    if (confirm('Are you sure you want to delete this interview?')) {
      const result = await deleteInterview(id);
      if (result.success) {
        await loadData();
        showToast({ type: 'success', title: 'Interview deleted', message: 'The interview has been removed.' });
      } else if (result.error) {
        showToast({ type: 'error', title: 'Failed to delete interview', message: result.error });
      }
    }
  }, [loadData, isAdmin, showToast]);

  const handleStatusChange = useCallback(async (id: string, status: string) => {
    if (!user) return;
    const result = await updateInterview(id, { status }, user.id);
    if (result.success) {
      await loadData();
      showToast({ type: 'success', title: 'Status updated', message: `Interview marked as ${status}` });
    } else if (result.error) {
      showToast({ type: 'error', title: 'Failed to update interview', message: result.error });
    }
  }, [loadData, user, showToast]);

  const handleViewDetails = (interview: Interview) => {
    setSelectedInterview(interview);
    // These fields will be added when database is updated
    setSelectedCreatedBy((interview as unknown as { created_by?: string }).created_by || null);
    setSelectedUpdatedBy((interview as unknown as { updated_by?: string }).updated_by || null);
  };

  const getRequirementTitle = (requirementId: string) => {
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
      <div className="space-y-6">
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <p className="text-gray-500">Loading interviews...</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 lg:gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white border border-gray-200 rounded-xl sm:rounded-2xl shadow-sm overflow-hidden animate-pulse h-96">
              <div className="h-24 bg-gradient-to-r from-gray-300 to-gray-200" />
              <div className="p-4 space-y-3">
                <div className="h-3 bg-gray-200 rounded w-3/4" />
                <div className="h-3 bg-gray-200 rounded w-1/2" />
                <div className="h-20 bg-gray-100 rounded" />
                <div className="space-y-2">
                  <div className="h-3 bg-gray-200 rounded" />
                  <div className="h-3 bg-gray-200 rounded w-5/6" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
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
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Interview Tracking</h2>
        <button
          onClick={onQuickAdd}
          className="w-full sm:w-auto px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 flex items-center justify-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Quick Add
        </button>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Search Candidate or Company</label>
            <div className="relative">
              <input
                type="text"
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">From Date</label>
            <input
              type="date"
              value={filterDateFrom}
              onChange={(e) => {
                setFilterDateFrom(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">To Date</label>
            <input
              type="date"
              value={filterDateTo}
              onChange={(e) => {
                setFilterDateTo(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {(searchTerm || filterDateFrom || filterDateTo) && (
          <button
            onClick={() => {
              setSearchTerm('');
              setFilterDateFrom('');
              setFilterDateTo('');
              setCurrentPage(1);
            }}
            className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 px-3 py-1.5 rounded-lg transition"
          >
            <X className="w-4 h-4" />
            Clear Filters
          </button>
        )}
      </div>

      <div className="border-b border-gray-200 overflow-x-auto">
        <div className="flex gap-4 sm:gap-8 min-w-full sm:min-w-0">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                setCurrentPage(1);
              }}
              className={`py-3 px-1 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap transition ${
                activeTab === tab.id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              <span className="hidden sm:inline">{tab.label}</span>
              <span className="sm:hidden">{tab.label.split('(')[0].trim()}</span> ({tab.count})
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3 sm:space-y-4">
        {filteredInterviews.length === 0 ? (
          <div className="text-center py-8 sm:py-12 bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg border border-gray-200">
            <p className="text-sm sm:text-base text-gray-500 font-medium">No interviews found in this category</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 lg:gap-6">
              {paginatedInterviews.map(interview => (
                <div key={interview.id} onClick={() => handleViewDetails(interview)} className="cursor-pointer">
                  <InterviewCard
                    interview={interview}
                    requirementTitle={getRequirementTitle(interview.requirement_id)}
                    statusColor={interviewStatusColors[interview.status] || { badge: 'bg-gray-50 text-gray-700 border-gray-200', dot: 'bg-gray-500' }}
                    onStatusChange={handleStatusChange}
                    onDelete={handleDelete}
                  />
                </div>
              ))}
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-6 sm:mt-8">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="px-3 py-2 text-sm font-semibold border border-gray-300 rounded-lg bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  Previous
                </button>
                
                <div className="flex items-center gap-1 sm:gap-2">
                  {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                    const page = currentPage <= 3 ? i + 1 : currentPage - 2 + i;
                    if (page > totalPages) return null;
                    return (
                      <button
                        key={page}
                        onClick={() => handlePageChange(page)}
                        className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg font-semibold transition ${
                          currentPage === page
                            ? 'bg-blue-600 text-white'
                            : 'border border-gray-300 bg-white hover:bg-gray-50 text-gray-900'
                        }`}
                      >
                        {page}
                      </button>
                    );
                  })}
                </div>

                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="px-3 py-2 text-sm font-semibold border border-gray-300 rounded-lg bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  Next
                </button>
              </div>
            )}

            {totalPages > 1 && (
              <div className="text-center text-xs sm:text-sm text-gray-600 mt-4">
                Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1} - {Math.min(currentPage * ITEMS_PER_PAGE, filteredInterviews.length)} of {filteredInterviews.length} interviews ({totalPages} page{totalPages !== 1 ? 's' : ''})
              </div>
            )}
          </>
        )}
      </div>

      <InterviewDetailModal
        isOpen={selectedInterview !== null}
        interview={selectedInterview}
        onClose={() => setSelectedInterview(null)}
        onUpdate={loadData}
        createdBy={selectedCreatedBy}
        updatedBy={selectedUpdatedBy}
      />
    </div>
  );
};
