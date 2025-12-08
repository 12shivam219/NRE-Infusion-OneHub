import { useState, useEffect, useCallback, useMemo, memo } from 'react';
import { X, AlertCircle, ChevronDown } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../contexts/ToastContext';
import { createInterview } from '../../lib/api/interviews';
import { getRequirements } from '../../lib/api/requirements';
import { getConsultants } from '../../lib/api/consultants';
import { validateInterviewForm, getAllInterviewStatuses } from '../../lib/interviewValidation';
import { sanitizeText } from '../../lib/utils';
import type { Database } from '../../lib/database.types';

type Requirement = Database['public']['Tables']['requirements']['Row'];
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
  readOnly?: boolean;
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
  readOnly = false,
  options,
  error,
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
          disabled={readOnly}
          className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 ${
            error ? 'border-red-500 ring-2 ring-red-200' : 'border-gray-300'
          }`}
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
          readOnly={readOnly}
          rows={3}
          className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 resize-none ${
            error ? 'border-red-500 ring-2 ring-red-200' : 'border-gray-300'
          }`}
        />
      ) : (
        <input
          type={type}
          name={name}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          required={required}
          readOnly={readOnly}
          className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 ${
            error ? 'border-red-500 ring-2 ring-red-200' : 'border-gray-300'
          }`}
        />
      )}
      {error && (
        <div className="flex items-center gap-2 mt-2 text-red-600 text-sm bg-red-50 p-2 rounded">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
});

interface CreateInterviewFormProps {
  onClose: () => void;
  onSuccess: () => void;
  requirementId?: string;
}

const AccordionSection = ({ title, children, defaultOpen = false }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 sm:px-6 py-3 sm:py-4 bg-gray-50 hover:bg-gray-100 flex items-center justify-between font-semibold text-gray-900 transition text-sm"
      >
        <span>{title}</span>
        <ChevronDown className={`w-5 h-5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      {isOpen && (
        <div className="px-4 sm:px-6 py-3 sm:py-4 space-y-4 border-t border-gray-200">
          {children}
        </div>
      )}
    </div>
  );
};

