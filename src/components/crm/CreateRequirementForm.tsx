import { useState, useEffect, useCallback, useMemo, memo } from 'react';
import { X } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { createRequirement } from '../../lib/api/requirements';
import { getConsultants } from '../../lib/api/consultants';
import type { Database } from '../../lib/database.types';

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
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
  required?: boolean;
  options?: FormFieldOption[];
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
}: FormFieldProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {label}
        {required && <span className="text-red-500">*</span>}
      </label>
      {type === 'select' ? (
        <select
          name={name}
          value={value}
          onChange={onChange}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="">Select {label.toLowerCase()}</option>
          {options?.map((opt: FormFieldOption) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      ) : type === 'textarea' ? (
        <textarea
          name={name}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          rows={4}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      ) : (
        <input
          type={type}
          name={name}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          required={required}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
    <h3 className="text-sm font-semibold text-gray-900 mb-4">{title}</h3>
    <div className="space-y-4">{children}</div>
  </div>
);

export const CreateRequirementForm = ({ onClose, onSuccess }: CreateRequirementFormProps) => {
  const { user } = useAuth();
  const [consultants, setConsultants] = useState<Consultant[]>([]);
  const [loading, setLoading] = useState(false);

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

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prevState => ({ ...prevState, [name]: value }));
  }, []);

  const loadConsultants = useCallback(async () => {
    if (!user) return;
    const result = await getConsultants(user.id);
    if (result.success && result.consultants) {
      setConsultants(result.consultants);
    }
  }, [user]);

  useEffect(() => {
    loadConsultants();
  }, [loadConsultants]);

  const consultantOptions = useMemo(
    () => consultants.map(c => ({ label: c.name, value: c.id })),
    [consultants]
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    const result = await createRequirement({
      user_id: user.id,
      title: formData.title,
      company: formData.company,
      status: formData.status,
      consultant_id: formData.consultant_id || null,
      applied_for: formData.applied_for || null,
      rate: formData.rate || null,
      primary_tech_stack: formData.primary_tech_stack || null,
      imp_name: formData.imp_name || null,
      client_website: formData.client_website || null,
      imp_website: formData.imp_website || null,
      vendor_company: formData.vendor_company || null,
      vendor_website: formData.vendor_website || null,
      vendor_person_name: formData.vendor_person_name || null,
      vendor_phone: formData.vendor_phone || null,
      vendor_email: formData.vendor_email || null,
      description: formData.description || null,
      next_step: formData.next_step || null,
      remote: formData.remote || null,
      duration: formData.duration || null,
      location: formData.location || null,
      priority: 'medium',
    });

    setLoading(false);
    if (result.success) {
      onSuccess();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-8 py-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">Create New Requirement</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
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
              />
              <FormField
                label="Which company is hiring?"
                name="company"
                placeholder="TechCorp Inc"
                value={formData.company}
                onChange={handleChange}
                required
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
          <div className="flex gap-3 pt-6 border-t border-gray-200">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-400 transition"
            >
              {loading ? 'Creating...' : 'Create Requirement'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
