import { useState, useEffect, useCallback, useMemo } from 'react';
import { Search, Plus, Trash2, Download, ChevronDown, Eye, Sparkles, Cog, Calendar, CheckCircle, XCircle, Lock, AlertCircle, ArrowUpDown } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { debounce } from '../../lib/utils';
import { getRequirements, updateRequirement } from '../../lib/api/requirements';
import { getConsultants } from '../../lib/api/consultants';
import type { Database, RequirementStatus } from '../../lib/database.types';
import { useToast } from '../../contexts/ToastContext';
import { calculateDaysOpen, getPriorityColors, getSLAStatus, findSimilarRequirements, calculateMatchScore } from '../../lib/requirementUtils';
import { RequirementsReport } from './RequirementsReport';
import { RequirementDetailModal } from './RequirementDetailModal';

type Requirement = Database['public']['Tables']['requirements']['Row'];
type Consultant = Database['public']['Tables']['consultants']['Row'];

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

// Priority icon component
const getPriorityIcon = (priority: string) => {
  const iconProps = 'w-4 h-4';
  switch ((priority || 'medium').toLowerCase()) {
    case 'high': return <XCircle className={`${iconProps} text-red-500`} />;
    case 'low': return <CheckCircle className={`${iconProps} text-green-500`} />;
    default: return <AlertCircle className={`${iconProps} text-yellow-500`} />;
  }
};

interface RequirementsManagementProps {
  onQuickAdd?: () => void;
}

