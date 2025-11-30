import { useState, useEffect, useCallback } from 'react';
import { X } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { createInterview } from '../../lib/api/interviews';
import { getRequirements } from '../../lib/api/requirements';
import { getConsultants } from '../../lib/api/consultants';
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
}

interface CreateInterviewFormProps {
  onClose: () => void;
  onSuccess: () => void;
  requirementId?: string;
}

export const CreateInterviewForm = ({ onClose, onSuccess, requirementId }: CreateInterviewFormProps) => {
  const { user } = useAuth();
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [consultants, setConsultants] = useState<Consultant[]>([]);
  const [loading, setLoading] = useState(false);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

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
      vendor_company: formData.vendor_company || null,
      interview_with: formData.interview_with || null,
      result: formData.result || null,
      round: formData.round || null,
      mode: formData.mode || null,
      meeting_type: formData.meeting_type || null,
      subject_line: formData.subject_line || null,
      interviewer: formData.interviewer || null,
      location: formData.location || null,
      interview_focus: formData.interview_focus || null,
      special_note: formData.special_note || null,
      job_description_excerpt: formData.job_description_excerpt || null,
      feedback_notes: formData.feedback_notes || null,
    });

    setLoading(false);
    if (result.success) {
      onSuccess();
    }
  };

  const FormSection = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div className="border-t border-gray-200 pt-6 mt-6 first:border-t-0 first:pt-0 first:mt-0">
      <h3 className="text-sm font-semibold text-gray-900 mb-4">{title}</h3>
      <div className="space-y-4">{children}</div>
    </div>
  );

  const FormField = ({
    label,
    name,
    type = 'text',
    placeholder,
    value,
    onChange,
    required = false,
    readOnly = false,
    options,
  }: FormFieldProps) => (
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
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
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
          rows={4}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent read-only:bg-gray-100"
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
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent read-only:bg-gray-100"
        />
      )}
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-8 py-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">Schedule Interview</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          {/* Basic Information */}
          <FormSection title="Basic Information">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                label="Requirement ID (read-only display)"
                name="requirement_id"
                type="select"
                value={formData.requirement_id}
                onChange={(e) => setFormData({ ...formData, requirement_id: e.target.value })}
                options={requirements.map(r => ({ label: `${r.title} - ${r.company}`, value: r.id }))}
                required
              />
              <FormField
                label="Interview Date"
                name="scheduled_date"
                type="date"
                value={formData.scheduled_date}
                onChange={(e) => setFormData({ ...formData, scheduled_date: e.target.value })}
                required
              />
              <FormField
                label="Interview Time"
                name="scheduled_time"
                type="time"
                value={formData.scheduled_time}
                onChange={(e) => setFormData({ ...formData, scheduled_time: e.target.value })}
              />
              <FormField
                label="Timezone"
                name="timezone"
                type="select"
                value={formData.timezone}
                onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
                options={[
                  { label: 'UTC', value: 'UTC' },
                  { label: 'EST (UTC-5)', value: 'EST' },
                  { label: 'CST (UTC-6)', value: 'CST' },
                  { label: 'MST (UTC-7)', value: 'MST' },
                  { label: 'PST (UTC-8)', value: 'PST' },
                  { label: 'IST (UTC+5:30)', value: 'IST' },
                ]}
              />
            </div>
          </FormSection>

          {/* Interview Details */}
          <FormSection title="Interview Details">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                label="Interview Type"
                name="type"
                type="select"
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                options={[
                  { label: 'Technical', value: 'Technical' },
                  { label: 'HR', value: 'HR' },
                  { label: 'Behavioral', value: 'Behavioral' },
                  { label: 'Final Round', value: 'Final Round' },
                  { label: 'Screening', value: 'Screening' },
                ]}
              />
              <FormField
                label="Status"
                name="status"
                type="select"
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                options={[
                  { label: 'Scheduled', value: 'Scheduled' },
                  { label: 'Confirmed', value: 'Confirmed' },
                  { label: 'Completed', value: 'Completed' },
                  { label: 'Cancelled', value: 'Cancelled' },
                  { label: 'Rescheduled', value: 'Rescheduled' },
                  { label: 'No Show', value: 'No Show' },
                ]}
              />
              <FormField
                label="Consultant"
                name="consultant_id"
                type="select"
                value={formData.consultant_id}
                onChange={(e) => setFormData({ ...formData, consultant_id: e.target.value })}
                options={consultants.map(c => ({ label: c.name, value: c.id }))}
              />
              <FormField
                label="Vendor Company"
                name="vendor_company"
                placeholder="ABC Staffing"
                value={formData.vendor_company}
                onChange={(e) => setFormData({ ...formData, vendor_company: e.target.value })}
              />
              <FormField
                label="Interview With"
                name="interview_with"
                placeholder="Candidate name"
                value={formData.interview_with}
                onChange={(e) => setFormData({ ...formData, interview_with: e.target.value })}
              />
              <FormField
                label="Result (optional)"
                name="result"
                type="select"
                value={formData.result}
                onChange={(e) => setFormData({ ...formData, result: e.target.value })}
                options={[
                  { label: 'Positive', value: 'Positive' },
                  { label: 'Negative', value: 'Negative' },
                  { label: 'On Hold', value: 'On Hold' },
                  { label: 'Pending', value: 'Pending' },
                ]}
              />
            </div>
          </FormSection>

          {/* Meeting Configuration */}
          <FormSection title="Meeting Configuration">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                label="Round"
                name="round"
                type="select"
                value={formData.round}
                onChange={(e) => setFormData({ ...formData, round: e.target.value })}
                options={[
                  { label: '1st Round', value: '1st Round' },
                  { label: '2nd Round', value: '2nd Round' },
                  { label: '3rd Round', value: '3rd Round' },
                  { label: 'Final Round', value: 'Final Round' },
                ]}
              />
              <FormField
                label="Mode"
                name="mode"
                type="select"
                value={formData.mode}
                onChange={(e) => setFormData({ ...formData, mode: e.target.value })}
                options={[
                  { label: 'Video Call', value: 'Video Call' },
                  { label: 'Phone Call', value: 'Phone Call' },
                  { label: 'In Person', value: 'In Person' },
                  { label: 'Panel Interview', value: 'Panel Interview' },
                ]}
              />
              <FormField
                label="Meeting Type"
                name="meeting_type"
                type="select"
                value={formData.meeting_type}
                onChange={(e) => setFormData({ ...formData, meeting_type: e.target.value })}
                options={[
                  { label: 'Scheduled', value: 'Scheduled' },
                  { label: 'Ad Hoc', value: 'Ad Hoc' },
                  { label: 'Follow-up', value: 'Follow-up' },
                ]}
              />
              <FormField
                label="Duration (minutes)"
                name="duration_minutes"
                type="number"
                placeholder="60"
                value={formData.duration_minutes}
                onChange={(e) => setFormData({ ...formData, duration_minutes: e.target.value })}
              />
            </div>
          </FormSection>

          {/* Interview Participants & Location */}
          <FormSection title="Participants & Location">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                label="Subject Line (auto-generated/editable)"
                name="subject_line"
                placeholder="Will auto-generate based on requirement and date"
                value={formData.subject_line}
                onChange={(e) => setFormData({ ...formData, subject_line: e.target.value })}
              />
              <FormField
                label="Interviewer"
                name="interviewer"
                placeholder="Interviewer name"
                value={formData.interviewer}
                onChange={(e) => setFormData({ ...formData, interviewer: e.target.value })}
              />
              <FormField
                label="Interview Link or Location"
                name="location"
                placeholder="Zoom link, Meeting room, or Address"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              />
            </div>
          </FormSection>

          {/* Interview Notes & Feedback */}
          <FormSection title="Interview Notes & Feedback">
            <FormField
              label="Interview Focus (optional notes)"
              name="interview_focus"
              type="textarea"
              placeholder="Key areas to discuss, focus areas, etc."
              value={formData.interview_focus}
              onChange={(e) => setFormData({ ...formData, interview_focus: e.target.value })}
            />
            <FormField
              label="Special Note"
              name="special_note"
              type="textarea"
              placeholder="Any special instructions or notes"
              value={formData.special_note}
              onChange={(e) => setFormData({ ...formData, special_note: e.target.value })}
            />
            <FormField
              label="Job Description excerpt"
              name="job_description_excerpt"
              type="textarea"
              placeholder="Key job requirements or description"
              value={formData.job_description_excerpt}
              onChange={(e) => setFormData({ ...formData, job_description_excerpt: e.target.value })}
            />
            <FormField
              label="Feedback Notes"
              name="feedback_notes"
              type="textarea"
              placeholder="Post-interview feedback and observations"
              value={formData.feedback_notes}
              onChange={(e) => setFormData({ ...formData, feedback_notes: e.target.value })}
            />
          </FormSection>

          {/* Form Actions */}
          <div className="flex gap-3 pt-6 border-t border-gray-200">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-400 transition"
            >
              {loading ? 'Scheduling...' : 'Schedule Interview'}
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
