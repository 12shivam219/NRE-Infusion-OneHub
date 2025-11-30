import { useState, useEffect, useCallback } from 'react';
import { Search, Plus, Trash2, Mail, Phone } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { getConsultants, updateConsultant, deleteConsultant } from '../../lib/api/consultants';
import type { Database } from '../../lib/database.types';

type Consultant = Database['public']['Tables']['consultants']['Row'];

const statusColors: Record<string, string> = {
  'Active': 'bg-green-100 text-green-800',
  'Not Active': 'bg-gray-100 text-gray-800',
  'Recently Placed': 'bg-blue-100 text-blue-800',
};

interface ConsultantProfilesProps {
  onQuickAdd?: () => void;
}

export const ConsultantProfiles = ({ onQuickAdd }: ConsultantProfilesProps) => {
  const { user } = useAuth();
  const [consultants, setConsultants] = useState<Consultant[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [selectedConsultant, setSelectedConsultant] = useState<Consultant | null>(null);

  const loadConsultants = useCallback(async () => {
    if (!user) return;
    const result = await getConsultants(user.id);
    if (result.success && result.consultants) {
      setConsultants(result.consultants);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    loadConsultants();
  }, [loadConsultants]);

  const handleDelete = useCallback(async (id: string) => {
    if (confirm('Are you sure you want to delete this consultant?')) {
      await deleteConsultant(id);
      await loadConsultants();
    }
  }, [loadConsultants]);

  const handleStatusChange = useCallback(async (id: string, newStatus: string) => {
    await updateConsultant(id, { status: newStatus });
    await loadConsultants();
  }, [loadConsultants]);

  const filteredConsultants = consultants.filter(con => {
    const matchesSearch = 
      con.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      con.email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterStatus === 'ALL' || con.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  if (loading) {
    return <div className="p-6 text-center text-gray-500">Loading consultants...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Consultant Profiles</h2>
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
            placeholder="Search by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm"
          />
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg text-sm"
        >
          <option value="ALL">All Status</option>
          <option value="Active">Active</option>
          <option value="Not Active">Not Active</option>
          <option value="Recently Placed">Recently Placed</option>
        </select>
      </div>

      {/* Consultant Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {filteredConsultants.length === 0 ? (
          <div className="col-span-full text-center py-12 bg-gray-50 rounded-lg">
            <p className="text-gray-500">No consultants found</p>
          </div>
        ) : (
          filteredConsultants.map(consultant => (
            <div
              key={consultant.id}
              className="bg-white border border-gray-200 rounded-lg p-4 sm:p-6 hover:shadow-lg transition cursor-pointer"
              onClick={() => setSelectedConsultant(consultant)}
            >
              {/* Status Badge */}
              <div className="flex items-start justify-between mb-4 gap-2">
                <h3 className="text-base sm:text-lg font-semibold text-gray-900 flex-1 break-words">{consultant.name}</h3>
                <span className={`px-2 sm:px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap flex-shrink-0 ${statusColors[consultant.status] || 'bg-gray-100 text-gray-800'}`}>
                  {consultant.status === 'Active' ? '🟢' : consultant.status === 'Recently Placed' ? '🔵' : '🔴'} <span className="hidden sm:inline">{consultant.status}</span>
                </span>
              </div>

              {/* Contact Info */}
              <div className="space-y-2 text-xs sm:text-sm mb-4">
                {consultant.email && (
                  <div className="flex items-center gap-2 text-gray-600 truncate">
                    <Mail className="w-4 h-4 flex-shrink-0" />
                    <a href={`mailto:${consultant.email}`} className="hover:text-blue-600 truncate">
                      {consultant.email}
                    </a>
                  </div>
                )}
                {consultant.phone && (
                  <div className="flex items-center gap-2 text-gray-600 truncate">
                    <Phone className="w-4 h-4 flex-shrink-0" />
                    <a href={`tel:${consultant.phone}`} className="hover:text-blue-600 truncate">
                      {consultant.phone}
                    </a>
                  </div>
                )}
                {consultant.location && (
                  <div className="flex items-center gap-2 text-gray-600 truncate">
                    <span className="text-xs font-medium flex-shrink-0">📍</span>
                    <span className="truncate">{consultant.location}</span>
                  </div>
                )}
              </div>

              {/* Skills & Experience */}
              <div className="grid grid-cols-2 gap-2 sm:gap-3 py-4 border-y border-gray-100 mb-4">
                {consultant.primary_skills && (
                  <div className="min-w-0">
                    <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Skills</p>
                    <p className="text-xs sm:text-sm font-medium text-gray-900 truncate">{consultant.primary_skills}</p>
                  </div>
                )}
                {consultant.total_experience && (
                  <div className="min-w-0">
                    <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Experience</p>
                    <p className="text-xs sm:text-sm font-medium text-gray-900 truncate">{consultant.total_experience}</p>
                  </div>
                )}
                {consultant.availability && (
                  <div className="min-w-0">
                    <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Available</p>
                    <p className="text-xs sm:text-sm font-medium text-gray-900 truncate">{consultant.availability}</p>
                  </div>
                )}
                {consultant.expected_rate && (
                  <div className="min-w-0">
                    <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Rate</p>
                    <p className="text-xs sm:text-sm font-medium text-gray-900 truncate">{consultant.expected_rate}</p>
                  </div>
                )}
              </div>

              {/* Additional Info */}
              <div className="space-y-2 text-xs sm:text-sm mb-4">
                {consultant.visa_status && (
                  <p className="text-gray-600 truncate">Visa: <span className="font-medium">{consultant.visa_status}</span></p>
                )}
                {consultant.preferred_work_type && (
                  <p className="text-gray-600 truncate">Type: <span className="font-medium">{consultant.preferred_work_type}</span></p>
                )}
                {consultant.preferred_work_location && (
                  <p className="text-gray-600 truncate">Location: <span className="font-medium">{consultant.preferred_work_location}</span></p>
                )}
              </div>

              {/* Links */}
              {(consultant.linkedin_profile || consultant.portfolio_link) && (
                <div className="flex gap-2 mb-4 flex-wrap">
                  {consultant.linkedin_profile && (
                    <a
                      href={consultant.linkedin_profile}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs px-2 sm:px-3 py-1 bg-blue-100 text-blue-600 rounded hover:bg-blue-200"
                      onClick={(e) => e.stopPropagation()}
                    >
                      LinkedIn
                    </a>
                  )}
                  {consultant.portfolio_link && (
                    <a
                      href={consultant.portfolio_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs px-2 sm:px-3 py-1 bg-purple-100 text-purple-600 rounded hover:bg-purple-200"
                      onClick={(e) => e.stopPropagation()}
                    >
                      Portfolio
                    </a>
                  )}
                </div>
              )}

              {/* Actions */}
              <div className="pt-4 border-t border-gray-200 flex gap-2">
                <select
                  value={consultant.status}
                  onChange={(e) => {
                    e.stopPropagation();
                    handleStatusChange(consultant.id, e.target.value);
                  }}
                  className="flex-1 px-3 py-2 text-xs sm:text-sm border border-gray-300 rounded-lg"
                >
                  <option>Active</option>
                  <option>Not Active</option>
                  <option>Recently Placed</option>
                </select>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(consultant.id);
                  }}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg flex-shrink-0"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Detail Modal */}
      {selectedConsultant && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-2xl p-4 sm:p-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6 gap-4">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 break-words">{selectedConsultant.name}</h2>
              <button
                onClick={() => setSelectedConsultant(null)}
                className="text-gray-400 hover:text-gray-600 text-2xl flex-shrink-0"
              >
                ✕
              </button>
            </div>

            <div className="space-y-6">
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Status</h3>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusColors[selectedConsultant.status] || 'bg-gray-100 text-gray-800'}`}>
                  {selectedConsultant.status}
                </span>
              </div>

              {selectedConsultant.email && (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Email</h3>
                  <a href={`mailto:${selectedConsultant.email}`} className="text-blue-600 hover:underline break-all">
                    {selectedConsultant.email}
                  </a>
                </div>
              )}

              {selectedConsultant.phone && (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Phone</h3>
                  <a href={`tel:${selectedConsultant.phone}`} className="text-blue-600 hover:underline">
                    {selectedConsultant.phone}
                  </a>
                </div>
              )}

              {selectedConsultant.company && (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Company</h3>
                  <p className="text-gray-600">{selectedConsultant.company}</p>
                </div>
              )}

              <div className="pt-6 border-t border-gray-200">
                <button
                  onClick={() => setSelectedConsultant(null)}
                  className="w-full px-4 py-2 bg-gray-200 text-gray-900 rounded-lg font-medium hover:bg-gray-300"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
