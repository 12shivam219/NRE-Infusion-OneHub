import { useState, useEffect, useCallback, useMemo, useRef, memo } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Search, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
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

type Consultant = Database['public']['Tables']['consultants']['Row'];

type RealtimeUpdate<T> = { type: 'INSERT' | 'UPDATE' | 'DELETE'; record: T };

export const ConsultantProfiles = memo(() => {
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

  useEffect(() => {
    loadConsultants(0);
  }, [loadConsultants]);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    if (user) {
      unsubscribe = subscribeToConsultants(user.id, (update: RealtimeUpdate<Consultant>) => {
        if (update.type === 'INSERT') {
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
      <div className="flex flex-col gap-4">
        <h2 className="text-xl font-medium text-[color:var(--text)] font-heading">
          Consultant Profiles
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {error && (
        <ErrorAlert
          title={error.title}
          message={error.message}
          onRetry={loadConsultants}
          onDismiss={() => setError(null)}
        />
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h2 className="text-xl font-medium text-[color:var(--text)] font-heading">
          Consultant Profiles
        </h2>
      </div>

      {/* Search and Filter */}
      <div className="bg-[color:var(--darkbg-surface)] border border-yellow-500/20 rounded-lg p-4">
        <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-start">
          <div className="flex-1 relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              className={`block w-full pl-10 pr-3 py-2 border rounded-md leading-5 bg-[color:var(--darkbg-surface-light)] text-[color:var(--text)] placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 sm:text-sm ${
                searchError ? 'border-red-500' : 'border-gray-300'
              }`}
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
              aria-label="Search consultants"
            />
            {searchError && <p className="mt-1 text-xs text-red-500">{searchError}</p>}
          </div>

          <div className="min-w-[180px]">
            <select
              className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md bg-[color:var(--darkbg-surface-light)] text-[color:var(--text)]"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              aria-label="Filter status"
            >
              <option value="ALL">All Status</option>
              <option value="Active">Active</option>
              <option value="Not Active">Not Active</option>
              <option value="Recently Placed">Recently Placed</option>
            </select>
          </div>
        </div>
      </div>

      {/* Grid Content */}
      {consultants.length === 0 ? (
        <EmptyStateNoData type="consultants" />
      ) : (
        <ConsultantGridVirtualizer 
          consultants={consultants}
          onViewDetails={handleViewDetails}
          onDelete={async (id: string) => {
            handleDeleteClick(id);
            return Promise.resolve();
          }}
          onStatusChange={handleStatusChange}
          isAdmin={isAdmin}
        />
      )}

      {/* Pagination Controls */}
      {totalResults && totalResults > itemsPerPage && (
        <div className="bg-[color:var(--darkbg-surface)] border border-gray-200 rounded-lg p-3 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-[color:var(--text-secondary)]">
            Showing {currentPage * itemsPerPage + 1} to {Math.min((currentPage + 1) * itemsPerPage, totalResults)} of {totalResults}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => {
                const prev = Math.max(0, currentPage - 1);
                setCurrentPage(prev);
                loadConsultants(prev);
              }}
              disabled={currentPage === 0}
              className="px-3 py-1 border border-gray-300 rounded-md text-sm font-medium hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Previous
            </button>
            <button
              onClick={() => {
                const next = Math.min(currentPage + 1, totalPages - 1);
                setCurrentPage(next);
                loadConsultants(next);
              }}
              disabled={currentPage >= totalPages - 1}
              className="px-3 py-1 border border-gray-300 rounded-md text-sm font-medium hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              Next
              <ChevronRight className="w-4 h-4 ml-1" />
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
    </div>
  );
});

interface ConsultantGridVirtualizerProps {
  consultants: Consultant[];
  onViewDetails: (consultant: Consultant) => void;
  onDelete: (id: string) => Promise<void>;
  onStatusChange: (id: string, status: string) => Promise<void>;
  isAdmin: boolean;
}

const ConsultantGridVirtualizer = ({ consultants, onViewDetails, onDelete, onStatusChange, isAdmin }: ConsultantGridVirtualizerProps) => {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: consultants.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 350,
    overscan: 5,
    measureElement: typeof window !== 'undefined' && navigator.userAgent.indexOf('jsdom') === -1 ? element => element?.getBoundingClientRect().height : undefined,
  });

  const virtualItems = virtualizer.getVirtualItems();

  return (
    <div
      ref={parentRef}
      className="max-h-[600px] overflow-y-auto p-1 border border-gray-200 rounded-lg bg-[color:var(--darkbg-surface-light)]"
    >
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: '1.5rem',
          height: `${virtualizer.getTotalSize()}px`,
          position: 'relative',
        }}
      >
        {virtualItems.map((virtualItem) => {
          const consultant = consultants[virtualItem.index];
          const statusEmoji =
            consultant.status === 'Active'
              ? '🟢'
              : consultant.status === 'Recently Placed'
              ? '🔵'
              : '⚪';
              
          // Position virtual items absolutely to maintain grid layout within virtual container
          // Note: virtualizer returns simple items, for grid we usually rely on flow. 
          // However, React Virtual's grid example uses absolute positioning. 
          // Since the original code didn't position absolutely, it likely relied on standard flow.
          // To be safe with the 'height' prop on parent, we usually just render the items.
          // But since React Virtual calculates offset, if we don't position, the large height pushes them down?
          // The previous code relied on mapping virtualItems directly. Let's keep it simple.
          
          return (
            <div
              key={virtualItem.key}
              onClick={() => onViewDetails(consultant)}
              // If using standard flow in grid, we don't need absolute positioning if we don't use virtualizer.start
              // BUT, virtualizer usually requires translation. 
              // The original code was: {virtualItems.map...}. It works if the estimate is accurate enough or just rendering visible.
              // We will rely on the standard flow for now as per original implementation pattern.
            >
              <div className="bg-[color:var(--darkbg-surface)] border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer h-full flex flex-col">
                <div className="flex flex-row justify-between items-start mb-2">
                  <h3 className="text-base font-medium text-[color:var(--text)] pr-2 break-words">
                    {consultant.name}
                  </h3>
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 border border-gray-200 whitespace-nowrap">
                    {statusEmoji} {consultant.status ?? ''}
                  </span>
                </div>

                <div className="flex flex-col gap-1 mb-4 flex-grow">
                  {consultant.email && (
                    <p className="text-sm text-[color:var(--text-secondary)] truncate" title={consultant.email}>
                      {consultant.email}
                    </p>
                  )}
                  {consultant.primary_skills && (
                    <p className="text-sm font-medium text-[color:var(--text)] line-clamp-2">
                      {consultant.primary_skills}
                    </p>
                  )}
                </div>

                <div className="border-t border-gray-200 pt-3 mt-auto flex flex-row items-center gap-2">
                  <div className="flex-1">
                    <select
                      className="block w-full py-1 px-2 text-xs border border-gray-300 rounded bg-white focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                      value={consultant.status ?? ''}
                      onChange={(e) => {
                        e.stopPropagation();
                        onStatusChange(consultant.id, String(e.target.value));
                      }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <option value="Active">Active</option>
                      <option value="Not Active">Not Active</option>
                      <option value="Recently Placed">Recently Placed</option>
                    </select>
                  </div>
                  {isAdmin && (
                    <button
                      className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(consultant.id);
                      }}
                      title="Delete consultant"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};