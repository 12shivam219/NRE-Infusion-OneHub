import { useState, useEffect, useCallback } from 'react';
import { GripVertical } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { getRequirements, updateRequirement } from '../../lib/api/requirements';
import { useToast } from '../../contexts/ToastContext';
import { calculateDaysOpen, getPriorityColors } from '../../lib/requirementUtils';
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
};

const KanbanCard = ({ requirement, onDragStart }: { requirement: Requirement; onDragStart: (e: React.DragEvent<HTMLDivElement>, req: Requirement) => void }) => {
  const daysOpen = calculateDaysOpen(requirement.created_at);
  const priority = requirement.priority || 'medium';
  const priorityColors = getPriorityColors(priority);

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, requirement)}
      className="bg-white border border-gray-200 rounded-lg p-3 mb-3 cursor-move hover:shadow-md transition hover:border-gray-300"
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm text-gray-900 truncate">{requirement.title}</p>
          <p className="text-xs text-gray-600 truncate">{requirement.company || 'No company'}</p>
        </div>
        <GripVertical className="w-4 h-4 text-gray-400 flex-shrink-0" />
      </div>

      <div className="flex gap-1 mb-2 flex-wrap">
        <span className={`px-2 py-1 rounded text-xs font-medium ${priorityColors.badge}`}>
          {priorityColors.icon} {priority}
        </span>
        {requirement.primary_tech_stack && (
          <span className="px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-700 truncate">
            {requirement.primary_tech_stack.split(',')[0].trim()}
          </span>
        )}
      </div>

      <div className="text-xs text-gray-500 space-y-1">
        {requirement.rate && <p>Rate: {requirement.rate}</p>}
        <p>Open: {daysOpen} days</p>
        {requirement.next_step && <p className="truncate">Next: {requirement.next_step}</p>}
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
    blue: 'border-blue-200 bg-blue-50',
    yellow: 'border-yellow-200 bg-yellow-50',
    purple: 'border-purple-200 bg-purple-50',
    green: 'border-green-200 bg-green-50',
    gray: 'border-gray-200 bg-gray-50',
    red: 'border-red-200 bg-red-50',
  }[config.color];

  return (
    <div className={`flex-1 min-w-80 border-2 rounded-lg p-4 ${borderColor}`}>
      <div className="mb-4">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
          {title}
          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-white text-sm font-bold text-gray-700">
            {requirements.length}
          </span>
        </h3>
      </div>

      <div
        onDragOver={onDragOver}
        onDrop={(e) => onDrop(e, status)}
        className="space-y-2 min-h-96 bg-white rounded-lg p-2"
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
  const { showToast } = useToast();
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [loading, setLoading] = useState(true);
  const [draggedRequirement, setDraggedRequirement] = useState<Requirement | null>(null);
  const [filterPriority, setFilterPriority] = useState<string>('all');

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
    loadRequirements();
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
    
    if (!draggedRequirement || draggedRequirement.status === newStatus) {
      setDraggedRequirement(null);
      return;
    }

    const result = await updateRequirement(draggedRequirement.id, { status: newStatus });
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
  }, [draggedRequirement, loadRequirements, showToast]);

  const filteredRequirements = requirements.filter(req => {
    if (filterPriority === 'all') return true;
    return (req.priority || 'medium').toLowerCase() === filterPriority;
  });

  const groupedByStatus = {
    NEW: filteredRequirements.filter(r => r.status === 'NEW'),
    IN_PROGRESS: filteredRequirements.filter(r => r.status === 'IN_PROGRESS'),
    INTERVIEW: filteredRequirements.filter(r => r.status === 'INTERVIEW'),
    OFFER: filteredRequirements.filter(r => r.status === 'OFFER'),
    CLOSED: filteredRequirements.filter(r => r.status === 'CLOSED'),
  };

  if (loading) {
    return <div className="p-6 text-center text-gray-500">Loading kanban board...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Requirement Pipeline</h2>
        <div className="flex gap-3">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">Filter by priority:</label>
            <select
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Priorities</option>
              <option value="high">🔴 High</option>
              <option value="medium">🟡 Medium</option>
              <option value="low">🟢 Low</option>
            </select>
          </div>
          <button
            onClick={() => onQuickAdd?.('requirement')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
          >
            + Add Requirement
          </button>
        </div>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-4">
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

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-6">
        {Object.entries(groupedByStatus).map(([status, reqs]) => (
          <div key={status} className="bg-white border border-gray-200 rounded-lg p-4">
            <p className="text-gray-600 text-sm">{statusConfig[status as RequirementStatus].title}</p>
            <p className="text-3xl font-bold text-gray-900">{reqs.length}</p>
          </div>
        ))}
      </div>
    </div>
  );
};
