import { useState, useEffect } from 'react';
import { X, Edit2, Trash2, Loader, Mail } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { updateRequirement, deleteRequirement } from '../../lib/api/requirements';
import { useToast } from '../../contexts/ToastContext';
import { AuditLog } from '../common/AuditLog';
import { EmailThreading } from './EmailThreading';
import type { Database } from '../../lib/database.types';

type Requirement = Database['public']['Tables']['requirements']['Row'];

interface RequirementDetailModalProps {
  isOpen: boolean;
  requirement: Requirement | null;
  onClose: () => void;
  onUpdate: () => void;
  createdBy?: string | null;
  updatedBy?: string | null;
}

export const RequirementDetailModal = ({
  isOpen,
  requirement,
  onClose,
  onUpdate,
  createdBy,
  updatedBy,
}: RequirementDetailModalProps) => {
  const { user, isAdmin } = useAuth();
  const { showToast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState<Partial<Requirement> | null>(null);
  const [activeTab, setActiveTab] = useState<'details' | 'emails'>('details');

  useEffect(() => {
    if (requirement) {
      setFormData(requirement);
      setIsEditing(false);
    }
  }, [requirement, isOpen]);

  if (!isOpen || !requirement || !formData) return null;

  const handleFieldChange = (key: keyof Requirement, value: unknown) => {
    setFormData(prev => prev ? { ...prev, [key]: value } : null);
  };

  const handleSave = async () => {
    if (!user) return;
    setIsLoading(true);

    const result = await updateRequirement(
      requirement.id,
      formData as Partial<Requirement>,
      user.id
    );

    if (result.success) {
      showToast({
        type: 'success',
        title: 'Requirement updated',
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
        message: 'Only admins can delete requirements.',
      });
      return;
    }

    if (!confirm('Are you sure you want to delete this requirement? This action cannot be undone.')) {
      return;
    }

    setIsDeleting(true);
    const result = await deleteRequirement(requirement.id);

    if (result.success) {
      showToast({
        type: 'success',
        title: 'Requirement deleted',
        message: 'The requirement has been removed.',
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
            {isEditing ? 'Edit Requirement' : 'Requirement Details'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-gray-200 bg-gray-50 px-6 flex gap-0">
          <button
            onClick={() => setActiveTab('details')}
            className={`py-3 px-4 font-medium border-b-2 transition ${
              activeTab === 'details'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            Details
          </button>
          <button
            onClick={() => setActiveTab('emails')}
            className={`py-3 px-4 font-medium border-b-2 transition flex items-center gap-2 ${
              activeTab === 'emails'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            <Mail className="w-4 h-4" />
            Emails
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Details Tab */}
          {activeTab === 'details' && (
            <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Title
              </label>
              {isEditing ? (
                <input
                  type="text"
                  value={formData.title || ''}
                  onChange={(e) => handleFieldChange('title', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              ) : (
                <p className="text-gray-900 font-medium">{formData.title}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Company
              </label>
              {isEditing ? (
                <input
                  type="text"
                  value={formData.company || ''}
                  onChange={(e) => handleFieldChange('company', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              ) : (
                <p className="text-gray-600">{formData.company || '-'}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status
              </label>
              {isEditing ? (
                <select
                  value={formData.status || 'NEW'}
                  onChange={(e) => handleFieldChange('status', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="NEW">New</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="INTERVIEW">Interview</option>
                  <option value="OFFER">Offer</option>
                  <option value="REJECTED">Rejected</option>
                  <option value="CLOSED">Closed</option>
                </select>
              ) : (
                <p className="text-gray-600">{formData.status || '-'}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Priority
              </label>
              {isEditing ? (
                <select
                  value={formData.priority || 'Medium'}
                  onChange={(e) => handleFieldChange('priority', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                </select>
              ) : (
                <p className="text-gray-600">{formData.priority || '-'}</p>
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
                Rate
              </label>
              {isEditing ? (
                <input
                  type="text"
                  value={formData.rate || ''}
                  onChange={(e) => handleFieldChange('rate', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              ) : (
                <p className="text-gray-600">{formData.rate || '-'}</p>
              )}
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tech Stack
              </label>
              {isEditing ? (
                <textarea
                  value={formData.primary_tech_stack || ''}
                  onChange={(e) => handleFieldChange('primary_tech_stack', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  rows={2}
                />
              ) : (
                <p className="text-gray-600">{formData.primary_tech_stack || '-'}</p>
              )}
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              {isEditing ? (
                <textarea
                  value={formData.description || ''}
                  onChange={(e) => handleFieldChange('description', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  rows={3}
                />
              ) : (
                <p className="text-gray-600">{formData.description || '-'}</p>
              )}
            </div>
          </div>

          {/* Audit Log - Admin Only */}
          {isAdmin && (
            <AuditLog
              createdAt={requirement.created_at}
              createdBy={createdBy}
              updatedAt={requirement.updated_at}
              updatedBy={updatedBy}
              showToNonAdmins={true}
            />
          )}
            </>
          )}

          {/* Emails Tab */}
          {activeTab === 'emails' && (
            <div className="min-h-[400px]">
              <EmailThreading
                requirementId={requirement.id}
                onClose={() => setActiveTab('details')}
              />
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t border-gray-200">
            {isEditing && activeTab === 'details' ? (
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
                    setFormData(requirement);
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
