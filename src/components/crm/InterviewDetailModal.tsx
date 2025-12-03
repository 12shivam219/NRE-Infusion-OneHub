import { useState, useEffect } from 'react';
import { X, Edit2, Trash2, Loader, ExternalLink, Clock, MapPin, ChevronDown } from 'lucide-react';
import { isValidUrl, isMeetingLink, extractDomainFromUrl } from '../../lib/interviewValidation';
import { useAuth } from '../../hooks/useAuth';
import { updateInterview, deleteInterview } from '../../lib/api/interviews';
import { useToast } from '../../contexts/ToastContext';
import { AuditLog } from '../common/AuditLog';
import type { Database } from '../../lib/database.types';

type Interview = Database['public']['Tables']['interviews']['Row'];

interface InterviewDetailModalProps {
  isOpen: boolean;
  interview: Interview | null;
  onClose: () => void;
  onUpdate: () => void;
  createdBy?: string | null;
  updatedBy?: string | null;
}

const EditableField = ({ label, value, isEditing, children }: { 
  label: string; 
  value: string | number | null | undefined; 
  isEditing: boolean;
  children?: React.ReactNode;
}) => (
  <div>
    <p className="text-xs font-semibold text-gray-600 uppercase mb-1">{label}</p>
    {isEditing && children ? (
      children
    ) : (
      <p className="text-sm text-gray-900 font-medium">{value || '-'}</p>
    )}
  </div>
);

