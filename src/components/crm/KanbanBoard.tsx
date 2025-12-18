import { useState, useEffect, useCallback } from 'react';
import { GripVertical } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useOfflineCache } from '../../hooks/useOfflineCache';
import { getRequirements, updateRequirement } from '../../lib/api/requirements';
import { useToast } from '../../contexts/ToastContext';
import { calculateDaysOpen } from '../../lib/requirementUtils';
import { cacheRequirements, type CachedRequirement } from '../../lib/offlineDB';
import type { Database, RequirementStatus } from '../../lib/database.types';

type Requirement = Database['public']['Tables']['requirements']['Row'];

interface KanbanColumnProps {
  status: RequirementStatus;
  title: string;
  requirements: Requirement[];
  onDragOver: (e: React.DragEvent<HTMLDivElement>) => void;
  onDrop: (e: React.DragEvent<HTMLDivElement>, status: RequirementStatus) => void;
  onDragStart: (e: React.DragEvent<HTMLDivElement>, requirement: Requirement) => void;
}

const statusConfig: Record<RequirementStatus, { title: string; color: string; bgColor: string }> = {
  'NEW': { title: 'New', color: 'blue', bgColor: 'bg-blue-50' },
  'IN_PROGRESS': { title: 'In Progress', color: 'yellow', bgColor: 'bg-yellow-50' },
  'INTERVIEW': { title: 'Interview', color: 'purple', bgColor: 'bg-purple-50' },
  'OFFER': { title: 'Offer', color: 'green', bgColor: 'bg-green-50' },
  'CLOSED': { title: 'Closed', color: 'gray', bgColor: 'bg-gray-50' },
  'REJECTED': { title: 'Rejected', color: 'red', bgColor: 'bg-red-50' },
  'SUBMITTED': { title: 'Submitted', color: 'indigo', bgColor: 'bg-indigo-50' },
};

const KanbanCard = ({ requirement, onDragStart }: { requirement: Requirement; onDragStart: (e: React.DragEvent<HTMLDivElement>, req: Requirement) => void }) => {
  const daysOpen = calculateDaysOpen(requirement.created_at);

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, requirement)}
      className="bg-white border border-gray-200 rounded-lg p-3 mb-3 cursor-move shadow-card hover:shadow-card-hover transition-all duration-200 hover:border-gray-300 group"
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex-1 min-w-0">
          <p title={requirement.title} className="font-semibold text-sm text-gray-900 line-clamp-1 md:line-clamp-none md:overflow-visible">{requirement.title}</p>
          <p title={requirement.company || 'No company'} className="text-xs text-gray-600 line-clamp-1 md:line-clamp-none md:overflow-visible mt-0.5">{requirement.company || 'No company'}</p>
        </div>
        <GripVertical className="w-4 h-4 text-gray-300 flex-shrink-0 group-hover:text-gray-400 transition-colors" />
      </div>

      <div className="flex gap-1.5 mb-2.5 flex-wrap">
        {requirement.primary_tech_stack && (
          <span title={requirement.primary_tech_stack?.split(',')[0]?.trim()} className="px-2 py-1 rounded text-xs font-semibold bg-gray-100 text-gray-700 overflow-hidden whitespace-nowrap text-ellipsis md:overflow-visible md:whitespace-normal">
            {requirement.primary_tech_stack.split(',')[0].trim()}
          </span>
        )}
      </div>

      <div className="text-xs text-gray-600 space-y-1.5 border-t border-gray-100 pt-2.5">
        {requirement.rate && <p className="font-medium">💰 {requirement.rate}</p>}
        <p className="text-gray-500">⏳ {daysOpen} days open</p>
        {requirement.next_step && <p title={requirement.next_step} className="line-clamp-1 md:line-clamp-none md:overflow-visible md:whitespace-normal text-gray-600 italic">→ {requirement.next_step}</p>}
      </div>
    </div>
  );
};

const KanbanColumn = ({
  status,
  title,
  requirements,
  onDragOver,
  onDrop,
  onDragStart,
}: KanbanColumnProps) => {
  const config = statusConfig[status];
  const borderColor = {
    blue: 'border-l-4 border-l-blue-500 bg-blue-50',
    yellow: 'border-l-4 border-l-yellow-500 bg-yellow-50',
    purple: 'border-l-4 border-l-purple-500 bg-purple-50',
    green: 'border-l-4 border-l-green-500 bg-green-50',
    gray: 'border-l-4 border-l-gray-500 bg-gray-50',
    red: 'border-l-4 border-l-red-500 bg-red-50',
  }[config.color];

  return (
    <div className={`flex-1 min-w-80 rounded-lg p-4 border border-gray-200 shadow-card ${borderColor}`}>
      <div className="mb-4">
        <h3 className="font-bold text-gray-900 text-lg flex items-center gap-2">
          {title}
          <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-white text-sm font-bold text-gray-700 shadow-sm">
            {requirements.length}
          </span>
        </h3>
      </div>

      <div
        onDragOver={onDragOver}
        onDrop={(e) => onDrop(e, status)}
        className="space-y-2 min-h-96 bg-white bg-opacity-60 rounded-lg p-3"
      >
        {requirements.length === 0 ? (
          <div className="flex items-center justify-center h-96 text-gray-400">
            <p className="text-sm">Drop items here</p>
          </div>
        ) : (
          requirements.map(req => (
            <KanbanCard key={req.id} requirement={req} onDragStart={onDragStart} />
          ))
        )}
      </div>
    </div>
  );
};

