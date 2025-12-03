import { memo, useCallback } from 'react';
import { Trash2, Clock, ExternalLink, AlertCircle } from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';
import { isValidStatusTransition, isValidUrl, isMeetingLink } from '../../lib/interviewValidation';
import type { Database } from '../../lib/database.types';

type Interview = Database['public']['Tables']['interviews']['Row'];

interface InterviewCardProps {
  interview: Interview;
  requirementTitle: string;
  statusColor: { badge: string; dot: string };
  onStatusChange: (id: string, status: string) => void;
  onDelete: (id: string) => void;
  onViewDetails: (interview: Interview) => void;
}

const InterviewCard = memo(({
  interview,
  requirementTitle,
  statusColor,
  onStatusChange,
  onDelete,
  onViewDetails,
}: InterviewCardProps) => {
  const { showToast } = useToast();

  const interviewDate = new Date(interview.scheduled_date);
  const monthStr = interviewDate.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
  const dayStr = String(interviewDate.getDate()).padStart(2, '0');
  const timeStr = interview.scheduled_time || '--:--';
  const jobTitle = requirementTitle.split(' - ')[0];
  const company = requirementTitle.split(' - ')[1] || 'Company';
  const candidateInitial = interview.interview_with?.charAt(0)?.toUpperCase() || 'A';

  // Calculate urgency indicator
  const now = new Date();
  const interviewDateTime = new Date(`${interview.scheduled_date}T${interview.scheduled_time || '00:00'}`);
  const daysUntilInterview = Math.floor((interviewDateTime.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  const isToday = interviewDate.toDateString() === now.toDateString();
  const isSoon = daysUntilInterview >= 0 && daysUntilInterview <= 3;
  const isOverdue = daysUntilInterview < 0 && interview.status !== 'Completed' && interview.status !== 'Cancelled';

  // Validate meeting link
  const isMeetingUrl = interview.location ? isValidUrl(interview.location) && isMeetingLink(interview.location) : false;

  const handleStatusChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const newStatus = e.target.value;
    
    // Check if transition is valid
    if (!isValidStatusTransition(interview.status, newStatus)) {
      showToast({
        type: 'error',
        title: 'Invalid Status Transition',
        message: `Cannot change from ${interview.status} to ${newStatus}`,
      });
      e.target.value = interview.status; // Reset to original
      return;
    }
    
    onStatusChange(interview.id, newStatus);
  }, [interview.id, interview.status, onStatusChange, showToast]);

  // Get valid status transitions
  const getValidStatuses = useCallback(() => {
    const allStatuses = ['Scheduled', 'Confirmed', 'Completed', 'Cancelled', 'Re-Scheduled', 'Pending', 'No Show'];
    return allStatuses.filter(status => isValidStatusTransition(interview.status, status) || status === interview.status);
  }, [interview.status]);

  const handleDelete = useCallback(() => {
    onDelete(interview.id);
  }, [interview.id, onDelete]);

  const handleJoinCall = useCallback(() => {
    if (isMeetingUrl && interview.location) {
      window.open(interview.location, '_blank', 'noopener,noreferrer');
      showToast({
        type: 'success',
        title: 'Joining Call',
        message: `Opening meeting link`,
      });
    }
  }, [isMeetingUrl, interview.location, showToast]);

  return (
    <div className={`group bg-white border rounded-xl sm:rounded-2xl shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden flex flex-col w-full h-auto min-h-80 max-w-full sm:max-w-[24.5rem] ${
      isOverdue ? 'border-red-300 bg-red-50' : isToday ? 'border-orange-300 bg-orange-50' : isSoon ? 'border-yellow-300 bg-yellow-50' : 'border-gray-200'
    }`}>
      {/* Header area */}
      <div className="flex items-start justify-between p-3 sm:p-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="flex flex-col items-center justify-center bg-white text-blue-700 rounded px-2.5 sm:px-3 py-2 sm:py-2.5 font-bold flex-shrink-0">
            <span className="text-xs leading-tight">{monthStr}</span>
            <span className="text-2xl sm:text-3xl font-black leading-none">{dayStr}</span>
          </div>
          <div className="text-sm min-w-0">
            <p className="font-semibold leading-snug truncate">{jobTitle}</p>
            <p className="flex items-center gap-2 text-xs opacity-90 truncate">
              <Clock className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="truncate">{timeStr} • {interview.timezone || 'IST'}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {isOverdue && (
            <div className="px-2 py-1 rounded-full bg-white/10 border border-white/20 flex items-center gap-1" title="Interview date has passed">
              <AlertCircle className="w-3.5 h-3.5" />
              <span className="text-xs font-semibold">Overdue</span>
            </div>
          )}
          {isToday && !isOverdue && (
            <div className="px-2 py-1 rounded-full bg-white/10 border border-white/20 text-xs font-semibold">Today</div>
          )}
          {isSoon && !isToday && !isOverdue && (
            <div className="px-2 py-1 rounded-full bg-white/10 border border-white/20 text-xs font-semibold">Soon</div>
          )}
          <div className={`flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 text-sm font-semibold ${statusColor.badge}`}>
            <span className={`w-2 h-2 rounded-full ${statusColor.dot}`}></span>
            <span className="truncate max-w-[6rem] text-xs text-white sm:text-sm">{interview.status}</span>
          </div>
        </div>
      </div>

      {/* Content - Simplified */}
      <div className="flex-1 p-3 sm:p-4 flex flex-col space-y-3">
        {/* Candidate Section */}
        <div className="flex items-center gap-3">
          <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-blue-600 text-white font-bold text-sm flex-shrink-0">
            {candidateInitial}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-gray-900 truncate">{interview.interview_with || 'TBD'}</p>
            <p className="text-xs text-gray-500 truncate">{company}</p>
          </div>
        </div>

        {/* Essential Info - Only show most important fields */}
        <div className="space-y-2">
          {/* Interview Type and Result in one row when space permits */}
          {(interview.type || interview.meeting_type || interview.result) && (
            <div className="flex gap-2">
              {interview.type && (
                <div className="flex-1 bg-indigo-50 border border-indigo-100 rounded-lg p-2">
                  <p className="text-xs font-bold text-indigo-700 uppercase leading-tight">Type</p>
                  <p className="text-sm font-semibold text-indigo-900 truncate">{interview.type}</p>
                </div>
              )}
              {interview.meeting_type && (
                <div className="flex-1 bg-blue-50 border border-blue-100 rounded-lg p-2">
                  <p className="text-xs font-bold text-blue-700 uppercase leading-tight">Platform</p>
                  <p className="text-sm font-semibold text-blue-900 truncate">{interview.meeting_type}</p>
                </div>
              )}
              {interview.result && (
                <div className={`flex-1 rounded-lg p-2 border ${
                  interview.result === 'Positive' ? 'bg-green-50 border-green-100' : interview.result === 'Negative' ? 'bg-red-50 border-red-100' : 'bg-yellow-50 border-yellow-100'
                }`}>
                  <p className="text-xs font-bold uppercase mb-0.5 leading-tight" style={{
                    color: interview.result === 'Positive' ? '#166534' : interview.result === 'Negative' ? '#991b1b' : '#92400e'
                  }}>Result</p>
                  <p className="text-sm font-semibold truncate" style={{
                    color: interview.result === 'Positive' ? '#166534' : interview.result === 'Negative' ? '#991b1b' : '#92400e'
                  }}>{interview.result}</p>
                </div>
              )}
            </div>
          )}


        </div>

        {/* Quick metadata on hover/bottom */}
        {(interview.interviewer || interview.mode || interview.duration_minutes) && (
          <div className="text-xs text-gray-600 space-y-1 border-t border-gray-100 pt-2 mt-auto">
            {interview.interviewer && <p><span className="font-semibold">Panel:</span> {interview.interviewer}</p>}
            {interview.mode && <p><span className="font-semibold">Mode:</span> {interview.mode}</p>}
            {interview.duration_minutes && <p><span className="font-semibold">Duration:</span> {interview.duration_minutes} mins</p>}
          </div>
        )}
      </div>

      {/* Footer actions - Simplified */}
      <div className="bg-gray-50 border-t border-gray-200 px-3 sm:px-4 py-3 flex items-center gap-2 flex-shrink-0 flex-wrap">
        <button 
          onClick={() => onViewDetails(interview)}
          className="flex-1 min-w-[100px] px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition"
        >
          Details
        </button>

        {isMeetingUrl && (
          <button 
            onClick={handleJoinCall} 
            className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
            title="Join the meeting"
          >
            <ExternalLink className="w-4 h-4" />
          </button>
        )}

        <select
          value={interview.status}
          onChange={handleStatusChange}
          aria-label="Change status"
          className="px-3 py-2 text-sm font-semibold border border-gray-300 rounded-lg bg-white hover:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition text-gray-700 cursor-pointer"
        >
          {getValidStatuses().map(status => (
            <option key={status} value={status}>{status}</option>
          ))}
        </select>

        <button
          onClick={handleDelete}
          className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
          title="Delete interview"
          aria-label="Delete interview"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison for performance
  return (
    prevProps.interview.id === nextProps.interview.id &&
    prevProps.interview.status === nextProps.interview.status &&
    prevProps.interview.result === nextProps.interview.result &&
    prevProps.interview.interview_focus === nextProps.interview.interview_focus &&
    prevProps.requirementTitle === nextProps.requirementTitle
  );
});

InterviewCard.displayName = 'InterviewCard';

export default InterviewCard;
