import { useState, useEffect, useCallback, useMemo } from 'react';
import { Search, Plus, Trash2, Download, Eye, Sparkles, Cog, Calendar, CheckCircle, XCircle, Lock, ArrowUpDown } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { debounce } from '../../lib/utils';
import { getRequirements, deleteRequirement, type RequirementWithLogs } from '../../lib/api/requirements';
import type { Database, RequirementStatus } from '../../lib/database.types';
import { useToast } from '../../contexts/ToastContext';
import { calculateDaysOpen } from '../../lib/requirementUtils';
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
  INTERVIEW: { badge: 'bg-purple-100 text-purple-800', label: 'Interview' },
  OFFER: { badge: 'bg-green-100 text-green-800', label: 'Offer' },
  REJECTED: { badge: 'bg-red-100 text-red-800', label: 'Rejected' },
  CLOSED: { badge: 'bg-gray-100 text-gray-800', label: 'Closed' },
};

interface RequirementsManagementProps {
  onQuickAdd?: () => void;
}

export const RequirementsManagement = ({ onQuickAdd }: RequirementsManagementProps) => {
  const { user, isAdmin } = useAuth();
  const { showToast } = useToast();
  const [requirements, setRequirements] = useState<RequirementWithLogs[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<{ title: string; message: string } | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedValue, setDebouncedValue] = useState('');
  const [filterStatus, setFilterStatus] = useState<RequirementStatus | 'ALL'>('ALL');
  const [sortBy, setSortBy] = useState<'date' | 'company' | 'daysOpen'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(0);
  const [itemsPerPage, setItemsPerPage] = useState(6);
  const [jumpToPageInput, setJumpToPageInput] = useState('');
  const [showReport, setShowReport] = useState(false);
  const [selectedRequirement, setSelectedRequirement] = useState<Requirement | null>(null);
  const [selectedJDRequirement, setSelectedJDRequirement] = useState<Requirement | null>(null);
  const [selectedCreatedBy, setSelectedCreatedBy] = useState<string | null>(null);
  const [selectedUpdatedBy, setSelectedUpdatedBy] = useState<string | null>(null);

  const handleDebouncedSearch = useMemo(
    () => debounce((value: unknown) => {
      setDebouncedValue(value as string);
      setCurrentPage(0);
    }, 300),
    []
  );

  const loadRequirements = useCallback(async () => {
    if (!user) return;
    try {
      setError(null);
      const reqResult = await getRequirements(user.id);
      if (reqResult.success && reqResult.requirements) {
        setRequirements(reqResult.requirements);
      } else {
        setError({
          title: 'Failed to load requirements',
          message: reqResult.error || 'An unexpected error occurred',
        });
      }
    } catch (err) {
      setError({
        title: 'Error',
        message: err instanceof Error ? err.message : 'Failed to load requirements',
      });
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadRequirements();

    // Subscribe to real-time changes
    let unsubscribe: (() => void) | undefined;
    if (user) {
      unsubscribe = subscribeToRequirements(user.id, (update: RealtimeUpdate<Requirement>) => {
        if (update.type === 'INSERT') {
          setRequirements(prev => [update.record, ...prev]);
        } else if (update.type === 'UPDATE') {
          setRequirements(prev =>
            prev.map(r => (r.id === update.record.id ? update.record : r))
          );
        } else if (update.type === 'DELETE') {
          setRequirements(prev => prev.filter(r => r.id !== update.record.id));
        }
      });
    }

    return () => {
      unsubscribe?.();
    };
  }, [loadRequirements, user]);

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
        const result = await deleteRequirement(requirement.id);
        if (result.success) {
          setSelectedRequirement(null);
          showToast({ type: 'success', title: 'Requirement deleted', message: 'The requirement has been removed.' });
          await loadRequirements();
        } else {
          showToast({ type: 'error', title: 'Failed to delete', message: result.error || 'Unknown error' });
        }
      } catch {
        showToast({ type: 'error', title: 'Error', message: 'Failed to delete requirement' });
      }
    }
  }, [selectedRequirement, isAdmin, showToast, loadRequirements]);

  const handleViewDetails = (req: Requirement) => {
    setSelectedRequirement(req);
    setSelectedCreatedBy((req as unknown as { created_by?: string }).created_by || null);
    setSelectedUpdatedBy((req as unknown as { updated_by?: string }).updated_by || null);
  };

  const filteredRequirements = useMemo(() => {
    const filtered = requirements.filter(req => {
      const matchesSearch = 
        req.title.toLowerCase().includes(debouncedValue.toLowerCase()) ||
        req.company?.toLowerCase().includes(debouncedValue.toLowerCase());
      const matchesFilter = filterStatus === 'ALL' || req.status === filterStatus;
      return matchesSearch && matchesFilter;
    });

    // Apply sorting
    filtered.sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'company':
          comparison = (a.company || '').localeCompare(b.company || '');
          break;
        case 'daysOpen':
          comparison = calculateDaysOpen(a.created_at) - calculateDaysOpen(b.created_at);
          break;
        case 'date':
        default:
          comparison = new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
          break;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return filtered;
    }, [requirements, debouncedValue, filterStatus, sortBy, sortOrder]);

  const totalPages = Math.ceil(filteredRequirements.length / itemsPerPage);
  const paginatedRequirements = useMemo(() => {
    const start = currentPage * itemsPerPage;
    return filteredRequirements.slice(start, start + itemsPerPage);
  }, [filteredRequirements, currentPage, itemsPerPage]);

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
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Requirements Management</h2>
        <div className="flex gap-2 w-full sm:w-auto">
          <button
            onClick={() => setShowReport(true)}
            className="px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 flex items-center justify-center gap-2"
          >
            <Download className="w-4 h-4" />
            Report
          </button>
          <button
            onClick={onQuickAdd}
            className="flex-1 sm:flex-none px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Create Requirement
          </button>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row gap-4 flex-wrap">
          <div className="flex-1 min-w-[250px] relative">
            <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by company or role..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                handleDebouncedSearch(e.target.value);
              }}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm"
              title="Search for requirements by company name or job title"
            />
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as RequirementStatus | 'ALL')}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm"
            title="Filter requirements by status"
          >
            <option value="ALL">All Statuses</option>
            <option value="NEW">New</option>
            <option value="IN_PROGRESS">In Progress</option>
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
        </div>
      </div>

      {/* Requirements Cards - Responsive Grid & Virtualized */}
      <div className="w-full">
        {filteredRequirements.length === 0 ? (
          <div className="text-center py-16 bg-gradient-to-b from-gray-50 to-white rounded-lg border border-gray-200">
            <Sparkles className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600 font-medium mb-2">No requirements found</p>
            <p className="text-sm text-gray-500 mb-6">Create your first requirement to get started tracking job opportunities.</p>
            <button
              onClick={onQuickAdd}
              className="inline-flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition"
            >
              <Plus className="w-4 h-4" />
              Create First Requirement
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5 lg:gap-6">
            {paginatedRequirements.map(req => {
              return (
                <div
                  key={req.id}
                  className="bg-white border border-gray-200 rounded-xl sm:rounded-2xl shadow-sm hover:shadow-xl transition-all duration-200 overflow-hidden flex flex-col h-full min-w-0"
                >
                  {/* ZONE 1: IDENTITY ZONE - Job Title, Status */}
                  <div className="p-3 sm:p-5 lg:p-6 pb-2 sm:pb-4 border-b border-gray-100">
                    {/* Title with Status Icon */}
                    <div className="flex flex-col sm:flex-row items-start justify-between gap-2 sm:gap-3 mb-2 sm:mb-3">
                      <h3 className="text-base sm:text-lg md:text-xl font-bold text-gray-900 flex items-center gap-1.5 sm:gap-2 flex-1 min-w-0">
                        {getStatusIcon(req.status)}
                        <span className="line-clamp-2">{req.title}</span>
                      </h3>
                    </div>

                    {/* Badges: Status */}
                    <div className="flex flex-wrap gap-2 mb-2 sm:mb-3">
                      <span className={`inline-flex items-center gap-1 px-2.5 sm:px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${statusColors[req.status].badge}`}>
                        {statusColors[req.status].label}
                      </span>
                    </div>

                    {/* Company Name - Subtle Secondary Context */}
                    <p className="text-xs sm:text-sm text-gray-500 truncate">
                      <span className="text-gray-400">From</span> <span className="font-semibold text-gray-700">{req.company || 'N/A'}</span>
                    </p>
                  </div>

                  {/* ZONE 2: KEY INFO GRID - Vendor Contact & Context */}
                  <div className="px-3 sm:px-5 lg:px-6 py-2 sm:py-4 bg-gray-50 border-b border-gray-100">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-2 sm:gap-4">
                      {/* Vendor Name */}
                      {req.vendor_company && (
                        <div className="flex flex-col min-w-0">
                          <span className="text-xs text-gray-500 uppercase tracking-wide font-semibold mb-1">🏢 Vendor</span>
                          <span className="text-xs sm:text-sm font-bold text-gray-900 truncate">{req.vendor_company}</span>
                        </div>
                      )}

                      {/* Vendor Email */}
                      {req.vendor_email && (
                        <div className="flex flex-col min-w-0">
                          <span className="text-xs text-gray-500 uppercase tracking-wide font-semibold mb-1">📧 Email</span>
                          <span className="text-xs sm:text-sm font-bold text-gray-900 truncate">{req.vendor_email}</span>
                        </div>
                      )}

                      {/* Vendor Phone */}
                      {req.vendor_phone && (
                        <div className="flex flex-col min-w-0">
                          <span className="text-xs text-gray-500 uppercase tracking-wide font-semibold mb-1">📱 Phone</span>
                          <span className="text-xs sm:text-sm font-bold text-gray-900 truncate">{req.vendor_phone}</span>
                        </div>
                      )}

                      {/* Tech Stack (First item) */}
                      {req.primary_tech_stack && (
                        <div className="flex flex-col min-w-0">
                          <span className="text-xs text-gray-500 uppercase tracking-wide font-semibold mb-1">🧩 Tech</span>
                          <span className="text-xs sm:text-sm font-bold text-gray-900 truncate">{req.primary_tech_stack.split(',')[0].trim()}</span>
                        </div>
                      )}
                    </div>
                  </div>



                  {/* ZONE 4: FOOTER SECTION - Metadata & Actions */}
                  <div className="px-3 sm:px-5 lg:px-6 py-3 sm:py-5 bg-gray-50 border-t border-gray-100">
                    {/* Left: Duration & Work Type */}
                    <div className="flex flex-wrap gap-2 sm:gap-4 mb-3 sm:mb-5 text-xs sm:text-sm">
                      {req.duration && (
                        <div className="flex items-center gap-2 text-gray-700">
                          <span className="text-gray-400 flex-shrink-0 text-sm">⏳</span>
                          <span className="font-medium">{req.duration}</span>
                        </div>
                      )}
                      {req.remote && (
                        <div className="flex items-center gap-2 text-gray-700">
                          <span className="text-gray-400 flex-shrink-0 text-sm">🏠</span>
                          <span className="font-medium">{req.remote}</span>
                        </div>
                      )}
                    </div>

                    {/* Right: Action Buttons - Vertical on mobile, horizontal on tablet+ */}
                    <div className="flex flex-col sm:flex-row gap-2 w-full">
                      <button
                        onClick={() => handleViewDetails(req)}
                        className="flex-1 h-10 sm:h-11 flex items-center justify-center gap-1.5 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 active:bg-blue-800 transition-all duration-200 shadow-sm hover:shadow-md text-xs sm:text-sm font-semibold whitespace-nowrap"
                        title="View full details"
                      >
                        <Eye className="w-4 h-4 flex-shrink-0" />
                        <span className="hidden sm:inline">View</span>
                      </button>

                      {req.description && (
                        <button
                          onClick={() => setSelectedJDRequirement(req)}
                          className="flex-1 h-10 sm:h-11 flex items-center justify-center gap-1.5 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 active:bg-green-800 transition-all duration-200 shadow-sm hover:shadow-md text-xs sm:text-sm font-semibold whitespace-nowrap"
                          title="View job description"
                        >
                          <span className="text-base flex-shrink-0">📄</span>
                          <span className="hidden xs:inline">JD</span>
                        </button>
                      )}

                      {isAdmin && (
                        <button
                          onClick={() => handleDelete()}
                          className="flex-1 h-10 sm:h-11 flex items-center justify-center gap-1.5 px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 active:bg-red-800 transition-all duration-200 shadow-sm hover:shadow-md text-xs sm:text-sm font-semibold whitespace-nowrap"
                          title="Delete requirement"
                        >
                          <Trash2 className="w-4 h-4 flex-shrink-0" />
                          <span className="hidden xs:inline">Delete</span>
                        </button>
                      )}
                    </div>
                  </div>

                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Pagination Controls */}
      {filteredRequirements.length > itemsPerPage && (
        <div className="flex flex-col gap-4 mt-6 px-4 py-4 bg-gray-50 rounded-lg">
          {/* Pagination Info and Items Per Page Selector */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <span className="text-sm text-gray-600">
              Showing {currentPage * itemsPerPage + 1} to {Math.min((currentPage + 1) * itemsPerPage, filteredRequirements.length)} of {filteredRequirements.length}
            </span>
            <div className="flex flex-col xs:flex-row gap-3 items-start xs:items-center">
              <div className="flex items-center gap-2">
                <label htmlFor="itemsPerPage" className="text-sm text-gray-600 font-medium">Items per page:</label>
                <select
                  id="itemsPerPage"
                  value={itemsPerPage}
                  onChange={(e) => {
                    setItemsPerPage(parseInt(e.target.value));
                    setCurrentPage(0);
                  }}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white hover:bg-gray-100 transition"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                <label htmlFor="jumpToPage" className="text-sm text-gray-600 font-medium">Go to page:</label>
                <input
                  id="jumpToPage"
                  type="number"
                  min="1"
                  max={totalPages}
                  value={jumpToPageInput}
                  onChange={(e) => setJumpToPageInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      const pageNum = parseInt(jumpToPageInput) - 1;
                      if (pageNum >= 0 && pageNum < totalPages) {
                        setCurrentPage(pageNum);
                        setJumpToPageInput('');
                      }
                    }
                  }}
                  placeholder="Page #"
                  className="w-16 px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                />
                <button
                  onClick={() => {
                    const pageNum = parseInt(jumpToPageInput) - 1;
                    if (pageNum >= 0 && pageNum < totalPages) {
                      setCurrentPage(pageNum);
                      setJumpToPageInput('');
                    }
                  }}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white hover:bg-gray-100 transition font-medium"
                >
                  Go
                </button>
              </div>
            </div>
          </div>

          {/* Page Navigation Buttons */}
          <div className="flex gap-2 justify-end">
            <button
              onClick={() => setCurrentPage(prev => Math.max(0, prev - 1))}
              disabled={currentPage === 0}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              Previous
            </button>
            <span className="px-4 py-2 text-sm text-gray-600">
              Page {currentPage + 1} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages - 1, prev + 1))}
              disabled={currentPage >= totalPages - 1}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              Next
            </button>
          </div>
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
