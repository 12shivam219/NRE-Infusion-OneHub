import { useState, useEffect, useCallback, useMemo } from 'react';
import { Save, Trash2, Copy, X } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { getRequirements, createRequirement } from '../../lib/api/requirements';
import { useToast } from '../../contexts/ToastContext';
import type { Database } from '../../lib/database.types';

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

  const loadRequirements = useCallback(async () => {
    if (!user) return;
    const result = await getRequirements(user.id);
    if (result.success && result.requirements) {
      setRequirements(result.requirements);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    loadRequirements();
    // Load templates from localStorage
    const savedTemplates = localStorage.getItem('requirementTemplates');
    if (savedTemplates) {
      try {
        setTemplates(JSON.parse(savedTemplates));
      } catch (error) {
        console.error('Failed to load templates:', error);
      }
    }
  }, [loadRequirements]);

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

  const handleApplyTemplate = async (template: RequirementTemplate) => {
    if (!user) return;

    const result = await createRequirement({
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
    });

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
    return <div className="p-6 text-center text-gray-500">Loading templates...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Saved Templates */}
      {templates.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Saved Templates</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {templates.map(template => (
              <div key={template.id} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{template.name}</p>
                    <p className="text-sm text-gray-600">{template.title}</p>
                  </div>
                  <button
                    onClick={() => handleDeleteTemplate(template.id)}
                    className="text-red-600 hover:bg-red-50 p-2 rounded"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {template.company && <p className="text-xs text-gray-500">Company: {template.company}</p>}
                {template.primary_tech_stack && <p className="text-xs text-gray-500">Tech: {template.primary_tech_stack}</p>}
                {template.rate && <p className="text-xs text-gray-500">Rate: {template.rate}</p>}

                <button
                  onClick={() => handleApplyTemplate(template)}
                  className="w-full mt-3 px-3 py-2 bg-blue-50 text-blue-600 rounded-lg font-medium hover:bg-blue-100 text-sm flex items-center justify-center gap-2"
                >
                  <Copy className="w-4 h-4" />
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
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Suggested Templates</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {suggestedTemplates.map(template => (
              <div key={template.id} className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-lg p-4 hover:shadow-md transition">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{template.name}</p>
                    <p className="text-sm text-gray-600">{template.title}</p>
                  </div>
                </div>

                {template.primary_tech_stack && <p className="text-xs text-gray-600">Tech: {template.primary_tech_stack}</p>}
                {template.rate && <p className="text-xs text-gray-600">Rate: {template.rate}</p>}

                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => handleApplyTemplate(template)}
                    className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 text-sm flex items-center justify-center gap-2"
                  >
                    <Copy className="w-4 h-4" />
                    Apply
                  </button>
                  <button
                    onClick={() => {
                      setSelectedTemplate(template as RequirementTemplate);
                      setShowTemplateForm(true);
                    }}
                    className="px-3 py-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 text-sm"
                  >
                    <Save className="w-4 h-4" />
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
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Create Template from Requirement</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {requirements.slice(0, 6).map(req => (
              <div key={req.id} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition">
                <p className="font-medium text-gray-900 mb-1">{req.title}</p>
                <p className="text-sm text-gray-600 mb-3">{req.company || 'No company'}</p>

                {req.primary_tech_stack && <p className="text-xs text-gray-500">Tech: {req.primary_tech_stack}</p>}
                {req.rate && <p className="text-xs text-gray-500">Rate: {req.rate}</p>}

                <button
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
                  className="w-full mt-3 px-3 py-2 bg-green-50 text-green-600 rounded-lg font-medium hover:bg-green-100 text-sm flex items-center justify-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  Save as Template
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Template Form Modal */}
      {showTemplateForm && selectedTemplate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">Save as Template</h2>
              <button
                onClick={() => {
                  setShowTemplateForm(false);
                  setSelectedTemplate(null);
                  setNewTemplateName('');
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Template Name</label>
                <input
                  type="text"
                  value={newTemplateName}
                  onChange={(e) => setNewTemplateName(e.target.value)}
                  placeholder={`${selectedTemplate.company} - ${selectedTemplate.primary_tech_stack}`}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  aria-label="Template Name"
                />
                {formError && <p className="text-xs text-red-600 mt-2">{formError}</p>}
              </div>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                <p className="text-sm font-medium text-gray-700">Template Preview:</p>
                {selectedTemplate.company && (
                  <p className="text-xs text-gray-600">Company: {selectedTemplate.company}</p>
                )}
                {selectedTemplate.title && (
                  <p className="text-xs text-gray-600">Title: {selectedTemplate.title}</p>
                )}
                {selectedTemplate.primary_tech_stack && (
                  <p className="text-xs text-gray-600">Tech Stack: {selectedTemplate.primary_tech_stack}</p>
                )}
                {selectedTemplate.rate && (
                  <p className="text-xs text-gray-600">Rate: {selectedTemplate.rate}</p>
                )}
                {selectedTemplate.duration && (
                  <p className="text-xs text-gray-600">Duration: {selectedTemplate.duration}</p>
                )}
              </div>
              <div className="flex gap-3 pt-4 border-t border-gray-200">
                <button
                  onClick={() => handleCreateTemplate(selectedTemplate as unknown as Requirement)}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
                  aria-label="Save Template"
                >
                  Save Template
                </button>
                <button
                  onClick={() => {
                    setShowTemplateForm(false);
                    setSelectedTemplate(null);
                    setNewTemplateName('');
                    setFormError(null);
                  }}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                  aria-label="Cancel"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
