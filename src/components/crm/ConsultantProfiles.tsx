import { useState, useEffect, useCallback, useMemo } from 'react';
import { Search, Plus, Mail, Phone, Trash2 } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { updateConsultant, deleteConsultant, getConsultantsPage } from '../../lib/api/consultants';
import { subscribeToConsultants } from '../../lib/api/realtimeSync';
import { debounce } from '../../lib/utils';
import { SkeletonCard } from '../common/SkeletonCard';
import { ConsultantDetailModal } from './ConsultantDetailModal';
import {ErrorAlert} from '../common/ErrorAlert';
import type { Database } from '../../lib/database.types';
import { useToast } from '../../contexts/ToastContext';

type Consultant = Database['public']['Tables']['consultants']['Row'];

type RealtimeUpdate<T> = { type: 'INSERT' | 'UPDATE' | 'DELETE'; record: T };

const statusColors: Record<string, string> = {
  'Active': 'bg-green-100 text-green-800',
  'Not Active': 'bg-gray-100 text-gray-800',
  'Recently Placed': 'bg-blue-100 text-blue-800',
};

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

  const handleDelete = useCallback(async (id: string) => {
    if (!isAdmin) {
      showToast({
        type: 'error',
        title: 'Permission denied',
        message: 'Only admins can delete consultants.',
      });
      return;
    }

    if (confirm('Are you sure you want to delete this consultant?')) {
      try {
        const result = await deleteConsultant(id);
        if (result.success) {
          showToast({ type: 'success', title: 'Consultant deleted', message: 'The consultant has been removed.' });
          await loadConsultants(0);
        } else if (result.error) {
          setError({ title: 'Failed to delete', message: result.error });
        }
      } catch {
        setError({ title: 'Error', message: 'Failed to delete consultant' });
      }
    }
  }, [loadConsultants, isAdmin, showToast]);

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
      <div className="space-y-6">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Consultant Profiles</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Error Alert */}
      {error && (
        <ErrorAlert
          title={error.title}
          message={error.message}
          onRetry={loadConsultants}
          onDismiss={() => setError(null)}
        />
      )}

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
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm"
            aria-label="Search consultants"
        />
        {searchError && <p className="text-xs text-red-600 mt-2">{searchError}</p>}
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

      {/* Consultant Cards Grid with Scrolling Container */}
      <div className="max-h-[600px] overflow-y-auto border border-gray-200 rounded-lg p-2">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {consultants.length === 0 ? (
            <div className="col-span-full text-center py-12 bg-gray-50 rounded-lg">
              <p className="text-gray-500">No consultants found</p>
            </div>
          ) : (
            consultants.map(consultant => (
            <div
              key={consultant.id}
              className="bg-white border border-gray-200 rounded-lg p-4 sm:p-6 hover:shadow-lg transition cursor-pointer"
              onClick={() => handleViewDetails(consultant)}
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
                {isAdmin && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(consultant.id);
                    }}
                    className="px-3 py-2 text-xs sm:text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition flex items-center gap-1"
                    title="Delete consultant"
                  >
                    <Trash2 className="w-3 h-3 sm:w-4 sm:h-4" />
                    <span className="hidden xs:inline">Delete</span>
                  </button>
                )}
              </div>
            </div>
          ))
        )}
        </div>
      </div>

      {/* Pagination Controls */}
      {totalResults && totalResults > itemsPerPage && (
        <div className="flex items-center justify-between mt-6 px-4 py-4 bg-gray-50 rounded-lg">
          <span className="text-sm text-gray-600">
            Showing {currentPage * itemsPerPage + 1} to {Math.min((currentPage + 1) * itemsPerPage, totalResults)} of {totalResults}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => {
                setCurrentPage(prev => Math.max(0, prev - 1));
                loadConsultants(Math.max(0, currentPage - 1));
              }}
              disabled={currentPage === 0}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              Previous
            </button>
            <span className="px-4 py-2 text-sm text-gray-600">
              Page {currentPage + 1} of {totalPages}
            </span>
            <button
              onClick={() => {
                const nextPage = Math.min(totalPages - 1, currentPage + 1);
                setCurrentPage(nextPage);
                loadConsultants(nextPage);
              }}
              disabled={currentPage >= totalPages - 1}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              Next
            </button>
          </div>
        </div>
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
    </div>
  );
};
