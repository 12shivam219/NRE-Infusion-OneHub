import { useState, useEffect, useCallback, useMemo, memo } from 'react';
import { X, AlertCircle } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../contexts/ToastContext';
import { useOfflineCache } from '../../hooks/useOfflineCache';
import { createRequirement, getRequirements } from '../../lib/api/requirements';
import { getConsultants } from '../../lib/api/consultants';
import { findSimilarRequirements } from '../../lib/requirementUtils';
import { validateRequirementForm } from '../../lib/formValidation';
import { sanitizeText } from '../../lib/utils';
import { ErrorAlert } from '../common/ErrorAlert';
import { cacheRequirements, type CachedRequirement } from '../../lib/offlineDB';
import { supabase } from '../../lib/supabase';
import type { Database } from '../../lib/database.types';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import type { SelectChangeEvent } from '@mui/material/Select';

type Consultant = Database['public']['Tables']['consultants']['Row'];

interface FormFieldOption {
  label: string;
  value: string;
}

interface FormFieldProps {
  label: string;
  name: string;
  type?: string;
  placeholder?: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | SelectChangeEvent<string>) => void;
  required?: boolean;
  options?: FormFieldOption[];
  error?: string;
  id?: string;
  autoComplete?: string;
}

// Create FormField component outside the parent component for stability
const FormField = memo(function FormField({
  label,
  name,
  type = 'text',
  placeholder,
  value,
  onChange,
  required = false,
  options,
  error,
  id,
  autoComplete,
}: FormFieldProps) {
  // Generate a unique ID if one isn't provided to ensure accessibility
  const fieldId = id || `field-${name}`;

  return (
    <div>
      {type === 'select' ? (
        <TextField
          select
          id={fieldId}
          name={name}
          label={label}
          value={value}
          onChange={onChange}
          required={required}
          error={Boolean(error)}
          helperText={error}
          size="small"
          fullWidth
          // MUI handles accessibility automatically when 'id' is provided.
          // Manually setting htmlFor in InputLabelProps can cause mismatches, especially with Select.
          InputLabelProps={{
            shrink: true,
            sx: {
              fontSize: '0.85rem',
              color: '#666',
              '&.Mui-focused': { color: '#007bff' },
            }
          }}
          sx={{
            mb: 0.5,
            '& .MuiOutlinedInput-root': {
              borderRadius: '5px',
              backgroundColor: '#fff',
              fontSize: '0.9rem',
              '& fieldset': {
                borderColor: '#ddd',
              },
              '&:hover fieldset': {
                borderColor: '#999',
              },
              '&.Mui-focused fieldset': {
                borderColor: '#007bff',
                boxShadow: '0 0 0 2px rgba(0, 123, 255, 0.15)',
              },
            },
            '& .MuiFormHelperText-root': {
              fontSize: '0.75rem',
              mt: 0.25,
            },
            '& .MuiOutlinedInput-input::placeholder': {
              color: '#999',
              opacity: 1,
              fontSize: '0.9rem',
            },
          }}
        >
          <MenuItem value="">Select {label.toLowerCase()}</MenuItem>
          {options?.map((opt: FormFieldOption) => (
            <MenuItem key={opt.value} value={opt.value}>
              {opt.label}
            </MenuItem>
          ))}
        </TextField>
      ) : (
        <TextField
          id={fieldId}
          name={name}
          label={label}
          type={type === 'textarea' ? 'text' : type}
          value={value}
          onChange={onChange as unknown as (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void}
          placeholder={placeholder}
          required={required}
          error={Boolean(error)}
          helperText={error}
          size="small"
          fullWidth
          autoComplete={autoComplete}
          multiline={type === 'textarea'}
          rows={type === 'textarea' ? 2 : undefined}
          // Rely on MUI's default label-input association via the 'id' prop
          InputLabelProps={{
            shrink: true,
            sx: {
              fontSize: '0.85rem',
              color: '#666',
              '&.Mui-focused': { color: '#007bff' },
            }
          }}
          sx={{
            mb: 0.5,
            '& .MuiOutlinedInput-root': {
              borderRadius: '5px',
              backgroundColor: '#fff',
              fontSize: '0.9rem',
              '& fieldset': {
                borderColor: '#ddd',
              },
              '&:hover fieldset': {
                borderColor: '#999',
              },
              '&.Mui-focused fieldset': {
                borderColor: '#007bff',
                boxShadow: '0 0 0 2px rgba(0, 123, 255, 0.15)',
              },
            },
            '& .MuiFormHelperText-root': {
              fontSize: '0.75rem',
              mt: 0.25,
            },
            '& .MuiOutlinedInput-input::placeholder': {
              color: '#999',
              opacity: 1,
              fontSize: '0.9rem',
            },
          }}
        />
      )}
    </div>
  );
});

interface CreateRequirementFormProps {
  onClose: () => void;
  onSuccess: () => void;
  initialData?: {
    title?: string;
    company?: string;
    primary_tech_stack?: string;
    rate?: string;
    remote?: string;
    location?: string;
    duration?: string;
    vendor_company?: string;
    vendor_person_name?: string;
    vendor_phone?: string;
    vendor_email?: string;
    description?: string;
  };
}

const FormSection = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section
    style={{
      background: '#fafafa',
      border: '1px solid #e8e8e8',
      borderRadius: '6px',
      padding: '0.875rem',
      marginBottom: '0.875rem',
    }}
  >
    <h3 style={{ fontSize: '0.8rem', fontWeight: 700, color: '#333', marginBottom: '0.625rem', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
      {title}
    </h3>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.625rem' }}>
      {children}
    </div>
  </section>
);

export const CreateRequirementForm = ({ onClose, onSuccess, initialData }: CreateRequirementFormProps) => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const { isOnline, queueOfflineOperation } = useOfflineCache();
  const [consultants, setConsultants] = useState<Consultant[]>([]);
  const [allRequirements, setAllRequirements] = useState<Database['public']['Tables']['requirements']['Row'][]>([]);
  const [loading, setLoading] = useState(false);
  const [similarRequirements, setSimilarRequirements] = useState<Database['public']['Tables']['requirements']['Row'][]>([]);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    title: initialData?.title || '',
    company: initialData?.company || '',
    status: 'NEW' as const,
    consultant_id: '',
    applied_for: '',
    rate: initialData?.rate || '',
    primary_tech_stack: initialData?.primary_tech_stack || '',
    imp_name: '',
    client_website: '',
    imp_website: '',
    vendor_company: initialData?.vendor_company || '',
    vendor_website: '',
    vendor_person_name: initialData?.vendor_person_name || '',
    vendor_phone: initialData?.vendor_phone || '',
    vendor_email: initialData?.vendor_email || '',
    description: initialData?.description || '',
    next_step: '',
    remote: initialData?.remote || '',
    duration: initialData?.duration || '',
    location: initialData?.location || '',
  });

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | SelectChangeEvent<string>) => {
    const { name, value } = e.target as { name: string; value: string };
    setFormData(prevState => ({ ...prevState, [name]: value }));
  }, []);

  // Separate effect for debounced similarity check
  useEffect(() => {
    const timer = setTimeout(() => {
      const similar = findSimilarRequirements(
        { 
          title: formData.title, 
          company: formData.company, 
          primary_tech_stack: formData.primary_tech_stack 
        },
        allRequirements
      );
      setSimilarRequirements(similar);
    }, 300); // Wait 300ms after user stops typing

    return () => clearTimeout(timer);
  }, [formData.title, formData.company, formData.primary_tech_stack, allRequirements]);

  const loadConsultants = useCallback(async () => {
    if (!user) return;
    const result = await getConsultants(user.id);
    if (result.success && result.consultants) {
      setConsultants(result.consultants);
    }
  }, [user]);

  const loadRequirements = useCallback(async () => {
    if (!user) return;
    const result = await getRequirements(user.id);
    if (result.success && result.requirements) {
      setAllRequirements(result.requirements);
    }
  }, [user]);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      await Promise.resolve();
      if (cancelled) return;
      await loadConsultants();
      await loadRequirements();
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [loadConsultants, loadRequirements]);

  const consultantOptions = useMemo(
    () => consultants.map(c => ({ label: c.name, value: c.id })),
    [consultants]
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || loading) return; // Prevent double-submit

    // Validate form
    const validation = validateRequirementForm({
      title: formData.title,
      company: formData.company,
      vendor_email: formData.vendor_email,
      client_website: formData.client_website,
      imp_website: formData.imp_website,
      vendor_website: formData.vendor_website,
      rate: formData.rate,
    });

    if (!validation.isValid) {
      setFormErrors(validation.errors);
      showToast({
        type: 'error',
        title: 'Validation Error',
        message: 'Please fix the errors below',
      });
      return;
    }

    setFormErrors({});
    setSubmitError(null);
    setLoading(true);

    try {
      const requirementData = {
        user_id: user.id,
        title: sanitizeText(formData.title),
        company: sanitizeText(formData.company),
        status: formData.status,
        consultant_id: formData.consultant_id || null,
        applied_for: formData.applied_for || null,
        rate: formData.rate || null,
        primary_tech_stack: sanitizeText(formData.primary_tech_stack),
        imp_name: sanitizeText(formData.imp_name),
        client_website: formData.client_website || null,
        imp_website: formData.imp_website || null,
        vendor_company: sanitizeText(formData.vendor_company),
        vendor_website: formData.vendor_website || null,
        vendor_person_name: sanitizeText(formData.vendor_person_name),
        vendor_phone: formData.vendor_phone || null,
        vendor_email: formData.vendor_email || null,
        description: sanitizeText(formData.description),
        next_step: sanitizeText(formData.next_step),
        remote: formData.remote || null,
        duration: formData.duration || null,
        location: sanitizeText(formData.location),
      };

      // Check if offline - queue operation
      if (!isOnline) {
        const tempId = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        await queueOfflineOperation('CREATE', 'requirement', tempId, requirementData);
        
        // Optimistically add to local cache
        const optimisticRequirement = {
          id: tempId,
          ...requirementData,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          requirement_number: 0, // Will be assigned on sync
        } as Database['public']['Tables']['requirements']['Row'];
        
        await cacheRequirements([optimisticRequirement as CachedRequirement], user.id);
        
        setLoading(false);
        showToast({
          type: 'info',
          title: 'Queued for Sync',
          message: 'Requirement will be created when you come back online',
        });
        onSuccess(); // Close form and refresh
        return;
      }

      // Online - create normally
      const result = await createRequirement(requirementData, user.id);

      setLoading(false);
      if (result.success && result.requirement) {
        // Create initial next step comment if next_step has a value
        if (formData.next_step.trim()) {
          try {
            await supabase
              .from('next_step_comments')
              .insert([
                {
                  requirement_id: result.requirement.id,
                  user_id: user.id,
                  comment_text: formData.next_step.trim(),
                },
              ]);
          } catch (commentError) {
            console.error('Failed to create initial next step comment:', commentError);
            // Don't fail the whole operation if comment creation fails
          }
        }

        showToast({
          type: 'success',
          title: 'Requirement Created',
          message: 'New requirement has been successfully created',
        });
        // Dispatch event to refresh requirements list
        window.dispatchEvent(new CustomEvent('requirement-created', { detail: result.requirement }));
        onSuccess();
      } else {
        setSubmitError(result.error || 'Failed to create requirement');
        showToast({
          type: 'error',
          title: 'Failed',
          message: result.error || 'Failed to create requirement',
        });
      }
    } catch (error) {
      setLoading(false);
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
      setSubmitError(errorMessage);
      showToast({
        type: 'error',
        title: 'Error',
        message: errorMessage,
      });
    }
  };

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="sm" scroll="paper" PaperProps={{
      sx: { maxHeight: '95vh' }
    }}>
      <DialogTitle sx={{ pr: 7, pb: 1.5 }}>
        <Typography sx={{ fontWeight: 800, fontSize: '1.3rem', color: '#333', mb: 0.5 }}>
          Create New Requirement
        </Typography>
        <Typography sx={{ fontSize: '0.85rem', color: '#888' }}>
          Add job requirement details
        </Typography>
        <IconButton
          onClick={onClose}
          sx={{ position: 'absolute', right: 8, top: 8 }}
          aria-label="Close form"
          title="Close form"
        >
          <X className="w-6 h-6" />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers sx={{ backgroundColor: '#fff', p: 2 }}>
        <form onSubmit={handleSubmit}>
          {/* Submit Error Alert */}
          {submitError && (
            <div style={{ marginBottom: '1rem' }}>
              <ErrorAlert
                title="Failed to Create Requirement"
                message={submitError}
                onDismiss={() => setSubmitError(null)}
                retryLabel="Try Again"
              />
            </div>
          )}

          {/* Similar Requirements Warning */}
          {similarRequirements.length > 0 && (
            <div style={{ backgroundColor: '#fff3cd', border: '1px solid #ffc107', borderRadius: '5px', padding: '0.75rem', marginBottom: '1rem', display: 'flex', gap: '0.5rem' }}>
              <AlertCircle className="w-4 h-4 text-yellow-700 flex-shrink-0 mt-0.5" />
              <div style={{ fontSize: '0.85rem' }}>
                <p style={{ fontWeight: 600, color: '#856404', marginBottom: '0.25rem' }}>Similar requirements found</p>
                <p style={{ color: '#856404' }}>
                  {similarRequirements.length} similar requirement(s) exist. Review before creating.
                </p>
              </div>
            </div>
          )}

          {/* Core Details */}
          <FormSection title="Core Details">
            <FormField
              label="Job Title"
              name="title"
              id="req-title"
              autoComplete="organization-title"
              placeholder="e.g., Senior Java Developer"
              value={formData.title}
              onChange={handleChange}
              required
              error={formErrors.title}
            />
            <FormField
              label="Company Name"
              name="company"
              id="req-company"
              autoComplete="organization"
              placeholder="e.g., TechCorp Inc"
              value={formData.company}
              onChange={handleChange}
              required
              error={formErrors.company}
            />
            <FormField
              label="Status"
              name="status"
              id="req-status"
              type="select"
              value={formData.status}
              onChange={handleChange}
              options={[
                { label: 'New', value: 'NEW' },
                { label: 'In Progress', value: 'IN_PROGRESS' },
                { label: 'Submitted', value: 'SUBMITTED' },
                { label: 'Interview', value: 'INTERVIEW' },
                { label: 'Offer', value: 'OFFER' },
                { label: 'Rejected', value: 'REJECTED' },
                { label: 'Closed', value: 'CLOSED' },
              ]}
            />
            <FormField
              label="Assigned Consultant"
              name="consultant_id"
              id="req-consultant"
              type="select"
              value={formData.consultant_id}
              onChange={handleChange}
              options={consultantOptions}
            />
            <FormField
              label="Next Action"
              name="next_step"
              id="req-next-step"
              autoComplete="off"
              placeholder="e.g., Send profile, Schedule interview"
              value={formData.next_step}
              onChange={handleChange}
            />
          </FormSection>

          {/* Work Details */}
          <FormSection title="Work Details">
            <FormField
              label="Key Skills"
              name="primary_tech_stack"
              id="req-tech-stack"
              autoComplete="off"
              placeholder="e.g., Java, Spring Boot, AWS"
              value={formData.primary_tech_stack}
              onChange={handleChange}
            />
            <FormField
              label="Rate / Salary"
              name="rate"
              id="req-rate"
              autoComplete="off"
              placeholder="e.g., $80k - $120k"
              value={formData.rate}
              onChange={handleChange}
              error={formErrors.rate}
            />
            <FormField
              label="Work Type"
              name="remote"
              id="req-remote"
              autoComplete="off"
              placeholder="e.g., Remote, Hybrid, Onsite"
              value={formData.remote}
              onChange={handleChange}
            />
            <FormField
              label="Duration"
              name="duration"
              id="req-duration"
              autoComplete="off"
              placeholder="e.g., 6 months, Full-time"
              value={formData.duration}
              onChange={handleChange}
            />
          </FormSection>

          {/* Client Information */}
          <FormSection title="Client">
            <FormField
              label="Internal Contact"
              name="imp_name"
              id="req-internal-contact"
              autoComplete="name"
              placeholder="e.g., John Smith"
              value={formData.imp_name}
              onChange={handleChange}
            />
            <FormField
              label="Source"
              name="applied_for"
              id="req-source"
              autoComplete="off"
              placeholder="e.g., LinkedIn, Referral"
              value={formData.applied_for}
              onChange={handleChange}
            />
            <FormField
              label="Client Website"
              name="client_website"
              id="req-client-website"
              autoComplete="url"
              type="url"
              placeholder="https://example.com"
              value={formData.client_website}
              onChange={handleChange}
            />
            <FormField
              label="Partner Website"
              name="imp_website"
              id="req-partner-website"
              autoComplete="url"
              type="url"
              placeholder="https://partner.com"
              value={formData.imp_website}
              onChange={handleChange}
            />
            <FormField
              label="Work Location"
              name="location"
              id="req-location"
              autoComplete="address-level2"
              placeholder="e.g., 123 Main St, New York, NY"
              value={formData.location}
              onChange={handleChange}
            />
          </FormSection>

          {/* Vendor Information */}
          <FormSection title="Vendor">
            <FormField
              label="Vendor Company"
              name="vendor_company"
              id="req-vendor-company"
              autoComplete="organization"
              placeholder="e.g., ABC Staffing"
              value={formData.vendor_company}
              onChange={handleChange}
            />
            <FormField
              label="Vendor Website"
              name="vendor_website"
              id="req-vendor-website"
              autoComplete="url"
              type="url"
              placeholder="https://vendor.com"
              value={formData.vendor_website}
              onChange={handleChange}
              error={formErrors.vendor_website}
            />
            <FormField
              label="Vendor Contact"
              name="vendor_person_name"
              id="req-vendor-contact"
              autoComplete="name"
              placeholder="e.g., Jane Doe"
              value={formData.vendor_person_name}
              onChange={handleChange}
            />
            <FormField
              label="Vendor Phone"
              name="vendor_phone"
              id="req-vendor-phone"
              autoComplete="tel"
              type="tel"
              placeholder="(555) 123-4567"
              value={formData.vendor_phone}
              onChange={handleChange}
            />
            <FormField
              label="Vendor Email"
              name="vendor_email"
              id="req-vendor-email"
              autoComplete="email"
              type="email"
              placeholder="vendor@example.com"
              value={formData.vendor_email}
              onChange={handleChange}
              error={formErrors.vendor_email}
            />
          </FormSection>

          {/* Description */}
          <FormSection title="Description">
            <div style={{ gridColumn: '1 / -1' }}>
              <FormField
                label="Role Description"
                name="description"
                id="req-description"
                type="textarea"
                autoComplete="off"
                placeholder="Full job description and key responsibilities..."
                value={formData.description}
                onChange={handleChange}
              />
            </div>
          </FormSection>

          {/* Form Actions */}
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #eee' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                backgroundColor: '#f0f0f0',
                color: '#333',
                border: '1px solid #ddd',
                padding: '0.625rem 1.25rem',
                borderRadius: '5px',
                fontWeight: 600,
                cursor: 'pointer',
                fontSize: '0.9rem',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#e0e0e0')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#f0f0f0')}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              style={{
                backgroundColor: loading ? '#0056b3' : '#007bff',
                color: '#fff',
                border: 'none',
                padding: '0.625rem 1.25rem',
                borderRadius: '5px',
                fontWeight: 600,
                cursor: loading ? 'not-allowed' : 'pointer',
                fontSize: '0.9rem',
                transition: 'all 0.2s ease',
                opacity: loading ? 0.8 : 1,
              }}
              onMouseEnter={(e) => !loading && (e.currentTarget.style.backgroundColor = '#0056b3')}
              onMouseLeave={(e) => !loading && (e.currentTarget.style.backgroundColor = '#007bff')}
            >
              {loading ? 'Creating...' : 'Create'}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};