const AccordionSection = ({ title, children, defaultOpen = false }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-3 bg-gray-50 hover:bg-gray-100 flex items-center justify-between font-semibold text-gray-900 transition text-sm"
      >
        <span>{title}</span>
        <ChevronDown className={`w-5 h-5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      {isOpen && (
        <div className="px-4 py-4 space-y-4 border-t border-gray-200">
          {children}
        </div>
      )}
    </div>
  );
};

export const InterviewDetailModal = ({
  isOpen,
  interview,
  onClose,
  onUpdate,
  createdBy,
  updatedBy,
}: InterviewDetailModalProps) => {
  const { user, isAdmin } = useAuth();
  const { showToast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState<Partial<Interview> | null>(null);

  useEffect(() => {
    if (interview) {
      // Update form data with fresh interview data when not editing
      if (!isEditing) {
        setFormData(interview);
      }
    }
  }, [interview, isEditing]);

  if (!isOpen || !interview || !formData) return null;

  // Get valid status options
  const getValidStatuses = () => {
    // When editing, allow changing to any status
    const allStatuses = ['Pending', 'Scheduled', 'Confirmed', 'Completed', 'Cancelled', 'Re-Scheduled', 'No Show'];
    return allStatuses;
  };

  const handleFieldChange = (key: keyof Interview, value: unknown) => {
    setFormData(prev => prev ? { ...prev, [key]: value } : null);
  };

  const handleSave = async () => {
    if (!user) return;
    setIsLoading(true);

    const result = await updateInterview(
      interview.id,
      formData as Partial<Interview>
    );

    if (result.success) {
      showToast({
        type: 'success',
        title: 'Interview updated',
        message: 'Changes have been saved successfully.',
      });
      setIsEditing(false);
      onUpdate();
    } else if (result.error) {
      showToast({
        type: 'error',
        title: 'Failed to update',
        message: result.error,
      });
    }
    setIsLoading(false);
  };

  const handleDelete = async () => {
    if (!isAdmin) {
      showToast({
        type: 'error',
        title: 'Permission denied',
        message: 'Only admins can delete interviews.',
      });
      return;
    }

    if (!confirm('Are you sure you want to delete this interview? This action cannot be undone.')) {
      return;
    }

    setIsDeleting(true);
    const result = await deleteInterview(interview.id);

    if (result.success) {
      showToast({
        type: 'success',
        title: 'Interview deleted',
        message: 'The interview has been removed.',
      });
      onUpdate();
      onClose();
    } else if (result.error) {
      showToast({
        type: 'error',
        title: 'Failed to delete',
        message: result.error,
      });
    }
    setIsDeleting(false);
  };

  // Meeting link detection and join handler
  const isMeetingUrl = formData.location ? isValidUrl(formData.location as string) && isMeetingLink(formData.location as string) : false;
  const domainName = formData.location ? extractDomainFromUrl(formData.location as string) : null;
  const getMeetingProvider = (url?: string) => {
    if (!url) return null;
    const s = url.toLowerCase();
    if (s.includes('meet.google.com') || s.includes('google.com')) return 'Google Meet';
    if (s.includes('teams.microsoft.com') || s.includes('microsoft.com') || s.includes('/l/meetup-join')) return 'Microsoft Teams';
    if (s.includes('zoom.us') || s.includes('zoom')) return 'Zoom';
    if (s.includes('webex')) return 'Webex';
    if (s.includes('bluejeans')) return 'BlueJeans';
    return domainName || 'Meeting';
  };
  const meetingProvider = getMeetingProvider(formData.location as string | undefined);

  const handleJoinCall = () => {
    if (isMeetingUrl && formData.location) {
      window.open(formData.location as string, '_blank', 'noopener,noreferrer');
      showToast({ type: 'success', title: 'Joining Call', message: `Opening ${meetingProvider}` });
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl sm:max-w-3xl max-h-[95vh] sm:max-h-[90vh] overflow-y-auto flex flex-col">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
            <div className="inline-flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-blue-600 text-white font-bold text-xs sm:text-base flex-shrink-0">
              {formData.interview_with?.charAt(0)?.toUpperCase() || 'A'}
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-base sm:text-lg font-bold text-gray-900 truncate">{formData.interview_with || 'Interview'}</h2>
              <p className="text-xs text-gray-500 flex items-center gap-1 truncate"><Clock className="w-3 h-3 flex-shrink-0" /> <span className="truncate">{formData.scheduled_date || '-'} • {formData.scheduled_time || '-'}</span></p>
            </div>
          </div>

          <button onClick={() => {
            setIsEditing(false);
            onClose();
          }} className="text-gray-400 hover:text-gray-600 flex-shrink-0" aria-label="Close">
            <X className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
        </div>

        <div className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1">
          {/* Schedule Information - Always Visible */}
          <AccordionSection title="Schedule & Status" defaultOpen={true}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <p className="text-xs font-semibold text-gray-600 uppercase mb-1">Date</p>
                <p className="text-sm text-gray-900 font-medium truncate">{formData.scheduled_date || '-'}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-600 uppercase mb-1">Time</p>
                <p className="text-sm text-gray-900 font-medium truncate">{formData.scheduled_time || '-'} {formData.timezone && `(${formData.timezone})`}</p>
              </div>
              <div className="sm:col-span-2">
                <label className="text-xs font-semibold text-gray-600 uppercase mb-2 block">Status</label>
                {isEditing ? (
                  <select
                    value={formData.status || 'Scheduled'}
                    onChange={(e) => handleFieldChange('status', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                  >
                    {getValidStatuses().map(status => (
                      <option key={status} value={status}>{status}</option>
                    ))}
                  </select>
                ) : (
                  <div className="inline-block px-3 py-1 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm text-blue-900 font-medium">{formData.status || '-'}</p>
                  </div>
                )}
              </div>
            </div>
          </AccordionSection>

          {/* Meeting Link */}
          {formData.location && (
            <div className="flex items-start gap-2 sm:gap-3 bg-blue-50 border border-blue-200 rounded-lg p-3 sm:p-4">
              <MapPin className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-blue-700 uppercase mb-1">Meeting Link</p>
                {isMeetingUrl ? (
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-blue-900 truncate">{meetingProvider}</p>
                    <button
                      onClick={handleJoinCall}
                      className="px-3 py-1 bg-blue-600 text-white text-xs font-semibold rounded hover:bg-blue-700 flex items-center gap-2 flex-shrink-0"
                    >
                      <ExternalLink className="w-3 h-3" /> Join
                    </button>
                  </div>
                ) : (
                  <p className="text-sm text-blue-900 truncate">{formData.location}</p>
                )}
              </div>
            </div>
          )}

          {/* Interview Details */}
          <AccordionSection title="Interview Details" defaultOpen={false}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <EditableField 
                label="Candidate Name" 
                value={formData.interview_with}
                isEditing={isEditing}
              >
                <input
                  type="text"
                  value={formData.interview_with || ''}
                  onChange={(e) => handleFieldChange('interview_with', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </EditableField>

              <EditableField 
                label="Interview Type" 
                value={formData.type}
                isEditing={isEditing}
              >
                <input
                  type="text"
                  value={formData.type || ''}
                  onChange={(e) => handleFieldChange('type', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </EditableField>

              <EditableField 
                label="Round" 
                value={formData.round}
                isEditing={isEditing}
              >
                <input
                  type="text"
                  value={formData.round || ''}
                  onChange={(e) => handleFieldChange('round', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </EditableField>

              <EditableField 
                label="Result" 
                value={formData.result}
                isEditing={isEditing}
              >
                <input
                  type="text"
                  value={formData.result || ''}
                  onChange={(e) => handleFieldChange('result', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </EditableField>

              <EditableField 
                label="Duration (minutes)" 
                value={formData.duration_minutes}
                isEditing={isEditing}
              >
                <input
                  type="number"
                  value={formData.duration_minutes || ''}
                  onChange={(e) => handleFieldChange('duration_minutes', parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </EditableField>

              <EditableField 
                label="Mode" 
                value={formData.mode}
                isEditing={isEditing}
              >
                <input
                  type="text"
                  value={formData.mode || ''}
                  onChange={(e) => handleFieldChange('mode', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </EditableField>
            </div>
          </AccordionSection>

          {/* Participants */}
          <AccordionSection title="Participants" defaultOpen={false}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <EditableField 
                label="Interviewer" 
                value={formData.interviewer}
                isEditing={isEditing}
              >
                <input
                  type="text"
                  value={formData.interviewer || ''}
                  onChange={(e) => handleFieldChange('interviewer', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </EditableField>

              <EditableField 
                label="Vendor Company" 
                value={formData.vendor_company}
                isEditing={isEditing}
              >
                <input
                  type="text"
                  value={formData.vendor_company || ''}
                  onChange={(e) => handleFieldChange('vendor_company', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </EditableField>
            </div>
          </AccordionSection>

          {/* Notes & Feedback */}
          <AccordionSection title="Notes & Feedback" defaultOpen={false}>
            <div className="space-y-4">
              <EditableField 
                label="Interview Focus" 
                value={formData.interview_focus}
                isEditing={isEditing}
              >
                <textarea
                  value={formData.interview_focus || ''}
                  onChange={(e) => handleFieldChange('interview_focus', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm resize-none"
                  rows={2}
                />
              </EditableField>

              <EditableField 
                label="Feedback Notes" 
                value={formData.feedback_notes}
                isEditing={isEditing}
              >
                <textarea
                  value={formData.feedback_notes || ''}
                  onChange={(e) => handleFieldChange('feedback_notes', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm resize-none"
                  rows={2}
                />
              </EditableField>

              <EditableField 
                label="Special Notes" 
                value={formData.notes}
                isEditing={isEditing}
              >
                <textarea
                  value={(formData as any).notes || ''}
                  onChange={(e) => handleFieldChange('notes' as any, e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm resize-none"
                  rows={2}
                />
              </EditableField>
            </div>
          </AccordionSection>

          {/* Audit Log - Admin Only */}
          {isAdmin && (
            <AccordionSection title="Audit Information" defaultOpen={false}>
              <AuditLog
                createdAt={interview.created_at}
                createdBy={createdBy}
                updatedAt={interview.updated_at}
                updatedBy={updatedBy}
                showToNonAdmins={true}
              />
            </AccordionSection>
          )}

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 pt-4 border-t border-gray-200 sticky bottom-0 bg-white">
            {isEditing ? (
              <>
                <button
                  onClick={handleSave}
                  disabled={isLoading}
                  className="flex-1 px-4 sm:px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2 text-sm"
                >
                  {isLoading ? <Loader className="w-4 h-4 animate-spin" /> : 'Save Changes'}
                </button>
                <button
                  onClick={() => {
                    setFormData(interview);
                    setIsEditing(false);
                  }}
                  className="flex-1 px-4 sm:px-6 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 text-sm"
                >
                  Cancel
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => setIsEditing(true)}
                  className="flex-1 px-4 sm:px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 flex items-center justify-center gap-2 text-sm"
                >
                  <Edit2 className="w-4 h-4" />
                  <span className="hidden sm:inline">Edit</span>
                </button>
                {isAdmin && (
                  <button
                    onClick={handleDelete}
                    disabled={isDeleting}
                    className="flex-1 px-4 sm:px-6 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-2 text-sm"
                  >
                    {isDeleting ? (
                      <Loader className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                    <span className="hidden sm:inline">Delete</span>
                  </button>
                )}
                <button
                  onClick={() => {
                    setIsEditing(false);
                    onClose();
                  }}
                  className="flex-1 px-4 sm:px-6 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 text-sm"
                >
                  Close
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

