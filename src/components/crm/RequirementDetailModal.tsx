import { useState, useEffect } from 'react';
import { X, Edit2, Mail, History } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useOfflineCache } from '../../hooks/useOfflineCache';
import { updateRequirement } from '../../lib/api/requirements';
import { useToast } from '../../contexts/ToastContext';
import { ResourceAuditTimeline } from '../common/ResourceAuditTimeline';
import { RequirementEmailManager } from './RequirementEmailManager';
import EmailHistoryPanel from './EmailHistoryPanel';
import { LogoLoader } from '../common/LogoLoader';
import NextStepThread from './NextStepThread';
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
  const [activeTab, setActiveTab] = useState<'details' | 'emails' | 'history'>('details');
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
      disableScrollLock
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
          onChange={(_, value) => setActiveTab(value as 'details' | 'emails' | 'history')}
          variant="fullWidth"
          sx={{ mt: 2 }}
        >
          <Tab value="details" label="Details" />
          <Tab value="emails" label="Emails" icon={<Mail className="w-4 h-4" />} iconPosition="start" />
          <Tab value="history" label="History" icon={<History className="w-4 h-4" />} iconPosition="start" />
        </Tabs>
      </DialogTitle>

      <DialogContent sx={{ p: 0 }}>
        <Box sx={{ maxHeight: '95vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <Box sx={{ flex: 1, overflowY: 'auto', bgcolor: 'grey.50' }}>
          {/* Details Tab */}
          {activeTab === 'details' && (
            <>
              <div className="p-3 sm:p-4 space-y-4">
                {/* Form Section Header */}
                <div className="border-b border-gray-200 pb-2 mb-3">
                  <h3 className="text-xs font-semibold text-gray-900 flex items-center gap-2">
                    <div className="w-1 h-4 bg-blue-600 rounded-full"></div>
                    Requirement Details
                  </h3>
                </div>

                <div className="bg-white rounded-lg border border-gray-200 p-3">
                  {!isEditing ? (
                    // View Mode - Organized Grid
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        <div>
                          <p className="text-xs font-medium text-gray-500">Title</p>
                          <p className="text-sm text-gray-700">{formData.title || '-'}</p>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-gray-500">Company</p>
                          <p className="text-sm text-gray-700">{formData.company || '-'}</p>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-gray-500">Status</p>
                          <p className="text-sm text-gray-700">{formData.status || '-'}</p>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-gray-500">Rate</p>
                          <p className="text-sm text-gray-700">{formData.rate || '-'}</p>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-gray-500">Location</p>
                          <p className="text-sm text-gray-700">{formData.location || '-'}</p>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-gray-500">Work Type</p>
                          <p className="text-sm text-gray-700">{formData.remote || '-'}</p>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-gray-500">Duration</p>
                          <p className="text-sm text-gray-700">{formData.duration || '-'}</p>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-gray-500">Source</p>
                          <p className="text-sm text-gray-700">{formData.applied_for || '-'}</p>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-gray-500">Vendor Email</p>
                          <p className="text-sm text-gray-700">{formData.vendor_email || '-'}</p>
                        </div>
                      </div>

                      {/* Next Step moved to dedicated tab */}

                      <div className="pt-2 border-t border-gray-200">
                        <p className="text-xs font-medium text-gray-500 mb-3">Next Steps</p>
                        {requirement && <NextStepThread requirementId={requirement.id} readOnly={false} />}
                      </div>

                      <div className="pt-2 border-t border-gray-200">
                        <p className="text-xs font-medium text-gray-500 mb-1">Tech Stack</p>
                        <p className="text-sm text-gray-700">{formData.primary_tech_stack || '-'}</p>
                      </div>

                      <div className="pt-2 border-t border-gray-200">
                        <p className="text-xs font-medium text-gray-500 mb-1">Description</p>
                        <p className="text-sm text-gray-700 whitespace-pre-wrap">{formData.description || '-'}</p>
                      </div>

                      <div className="pt-2 border-t border-gray-200 grid grid-cols-2 sm:grid-cols-3 gap-3">
                        <div>
                          <p className="text-xs font-medium text-gray-500">Vendor Company</p>
                          <p className="text-sm text-gray-700">{formData.vendor_company || '-'}</p>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-gray-500">Vendor Contact</p>
                          <p className="text-sm text-gray-700">{formData.vendor_person_name || '-'}</p>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-gray-500">Vendor Phone</p>
                          <p className="text-sm text-gray-700">{formData.vendor_phone || '-'}</p>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-gray-500">Internal Contact</p>
                          <p className="text-sm text-gray-700">{formData.imp_name || '-'}</p>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-gray-500">Client Website</p>
                          <p className="text-sm text-blue-600 truncate">{formData.client_website ? <a href={formData.client_website} target="_blank" rel="noopener noreferrer">{formData.client_website}</a> : '-'}</p>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-gray-500">Partner Website</p>
                          <p className="text-sm text-blue-600 truncate">{formData.imp_website ? <a href={formData.imp_website} target="_blank" rel="noopener noreferrer">{formData.imp_website}</a> : '-'}</p>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-gray-500">Vendor Website</p>
                          <p className="text-sm text-blue-600 truncate">{formData.vendor_website ? <a href={formData.vendor_website} target="_blank" rel="noopener noreferrer">{formData.vendor_website}</a> : '-'}</p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    // Edit Mode - Compact Grid
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <TextField
                        label="Title"
                        value={formData.title || ''}
                        onChange={(e) => handleFieldChange('title', e.target.value)}
                        size="small"
                        fullWidth
                      />
                      <TextField
                        label="Company"
                        value={formData.company || ''}
                        onChange={(e) => handleFieldChange('company', e.target.value)}
                        size="small"
                        fullWidth
                      />
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
                      <TextField
                        label="Rate"
                        value={formData.rate || ''}
                        onChange={(e) => handleFieldChange('rate', e.target.value)}
                        size="small"
                        fullWidth
                      />
                      <TextField
                        label="Location"
                        value={formData.location || ''}
                        onChange={(e) => handleFieldChange('location', e.target.value)}
                        size="small"
                        fullWidth
                      />
                      <TextField
                        select
                        label="Work Type"
                        value={String(formData.remote || '')}
                        onChange={(e) => handleFieldChange('remote', e.target.value)}
                        size="small"
                        fullWidth
                      >
                        <MenuItem value="">Select</MenuItem>
                        <MenuItem value="Remote">Remote</MenuItem>
                        <MenuItem value="Hybrid">Hybrid</MenuItem>
                        <MenuItem value="Onsite">Onsite</MenuItem>
                      </TextField>
                      <TextField
                        label="Duration"
                        value={formData.duration || ''}
                        onChange={(e) => handleFieldChange('duration', e.target.value)}
                        size="small"
                        fullWidth
                        placeholder="e.g., 6 months"
                      />
                      <TextField
                        label="Source"
                        value={formData.applied_for || ''}
                        onChange={(e) => handleFieldChange('applied_for', e.target.value)}
                        size="small"
                        fullWidth
                        placeholder="e.g., LinkedIn"
                      />
                      <TextField
                        label="Vendor Email"
                        type="email"
                        value={formData.vendor_email || ''}
                        onChange={(e) => handleFieldChange('vendor_email', e.target.value)}
                        size="small"
                        fullWidth
                      />
                      <TextField
                        label="Vendor Phone"
                        type="tel"
                        value={formData.vendor_phone || ''}
                        onChange={(e) => handleFieldChange('vendor_phone', e.target.value)}
                        size="small"
                        fullWidth
                      />
                      {/* Next Step moved to dedicated tab */}
                      <TextField
                        label="Tech Stack"
                        value={formData.primary_tech_stack || ''}
                        onChange={(e) => handleFieldChange('primary_tech_stack', e.target.value)}
                        size="small"
                        fullWidth
                        multiline
                        rows={2}
                      />
                      <TextField
                        label="Vendor Company"
                        value={formData.vendor_company || ''}
                        onChange={(e) => handleFieldChange('vendor_company', e.target.value)}
                        size="small"
                        fullWidth
                      />
                      <TextField
                        label="Internal Contact"
                        value={formData.imp_name || ''}
                        onChange={(e) => handleFieldChange('imp_name', e.target.value)}
                        size="small"
                        fullWidth
                      />
                      <TextField
                        label="Vendor Contact"
                        value={formData.vendor_person_name || ''}
                        onChange={(e) => handleFieldChange('vendor_person_name', e.target.value)}
                        size="small"
                        fullWidth
                      />
                      <TextField
                        label="Client Website"
                        type="url"
                        value={formData.client_website || ''}
                        onChange={(e) => handleFieldChange('client_website', e.target.value)}
                        size="small"
                        fullWidth
                        placeholder="https://example.com"
                      />
                      <TextField
                        label="Partner Website"
                        type="url"
                        value={formData.imp_website || ''}
                        onChange={(e) => handleFieldChange('imp_website', e.target.value)}
                        size="small"
                        fullWidth
                        placeholder="https://example.com"
                      />
                      <TextField
                        label="Vendor Website"
                        type="url"
                        value={formData.vendor_website || ''}
                        onChange={(e) => handleFieldChange('vendor_website', e.target.value)}
                        size="small"
                        fullWidth
                        placeholder="https://example.com"
                      />
                      <TextField
                        label="Description"
                        value={formData.description || ''}
                        onChange={(e) => handleFieldChange('description', e.target.value)}
                        size="small"
                        fullWidth
                        multiline
                        rows={2}
                        placeholder="Role description and requirements..."
                        sx={{ gridColumn: { xs: '1', sm: '1 / -1' } }}
                      />
                    </div>
                  )}
                </div>

                {/* Audit Log - Admin Only */}
                {isAdmin && (
                  <Paper variant="outlined" sx={{ p: 2, mt: 2 }}>
                    <ResourceAuditTimeline
                      resourceType="requirement"
                      resourceId={requirement.id}
                      title="Admin & CRM actions"
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

          {/* History Tab */}
          {activeTab === 'history' && (
            <Box sx={{ p: { xs: 2, sm: 4 }, height: '100%' }}>
              <EmailHistoryPanel requirementId={requirement.id} />
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
