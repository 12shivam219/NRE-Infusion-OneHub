import { useState, useEffect } from 'react';
import { X, Edit2, Trash2, Loader } from 'lucide-react';
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
      setFormData(interview);
      setIsEditing(false);
    }
  }, [interview, isOpen]);

  if (!isOpen || !interview || !formData) return null;

  const handleFieldChange = (key: keyof Interview, value: unknown) => {
    setFormData(prev => prev ? { ...prev, [key]: value } : null);
  };

  const handleSave = async () => {
    if (!user) return;
    setIsLoading(true);

    const result = await updateInterview(
      interview.id,
      formData as Partial<Interview>,
      user.id
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

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">
            {isEditing ? 'Edit Interview' : 'Interview Details'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status
              </label>
              {isEditing ? (
                <select
                  value={formData.status || 'Scheduled'}
                  onChange={(e) => handleFieldChange('status', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Pending">Pending</option>
                  <option value="Scheduled">Scheduled</option>
                  <option value="Confirmed">Confirmed</option>
                  <option value="Completed">Completed</option>
                  <option value="Cancelled">Cancelled</option>
                  <option value="Re-Scheduled">Re-Scheduled</option>
                </select>
              ) : (
                <p className="text-gray-900 font-medium">{formData.status || '-'}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Scheduled Date
              </label>
              {isEditing ? (
                <input
                  type="date"
                  value={formData.scheduled_date || ''}
                  onChange={(e) => handleFieldChange('scheduled_date', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              ) : (
                <p className="text-gray-600">{formData.scheduled_date || '-'}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Scheduled Time
              </label>
              {isEditing ? (
                <input
                  type="time"
                  value={formData.scheduled_time || ''}
                  onChange={(e) => handleFieldChange('scheduled_time', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              ) : (
                <p className="text-gray-600">{formData.scheduled_time || '-'}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Duration (minutes)
              </label>
              {isEditing ? (
                <input
                  type="number"
                  value={formData.duration_minutes || ''}
                  onChange={(e) => handleFieldChange('duration_minutes', parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              ) : (
                <p className="text-gray-600">{formData.duration_minutes || '-'} minutes</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Interview With
              </label>
              {isEditing ? (
                <input
                  type="text"
                  value={formData.interview_with || ''}
                  onChange={(e) => handleFieldChange('interview_with', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              ) : (
                <p className="text-gray-600">{formData.interview_with || '-'}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Interviewer
              </label>
              {isEditing ? (
                <input
                  type="text"
                  value={formData.interviewer || ''}
                  onChange={(e) => handleFieldChange('interviewer', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              ) : (
                <p className="text-gray-600">{formData.interviewer || '-'}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Type
              </label>
              {isEditing ? (
                <input
                  type="text"
                  value={formData.type || ''}
                  onChange={(e) => handleFieldChange('type', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              ) : (
                <p className="text-gray-600">{formData.type || '-'}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Round
              </label>
              {isEditing ? (
                <input
                  type="text"
                  value={formData.round || ''}
                  onChange={(e) => handleFieldChange('round', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              ) : (
                <p className="text-gray-600">{formData.round || '-'}</p>
              )}
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Feedback Notes
              </label>
              {isEditing ? (
                <textarea
                  value={formData.feedback_notes || ''}
                  onChange={(e) => handleFieldChange('feedback_notes', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  rows={3}
                />
              ) : (
                <p className="text-gray-600">{formData.feedback_notes || '-'}</p>
              )}
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notes
              </label>
              {isEditing ? (
                <textarea
                  value={formData.notes || ''}
                  onChange={(e) => handleFieldChange('notes', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  rows={2}
                />
              ) : (
                <p className="text-gray-600">{formData.notes || '-'}</p>
              )}
            </div>
          </div>

          {/* Audit Log - Admin Only */}
          {isAdmin && (
            <AuditLog
              createdAt={interview.created_at}
              createdBy={createdBy}
              updatedAt={interview.updated_at}
              updatedBy={updatedBy}
              showToNonAdmins={true}
            />
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t border-gray-200">
            {isEditing ? (
              <>
                <button
                  onClick={handleSave}
                  disabled={isLoading}
                  className="flex-1 px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isLoading ? <Loader className="w-4 h-4 animate-spin" /> : 'Save Changes'}
                </button>
                <button
                  onClick={() => {
                    setFormData(interview);
                    setIsEditing(false);
                  }}
                  className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50"
                >
                  Cancel
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => setIsEditing(true)}
                  className="flex-1 px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 flex items-center justify-center gap-2"
                >
                  <Edit2 className="w-4 h-4" />
                  Edit
                </button>
                {isAdmin && (
                  <button
                    onClick={handleDelete}
                    disabled={isDeleting}
                    className="px-6 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isDeleting ? (
                      <Loader className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                    Delete
                  </button>
                )}
                <button
                  onClick={onClose}
                  className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50"
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