export const RequirementsManagement = ({ onQuickAdd }: RequirementsManagementProps) => {
  const { user, isAdmin } = useAuth();
  const { showToast } = useToast();
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [consultants, setConsultants] = useState<Consultant[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedValue, setDebouncedValue] = useState('');
  const [filterStatus, setFilterStatus] = useState<RequirementStatus | 'ALL'>('ALL');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'date' | 'company' | 'priority' | 'daysOpen'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(0);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showReport, setShowReport] = useState(false);
  const [selectedRequirement, setSelectedRequirement] = useState<Requirement | null>(null);
  const [selectedCreatedBy, setSelectedCreatedBy] = useState<string | null>(null);
  const [selectedUpdatedBy, setSelectedUpdatedBy] = useState<string | null>(null);
  const itemsPerPage = 6;

  const handleDebouncedSearch = useMemo(
    () => debounce((value: unknown) => {
      setDebouncedValue(value as string);
      setCurrentPage(0);
    }, 300),
    []
  );

  const loadRequirements = useCallback(async () => {
    if (!user) return;
    const [reqResult, conResult] = await Promise.all([
      getRequirements(user.id),
      getConsultants(user.id),
    ]);
    if (reqResult.success && reqResult.requirements) {
      setRequirements(reqResult.requirements);
    } else if (reqResult.error) {
      showToast({ type: 'error', title: 'Failed to load requirements', message: reqResult.error });
    }
    if (conResult.success && conResult.consultants) {
      setConsultants(conResult.consultants);
    }
    setLoading(false);
  }, [user, showToast]);

  useEffect(() => {
    loadRequirements();
  }, [loadRequirements]);

  const handleStatusChange = useCallback(async (id: string, newStatus: RequirementStatus) => {
    if (!user) return;
    const result = await updateRequirement(id, { status: newStatus }, user.id);
    if (result.success) {
      await loadRequirements();
      showToast({ type: 'success', title: 'Status updated', message: `Requirement moved to ${newStatus}` });
    } else if (result.error) {
      showToast({ type: 'error', title: 'Failed to update requirement', message: result.error });
    }
  }, [loadRequirements, user, showToast]);

  const handleDelete = useCallback(async () => {
    if (!isAdmin) {
      showToast({
        type: 'error',
        title: 'Permission denied',
        message: 'Only admins can delete requirements.',
      });
      return;
    }

    if (confirm('Are you sure you want to delete this requirement?')) {
      setSelectedRequirement(null);
      showToast({ type: 'success', title: 'Requirement deleted', message: 'The requirement has been removed.' });
      await loadRequirements();
    }
  }, [loadRequirements, isAdmin, showToast]);

  const handleViewDetails = (req: Requirement) => {
    setSelectedRequirement(req);
    setSelectedCreatedBy((req as unknown as { created_by?: string }).created_by || null);
    setSelectedUpdatedBy((req as unknown as { updated_by?: string }).updated_by || null);
  };

  const filteredRequirements = useMemo(() => {
    let filtered = requirements.filter(req => {
      const matchesSearch = 
        req.title.toLowerCase().includes(debouncedValue.toLowerCase()) ||
        req.company?.toLowerCase().includes(debouncedValue.toLowerCase());
      const matchesFilter = filterStatus === 'ALL' || req.status === filterStatus;
      const matchesPriority = filterPriority === 'all' || (req.priority || 'medium').toLowerCase() === filterPriority;
      return matchesSearch && matchesFilter && matchesPriority;
    });

    // Apply sorting
    filtered.sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'company':
          comparison = (a.company || '').localeCompare(b.company || '');
          break;
        case 'priority':
          const priorityOrder = { high: 3, medium: 2, low: 1 };
          const aPriority = priorityOrder[(a.priority?.toLowerCase() as keyof typeof priorityOrder) || 'medium'] || 2;
          const bPriority = priorityOrder[(b.priority?.toLowerCase() as keyof typeof priorityOrder) || 'medium'] || 2;
          comparison = aPriority - bPriority;
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
  }, [requirements, debouncedValue, filterStatus, filterPriority, sortBy, sortOrder]);

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
            Quick Add
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
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm"
            title="Filter requirements by priority level"
          >
            <option value="all">All Priorities</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm"
            title="Sort requirements by selected criteria"
          >
            <option value="date">Sort by Date</option>
            <option value="company">Sort by Company</option>
            <option value="priority">Sort by Priority</option>
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {paginatedRequirements.map(req => {
              const daysOpen = calculateDaysOpen(req.created_at);
              const priorityColors = getPriorityColors(req.priority || 'medium');
              const slaStatus = getSLAStatus(req.created_at, req.status);
              const matchingConsultants = consultants.filter(c => 
                calculateMatchScore(c, req) >= 50
              ).slice(0, 3);
              const isExpanded = expandedId === req.id;
              return (
                <div
                  key={req.id}
                  className="bg-white border border-gray-200 rounded-2xl shadow-sm hover:shadow-lg transition-all duration-200 group relative overflow-hidden flex flex-col"
                >
                  {/* Decorative Accent Bar */}
                  <div className={`absolute left-0 top-0 h-full w-2 ${priorityColors.badge}`}></div>
                  <div className="p-5 sm:p-7 flex-1 flex flex-col">
                    <div className="flex flex-col sm:flex-row items-start justify-between mb-4 gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 mb-2 flex-wrap">
                          <h3 className="text-lg sm:text-xl font-bold text-gray-900 flex items-center gap-2">
                            {getStatusIcon(req.status)}
                            {req.title}
                          </h3>
                          <span className={`px-3 py-1 rounded-full text-xs sm:text-sm font-semibold whitespace-nowrap ${statusColors[req.status].badge} flex items-center gap-1`}>
                            {statusColors[req.status].label}
                          </span>
                          <span className={`px-3 py-1 rounded-full text-xs sm:text-sm font-semibold whitespace-nowrap flex items-center gap-1 ${priorityColors.badge}`} title={`Priority: ${req.priority ? req.priority.charAt(0).toUpperCase() + req.priority.slice(1) : 'Medium'}`}>
                            {getPriorityIcon(req.priority || 'medium')} {req.priority ? req.priority.charAt(0).toUpperCase() + req.priority.slice(1) : 'Priority'}
                          </span>
                        </div>
                        <p className="text-sm text-gray-500">Company: <span className="font-medium text-gray-700">{req.company || 'N/A'}</span></p>
                      </div>

                      <div className="flex gap-2 w-full sm:w-auto flex-wrap sm:flex-nowrap items-center">
                        <button
                          onClick={() => handleViewDetails(req)}
                          className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg flex-shrink-0 transition"
                          title="View details"
                        >
                          <Eye className="w-5 h-5" />
                        </button>
                        <select
                          value={req.status}
                          onChange={(e) => handleStatusChange(req.id, e.target.value as RequirementStatus)}
                          className="flex-1 sm:flex-none px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-200"
                        >
                          <option value="NEW">New</option>
                          <option value="IN_PROGRESS">In Progress</option>
                          <option value="INTERVIEW">Interview</option>
                          <option value="OFFER">Offer</option>
                          <option value="REJECTED">Rejected</option>
                          <option value="CLOSED">Closed</option>
                        </select>
                        <button
                          onClick={() => setExpandedId(isExpanded ? null : req.id)}
                          className="p-2 text-gray-600 hover:bg-gray-200 rounded-lg flex-shrink-0 transition"
                          title={isExpanded ? 'Collapse details' : 'Expand details'}
                        >
                          <ChevronDown className={`w-5 h-5 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                        </button>
                        {isAdmin && (
                          <button
                            onClick={() => handleDelete()}
                            className="p-2 text-red-600 hover:bg-red-100 rounded-lg flex-shrink-0 transition"
                            title="Delete requirement (Admin only)"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Key Metrics */}
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 py-4 border-t border-b border-gray-100 bg-gray-50 rounded-xl">
                      <div className="flex flex-col items-start">
                        <span className="text-xs text-gray-400 uppercase tracking-wide flex items-center gap-1">Days Open <span className="text-gray-300 cursor-help" title="Number of days this requirement has been open">?</span></span>
                        <span className="text-base font-semibold text-gray-900 flex items-center gap-1"><Calendar className="w-4 h-4 text-indigo-500" /> {daysOpen} days</span>
                      </div>
                      <div className="flex flex-col items-start">
                        <span className="text-xs text-gray-400 uppercase tracking-wide flex items-center gap-1">SLA Status <span className="text-gray-300 cursor-help" title="Service level agreement status for this requirement">?</span></span>
                        <span className={`text-base font-semibold flex items-center gap-1 ${slaStatus.color}`}>{slaStatus.status}</span>
                      </div>
                      {req.rate && (
                        <div className="flex flex-col items-start">
                          <span className="text-xs text-gray-400 uppercase tracking-wide">Rate</span>
                          <span className="text-base font-semibold text-gray-900">{req.rate}</span>
                        </div>
                      )}
                      {matchingConsultants.length > 0 && (
                        <div className="flex flex-col items-start">
                          <span className="text-xs text-gray-400 uppercase tracking-wide flex items-center gap-1">Matches <span className="text-gray-300 cursor-help" title={`${matchingConsultants.length} consultant(s) match this requirement`}>?</span></span>
                          <span className="text-base font-semibold text-green-700">{matchingConsultants.length} Consultant{matchingConsultants.length !== 1 ? 's' : ''}</span>
                        </div>
                      )}
                      {req.primary_tech_stack && (
                        <div className="flex flex-col items-start">
                          <span className="text-xs text-gray-400 uppercase tracking-wide">Tech Stack</span>
                          <span className="text-base font-semibold text-gray-900 truncate">{req.primary_tech_stack.split(',')[0].trim()}</span>
                        </div>
                      )}
                    </div>

                    {/* Summary Info */}
                    <div className="mt-4 space-y-2 text-sm">
                      {req.next_step && <p className="text-gray-600"><span className="font-semibold text-blue-700">Next:</span> {req.next_step}</p>}
                      {req.vendor_company && <p className="text-gray-600"><span className="font-semibold text-purple-700">Vendor:</span> {req.vendor_company}</p>}
                      {req.applied_for && <p className="text-gray-600"><span className="font-semibold text-green-700">Source:</span> {req.applied_for}</p>}
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {isExpanded && (
                    <div className="border-t border-gray-100 p-5 sm:p-7 bg-gradient-to-br from-gray-50 to-white space-y-4 rounded-b-2xl">
                      {/* Full Details Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        {req.description && (
                          <div>
                            <p className="text-base font-semibold text-gray-700 mb-1">Description</p>
                            <p className="text-sm text-gray-600">{req.description}</p>
                          </div>
                        )}
                        {req.primary_tech_stack && (
                          <div>
                            <p className="text-base font-semibold text-gray-700 mb-1">Full Tech Stack</p>
                            <p className="text-sm text-gray-600">{req.primary_tech_stack}</p>
                          </div>
                        )}
                        {req.location && (
                          <div>
                            <p className="text-base font-semibold text-gray-700 mb-1">Location</p>
                            <p className="text-sm text-gray-600">{req.location}</p>
                          </div>
                        )}
                        {req.duration && (
                          <div>
                            <p className="text-base font-semibold text-gray-700 mb-1">Duration</p>
                            <p className="text-sm text-gray-600">{req.duration}</p>
                          </div>
                        )}
                        {req.remote && (
                          <div>
                            <p className="text-base font-semibold text-gray-700 mb-1">Work Type</p>
                            <p className="text-sm text-gray-600">{req.remote}</p>
                          </div>
                        )}
                        {req.imp_name && (
                          <div>
                            <p className="text-base font-semibold text-gray-700 mb-1">Internal Contact</p>
                            <p className="text-sm text-gray-600">{req.imp_name}</p>
                          </div>
                        )}
                      </div>

                      {/* Matching Consultants */}
                      {matchingConsultants.length > 0 && (
                        <div>
                          <p className="text-base font-semibold text-gray-700 mb-2">Matching Consultants</p>
                          <div className="space-y-2">
                            {matchingConsultants.map(consultant => (
                              <div key={consultant.id} className="bg-white p-3 rounded-xl border border-gray-200 text-sm shadow-sm">
                                <p className="font-semibold text-gray-900">{consultant.name}</p>
                                <p className="text-gray-600">Match Score: {calculateMatchScore(consultant, req)}%</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Similar Requirements */}
                      {requirements.length > 0 && (
                        (() => {
                          const similar = findSimilarRequirements(
                            { title: req.title, company: req.company, primary_tech_stack: req.primary_tech_stack },
                            requirements.filter(r => r.id !== req.id)
                          );
                          return similar.length > 0 ? (
                            <div>
                              <p className="text-base font-semibold text-yellow-700 mb-2">Similar Requirements ({similar.length})</p>
                              <div className="space-y-2">
                                {similar.slice(0, 3).map(sim => (
                                  <div key={sim.id} className="bg-yellow-50 border border-yellow-200 p-3 rounded-xl text-sm">
                                    <p className="font-semibold text-gray-900">{sim.title}</p>
                                    <p className="text-gray-600">{sim.company}</p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ) : null;
                        })()
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Pagination Controls */}
      {filteredRequirements.length > itemsPerPage && (
        <div className="flex items-center justify-between mt-6 px-4 py-4 bg-gray-50 rounded-lg">
          <span className="text-sm text-gray-600">
            Showing {currentPage * itemsPerPage + 1} to {Math.min((currentPage + 1) * itemsPerPage, filteredRequirements.length)} of {filteredRequirements.length}
          </span>
          <div className="flex gap-2">
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
