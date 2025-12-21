import { useState, useEffect, useCallback, useMemo } from 'react';
import { Save, Trash2, Copy, X } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { getRequirements, createRequirement } from '../../lib/api/requirements';
import { useToast } from '../../contexts/ToastContext';
import type { Database } from '../../lib/database.types';
import { ConfirmDialog } from '../common/ConfirmDialog';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import IconButton from '@mui/material/IconButton';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';

type Requirement = Database['public']['Tables']['requirements']['Row'];

interface RequirementTemplate {
  id: string;
  name: string;
  title: string;
  company?: string | null;
  description?: string | null;
  primary_tech_stack?: string | null;
  rate?: string | null;
  duration?: string | null;
  remote?: string | null;
  vendor_company?: string | null;
  priority?: string | null;
}

interface RequirementTemplatesProps {
  onTemplateApplied?: () => void;
}

export const RequirementTemplates = ({ onTemplateApplied }: RequirementTemplatesProps) => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [templates, setTemplates] = useState<RequirementTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showTemplateForm, setShowTemplateForm] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<RequirementTemplate | null>(null);
  const [newTemplateName, setNewTemplateName] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [templateToDelete, setTemplateToDelete] = useState<RequirementTemplate | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadRequirements = useCallback(async () => {
    if (!user) return;
    const result = await getRequirements(user.id);
    if (result.success && result.requirements) {
      setRequirements(result.requirements);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      if (!user) return;
      const result = await getRequirements(user.id);
      if (cancelled) return;
      if (result.success && result.requirements) {
        setRequirements(result.requirements);
      }
      setLoading(false);
    };

    void run();

    // Load templates from localStorage
    const savedTemplates = localStorage.getItem('requirementTemplates');
    if (savedTemplates) {
      try {
        void (async () => {
          await Promise.resolve();
          if (cancelled) return;
          setTemplates(JSON.parse(savedTemplates));
        })();
      } catch (error) {
        console.error('Failed to load templates:', error);
      }
    }

    return () => {
      cancelled = true;
    };
  }, [user]);

  const suggestedTemplates = useMemo(() => {
    // Suggest templates based on frequent patterns in existing requirements
    const templateMap = new Map<string, Requirement>();
    
    requirements.forEach(req => {
      const key = `${req.company}_${req.primary_tech_stack}`;
      if (!templateMap.has(key)) {
        templateMap.set(key, req);
      }
    });

    return Array.from(templateMap.values())
      .filter(req => req.company && req.primary_tech_stack)
      .slice(0, 5)
      .map(req => ({
        id: `suggested_${req.id}`,
        name: `${req.company} - ${req.primary_tech_stack}`,
        title: req.title,
        company: req.company,
        description: req.description,
        primary_tech_stack: req.primary_tech_stack,
        rate: req.rate,
        duration: req.duration,
        remote: req.remote,
        vendor_company: req.vendor_company,
      }));
  }, [requirements]);

  const handleCreateTemplate = (requirement: Requirement) => {
    if (!newTemplateName.trim()) {
      setFormError('Template name is required.');
      return;
    }
    setFormError(null);
    const newTemplate: RequirementTemplate = {
      id: `template_${Date.now()}`,
      name: newTemplateName,
      title: requirement.title,
      company: requirement.company,
      description: requirement.description,
      primary_tech_stack: requirement.primary_tech_stack,
      rate: requirement.rate,
      duration: requirement.duration,
      remote: requirement.remote,
      vendor_company: requirement.vendor_company,
    };
    setTemplates(prev => {
      const updated = [...prev, newTemplate];
      localStorage.setItem('requirementTemplates', JSON.stringify(updated));
      return updated;
    });
    showToast({
      type: 'success',
      title: 'Template created',
      message: `Template "${newTemplateName}" saved successfully`,
    });
    setNewTemplateName('');
    setShowTemplateForm(false);
    setSelectedTemplate(null);
  };

  const handleDeleteTemplate = (templateId: string) => {
    setTemplates(prev => {
      const updated = prev.filter(t => t.id !== templateId);
      localStorage.setItem('requirementTemplates', JSON.stringify(updated));
      return updated;
    });
    showToast({
      type: 'success',
      title: 'Template deleted',
      message: 'Template has been removed',
    });
  };

  const handleRequestDeleteTemplate = (template: RequirementTemplate) => {
    setTemplateToDelete(template);
  };

  const handleConfirmDeleteTemplate = async () => {
    if (!templateToDelete) return;
    setIsDeleting(true);
    try {
      handleDeleteTemplate(templateToDelete.id);
    } finally {
      setIsDeleting(false);
      setTemplateToDelete(null);
    }
  };

  const handleApplyTemplate = async (template: RequirementTemplate) => {
    if (!user) return;

    const result = await createRequirement(
      {
        user_id: user.id,
        title: template.title,
        company: template.company || null,
        description: template.description || null,
        status: 'NEW',
        primary_tech_stack: template.primary_tech_stack || null,
        rate: template.rate || null,
        duration: template.duration || null,
        remote: template.remote || null,
        vendor_company: template.vendor_company || null,
      },
      user.id
    );

    if (result.success) {
      showToast({
        type: 'success',
        title: 'Requirement created',
        message: 'New requirement created from template',
      });
      onTemplateApplied?.();
      await loadRequirements();
    } else if (result.error) {
      showToast({
        type: 'error',
        title: 'Failed to create requirement',
        message: result.error,
      });
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <div className="h-6 bg-gray-200 rounded w-56 mb-4 animate-pulse" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="card-base card-p-sm animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-2/3 mb-2" />
                <div className="h-3 bg-gray-200 rounded w-5/6 mb-4" />
                <div className="h-8 bg-gray-200 rounded w-full" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <ConfirmDialog
        isOpen={Boolean(templateToDelete)}
        onClose={() => setTemplateToDelete(null)}
        onConfirm={handleConfirmDeleteTemplate}
        title="Delete template"
        message={
          templateToDelete
            ? `Are you sure you want to delete "${templateToDelete.name}"? This cannot be undone.`
            : 'Are you sure you want to delete this template?'
        }
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
        isLoading={isDeleting}
      />

      {/* Saved Templates */}
      {templates.length > 0 && (
        <div>
          <h3 className="text-xs font-medium text-gray-900 mb-4">Saved Templates</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {templates.map(template => (
              <div key={template.id} className="card-base card-p-sm">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{template.name}</p>
                    <p className="text-xs text-gray-600">{template.title}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRequestDeleteTemplate(template)}
                    className="btn-icon-sm text-red-700 hover:bg-red-50 focus-ring"
                    aria-label={`Delete template ${template.name}`}
                  >
                    <Trash2 className="w-4 h-4" aria-hidden="true" />
                  </button>
                </div>

                {template.company && <p className="text-xs text-gray-500">Company: {template.company}</p>}
                {template.primary_tech_stack && <p className="text-xs text-gray-500">Tech: {template.primary_tech_stack}</p>}
                {template.rate && <p className="text-xs text-gray-500">Rate: {template.rate}</p>}

                <button
                  type="button"
                  onClick={() => handleApplyTemplate(template)}
                  className="btn-secondary w-full mt-3 inline-flex items-center justify-center gap-2 focus-ring"
                  aria-label={`Apply template ${template.name}`}
                >
                  <Copy className="w-4 h-4" aria-hidden="true" />
                  Apply Template
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Suggested Templates */}
      {suggestedTemplates.length > 0 && (
        <div>
          <h3 className="text-xs font-medium text-gray-900 mb-4">Suggested Templates</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {suggestedTemplates.map(template => (
              <div key={template.id} className="card-base card-p-sm bg-gradient-to-br from-primary-50 to-primary-100">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{template.name}</p>
                    <p className="text-xs text-gray-600">{template.title}</p>
                  </div>
                </div>

                {template.primary_tech_stack && <p className="text-xs text-gray-600">Tech: {template.primary_tech_stack}</p>}
                {template.rate && <p className="text-xs text-gray-600">Rate: {template.rate}</p>}

                <div className="flex gap-2 mt-3">
                  <button
                    type="button"
                    onClick={() => handleApplyTemplate(template)}
                    className="btn-primary flex-1 inline-flex items-center justify-center gap-2 focus-ring"
                    aria-label={`Apply suggested template ${template.name}`}
                  >
                    <Copy className="w-4 h-4" aria-hidden="true" />
                    Apply
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedTemplate(template as RequirementTemplate);
                      setShowTemplateForm(true);
                    }}
                    className="btn-outline px-3 py-2 inline-flex items-center justify-center focus-ring"
                    aria-label={`Save suggested template ${template.name}`}
                  >
                    <Save className="w-4 h-4" aria-hidden="true" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Create from Existing */}
      {requirements.length > 0 && templates.length < 5 && (
        <div>
          <h3 className="text-xs font-medium text-gray-900 mb-4">Create Template from Requirement</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {requirements.slice(0, 6).map(req => (
              <div key={req.id} className="card-base card-p-sm">
                <p className="font-medium text-gray-900 mb-1">{req.title}</p>
                <p className="text-xs text-gray-600 mb-3">{req.company || 'No company'}</p>

                {req.primary_tech_stack && <p className="text-xs text-gray-500">Tech: {req.primary_tech_stack}</p>}
                {req.rate && <p className="text-xs text-gray-500">Rate: {req.rate}</p>}

                <button
                  type="button"
                  onClick={() => {
                    setSelectedTemplate({
                      id: req.id,
                      name: req.title,
                      title: req.title,
                      company: req.company,
                      description: req.description,
                      primary_tech_stack: req.primary_tech_stack,
                      rate: req.rate,
                      duration: req.duration,
                      remote: req.remote,
                      vendor_company: req.vendor_company,
                    });
                    setShowTemplateForm(true);
                  }}
                  className="btn-secondary w-full mt-3 inline-flex items-center justify-center gap-2 focus-ring"
                  aria-label={`Save requirement ${req.title} as template`}
                >
                  <Save className="w-4 h-4" aria-hidden="true" />
                  Save as Template
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {templates.length === 0 && suggestedTemplates.length === 0 && requirements.length === 0 && (
        <div className="card-base card-p-md text-center">
          <Save className="w-12 h-12 text-gray-400 mx-auto mb-4" aria-hidden="true" />
          <h3 className="text-xs font-medium text-gray-900 mb-2">No templates yet</h3>
          <p className="text-gray-600 text-xs">Create your first requirement to start saving templates.</p>
        </div>
      )}

      {/* Template Form Modal */}
      {showTemplateForm && selectedTemplate && (
        <Dialog
          open
          onClose={() => {
            setShowTemplateForm(false);
            setSelectedTemplate(null);
            setNewTemplateName('');
          }}
          fullWidth
          maxWidth="sm"
          slotProps={{
            backdrop: { sx: { backdropFilter: 'blur(4px)' } }
          }}
        >
          <DialogTitle sx={{ pr: 7 }}>
            <Typography variant="h6" sx={{ fontWeight: 500 }}>
              Save as Template
            </Typography>
            <IconButton
              onClick={() => {
                setShowTemplateForm(false);
                setSelectedTemplate(null);
                setNewTemplateName('');
              }}
              sx={{ position: 'absolute', right: 8, top: 8 }}
              aria-label="Close"
            >
              <X className="w-5 h-5" aria-hidden="true" />
            </IconButton>
          </DialogTitle>

          <DialogContent dividers>
            <Stack spacing={2}>
              <TextField
                label="Template Name"
                value={newTemplateName}
                onChange={(e) => setNewTemplateName(e.target.value)}
                placeholder={`${selectedTemplate.company} - ${selectedTemplate.primary_tech_stack}`}
                size="small"
                fullWidth
                error={Boolean(formError)}
                helperText={formError || ' '}
                inputProps={{ 'aria-label': 'Template Name' }}
              />

              <Box sx={{ maxHeight: 256, overflowY: 'auto' }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 500, mb: 1 }}>
                  Template Preview:
                </Typography>
                <Stack spacing={0.5}>
                  {selectedTemplate.company && (
                    <Typography variant="caption" color="text.secondary">
                      Company: {selectedTemplate.company}
                    </Typography>
                  )}
                  {selectedTemplate.title && (
                    <Typography variant="caption" color="text.secondary">
                      Title: {selectedTemplate.title}
                    </Typography>
                  )}
                  {selectedTemplate.primary_tech_stack && (
                    <Typography variant="caption" color="text.secondary">
                      Tech Stack: {selectedTemplate.primary_tech_stack}
                    </Typography>
                  )}
                  {selectedTemplate.rate && (
                    <Typography variant="caption" color="text.secondary">
                      Rate: {selectedTemplate.rate}
                    </Typography>
                  )}
                  {selectedTemplate.duration && (
                    <Typography variant="caption" color="text.secondary">
                      Duration: {selectedTemplate.duration}
                    </Typography>
                  )}
                </Stack>
              </Box>
            </Stack>
          </DialogContent>

          <DialogActions>
            <Button
              onClick={() => handleCreateTemplate(selectedTemplate as unknown as Requirement)}
              variant="contained"
              aria-label="Save Template"
            >
              Save Template
            </Button>
            <Button
              onClick={() => {
                setShowTemplateForm(false);
                setSelectedTemplate(null);
                setNewTemplateName('');
                setFormError(null);
              }}
              variant="outlined"
              color="inherit"
              aria-label="Cancel"
            >
              Cancel
            </Button>
          </DialogActions>
        </Dialog>
      )}
    </div>
  );
};
