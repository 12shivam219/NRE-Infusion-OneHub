import { useState, useEffect } from 'react';
import { X, Edit2, Mail } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useOfflineCache } from '../../hooks/useOfflineCache';
import { updateRequirement } from '../../lib/api/requirements';
import { useToast } from '../../contexts/ToastContext';
import { ResourceAuditTimeline } from '../common/ResourceAuditTimeline';
import { RequirementEmailManager } from './RequirementEmailManager';
import { LogoLoader } from '../common/LogoLoader';
import { subscribeToRequirementById, type RealtimeUpdate } from '../../lib/api/realtimeSync';
import { cacheRequirements, type CachedRequirement } from '../../lib/offlineDB';
import type { Database } from '../../lib/database.types';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import IconButton from '@mui/material/IconButton';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Paper from '@mui/material/Paper';

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
  const { isOnline, queueOfflineOperation } = useOfflineCache();
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState<Partial<Requirement> | null>(null);
  const [activeTab, setActiveTab] = useState<'details' | 'emails'>('details');
  const [remoteUpdateNotified, setRemoteUpdateNotified] = useState(false);

  useEffect(() => {
    if (!requirement) return;

    let cancelled = false;

    const run = async () => {
      await Promise.resolve();
      if (cancelled) return;
      setFormData(requirement);
      setIsEditing(false);
      setRemoteUpdateNotified(false);
    };

    void run();

    return () => {
      cancelled = true;
    };
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
    if (!user || !requirement) return;
    
    // Store original data for rollback in case of error
    const originalFormData = formData;
    
    setIsLoading(true);

    // Check if offline - queue operation
    if (!isOnline) {
      await queueOfflineOperation('UPDATE', 'requirement', requirement.id, formData as Record<string, unknown>);
      
      // Optimistically update local cache
      const updatedRequirement = {
        ...requirement,
        ...formData,
        updated_at: new Date().toISOString(),
      };
      await cacheRequirements([updatedRequirement as CachedRequirement], user.id);
      
      setIsLoading(false);
      showToast({
        type: 'info',
        title: 'Queued for Sync',
        message: 'Changes will be saved when you come back online',
      });
      setIsEditing(false);
      onUpdate(); // Refresh UI
      return;
    }

    // Online - update normally
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

  return (
    <Dialog
      open={isOpen}
      onClose={() => {
        setIsEditing(false);
        onClose();
      }}
      fullWidth
      maxWidth={false}
      PaperProps={{
        sx: {
          width: { xs: '100%', sm: 'calc(100% - 32px)' },
          maxWidth: { xs: '100%', sm: 1200 },
          m: { xs: 0, sm: 2 },
          overflow: 'hidden',
        },
      }}
    >
      <DialogTitle
        sx={{
          position: 'sticky',
          top: 0,
          zIndex: 2,
          background: 'linear-gradient(90deg, rgba(212,175,55,0.18), rgba(212,175,55,0.08))',
          borderBottom: 1,
          borderColor: 'divider',
          pr: 7,
        }}
      >
        <Stack direction="row" spacing={2} alignItems="center" sx={{ minWidth: 0 }}>
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography variant="h6" sx={{ fontWeight: 500 }} noWrap>
              {isEditing ? 'Edit Requirement' : 'Requirement Details'}
            </Typography>
            <Typography variant="caption" color="text.secondary" noWrap>
              Req No: {String(requirement.requirement_number || 'N/A')}
            </Typography>
          </Box>
        </Stack>
        <IconButton
          onClick={onClose}
          aria-label="Close modal"
          sx={{ position: 'absolute', right: 8, top: 8 }}
        >
          <X className="w-5 h-5" />
        </IconButton>

        <Tabs
          value={activeTab}
          onChange={(_, value) => setActiveTab(value as 'details' | 'emails')}
          variant="fullWidth"
          sx={{ mt: 2 }}
        >
          <Tab value="details" label="Details" />
          <Tab value="emails" label="Emails" icon={<Mail className="w-4 h-4" />} iconPosition="start" />
        </Tabs>
      </DialogTitle>

      <DialogContent sx={{ p: 0 }}>
        <Box sx={{ maxHeight: '95vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <Box sx={{ flex: 1, overflowY: 'auto', bgcolor: 'grey.50' }}>
          {/* Details Tab */}
          {activeTab === 'details' && (
            <>
              <div className="p-3 sm:p-5 lg:p-8 space-y-6 sm:space-y-8">
                {/* Form Section Header */}
                <div className="border-b-2 border-primary-200 pb-3 sm:pb-4 mb-4 sm:mb-6">
                  <h3 className="text-xs font-medium text-gray-900 flex items-center gap-2 mb-1">
                    <div className="w-1 h-5 sm:h-6 bg-primary-600 rounded-full"></div>
                    Requirement Information
                  </h3>
                  <p className="text-xs text-gray-600 mt-2 ml-3">Edit and manage all requirement details below</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 lg:gap-6 bg-white p-4 sm:p-5 lg:p-6 rounded-lg sm:rounded-xl shadow-sm border border-gray-200">
                  <div>
                    {isEditing ? (
                      <TextField
                        label="Title"
                        value={formData.title || ''}
                        onChange={(e) => handleFieldChange('title', e.target.value)}
                        size="small"
                        fullWidth
                      />
              ) : (
                <p className="text-gray-600 text-xs py-2">{formData.title}</p>
              )}
            </div>

            <div>
              {isEditing ? (
                <TextField
                  label="Company"
                  value={formData.company || ''}
                  onChange={(e) => handleFieldChange('company', e.target.value)}
                  size="small"
                  fullWidth
                />
              ) : (
                <p className="text-gray-600 text-xs py-2">{formData.company || '-'}</p>
              )}
            </div>

            <div>
              {isEditing ? (
                <TextField
                  select
                  label="Status"
                  value={String(formData.status || 'NEW')}
                  onChange={(e) => handleFieldChange('status', e.target.value)}
                  size="small"
                  fullWidth
                >
                  <MenuItem value="NEW">New</MenuItem>
                  <MenuItem value="IN_PROGRESS">In Progress</MenuItem>
                  <MenuItem value="SUBMITTED">Submitted</MenuItem>
                  <MenuItem value="INTERVIEW">Interview</MenuItem>
                  <MenuItem value="OFFER">Offer</MenuItem>
                  <MenuItem value="REJECTED">Rejected</MenuItem>
                  <MenuItem value="CLOSED">Closed</MenuItem>
                </TextField>
              ) : (
                <p className="text-gray-600 text-xs py-2">{formData.status || '-'}</p>
              )}
            </div>

            <div>
              {isEditing ? (
                <TextField
                  label="Location"
                  value={formData.location || ''}
                  onChange={(e) => handleFieldChange('location', e.target.value)}
                  size="small"
                  fullWidth
                />
              ) : (
                <p className="text-gray-600 text-xs py-2">{formData.location || '-'}</p>
              )}
            </div>

            <div>
              {isEditing ? (
                <TextField
                  label="Rate"
                  value={formData.rate || ''}
                  onChange={(e) => handleFieldChange('rate', e.target.value)}
                  size="small"
                  fullWidth
                />
              ) : (
                <p className="text-gray-600 text-xs py-2">{formData.rate || '-'}</p>
              )}
            </div>

            <div className="md:col-span-2">
              {isEditing ? (
                <TextField
                  label="Next Step"
                  value={formData.next_step || ''}
                  onChange={(e) => handleFieldChange('next_step', e.target.value)}
                  size="small"
                  fullWidth
                  multiline
                  rows={2}
                  placeholder="e.g., Follow up on Monday, Send proposal"
                />
              ) : (
                <p className="text-gray-600 whitespace-pre-wrap">{formData.next_step || '-'}</p>
              )}
            </div>

            <div>
              {isEditing ? (
                <TextField
                  label="Vendor Email"
                  type="email"
                  value={formData.vendor_email || ''}
                  onChange={(e) => handleFieldChange('vendor_email', e.target.value)}
                  size="small"
                  fullWidth
                />
              ) : (
                <p className="text-gray-600 text-xs py-2">{formData.vendor_email || '-'}</p>
              )}
            </div>

            <div>
              {isEditing ? (
                <TextField
                  label="Vendor Phone"
                  type="tel"
                  value={formData.vendor_phone || ''}
                  onChange={(e) => handleFieldChange('vendor_phone', e.target.value)}
                  size="small"
                  fullWidth
                />
              ) : (
                <p className="text-gray-600 text-xs py-2">{formData.vendor_phone || '-'}</p>
              )}
            </div>

            <div>
              {isEditing ? (
                <TextField
                  label="Duration"
                  value={formData.duration || ''}
                  onChange={(e) => handleFieldChange('duration', e.target.value)}
                  size="small"
                  fullWidth
                  placeholder="e.g., 6 months, 1 year"
                />
              ) : (
                <p className="text-gray-600 text-xs py-2">{formData.duration || '-'}</p>
              )}
            </div>

            <div>
              {isEditing ? (
                <TextField
                  select
                  label="Work Type (Remote)"
                  value={String(formData.remote || '')}
                  onChange={(e) => handleFieldChange('remote', e.target.value)}
                  size="small"
                  fullWidth
                >
                  <MenuItem value="">Select Work Type</MenuItem>
                  <MenuItem value="Remote">Remote</MenuItem>
                  <MenuItem value="Hybrid">Hybrid</MenuItem>
                  <MenuItem value="Onsite">Onsite</MenuItem>
                </TextField>
              ) : (
                <p className="text-gray-600 text-xs py-2">{formData.remote || '-'}</p>
              )}
            </div>

            <div>
              {isEditing ? (
                <TextField
                  label="Source/Applied For"
                  value={formData.applied_for || ''}
                  onChange={(e) => handleFieldChange('applied_for', e.target.value)}
                  size="small"
                  fullWidth
                  placeholder="e.g., LinkedIn, Referral, Portal"
                />
              ) : (
                <p className="text-gray-600 text-xs py-2">{formData.applied_for || '-'}</p>
              )}
            </div>

            <div className="md:col-span-2">
              {isEditing ? (
                <TextField
                  label="Tech Stack"
                  value={formData.primary_tech_stack || ''}
                  onChange={(e) => handleFieldChange('primary_tech_stack', e.target.value)}
                  size="small"
                  fullWidth
                  multiline
                  rows={2}
                />
              ) : (
                <p className="text-gray-600 text-xs py-2">{formData.primary_tech_stack || '-'}</p>
              )}
            </div>

            <div className="md:col-span-2">
              {isEditing ? (
                <TextField
                  label="Description"
                  value={formData.description || ''}
                  onChange={(e) => handleFieldChange('description', e.target.value)}
                  size="small"
                  fullWidth
                  multiline
                  rows={3}
                />
              ) : (
                <p className="text-gray-600 whitespace-pre-wrap">{formData.description || '-'}</p>
              )}
            </div>

            <div>
              {isEditing ? (
                <TextField
                  label="Vendor Company"
                  value={formData.vendor_company || ''}
                  onChange={(e) => handleFieldChange('vendor_company', e.target.value)}
                  size="small"
                  fullWidth
                />
              ) : (
                <p className="text-gray-600 text-xs py-2">{formData.vendor_company || '-'}</p>
              )}
            </div>

            <div>
              {isEditing ? (
                <TextField
                  label="Internal Contact (Name)"
                  value={formData.imp_name || ''}
                  onChange={(e) => handleFieldChange('imp_name', e.target.value)}
                  size="small"
                  fullWidth
                />
              ) : (
                <p className="text-gray-600 text-xs py-2">{formData.imp_name || '-'}</p>
              )}
            </div>

            <div>
              {isEditing ? (
                <TextField
                  label="Client Website"
                  type="url"
                  value={formData.client_website || ''}
                  onChange={(e) => handleFieldChange('client_website', e.target.value)}
                  size="small"
                  fullWidth
                  placeholder="https://example.com"
                />
              ) : (
                <p className="text-gray-600 text-xs py-2">{formData.client_website || '-'}</p>
              )}
            </div>

            <div>
              {isEditing ? (
                <TextField
                  label="IMP Website"
                  type="url"
                  value={formData.imp_website || ''}
                  onChange={(e) => handleFieldChange('imp_website', e.target.value)}
                  size="small"
                  fullWidth
                  placeholder="https://example.com"
                />
              ) : (
                <p className="text-gray-600 text-xs py-2">{formData.imp_website || '-'}</p>
              )}
            </div>

            <div>
              {isEditing ? (
                <TextField
                  label="Vendor Website"
                  type="url"
                  value={formData.vendor_website || ''}
                  onChange={(e) => handleFieldChange('vendor_website', e.target.value)}
                  size="small"
                  fullWidth
                  placeholder="https://example.com"
                />
              ) : (
                <p className="text-gray-600 text-xs py-2">{formData.vendor_website || '-'}</p>
              )}
            </div>

            <div>
              {isEditing ? (
                <TextField
                  label="Vendor Person Name"
                  value={formData.vendor_person_name || ''}
                  onChange={(e) => handleFieldChange('vendor_person_name', e.target.value)}
                  size="small"
                  fullWidth
                />
              ) : (
                <p className="text-gray-600 text-xs py-2">{formData.vendor_person_name || '-'}</p>
              )}
            </div>
          </div>

          {/* Audit Log - Admin Only */}
          {isAdmin && (
            <Paper variant="outlined" sx={{ p: 3, mt: 3 }}>
              <ResourceAuditTimeline
                resourceType="requirement"
                resourceId={requirement.id}
                title="Recent admin + CRM actions"
              />
            </Paper>
          )}
                </div>
            </>
          )}

          {/* Emails Tab */}
          {activeTab === 'emails' && (
            <Box sx={{ p: { xs: 2, sm: 4 } }}>
              <RequirementEmailManager
                requirementId={requirement.id}
                requirementTitle={requirement.title}
                vendorEmail={requirement.vendor_email}
              />
            </Box>
          )}
          </Box>
        </Box>
      </DialogContent>

      <DialogActions
        sx={{
          position: 'sticky',
          bottom: 0,
          bgcolor: 'background.default',
          borderTop: 1,
          borderColor: 'divider',
          px: 2,
          py: 2,
        }}
      >
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ width: '100%' }}>
          {isEditing && activeTab === 'details' ? (
            <>
              <Button
                variant="contained"
                color="primary"
                onClick={handleSave}
                disabled={isLoading}
                startIcon={isLoading ? <span className="w-4 h-4"><LogoLoader size="sm" /></span> : undefined}
                sx={{ flex: 1 }}
              >
                Save Changes
              </Button>
              <Button
                variant="outlined"
                color="inherit"
                onClick={() => {
                  setFormData(requirement);
                  setIsEditing(false);
                }}
                sx={{ flex: 1 }}
              >
                Cancel
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="contained"
                color="primary"
                onClick={() => setIsEditing(true)}
                startIcon={<Edit2 className="w-4 h-4" />}
                sx={{ flex: 1 }}
              >
                Edit
              </Button>
              <Button variant="outlined" color="inherit" onClick={onClose} sx={{ flex: 1 }}>
                Close
              </Button>
            </>
          )}
        </Stack>
      </DialogActions>
    </Dialog>
  );
};
