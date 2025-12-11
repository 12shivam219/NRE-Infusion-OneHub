import { useState, useEffect } from 'react';
import { X, Edit2, Trash2, Loader } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { updateConsultant, deleteConsultant } from '../../lib/api/consultants';
import { useToast } from '../../contexts/ToastContext';
import { ResourceAuditTimeline } from '../common/ResourceAuditTimeline';
import { subscribeToConsultantById, type RealtimeUpdate } from '../../lib/api/realtimeSync';
import type { Database } from '../../lib/database.types';

type Consultant = Database['public']['Tables']['consultants']['Row'];

interface ConsultantDetailModalProps {
  isOpen: boolean;
  consultant: Consultant | null;
  onClose: () => void;
  onUpdate: () => void;
  createdBy?: string | null;
  updatedBy?: string | null;
}

export const ConsultantDetailModal = ({
  isOpen,
  consultant,
  onClose,
  onUpdate,
}: ConsultantDetailModalProps) => {
  const { user, isAdmin } = useAuth();
  const { showToast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState<Partial<Consultant> | null>(null);
  const [remoteUpdateNotified, setRemoteUpdateNotified] = useState(false);

  useEffect(() => {
    if (consultant) {
      setFormData(consultant);
      setIsEditing(false);
      setRemoteUpdateNotified(false);
    }
  }, [consultant, isOpen]);

  // Subscribe to real-time updates for this specific consultant
  useEffect(() => {
    if (!isOpen || !consultant) return;

    const unsubscribe = subscribeToConsultantById(consultant.id, (update: RealtimeUpdate<Consultant>) => {
      // Only update if not currently editing
      if (!isEditing && update.type === 'UPDATE') {
        setFormData(update.record);
        
        // Show notification if another user made changes
        if (!remoteUpdateNotified) {
          showToast({
            type: 'info',
            title: 'Updated',
            message: 'This consultant was updated by another user. Changes are reflected below.',
          });
          setRemoteUpdateNotified(true);
        }
      }
    });

    return () => {
      unsubscribe?.();
    };
  }, [isOpen, consultant, isEditing, remoteUpdateNotified, showToast]);

  if (!isOpen || !consultant || !formData) return null;

  const handleFieldChange = (key: keyof Consultant, value: unknown) => {
    setFormData(prev => prev ? { ...prev, [key]: value } : null);
  };

  const handleSave = async () => {
    if (!user) return;
    
    // Store original data for rollback in case of error
    const originalFormData = formData;
    
    setIsLoading(true);

    const result = await updateConsultant(
      consultant.id,
      formData as Partial<Consultant>,
      user.id
    );

    if (result.success) {
      showToast({
        type: 'success',
        title: 'Consultant updated',
        message: 'Changes have been saved successfully.',
      });
      setIsEditing(false);
      onUpdate();
    } else if (result.error) {
      // Rollback on error
      setFormData(originalFormData);
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
        message: 'Only admins can delete consultants.',
      });
      return;
    }

    if (!confirm('Are you sure you want to delete this consultant? This action cannot be undone.')) {
      return;
    }

    setIsDeleting(true);
    const result = await deleteConsultant(consultant.id, user?.id);

    if (result.success) {
      showToast({
        type: 'success',
        title: 'Consultant deleted',
        message: 'The consultant has been removed.',
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
            {isEditing ? 'Edit Consultant' : 'Consultant Details'}
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
                Name
              </label>
              {isEditing ? (
                <input
                  type="text"
                  value={formData.name || ''}
                  onChange={(e) => handleFieldChange('name', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              ) : (
                <p className="text-gray-900 font-medium">{formData.name}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status
              </label>
              {isEditing ? (
                <select
                  value={formData.status || 'Active'}
                  onChange={(e) => handleFieldChange('status', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Active">Active</option>
                  <option value="Not Active">Not Active</option>
                  <option value="Recently Placed">Recently Placed</option>
                </select>
              ) : (
                <p className="text-gray-600">{formData.status || '-'}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>
              {isEditing ? (
                <input
                  type="email"
                  value={formData.email || ''}
                  onChange={(e) => handleFieldChange('email', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              ) : (
                <p className="text-gray-600">{formData.email || '-'}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Phone
              </label>
              {isEditing ? (
                <input
                  type="tel"
                  value={formData.phone || ''}
                  onChange={(e) => handleFieldChange('phone', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              ) : (
                <p className="text-gray-600">{formData.phone || '-'}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Location
              </label>
              {isEditing ? (
                <input
                  type="text"
                  value={formData.location || ''}
                  onChange={(e) => handleFieldChange('location', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              ) : (
                <p className="text-gray-600">{formData.location || '-'}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Total Experience
              </label>
              {isEditing ? (
                <input
                  type="text"
                  value={formData.total_experience || ''}
                  onChange={(e) => handleFieldChange('total_experience', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              ) : (
                <p className="text-gray-600">{formData.total_experience || '-'}</p>
              )}
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Primary Skills
              </label>
              {isEditing ? (
                <textarea
                  value={formData.primary_skills || ''}
                  onChange={(e) => handleFieldChange('primary_skills', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  rows={2}
                />
              ) : (
                <p className="text-gray-600">{formData.primary_skills || '-'}</p>
              )}
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Secondary Skills
              </label>
              {isEditing ? (
                <textarea
                  value={formData.secondary_skills || ''}
                  onChange={(e) => handleFieldChange('secondary_skills', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  rows={2}
                />
              ) : (
                <p className="text-gray-600">{formData.secondary_skills || '-'}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                LinkedIn Profile
              </label>
              {isEditing ? (
                <input
                  type="url"
                  value={formData.linkedin_profile || ''}
                  onChange={(e) => handleFieldChange('linkedin_profile', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              ) : (
                <p className="text-gray-600">
                  {formData.linkedin_profile ? (
                    <a href={formData.linkedin_profile} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                      View Profile
                    </a>
                  ) : (
                    '-'
                  )}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Expected Rate
              </label>
              {isEditing ? (
                <input
                  type="text"
                  value={formData.expected_rate || ''}
                  onChange={(e) => handleFieldChange('expected_rate', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              ) : (
                <p className="text-gray-600">{formData.expected_rate || '-'}</p>
              )}
            </div>
          </div>

          {/* Audit Log - Admin Only */}
          {isAdmin && (
            <ResourceAuditTimeline
              resourceType="consultant"
              resourceId={consultant.id}
              title="Recent admin + CRM actions"
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
                    setFormData(consultant);
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
