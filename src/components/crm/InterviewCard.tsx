import { memo, useCallback } from 'react';
import { Trash2, Clock, ExternalLink } from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';
import { isValidStatusTransition, isValidUrl, isMeetingLink, extractDomainFromUrl } from '../../lib/interviewValidation';
import type { Database } from '../../lib/database.types';

type Interview = Database['public']['Tables']['interviews']['Row'];

interface InterviewCardProps {
  interview: Interview;
  requirementTitle: string;
  statusColor: { badge: string; dot: string };
  onStatusChange: (id: string, status: string) => void;
  onDelete: (id: string) => void;
}

const InterviewCard = memo(({
  interview,
  requirementTitle,
  statusColor,
  onStatusChange,
  onDelete,
}: InterviewCardProps) => {
  const { showToast } = useToast();

  const interviewDate = new Date(interview.scheduled_date);
  const monthStr = interviewDate.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
  const dayStr = String(interviewDate.getDate()).padStart(2, '0');
  const timeStr = interview.scheduled_time || '--:--';
  const jobTitle = requirementTitle.split(' - ')[0];
  const company = requirementTitle.split(' - ')[1] || 'Company';
  const candidateInitial = interview.interview_with?.charAt(0)?.toUpperCase() || 'A';

  // Validate meeting link
  const isMeetingUrl = interview.location ? isValidUrl(interview.location) && isMeetingLink(interview.location) : false;
  const domainName = interview.location ? extractDomainFromUrl(interview.location) : null;

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

  const handleDelete = useCallback(() => {
    onDelete(interview.id);
  }, [interview.id, onDelete]);

  const handleJoinCall = useCallback(() => {
    if (isMeetingUrl && interview.location) {
      window.open(interview.location, '_blank', 'noopener,noreferrer');
      showToast({
        type: 'success',
        title: 'Joining Call',
        message: `Opening ${domainName} meeting link`,
      });
    }
  }, [isMeetingUrl, interview.location, domainName, showToast]);

  return (
    <div className="group bg-white border border-gray-200 rounded-xl sm:rounded-2xl shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden flex flex-col w-full h-auto min-h-96">
      {/* Top Header - Blue Banner */}
      <div className="relative bg-gradient-to-r from-blue-600 to-blue-700 text-white p-3 sm:p-4">
        <div className="flex items-start justify-between gap-2 sm:gap-3">
          {/* Left: Date */}
          <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
            <div className="flex flex-col items-center justify-center bg-white text-blue-700 rounded px-2.5 sm:px-3 py-2 sm:py-2.5 font-bold">
              <span className="text-xs leading-tight">{monthStr}</span>
              <span className="text-2xl sm:text-3xl font-black leading-none">{dayStr}</span>
            </div>
            <div className="text-xs sm:text-sm">
              <p className="font-semibold leading-snug">Interview</p>
              <p className="flex items-center gap-0.5 sm:gap-1 leading-snug">
                <Clock className="w-3 h-3 flex-shrink-0" />
                <span className="truncate">{timeStr} {interview.timezone || 'IST'}</span>
              </p>
            </div>
          </div>

          {/* Right: Status Badge */}
          <div className={`flex items-center gap-1 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full border border-white bg-white font-bold text-xs whitespace-nowrap flex-shrink-0 ${statusColor.badge}`}>
            <span className="text-green-500 text-sm">✓</span>
            <span className="hidden sm:inline">{interview.status}</span>
            <span className="sm:hidden">{interview.status.length > 7 ? interview.status.substring(0, 7) : interview.status}</span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-3 sm:p-4 flex flex-col">
        {/* Job Title */}
        <h3 className="text-sm sm:text-base font-bold text-gray-900 mb-1 leading-snug line-clamp-2">
          {jobTitle}
        </h3>

        {/* Company */}
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3 truncate">
          {company}
        </p>

        {/* Candidate Section */}
        <div className="bg-blue-50 border border-blue-100 rounded-lg p-2.5 sm:p-3 mb-3 flex-shrink-0">
          <p className="text-xs font-bold text-gray-700 uppercase tracking-wide mb-1 sm:mb-1.5 leading-tight">Candidate</p>
          <p className="flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-gray-900 truncate">
            <span className="inline-flex items-center justify-center w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-blue-600 text-white font-bold text-xs flex-shrink-0">
              {candidateInitial}
            </span>
            <span className="truncate">{interview.interview_with || 'TBD'}</span>
          </p>
        </div>

        {/* Panel and Round/Mode Grid */}
        <div className="space-y-1.5 sm:space-y-2 mb-3 flex-shrink-0">
          {interview.interviewer && (
            <div className="flex items-center justify-between text-xs sm:text-sm">
              <span className="text-xs font-bold text-gray-700 uppercase">Panel</span>
              <span className="font-semibold text-gray-900 text-right">{interview.interviewer.split(' ')[0]}</span>
            </div>
          )}

          {/* Round and Mode in Grid */}
          <div className="grid grid-cols-2 gap-2 sm:gap-3">
            {interview.round && (
              <div>
                <p className="text-xs font-bold text-gray-600 uppercase mb-0.5 leading-tight">Round</p>
                <p className="text-xs sm:text-sm font-semibold text-gray-900 flex items-center gap-1">
                  <span>→</span>
                  <span className="truncate">{interview.round}</span>
                </p>
              </div>
            )}
            {interview.mode && (
              <div>
                <p className="text-xs font-bold text-gray-600 uppercase mb-0.5 leading-tight">Mode</p>
                <p className="text-xs sm:text-sm font-semibold text-gray-900 truncate">{interview.mode}</p>
              </div>
            )}
          </div>
        </div>

        {/* Interview Type & Result */}
        {(interview.type || interview.result) && (
          <div className="grid grid-cols-2 gap-2 sm:gap-3 mb-3 flex-shrink-0">
            {interview.type && (
              <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-2 sm:p-2.5">
                <p className="text-xs font-bold text-indigo-700 uppercase mb-0.5 leading-tight">Type</p>
                <p className="text-xs sm:text-sm font-semibold text-indigo-900 truncate">{interview.type}</p>
              </div>
            )}
            {interview.result && (
              <div className={`rounded-lg p-2 sm:p-2.5 border ${
                interview.result === 'Positive'
                  ? 'bg-green-50 border-green-100'
                  : interview.result === 'Negative'
                  ? 'bg-red-50 border-red-100'
                  : 'bg-yellow-50 border-yellow-100'
              }`}>
                <p className="text-xs font-bold uppercase mb-0.5 leading-tight" style={{
                  color: interview.result === 'Positive' ? '#166534' : interview.result === 'Negative' ? '#991b1b' : '#92400e'
                }}>Result</p>
                <p className="text-xs sm:text-sm font-semibold truncate" style={{
                  color: interview.result === 'Positive' ? '#166534' : interview.result === 'Negative' ? '#991b1b' : '#92400e'
                }}>{interview.result}</p>
              </div>
            )}
          </div>
        )}

        {/* Duration Section - Orange Background */}
        {interview.duration_minutes && (
          <div className="bg-orange-50 border-l-4 border-orange-400 rounded-lg p-2.5 sm:p-3 mb-3 flex-shrink-0">
            <p className="text-xs font-bold text-orange-700 uppercase mb-0.5 leading-tight">Duration</p>
            <p className="text-xs sm:text-sm font-semibold text-orange-900">{interview.duration_minutes} mins</p>
          </div>
        )}

        {/* Interview Focus */}
        {interview.interview_focus && (
          <div className="bg-purple-50 rounded-lg p-2.5 sm:p-3 border border-purple-200 flex-shrink-0 mb-3">
            <p className="text-xs font-bold text-purple-700 uppercase mb-1 leading-tight">Focus</p>
            <p className="text-xs text-purple-700 line-clamp-2">{interview.interview_focus}</p>
          </div>
        )}

        {/* Location / Link Section */}
        {interview.location && (
          <div className={`rounded-lg p-2.5 sm:p-3 mb-3 border flex items-start gap-1.5 sm:gap-2 flex-shrink-0 ${
            isMeetingUrl ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200'
          }`}>
            <Clock className={`w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0 mt-0.5 ${isMeetingUrl ? 'text-blue-600' : 'text-gray-600'}`} />
            <div className="flex-1 min-w-0">
              <p className={`text-xs font-bold mb-1 uppercase leading-tight ${isMeetingUrl ? 'text-blue-700' : 'text-gray-700'}`}>
                {isMeetingUrl ? 'Meeting Link' : 'Location'}
              </p>
              {isValidUrl(interview.location) ? (
                <>
                  <a href={interview.location} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 font-semibold underline truncate hover:text-blue-700 block mb-1 sm:mb-1.5">
                    {domainName}
                  </a>
                  {isMeetingUrl && (
                    <button
                      onClick={handleJoinCall}
                      className="px-2 py-1 text-xs font-bold text-white bg-blue-600 rounded hover:bg-blue-700 transition whitespace-nowrap flex items-center gap-1"
                    >
                      <ExternalLink className="w-3 h-3" />
                      Join Call
                    </button>
                  )}
                </>
              ) : (
                <p className="text-xs text-gray-700 font-semibold">{interview.location}</p>
              )}
            </div>
          </div>
        )}

        {/* Feedback Notes */}
        {interview.feedback_notes && (
          <div className="bg-gray-50 rounded-lg p-2.5 sm:p-3 border border-gray-200 flex-shrink-0">
            <p className="text-xs font-semibold text-gray-700 mb-1 leading-tight">Notes:</p>
            <p className="text-xs text-gray-600 line-clamp-1">{interview.feedback_notes}</p>
          </div>
        )}
      </div>

      {/* Bottom Action Footer */}
      <div className="bg-gray-50 border-t border-gray-200 px-3 sm:px-4 py-2.5 sm:py-3 flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
        <select
          value={interview.status}
          onChange={handleStatusChange}
          className="flex-1 px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold border border-gray-300 rounded-lg bg-white hover:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition text-gray-700 cursor-pointer"
        >
          <option value="Scheduled">Scheduled</option>
          <option value="Confirmed">Confirmed</option>
          <option value="Completed">Completed</option>
          <option value="Cancelled">Cancelled</option>
          <option value="Re-Scheduled">Re-Scheduled</option>
          <option value="Pending">Pending</option>
          <option value="No Show">No Show</option>
        </select>
        <button
          onClick={handleDelete}
          className="p-1.5 sm:p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200 flex-shrink-0"
          title="Delete interview"
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