export const CreateInterviewForm = ({ onClose, onSuccess, requirementId }: CreateInterviewFormProps) => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [consultants, setConsultants] = useState<Consultant[]>([]);
  const [loading, setLoading] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const [formData, setFormData] = useState({
    requirement_id: requirementId || '',
    scheduled_date: '',
    scheduled_time: '',
    timezone: 'UTC',
    duration_minutes: '60',
    type: 'Technical',
    status: 'Scheduled',
    consultant_id: '',
    vendor_company: '',
    interview_with: '',
    result: '',
    round: '1st Round',
    mode: 'Video Call',
    meeting_type: 'Scheduled',
    subject_line: '',
    interviewer: '',
    location: '',
    interview_focus: '',
    special_note: '',
    job_description_excerpt: '',
    feedback_notes: '',
  });

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    // Trim string values to prevent leading/trailing whitespace issues
    const trimmedValue = typeof value === 'string' ? value.trim() : value;
    setFormData(prevState => ({ ...prevState, [name]: trimmedValue }));
  }, []);

  const loadData = useCallback(async () => {
    if (!user) return;
    const [reqResult, consResult] = await Promise.all([
      getRequirements(user.id),
      getConsultants(user.id),
    ]);
    if (reqResult.success && reqResult.requirements) {
      setRequirements(reqResult.requirements);
    }
    if (consResult.success && consResult.consultants) {
      setConsultants(consResult.consultants);
    }
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Auto-generate subject line when requirement or date changes
  useEffect(() => {
    if (formData.requirement_id && formData.scheduled_date) {
      const requirement = requirements.find(r => r.id === formData.requirement_id);
      if (requirement) {
        const dateStr = new Date(formData.scheduled_date).toLocaleDateString('en-US', { 
          month: 'short', 
          day: 'numeric' 
        });
        const generatedSubject = `${requirement.title} - Interview on ${dateStr}`;
        setFormData(prev => ({ ...prev, subject_line: generatedSubject }));
      }
    }
  }, [formData.requirement_id, formData.scheduled_date, requirements]);

  const requirementOptions = useMemo(
    () => requirements.map(r => ({ label: `${r.title} - ${r.company}`, value: r.id })),
    [requirements]
  );

  const consultantOptions = useMemo(
    () => consultants.map(c => ({ label: c.name, value: c.id })),
    [consultants]
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || loading) return; // Prevent double-submit

    // Validate form data
    const validation = validateInterviewForm({
      requirement_id: formData.requirement_id,
      scheduled_date: formData.scheduled_date,
      scheduled_time: formData.scheduled_time,
      interview_with: formData.interview_with,
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
    setLoading(true);
    const result = await createInterview({
      user_id: user.id,
      requirement_id: formData.requirement_id,
      scheduled_date: formData.scheduled_date,
      scheduled_time: formData.scheduled_time || null,
      timezone: formData.timezone || null,
      duration_minutes: parseInt(formData.duration_minutes),
      type: formData.type || null,
      status: formData.status,
      consultant_id: formData.consultant_id || null,
      vendor_company: sanitizeText(formData.vendor_company),
      interview_with: sanitizeText(formData.interview_with),
      result: sanitizeText(formData.result),
      round: formData.round || null,
      mode: formData.mode || null,
      meeting_type: formData.meeting_type || null,
      subject_line: sanitizeText(formData.subject_line),
      interviewer: sanitizeText(formData.interviewer),
      location: sanitizeText(formData.location),
      interview_focus: sanitizeText(formData.interview_focus),
      special_note: sanitizeText(formData.special_note),
      job_description_excerpt: sanitizeText(formData.job_description_excerpt),
      feedback_notes: sanitizeText(formData.feedback_notes),
    });

    setLoading(false);
    if (result.success) {
      showToast({
        type: 'success',
        title: 'Interview Scheduled',
        message: 'The interview has been created successfully',
      });
      onSuccess();
    } else if (result.error) {
      showToast({
        type: 'error',
        title: 'Failed to Schedule',
        message: result.error,
      });
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="bg-white rounded-lg sm:rounded-xl shadow-2xl w-full max-w-2xl sm:max-w-4xl max-h-[95vh] sm:max-h-[90vh] overflow-y-auto flex flex-col">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-4 sm:px-8 py-4 sm:py-6 flex items-center justify-between gap-2">
          <h2 className="text-lg sm:text-2xl font-bold text-gray-900 truncate">Schedule Interview</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 flex-shrink-0"
          >
            <X className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-8 space-y-4 overflow-y-auto flex-1">
          {/* Required Information Accordion - Open by default */}
          <AccordionSection title="✓ Basic Information (Required)" defaultOpen={true}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <FormField
                label="Requirement"
                name="requirement_id"
                type="select"
                value={formData.requirement_id}
                onChange={handleChange}
                options={requirementOptions}
                required
                error={formErrors.requirement_id}
              />
              <FormField
                label="Interview Date"
                name="scheduled_date"
                type="date"
                value={formData.scheduled_date}
                onChange={handleChange}
                required
                error={formErrors.scheduled_date}
              />
              <FormField
                label="Candidate Name"
                name="interview_with"
                placeholder="Candidate name"
                value={formData.interview_with}
                onChange={handleChange}
                required
                error={formErrors.interview_with}
              />
              <FormField
                label="Interview Time"
                name="scheduled_time"
                type="time"
                value={formData.scheduled_time}
                onChange={handleChange}
              />
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
              <AlertCircle className="w-4 h-4 inline mr-2" />
              These fields must be filled to create an interview.
            </div>
          </AccordionSection>

          {/* Interview Details */}
          <AccordionSection title="Interview Details" defaultOpen={false}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <FormField
                label="Interview Type"
                name="type"
                type="select"
                value={formData.type}
                onChange={handleChange}
                options={[
                  { label: 'Technical', value: 'Technical' },
                  { label: 'HR', value: 'HR' },
                  { label: 'Behavioral', value: 'Behavioral' },
                  { label: 'Final Round', value: 'Final Round' },
                  { label: 'Screening', value: 'Screening' },
                ]}
              />
              <FormField
                label="Round"
                name="round"
                type="select"
                value={formData.round}
                onChange={handleChange}
                options={[
                  { label: '1st Round', value: '1st Round' },
                  { label: '2nd Round', value: '2nd Round' },
                  { label: '3rd Round', value: '3rd Round' },
                  { label: 'Final Round', value: 'Final Round' },
                ]}
              />
              <FormField
                label="Status"
                name="status"
                type="select"
                value={formData.status}
                onChange={handleChange}
                options={getAllInterviewStatuses()}
              />
              <FormField
                label="Result (optional)"
                name="result"
                type="select"
                value={formData.result}
                onChange={handleChange}
                options={[
                  { label: 'Positive', value: 'Positive' },
                  { label: 'Negative', value: 'Negative' },
                  { label: 'On Hold', value: 'On Hold' },
                  { label: 'Pending', value: 'Pending' },
                ]}
              />
            </div>
          </AccordionSection>

          {/* Meeting Configuration */}
          <AccordionSection title="Meeting Configuration" defaultOpen={false}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <FormField
                label="Mode"
                name="mode"
                type="select"
                value={formData.mode}
                onChange={handleChange}
                options={[
                  { label: 'Video Call', value: 'Video Call' },
                  { label: 'Phone Call', value: 'Phone Call' },
                  { label: 'In Person', value: 'In Person' },
                  { label: 'Panel Interview', value: 'Panel Interview' },
                ]}
              />
              <FormField
                label="Duration (minutes)"
                name="duration_minutes"
                type="number"
                placeholder="60"
                value={formData.duration_minutes}
                onChange={handleChange}
              />
              <FormField
                label="Timezone"
                name="timezone"
                type="select"
                value={formData.timezone}
                onChange={handleChange}
                options={[
                  { label: 'UTC', value: 'UTC' },
                  { label: 'EST (UTC-5)', value: 'EST' },
                  { label: 'CST (UTC-6)', value: 'CST' },
                  { label: 'MST (UTC-7)', value: 'MST' },
                  { label: 'PST (UTC-8)', value: 'PST' },
                  { label: 'IST (UTC+5:30)', value: 'IST' },
                ]}
              />
              <FormField
                label="Platform"
                name="meeting_type"
                type="select"
                value={formData.meeting_type}
                onChange={handleChange}
                options={[
                  { label: 'GMeet', value: 'GMeet' },
                  { label: 'Zoom', value: 'Zoom' },
                  { label: 'Webex', value: 'Webex' },
                  { label: 'MS Teams', value: 'MS Teams' },
                ]}
              />
              <FormField
                label="Meeting Link or Location"
                name="location"
                placeholder="Zoom link, Meeting room, or Address"
                value={formData.location}
                onChange={handleChange}
              />
            </div>
          </AccordionSection>

          {/* Participants */}
          <AccordionSection title="Participants & Interviewer" defaultOpen={false}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <FormField
                label="Consultant"
                name="consultant_id"
                type="select"
                value={formData.consultant_id}
                onChange={handleChange}
                options={consultantOptions}
              />
              <FormField
                label="Interviewer"
                name="interviewer"
                placeholder="Interviewer name"
                value={formData.interviewer}
                onChange={handleChange}
              />
              <FormField
                label="Vendor Company"
                name="vendor_company"
                placeholder="ABC Staffing"
                value={formData.vendor_company}
                onChange={handleChange}
              />
              <FormField
                label="Subject Line (auto-generated/editable)"
                name="subject_line"
                placeholder="Will auto-generate based on requirement and date"
                value={formData.subject_line}
                onChange={handleChange}
              />
            </div>
          </AccordionSection>

          {/* Interview Notes & Feedback */}
          <AccordionSection title="Notes & Feedback" defaultOpen={false}>
            <div className="space-y-4">
              <FormField
                label="Interview Focus (optional notes)"
                name="interview_focus"
                type="textarea"
                placeholder="Key areas to discuss, focus areas, etc."
                value={formData.interview_focus}
                onChange={handleChange}
              />
              <FormField
                label="Special Note"
                name="special_note"
                type="textarea"
                placeholder="Any special instructions or notes"
                value={formData.special_note}
                onChange={handleChange}
              />
              <FormField
                label="Job Description excerpt"
                name="job_description_excerpt"
                type="textarea"
                placeholder="Key job requirements or description"
                value={formData.job_description_excerpt}
                onChange={handleChange}
              />
              <FormField
                label="Feedback Notes"
                name="feedback_notes"
                type="textarea"
                placeholder="Post-interview feedback and observations"
                value={formData.feedback_notes}
                onChange={handleChange}
              />
            </div>
          </AccordionSection>

          {/* Form Actions */}
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 pt-6 border-t border-gray-200">
            <button
              type="submit"
              disabled={loading}
              className="px-4 sm:px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-400 transition"
            >
              {loading ? 'Scheduling...' : 'Schedule Interview'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 sm:px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
