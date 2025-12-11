import { useState, useEffect } from 'react';
import { X, Edit2, Trash2, Loader, Mail } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { updateRequirement, deleteRequirement } from '../../lib/api/requirements';
import { useToast } from '../../contexts/ToastContext';
import { ResourceAuditTimeline } from '../common/ResourceAuditTimeline';
import { EmailThreading } from './EmailThreading';
import { subscribeToRequirementById, type RealtimeUpdate } from '../../lib/api/realtimeSync';
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
}: RequirementDetailModalProps) => {
  const { user, isAdmin } = useAuth();
  const { showToast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState<Partial<Requirement> | null>(null);
  const [activeTab, setActiveTab] = useState<'details' | 'emails'>('details');
  const [remoteUpdateNotified, setRemoteUpdateNotified] = useState(false);

  useEffect(() => {
    if (requirement) {
      setFormData(requirement);
      setIsEditing(false);
      setRemoteUpdateNotified(false);
    }
  }, [requirement, isOpen]);

  // Subscribe to real-time updates for this specific requirement
  useEffect(() => {
    if (!isOpen || !requirement) return;

    const unsubscribe = subscribeToRequirementById(requirement.id, (update: RealtimeUpdate<Requirement>) => {
      // Only update if not currently editing
      if (!isEditing && update.type === 'UPDATE') {
        setFormData(update.record);
        
        // Show notification if another user made changes
        if (!remoteUpdateNotified) {
          showToast({
            type: 'info',
            title: 'Updated',
            message: 'This requirement was updated by another user. Changes are reflected below.',
          });
          setRemoteUpdateNotified(true);
        }
      }
    });

    return () => {
      unsubscribe?.();
    };
  }, [isOpen, requirement, isEditing, remoteUpdateNotified, showToast]);

  if (!isOpen || !requirement || !formData) return null;

  const handleFieldChange = (key: keyof Requirement, value: unknown) => {
    setFormData(prev => prev ? { ...prev, [key]: value } : null);
  };

  const handleSave = async () => {
    if (!user) return;
    
    // Store original data for rollback in case of error
    const originalFormData = formData;
    
    setIsLoading(true);
    
    // Optimistic update: immediately show the changes to the user
    // The real-time subscription will sync with server changes

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
        message: 'Only admins can delete requirements.',
      });
      return;
    }

    if (!confirm('Are you sure you want to delete this requirement? This action cannot be undone.')) {
      return;
    }

    setIsDeleting(true);
    const result = await deleteRequirement(requirement.id, user?.id);

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
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-2 sm:p-4 lg:p-6">
      <div className="bg-white rounded-lg sm:rounded-2xl shadow-2xl w-full max-w-2xl sm:max-w-3xl lg:max-w-5xl xl:max-w-6xl max-h-[95vh] overflow-hidden flex flex-col border border-blue-100">
        <div className="sticky top-0 bg-gradient-to-r from-blue-600 via-blue-600 to-indigo-600 border-b-4 border-blue-700 px-4 sm:px-6 lg:px-8 py-4 sm:py-5 lg:py-6 flex items-center justify-between shadow-lg">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 sm:gap-3 mb-1 sm:mb-2">
              <div className="w-1 h-6 sm:h-7 lg:h-8 bg-white rounded-full"></div>
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight drop-shadow truncate">
                {isEditing ? 'Edit Requirement' : 'Requirement Details'}
              </h2>
            </div>
            <p className="text-blue-100 text-xs sm:text-sm lg:text-base ml-3 sm:ml-4 font-medium">
              Req No: <span className="font-bold text-blue-200">{requirement.requirement_number || 'N/A'}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-blue-100 hover:text-white transition p-2 sm:p-3 hover:bg-blue-500 rounded-lg hover:shadow-lg ml-2 sm:ml-4 flex-shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
            aria-label="Close modal"
          >
            <X className="w-5 h-5 sm:w-6 sm:h-6 lg:w-7 lg:h-7" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-gray-200 overflow-visible bg-white px-3 sm:px-4 lg:px-6">
          <div className="flex gap-1 sm:gap-2 bg-gray-100 rounded-lg sm:rounded-xl p-1 shadow-sm w-full mb-3">
            <button
              onClick={() => setActiveTab('details')}
              className={`py-2 sm:py-2.5 lg:py-3 px-3 sm:px-4 lg:px-6 font-semibold rounded-md sm:rounded-lg transition whitespace-nowrap text-xs sm:text-sm lg:text-base flex-1 ${
                activeTab === 'details'
                  ? 'bg-white text-blue-700 border border-blue-500 shadow-md z-10'
                  : 'bg-gray-100 text-gray-600 hover:bg-white hover:text-blue-600 border border-transparent'
              }`}
              aria-selected={activeTab === 'details'}
              aria-controls="details-tab-panel"
              tabIndex={activeTab === 'details' ? 0 : -1}
            >
              Details
            </button>
            <button
              onClick={() => setActiveTab('emails')}
              className={`py-2 sm:py-2.5 lg:py-3 px-3 sm:px-4 lg:px-6 font-semibold rounded-md sm:rounded-lg transition whitespace-nowrap text-xs sm:text-sm lg:text-base flex-1 flex items-center justify-center gap-1 sm:gap-2 ${
                activeTab === 'emails'
                  ? 'bg-white text-blue-700 border border-blue-500 shadow-md z-10'
                  : 'bg-gray-100 text-gray-600 hover:bg-white hover:text-blue-600 border border-transparent'
              }`}
              aria-selected={activeTab === 'emails'}
              aria-controls="emails-tab-panel"
              tabIndex={activeTab === 'emails' ? 0 : -1}
            >
              <Mail className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">Emails</span>
              <span className="inline sm:hidden">Email</span>
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto bg-gray-50">
          {/* Details Tab */}
          {activeTab === 'details' && (
            <>
              <div className="p-3 sm:p-5 lg:p-8 space-y-6 sm:space-y-8">
                {/* Form Section Header */}
                <div className="border-b-2 border-blue-200 pb-3 sm:pb-4 mb-4 sm:mb-6">
                  <h3 className="text-base sm:text-lg lg:text-xl font-bold text-gray-900 flex items-center gap-2 mb-1">
                    <div className="w-1 h-5 sm:h-6 bg-blue-600 rounded-full"></div>
                    Requirement Information
                  </h3>
                  <p className="text-xs sm:text-sm lg:text-base text-gray-600 mt-2 ml-3">Edit and manage all requirement details below</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 lg:gap-6 bg-white p-4 sm:p-5 lg:p-6 rounded-lg sm:rounded-xl shadow-sm border border-gray-200">
                  <div>
                    <label className="block text-xs sm:text-sm font-bold text-gray-700 mb-2">
                      Title
                    </label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={formData.title || ''}
                        onChange={(e) => handleFieldChange('title', e.target.value)}
                        className="w-full px-3 sm:px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition text-sm"
                      />
              ) : (
                <p className="text-gray-600 text-sm sm:text-base py-2">{formData.title}</p>
              )}
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-bold text-gray-700 mb-2">
                Company
              </label>
              {isEditing ? (
                <input
                  type="text"
                  value={formData.company || ''}
                  onChange={(e) => handleFieldChange('company', e.target.value)}
                  className="w-full px-3 sm:px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition text-sm"
                />
              ) : (
                <p className="text-gray-600 text-sm sm:text-base py-2">{formData.company || '-'}</p>
              )}
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-bold text-gray-700 mb-2">
                Status
              </label>
              {isEditing ? (
                <select
                  value={formData.status || 'NEW'}
                  onChange={(e) => handleFieldChange('status', e.target.value)}
                  className="w-full px-3 sm:px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition text-sm"
                >
                  <option value="NEW">New</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="SUBMITTED">Submitted</option>
                  <option value="INTERVIEW">Interview</option>
                  <option value="OFFER">Offer</option>
                  <option value="REJECTED">Rejected</option>
                  <option value="CLOSED">Closed</option>
                </select>
              ) : (
                <p className="text-gray-600 text-sm sm:text-base py-2">{formData.status || '-'}</p>
              )}
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-bold text-gray-700 mb-2">
                Location
              </label>
              {isEditing ? (
                <input
                  type="text"
                  value={formData.location || ''}
                  onChange={(e) => handleFieldChange('location', e.target.value)}
                  className="w-full px-3 sm:px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition text-sm"
                />
              ) : (
                <p className="text-gray-600 text-sm sm:text-base py-2">{formData.location || '-'}</p>
              )}
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-bold text-gray-700 mb-2">
                Rate
              </label>
              {isEditing ? (
                <input
                  type="text"
                  value={formData.rate || ''}
                  onChange={(e) => handleFieldChange('rate', e.target.value)}
                  className="w-full px-3 sm:px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition text-sm"
                />
              ) : (
                <p className="text-gray-600 text-sm sm:text-base py-2">{formData.rate || '-'}</p>
              )}
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs sm:text-sm font-bold text-gray-700 mb-2">
                Next Step
              </label>
              {isEditing ? (
                <textarea
                  value={formData.next_step || ''}
                  onChange={(e) => handleFieldChange('next_step', e.target.value)}
                  className="w-full px-3 sm:px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition text-sm"
                  rows={2}
                  placeholder="e.g., Follow up on Monday, Send proposal"
                />
              ) : (
                <p className="text-gray-600 whitespace-pre-wrap">{formData.next_step || '-'}</p>
              )}
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-bold text-gray-700 mb-2">
                Vendor Email
              </label>
              {isEditing ? (
                <input
                  type="email"
                  value={formData.vendor_email || ''}
                  onChange={(e) => handleFieldChange('vendor_email', e.target.value)}
                  className="w-full px-3 sm:px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition text-sm"
                />
              ) : (
                <p className="text-gray-600 text-sm sm:text-base py-2">{formData.vendor_email || '-'}</p>
              )}
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-bold text-gray-700 mb-2">
                Vendor Phone
              </label>
              {isEditing ? (
                <input
                  type="tel"
                  value={formData.vendor_phone || ''}
                  onChange={(e) => handleFieldChange('vendor_phone', e.target.value)}
                  className="w-full px-3 sm:px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition text-sm"
                />
              ) : (
                <p className="text-gray-600 text-sm sm:text-base py-2">{formData.vendor_phone || '-'}</p>
              )}
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-bold text-gray-700 mb-2">
                Duration
              </label>
              {isEditing ? (
                <input
                  type="text"
                  value={formData.duration || ''}
                  onChange={(e) => handleFieldChange('duration', e.target.value)}
                  className="w-full px-3 sm:px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition text-sm"
                  placeholder="e.g., 6 months, 1 year"
                />
              ) : (
                <p className="text-gray-600 text-sm sm:text-base py-2">{formData.duration || '-'}</p>
              )}
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-bold text-gray-700 mb-2">
                Work Type (Remote)
              </label>
              {isEditing ? (
                <select
                  value={formData.remote || ''}
                  onChange={(e) => handleFieldChange('remote', e.target.value)}
                  className="w-full px-3 sm:px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition text-sm"
                >
                  <option value="">Select Work Type</option>
                  <option value="Remote">Remote</option>
                  <option value="Hybrid">Hybrid</option>
                  <option value="Onsite">Onsite</option>
                </select>
              ) : (
                <p className="text-gray-600 text-sm sm:text-base py-2">{formData.remote || '-'}</p>
              )}
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-bold text-gray-700 mb-2">
                Source/Applied For
              </label>
              {isEditing ? (
                <input
                  type="text"
                  value={formData.applied_for || ''}
                  onChange={(e) => handleFieldChange('applied_for', e.target.value)}
                  className="w-full px-3 sm:px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition text-sm"
                  placeholder="e.g., LinkedIn, Referral, Portal"
                />
              ) : (
                <p className="text-gray-600 text-sm sm:text-base py-2">{formData.applied_for || '-'}</p>
              )}
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs sm:text-sm font-bold text-gray-700 mb-2">
                Tech Stack
              </label>
              {isEditing ? (
                <textarea
                  value={formData.primary_tech_stack || ''}
                  onChange={(e) => handleFieldChange('primary_tech_stack', e.target.value)}
                  className="w-full px-3 sm:px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition text-sm"
                  rows={2}
                />
              ) : (
                <p className="text-gray-600 text-sm sm:text-base py-2">{formData.primary_tech_stack || '-'}</p>
              )}
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs sm:text-sm font-bold text-gray-700 mb-2">
                Description
              </label>
              {isEditing ? (
                <textarea
                  value={formData.description || ''}
                  onChange={(e) => handleFieldChange('description', e.target.value)}
                  className="w-full px-3 sm:px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition text-sm"
                  rows={3}
                />
              ) : (
                <p className="text-gray-600 whitespace-pre-wrap">{formData.description || '-'}</p>
              )}
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-bold text-gray-700 mb-2">
                Vendor Company
              </label>
              {isEditing ? (
                <input
                  type="text"
                  value={formData.vendor_company || ''}
                  onChange={(e) => handleFieldChange('vendor_company', e.target.value)}
                  className="w-full px-3 sm:px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition text-sm"
                />
              ) : (
                <p className="text-gray-600 text-sm sm:text-base py-2">{formData.vendor_company || '-'}</p>
              )}
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-bold text-gray-700 mb-2">
                Internal Contact (Name)
              </label>
              {isEditing ? (
                <input
                  type="text"
                  value={formData.imp_name || ''}
                  onChange={(e) => handleFieldChange('imp_name', e.target.value)}
                  className="w-full px-3 sm:px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition text-sm"
                />
              ) : (
                <p className="text-gray-600 text-sm sm:text-base py-2">{formData.imp_name || '-'}</p>
              )}
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-bold text-gray-700 mb-2">
                Client Website
              </label>
              {isEditing ? (
                <input
                  type="url"
                  value={formData.client_website || ''}
                  onChange={(e) => handleFieldChange('client_website', e.target.value)}
                  className="w-full px-3 sm:px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition text-sm"
                  placeholder="https://example.com"
                />
              ) : (
                <p className="text-gray-600 text-sm sm:text-base py-2">{formData.client_website || '-'}</p>
              )}
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-bold text-gray-700 mb-2">
                IMP Website
              </label>
              {isEditing ? (
                <input
                  type="url"
                  value={formData.imp_website || ''}
                  onChange={(e) => handleFieldChange('imp_website', e.target.value)}
                  className="w-full px-3 sm:px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition text-sm"
                  placeholder="https://example.com"
                />
              ) : (
                <p className="text-gray-600 text-sm sm:text-base py-2">{formData.imp_website || '-'}</p>
              )}
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-bold text-gray-700 mb-2">
                Vendor Website
              </label>
              {isEditing ? (
                <input
                  type="url"
                  value={formData.vendor_website || ''}
                  onChange={(e) => handleFieldChange('vendor_website', e.target.value)}
                  className="w-full px-3 sm:px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition text-sm"
                  placeholder="https://example.com"
                />
              ) : (
                <p className="text-gray-600 text-sm sm:text-base py-2">{formData.vendor_website || '-'}</p>
              )}
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-bold text-gray-700 mb-2">
                Vendor Person Name
              </label>
              {isEditing ? (
                <input
                  type="text"
                  value={formData.vendor_person_name || ''}
                  onChange={(e) => handleFieldChange('vendor_person_name', e.target.value)}
                  className="w-full px-3 sm:px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition text-sm"
                />
              ) : (
                <p className="text-gray-600 text-sm sm:text-base py-2">{formData.vendor_person_name || '-'}</p>
              )}
            </div>
          </div>

          {/* Audit Log - Admin Only */}
          {isAdmin && (
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 mt-6">
              <ResourceAuditTimeline
                resourceType="requirement"
                resourceId={requirement.id}
                title="Recent admin + CRM actions"
              />
            </div>
          )}
                </div>
            </>
          )}

          {/* Emails Tab */}
          {activeTab === 'emails' && (
            <div className="min-h-[400px] bg-gray-50">
              <div className="p-4 sm:p-8">
                {/* Section Header */}
                <div className="border-b-2 border-blue-200 pb-4 mb-6">
                  <h3 className="text-lg sm:text-xl font-bold text-gray-900 flex items-center gap-2">
                    <div className="w-1 h-6 bg-blue-600 rounded-full"></div>
                    Email Correspondence
                  </h3>
                  <p className="text-sm text-gray-600 mt-2 ml-4">View and manage email threads related to this requirement</p>
                </div>

                {/* Email Threading Component */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                  <EmailThreading
                    requirementId={requirement.id}
                    onClose={() => setActiveTab('details')}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
        
        {/* Action Buttons Footer */}
        <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-4 sm:px-6 py-4 flex flex-col sm:flex-row gap-3">
          {isEditing && activeTab === 'details' ? (
            <>
              <button
                onClick={handleSave}
                disabled={isLoading}
                className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition text-sm sm:text-base"
              >
                {isLoading ? <Loader className="w-4 h-4 animate-spin" /> : 'Save Changes'}
              </button>
              <button
                onClick={() => {
                  setFormData(requirement);
                  setIsEditing(false);
                }}
                className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-100 transition text-sm sm:text-base"
              >
                Cancel
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setIsEditing(true)}
                className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 flex items-center justify-center gap-2 transition text-sm sm:text-base"
              >
                <Edit2 className="w-4 h-4" />
                Edit
              </button>
              {isAdmin && (
                <button
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="flex-1 px-6 py-3 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition text-sm sm:text-base"
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
                className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-100 transition text-sm sm:text-base"
              >
                Close
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