interface KanbanBoardProps {
  onQuickAdd?: (type: 'requirement') => void;
}

export const KanbanBoard = ({ onQuickAdd }: KanbanBoardProps) => {
  const { user } = useAuth();
  const { isOnline, queueOfflineOperation } = useOfflineCache();
  const { showToast } = useToast();
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [loading, setLoading] = useState(true);
  const [draggedRequirement, setDraggedRequirement] = useState<Requirement | null>(null);

  const loadRequirements = useCallback(async () => {
    if (!user) return;
    const result = await getRequirements(user.id);
    if (result.success && result.requirements) {
      setRequirements(result.requirements);
    } else if (result.error) {
      showToast({ type: 'error', title: 'Failed to load requirements', message: result.error });
    }
    setLoading(false);
  }, [user, showToast]);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      await Promise.resolve();
      if (cancelled) return;
      await loadRequirements();
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [loadRequirements]);

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, requirement: Requirement) => {
    setDraggedRequirement(requirement);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = useCallback(async (e: React.DragEvent<HTMLDivElement>, newStatus: RequirementStatus) => {
    e.preventDefault();
    
    if (!draggedRequirement || !user || draggedRequirement.status === newStatus) {
      setDraggedRequirement(null);
      return;
    }

    // Check if offline - queue operation
    if (!isOnline) {
      await queueOfflineOperation('UPDATE', 'requirement', draggedRequirement.id, { status: newStatus });
      
      // Optimistically update local state
      setRequirements(prev => prev.map(r => 
        r.id === draggedRequirement.id ? { ...r, status: newStatus } : r
      ));
      
      // Optimistically update cache
      const updatedRequirement = { ...draggedRequirement, status: newStatus };
      await cacheRequirements([updatedRequirement as CachedRequirement], user.id);
      
      showToast({ 
        type: 'info', 
        title: 'Queued for Sync', 
        message: `Status change will be saved when you come back online` 
      });
      setDraggedRequirement(null);
      return;
    }

    // Online - update normally
    const result = await updateRequirement(draggedRequirement.id, { status: newStatus }, user.id);
    if (result.success) {
      showToast({ 
        type: 'success', 
        title: 'Status updated', 
        message: `Requirement moved to ${statusConfig[newStatus].title}` 
      });
      await loadRequirements();
    } else if (result.error) {
      showToast({ 
        type: 'error', 
        title: 'Failed to update', 
        message: result.error 
      });
    }
    setDraggedRequirement(null);
  }, [draggedRequirement, loadRequirements, showToast, user, isOnline, queueOfflineOperation]);

  const groupedByStatus = {
    NEW: requirements.filter(r => r.status === 'NEW'),
    IN_PROGRESS: requirements.filter(r => r.status === 'IN_PROGRESS'),
    INTERVIEW: requirements.filter(r => r.status === 'INTERVIEW'),
    OFFER: requirements.filter(r => r.status === 'OFFER'),
    CLOSED: requirements.filter(r => r.status === 'CLOSED'),
  };

  if (loading) {
    return <div className="p-6 text-center text-gray-500">Loading kanban board...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h2 className="text-2xl font-bold text-gray-900">Requirement Pipeline</h2>
        <div className="flex gap-3 flex-wrap items-start sm:items-center">
          <button
            onClick={() => onQuickAdd?.('requirement')}
            className="px-4 py-2.5 bg-primary-800 text-white rounded-lg font-semibold hover:bg-primary-900 active:bg-primary-950 transition-all shadow-sm hover:shadow-md flex items-center gap-2 text-sm whitespace-nowrap"
          >
            + Add Requirement
          </button>
        </div>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-4 -mx-6 px-6 sm:-mx-8 sm:px-8">
        <KanbanColumn
          status="NEW"
          title="New"
          requirements={groupedByStatus.NEW}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onDragStart={handleDragStart}
        />
        <KanbanColumn
          status="IN_PROGRESS"
          title="In Progress"
          requirements={groupedByStatus.IN_PROGRESS}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onDragStart={handleDragStart}
        />
        <KanbanColumn
          status="INTERVIEW"
          title="Interview"
          requirements={groupedByStatus.INTERVIEW}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onDragStart={handleDragStart}
        />
        <KanbanColumn
          status="OFFER"
          title="Offer"
          requirements={groupedByStatus.OFFER}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onDragStart={handleDragStart}
        />
        <KanbanColumn
          status="CLOSED"
          title="Closed"
          requirements={groupedByStatus.CLOSED}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onDragStart={handleDragStart}
        />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-8">
        {Object.entries(groupedByStatus).map(([status, reqs]) => (
          <div key={status} className="card-base card-p-md text-center">
            <p className="text-gray-600 text-sm font-medium mb-2">{statusConfig[status as RequirementStatus].title}</p>
            <p className="text-3xl sm:text-4xl font-bold text-blue-600">{reqs.length}</p>
          </div>
        ))}
      </div>
    </div>
  );
};