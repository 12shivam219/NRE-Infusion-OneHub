import { useState, useEffect } from 'react';
import { Search, Plus, Trash2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { getRequirements, updateRequirement, deleteRequirement } from '../../lib/api/requirements';
import type { Database, RequirementStatus } from '../../lib/database.types';

type Requirement = Database['public']['Tables']['requirements']['Row'];

const statusColors: Record<RequirementStatus, { badge: string; label: string; icon: string }> = {
  NEW: { badge: 'bg-blue-100 text-blue-800', label: 'New', icon: '🆕' },
  IN_PROGRESS: { badge: 'bg-yellow-100 text-yellow-800', label: 'In Progress', icon: '⚙️' },
  INTERVIEW: { badge: 'bg-purple-100 text-purple-800', label: 'Interview', icon: '📋' },
  OFFER: { badge: 'bg-green-100 text-green-800', label: 'Offer', icon: '🎉' },
  REJECTED: { badge: 'bg-red-100 text-red-800', label: 'Rejected', icon: '❌' },
  CLOSED: { badge: 'bg-gray-100 text-gray-800', label: 'Closed', icon: '✌️' },
};

interface RequirementsManagementProps {
  onQuickAdd?: () => void;
}

export const RequirementsManagement = ({ onQuickAdd }: RequirementsManagementProps) => {
  const { user } = useAuth();
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<RequirementStatus | 'ALL'>('ALL');

  useEffect(() => {
    const loadRequirements = async () => {
      if (!user) return;
      const result = await getRequirements(user.id);
      if (result.success && result.requirements) {
        setRequirements(result.requirements);
      }
      setLoading(false);
    };
    if (user) {
      loadRequirements();
    }
  }, [user]);

  const handleStatusChange = async (id: string, newStatus: RequirementStatus) => {
    const result = await updateRequirement(id, { status: newStatus });
    if (result.success && user) {
      const freshResult = await getRequirements(user.id);
      if (freshResult.success && freshResult.requirements) {
        setRequirements(freshResult.requirements);
      }
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this requirement?')) {
      const result = await deleteRequirement(id);
      if (result.success && user) {
        const freshResult = await getRequirements(user.id);
        if (freshResult.success && freshResult.requirements) {
          setRequirements(freshResult.requirements);
        }
      }
    }
  };

  const filteredRequirements = requirements.filter(req => {
    const matchesSearch = 
      req.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      req.company?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterStatus === 'ALL' || req.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  if (loading) {
    return <div className="p-6 text-center text-gray-500">Loading requirements...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Requirements Management</h2>
        <button
          onClick={onQuickAdd}
          className="w-full sm:w-auto px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 flex items-center justify-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Quick Add
        </button>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by company or role..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm"
          />
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as RequirementStatus | 'ALL')}
          className="px-4 py-2 border border-gray-300 rounded-lg text-sm"
        >
          <option value="ALL">All Statuses</option>
          <option value="NEW">New</option>
          <option value="IN_PROGRESS">In Progress</option>
          <option value="INTERVIEW">Interview</option>
          <option value="OFFER">Offer</option>
          <option value="REJECTED">Rejected</option>
          <option value="CLOSED">Closed</option>
        </select>
      </div>

      {/* Requirements Cards */}
      <div className="space-y-4">
        {filteredRequirements.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <p className="text-gray-500">No requirements found</p>
          </div>
        ) : (
          filteredRequirements.map(req => (
            <div
              key={req.id}
              className="bg-white border border-gray-200 rounded-lg p-4 sm:p-6 hover:shadow-md transition"
            >
              <div className="flex flex-col sm:flex-row items-start justify-between mb-4 gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 mb-2">
                    <h3 className="text-base sm:text-lg font-semibold text-gray-900 break-words">{req.title}</h3>
                    <span className={`px-3 py-1 rounded-full text-xs sm:text-sm font-medium whitespace-nowrap ${statusColors[req.status].badge}`}>
                      {statusColors[req.status].icon} {statusColors[req.status].label}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 truncate">Company: {req.company || 'N/A'}</p>
                </div>

                <div className="flex gap-2 w-full sm:w-auto">
                  <select
                    value={req.status}
                    onChange={(e) => handleStatusChange(req.id, e.target.value as RequirementStatus)}
                    className="flex-1 sm:flex-none px-3 py-2 text-sm border border-gray-300 rounded-lg"
                  >
                    <option value="NEW">New</option>
                    <option value="IN_PROGRESS">In Progress</option>
                    <option value="INTERVIEW">Interview</option>
                    <option value="OFFER">Offer</option>
                    <option value="REJECTED">Rejected</option>
                    <option value="CLOSED">Closed</option>
                  </select>
                  <button
                    onClick={() => handleDelete(req.id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg flex-shrink-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Additional Details Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 py-4 border-t border-b border-gray-100">
                {req.rate && (
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide">Rate</p>
                    <p className="text-sm font-medium text-gray-900 truncate">{req.rate}</p>
                  </div>
                )}
                {req.primary_tech_stack && (
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide">Tech Stack</p>
                    <p className="text-sm font-medium text-gray-900 truncate">{req.primary_tech_stack}</p>
                  </div>
                )}
                {req.duration && (
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide">Duration</p>
                    <p className="text-sm font-medium text-gray-900 truncate">{req.duration}</p>
                  </div>
                )}
                {req.remote && (
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide">Work Type</p>
                    <p className="text-sm font-medium text-gray-900 truncate">{req.remote}</p>
                  </div>
                )}
              </div>

              {/* Additional Info */}
              <div className="mt-4 space-y-2">
                {req.vendor_company && (
                  <p className="text-xs sm:text-sm text-gray-600 truncate">Vendor: <span className="font-medium">{req.vendor_company}</span></p>
                )}
                {req.next_step && (
                  <p className="text-xs sm:text-sm text-gray-600 truncate">Next Step: <span className="font-medium">{req.next_step}</span></p>
                )}
                {req.applied_for && (
                  <p className="text-xs sm:text-sm text-gray-600 truncate">Applied Via: <span className="font-medium">{req.applied_for}</span></p>
                )}
                {req.description && (
                  <p className="text-xs sm:text-sm text-gray-500 italic mt-2 line-clamp-2">{req.description}</p>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
