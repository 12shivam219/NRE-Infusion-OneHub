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
import type { Database } from '../../lib/database.types';
import { BrandButton } from '../brand';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
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
}: FormFieldProps) {
  return (
    <div>
      {type === 'select' ? (
        <TextField
          select
          label={label}
          name={name}
          value={value}
          onChange={onChange}
          required={required}
          error={Boolean(error)}
          helperText={error || ' '}
          size="small"
          fullWidth
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
          label={label}
          name={name}
          type={type === 'textarea' ? 'text' : type}
          value={value}
          onChange={onChange as unknown as (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void}
          placeholder={placeholder}
          required={required}
          error={Boolean(error)}
          helperText={error || ' '}
          size="small"
          fullWidth
          multiline={type === 'textarea'}
          rows={type === 'textarea' ? 4 : undefined}
        />
      )}
    </div>
  );
});

interface CreateRequirementFormProps {
  onClose: () => void;
  onSuccess: () => void;
}

const FormSection = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="border-t border-gray-200 pt-6 mt-6 first:border-t-0 first:pt-0 first:mt-0">
    <h3 className="text-xs font-medium text-gray-900 mb-4">{title}</h3>
    <div className="space-y-4">{children}</div>
  </div>
);

export const CreateRequirementForm = ({ onClose, onSuccess }: CreateRequirementFormProps) => {
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
    title: '',
    company: '',
    status: 'NEW' as const,
    consultant_id: '',
    applied_for: '',
    rate: '',
    primary_tech_stack: '',
    imp_name: '',
    client_website: '',
    imp_website: '',
    vendor_company: '',
    vendor_website: '',
    vendor_person_name: '',
    vendor_phone: '',
    vendor_email: '',
    description: '',
    next_step: '',
    remote: '',
    duration: '',
    location: '',
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
      if (result.success) {
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
    <Dialog open onClose={onClose} fullWidth maxWidth="lg" scroll="paper">
      <DialogTitle sx={{ pr: 7 }}>
        <Typography variant="h6" sx={{ fontWeight: 800 }}>
          Create New Requirement
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

      <DialogContent dividers>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Submit Error Alert */}
          {submitError && (
            <ErrorAlert
              title="Failed to Create Requirement"
              message={submitError}
              onDismiss={() => setSubmitError(null)}
              retryLabel="Try Again"
            />
          )}

          {/* Similar Requirements Warning */}
          {similarRequirements.length > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex gap-3">
              <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-yellow-900 mb-1">Similar Requirements Found</p>
                <p className="text-xs text-yellow-800">
                  We found {similarRequirements.length} similar requirement(s) already in your system. Consider reviewing them before creating a new one.
                </p>
              </div>
            </div>
          )}

          {/* Core Details */}
          <FormSection title="Core Details">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                label="What's the job title?"
                name="title"
                placeholder="Senior Java Developer"
                value={formData.title}
                onChange={handleChange}
                required
                error={formErrors.title}
              />
              <FormField
                label="Which company is hiring?"
                name="company"
                placeholder="TechCorp Inc"
                value={formData.company}
                onChange={handleChange}
                required
                error={formErrors.company}
              />
              <FormField
                label="What's the current status?"
                name="status"
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
                label="Who's assigned to this role?"
                name="consultant_id"
                type="select"
                value={formData.consultant_id}
                onChange={handleChange}
                options={consultantOptions}
              />
              <FormField
                label="What's the next action needed?"
                name="next_step"
                placeholder="Send profile, Confirm interview, Follow up, etc."
                value={formData.next_step}
                onChange={handleChange}
              />
            </div>
          </FormSection>

          {/* Work Details */}
          <FormSection title="Work Details">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                label="What are the key skills needed?"
                name="primary_tech_stack"
                placeholder="Java, Spring Boot, AWS"
                value={formData.primary_tech_stack}
                onChange={handleChange}
              />
              <FormField
                label="What's the target rate or range?"
                name="rate"
                placeholder="$80k - $120k"
                value={formData.rate}
                onChange={handleChange}
                error={formErrors.rate}
              />
              <FormField
                label="What's the work location type?"
                name="remote"
                placeholder="Remote, Hybrid, or Onsite"
                value={formData.remote}
                onChange={handleChange}
              />
              <FormField
                label="What's the contract duration or timeline?"
                name="duration"
                placeholder="6 months, Full-time, etc."
                value={formData.duration}
                onChange={handleChange}
              />
            </div>
          </FormSection>

          {/* Client Information */}
          <FormSection title="Client Information">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                label="Who's your internal contact?"
                name="imp_name"
                placeholder="John Smith"
                value={formData.imp_name}
                onChange={handleChange}
              />
              <FormField
                label="Where was it submitted?"
                name="applied_for"
                placeholder="LinkedIn, Direct, Referral, etc."
                value={formData.applied_for}
                onChange={handleChange}
              />
              <FormField
                label="What's the client's website?"
                name="client_website"
                type="url"
                placeholder="https://example.com"
                value={formData.client_website}
                onChange={handleChange}
              />
              <FormField
                label="What's your partner/support website?"
                name="imp_website"
                type="url"
                placeholder="https://partner.com"
                value={formData.imp_website}
                onChange={handleChange}
              />
            </div>
          </FormSection>

          {/* Vendor Information */}
          <FormSection title="Vendor Information">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                label="Which vendor is involved?"
                name="vendor_company"
                placeholder="ABC Staffing"
                value={formData.vendor_company}
                onChange={handleChange}
              />
              <FormField
                label="What's the vendor's website?"
                name="vendor_website"
                type="url"
                placeholder="https://vendor.com"
                value={formData.vendor_website}
                onChange={handleChange}
                error={formErrors.vendor_website}
              />
              <FormField
                label="Who's your primary vendor contact?"
                name="vendor_person_name"
                placeholder="Jane Doe"
                value={formData.vendor_person_name}
                onChange={handleChange}
              />
              <FormField
                label="What's the vendor's phone number?"
                name="vendor_phone"
                type="tel"
                placeholder="(555) 123-4567"
                value={formData.vendor_phone}
                onChange={handleChange}
              />
              <FormField
                label="What's the vendor's email?"
                name="vendor_email"
                type="email"
                placeholder="vendor@example.com"
                value={formData.vendor_email}
                onChange={handleChange}
                error={formErrors.vendor_email}
              />
            </div>
          </FormSection>

          {/* Description */}
          <FormSection title="Description">
            <FormField
              label="Describe the role and requirements?"
              name="description"
              type="textarea"
              placeholder="Full job description and key responsibilities..."
              value={formData.description}
              onChange={handleChange}
            />
          </FormSection>

          {/* Additional Info */}
          <FormSection title="Additional Information">
            <FormField
              label="Work location address (if needed)"
              name="location"
              placeholder="123 Main St, New York, NY"
              value={formData.location}
              onChange={handleChange}
            />
          </FormSection>

          {/* Form Actions */}
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={2}
            sx={{ pt: 3, borderTop: 1, borderColor: 'rgba(234,179,8,0.2)' }}
          >
            <BrandButton
              type="submit"
              variant="primary"
              size="md"
              disabled={loading}
              aria-busy={loading}
              aria-label="Create requirement"
              className="flex-1"
            >
              {loading ? 'Creating...' : 'Create Requirement'}
            </BrandButton>
            <BrandButton
              type="button"
              variant="secondary"
              size="md"
              onClick={onClose}
              className="flex-1"
            >
              Cancel
            </BrandButton>
          </Stack>
        </form>
      </DialogContent>
    </Dialog>
  );
};
