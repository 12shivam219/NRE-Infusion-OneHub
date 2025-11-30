import { useState, useEffect, useCallback } from 'react';
import { Trash2, Plus } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { getInterviews, updateInterview, deleteInterview } from '../../lib/api/interviews';
import { getRequirements } from '../../lib/api/requirements';
import type { Database } from '../../lib/database.types';

type Interview = Database['public']['Tables']['interviews']['Row'];
type Requirement = Database['public']['Tables']['requirements']['Row'];

const interviewStatusColors: Record<string, string> = {
  'Confirmed': 'bg-green-100 text-green-800',
  'Pending': 'bg-yellow-100 text-yellow-800',
  'Completed': 'bg-blue-100 text-blue-800',
  'Cancelled': 'bg-red-100 text-red-800',
  'Re-Scheduled': 'bg-purple-100 text-purple-800',
};

interface InterviewTrackingProps {
  onQuickAdd?: () => void;
}

export const InterviewTracking = ({ onQuickAdd }: InterviewTrackingProps) => {
  const { user } = useAuth();
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>('all');

  const loadData = useCallback(async () => {
    if (!user) return;
    
    const interviewsResult = await getInterviews(user.id);
    if (interviewsResult.success && interviewsResult.interviews) {
      setInterviews(interviewsResult.interviews);
    }
    
    const reqResult = await getRequirements(user.id);
    if (reqResult.success && reqResult.requirements) {
      setRequirements(reqResult.requirements);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleDelete = useCallback(async (id: string) => {
    if (confirm('Are you sure you want to delete this interview?')) {
      await deleteInterview(id);
      await loadData();
    }
  }, [loadData]);

  const handleStatusChange = useCallback(async (id: string, status: string) => {
    await updateInterview(id, { status });
    await loadData();
  }, [loadData]);

  const getRequirementTitle = (requirementId: string) => {
    const req = requirements.find(r => r.id === requirementId);
    return req ? `${req.title} - ${req.company}` : 'Unknown';
  };

  const filterInterviews = (status: string) => {
    if (status === 'all') return interviews;
    return interviews.filter(i => {
      const lowerStatus = i.status.toLowerCase();
      return lowerStatus.includes(status.toLowerCase());
    });
  };

  if (loading) {
    return <div className="p-6 text-center text-gray-500">Loading interviews...</div>;
  }

  const filteredInterviews = filterInterviews(activeTab);

  const tabs = [
    { id: 'all', label: 'All Interviews', count: interviews.length },
    { id: 'confirmed', label: 'Confirmed', count: interviews.filter(i => i.status.toLowerCase().includes('confirmed')).length },
    { id: 'rescheduled', label: 'Re-Scheduled', count: interviews.filter(i => i.status.toLowerCase().includes('rescheduled')).length },
    { id: 'cancelled', label: 'Cancelled', count: interviews.filter(i => i.status.toLowerCase().includes('cancelled')).length },
    { id: 'completed', label: 'Completed', count: interviews.filter(i => i.status.toLowerCase().includes('completed')).length },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Interview Tracking</h2>
        <button
          onClick={onQuickAdd}
          className="w-full sm:w-auto px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 flex items-center justify-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Quick Add
        </button>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 overflow-x-auto">
        <div className="flex gap-4 sm:gap-8 min-w-full sm:min-w-0">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-3 px-1 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap transition ${
                activeTab === tab.id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              <span className="hidden sm:inline">{tab.label}</span>
              <span className="sm:hidden">{tab.label.split('(')[0].trim()}</span> ({tab.count})
            </button>
          ))}
        </div>
      </div>

      {/* Interviews List */}
      <div className="space-y-4">
        {filteredInterviews.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <p className="text-gray-500">No interviews found in this category</p>
          </div>
        ) : (
          filteredInterviews.map(interview => (
            <div
              key={interview.id}
              className="bg-white border border-gray-200 rounded-lg p-4 sm:p-6 hover:shadow-md transition"
            >
              <div className="flex flex-col sm:flex-row items-start justify-between mb-4 gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 mb-2">
                    <h3 className="text-base sm:text-lg font-semibold text-gray-900 break-words">
                      {getRequirementTitle(interview.requirement_id)}
                    </h3>
                    <span className={`px-3 py-1 rounded-full text-xs sm:text-sm font-medium whitespace-nowrap ${interviewStatusColors[interview.status] || 'bg-gray-100 text-gray-800'}`}>
                      {interview.status}
                    </span>
                  </div>
                  {interview.subject_line && (
                    <p className="text-xs sm:text-sm text-gray-600 truncate">{interview.subject_line}</p>
                  )}
                </div>

                <div className="flex gap-2 w-full sm:w-auto">
                  <select
                    value={interview.status}
                    onChange={(e) => handleStatusChange(interview.id, e.target.value)}
                    className="flex-1 sm:flex-none px-3 py-2 text-xs sm:text-sm border border-gray-300 rounded-lg"
                  >
                    <option value="Scheduled">Scheduled</option>
                    <option value="Confirmed">Confirmed</option>
                    <option value="Completed">Completed</option>
                    <option value="Cancelled">Cancelled</option>
                    <option value="Re-Scheduled">Re-Scheduled</option>
                  </select>
                  <button
                    onClick={() => handleDelete(interview.id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg flex-shrink-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Date/Time and Meeting Details */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4 py-4 border-t border-b border-gray-100">
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Date & Time</p>
                  <p className="text-xs sm:text-sm font-medium text-gray-900">
                    {new Date(interview.scheduled_date).toLocaleDateString()} 
                    {interview.scheduled_time && ` at ${interview.scheduled_time}`}
                  </p>
                  {interview.timezone && <p className="text-xs text-gray-500 mt-1">{interview.timezone}</p>}
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Interview Details</p>
                  <p className="text-xs sm:text-sm font-medium text-gray-900">
                    {interview.round || 'Round'} • {interview.mode || 'Mode'} • {interview.type || 'Type'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Duration</p>
                  <p className="text-xs sm:text-sm font-medium text-gray-900">{interview.duration_minutes || 60} mins</p>
                </div>
              </div>

              {/* Participants & Location */}
              <div className="grid grid-cols-2 sm:grid-cols-2 gap-3 sm:gap-4 py-4 border-b border-gray-100">
                {interview.interviewer && (
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide">Interviewer</p>
                    <p className="text-xs sm:text-sm font-medium text-gray-900 truncate">{interview.interviewer}</p>
                  </div>
                )}
                {interview.interview_with && (
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide">Interview With</p>
                    <p className="text-xs sm:text-sm font-medium text-gray-900 truncate">{interview.interview_with}</p>
                  </div>
                )}
                {interview.location && (
                  <div className="col-span-2">
                    <p className="text-xs text-gray-500 uppercase tracking-wide">Location / Link</p>
                    <p className="text-xs sm:text-sm font-medium text-gray-900 break-all">{interview.location}</p>
                  </div>
                )}
              </div>

              {/* Additional Info */}
              <div className="mt-4 space-y-2">
                {interview.vendor_company && (
                  <p className="text-xs sm:text-sm text-gray-600 truncate">Vendor: <span className="font-medium">{interview.vendor_company}</span></p>
                )}
                {interview.result && (
                  <p className="text-xs sm:text-sm text-gray-600 truncate">Result: <span className="font-medium">{interview.result}</span></p>
                )}
                {interview.interview_focus && (
                  <p className="text-xs sm:text-sm text-gray-600 truncate">Focus: <span className="font-medium">{interview.interview_focus}</span></p>
                )}
              </div>

              {/* Feedback Notes */}
              {interview.feedback_notes && (
                <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded">
                  <p className="text-xs text-blue-700 uppercase tracking-wide font-medium mb-1">Feedback Notes</p>
                  <p className="text-xs sm:text-sm text-blue-900 line-clamp-2">{interview.feedback_notes}</p>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};
