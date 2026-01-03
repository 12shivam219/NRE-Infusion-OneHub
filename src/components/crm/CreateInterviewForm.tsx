import { useState, useEffect, useCallback, useMemo, memo } from 'react';
import { X, AlertCircle, CheckCircle2, Info, Sparkles } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../contexts/ToastContext';
import { createInterview } from '../../lib/api/interviews';
import { getRequirements } from '../../lib/api/requirements';
import { getConsultants } from '../../lib/api/consultants';
import { generateInterviewFocus } from '../../lib/api/groq-interview';
import { validateInterviewForm, getAllInterviewStatuses } from '../../lib/interviewValidation';
import { sanitizeText } from '../../lib/utils';
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
import Accordion from '@mui/material/Accordion';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import Box from '@mui/material/Box';
import FormHelperText from '@mui/material/FormHelperText';
import FormControl from '@mui/material/FormControl';
import type { SelectChangeEvent } from '@mui/material/Select';

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
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | SelectChangeEvent<string>) => void;
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
  // Helper text based on field type
  const getHelperText = () => {
    if (error) return undefined;
    if (type === 'date') return 'Format: MM/DD/YYYY';
    if (type === 'time') return 'Format: HH:MM (24-hour)';
    if (type === 'textarea') return 'Optional field';
    return undefined;
  };

  // Input props for date/time fields
  const getInputProps = () => {
    if (type === 'date') {
      return { placeholder: 'MM/DD/YYYY' };
    }
    if (type === 'time') {
      return { placeholder: 'HH:MM' };
    }
    return {};
  };

  const commonInputSx = {
    transition: 'all 0.2s ease',
    '&:hover': {
      borderColor: 'primary.main',
      boxShadow: '0 0 8px rgba(234, 179, 8, 0.1)',
    },
    '&.Mui-focused': {
      boxShadow: '0 0 12px rgba(234, 179, 8, 0.25)',
    },
  };

  return (
    <FormControl fullWidth variant="outlined" error={Boolean(error)} size="small">
      {type === 'select' ? (
        <TextField
          select
          label={label}
          name={name}
          value={value}
          onChange={onChange}
          disabled={readOnly}
          required={required}
          error={Boolean(error)}
          placeholder={placeholder}
          size="small"
          fullWidth
          variant="outlined"
          sx={{
            '& .MuiOutlinedInput-root': commonInputSx,
            '& .MuiInputBase-input': {
              fontFamily: '"Poppins", sans-serif',
            },
          }}
        >
          <MenuItem value="">
            <span style={{ color: '#999' }}>Select {label.toLowerCase()}</span>
          </MenuItem>
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
          disabled={readOnly}
          error={Boolean(error)}
          size="small"
          fullWidth
          variant="outlined"
          multiline={type === 'textarea'}
          rows={type === 'textarea' ? 3 : undefined}
          InputLabelProps={type === 'date' || type === 'time' ? { shrink: true } : undefined}
          inputProps={type === 'date' || type === 'time' ? getInputProps() : undefined}
          sx={{
            '& .MuiOutlinedInput-root': commonInputSx,
            '& .MuiInputBase-input': {
              fontFamily: '"Poppins", sans-serif',
              fontSize: '0.95rem',
              letterSpacing: type === 'time' ? '0.05em' : 'normal',
            },
            ...(type === 'date' || type === 'time' ? {
              '& input[type="date"]::-webkit-calendar-picker-indicator': {
                cursor: 'pointer',
                filter: 'invert(0.7)',
              },
              '& input[type="time"]::-webkit-calendar-picker-indicator': {
                cursor: 'pointer',
                filter: 'invert(0.7)',
              },
            } : {}),
          }}
        />
      )}
      {error && (
        <FormHelperText sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5, color: '#ef4444' }}>
          <AlertCircle size={14} />
          {error}
        </FormHelperText>
      )}
      {!error && getHelperText() && (
        <FormHelperText sx={{ mt: 0.5, color: '#6b7280' }}>
          {getHelperText()}
        </FormHelperText>
      )}
    </FormControl>
  );
});

interface CreateInterviewFormProps {
  onClose: () => void;
  onSuccess: () => void;
  requirementId?: string;
  showDialog?: boolean;
}

const AccordionSection = ({ title, children, defaultOpen = false, icon }: { title: string; children: React.ReactNode; defaultOpen?: boolean; icon?: React.ReactNode }) => {
  const [expanded, setExpanded] = useState(defaultOpen);
  const isRequired = title.includes('Required');
  
  return (
    <Accordion
      expanded={expanded}
      onChange={(_, next) => setExpanded(next)}
      disableGutters
      elevation={0}
      sx={{
        border: '1px solid rgba(234, 179, 8, 0.2)',
        borderRadius: 1.5,
        overflow: 'hidden',
        backgroundColor: expanded ? 'rgba(234, 179, 8, 0.04)' : 'transparent',
        transition: 'all 0.2s ease',
        '&:before': {
          display: 'none',
        },
        '&.Mui-expanded': {
          margin: 0,
        },
      }}
    >
      <AccordionSummary 
        expandIcon={<ExpandMoreIcon sx={{ color: 'primary.main' }} />}
        sx={{
          padding: '12px 16px',
          backgroundColor: isRequired ? 'rgba(234, 179, 8, 0.08)' : 'transparent',
          borderBottom: expanded ? '1px solid rgba(234, 179, 8, 0.15)' : 'none',
          transition: 'all 0.2s ease',
          '&:hover': {
            backgroundColor: 'rgba(234, 179, 8, 0.08)',
          },
        }}
      >
        <Stack direction="row" spacing={1} alignItems="center">
          {icon && icon}
          <Typography 
            variant="subtitle2" 
            sx={{ 
              fontWeight: 700,
              fontFamily: '"Poppins", sans-serif',
              fontSize: '0.95rem',
              color: 'text.primary',
            }}
          >
            {title}
          </Typography>
          {isRequired && (
            <CheckCircle2 size={16} style={{ color: '#22c55e', marginLeft: '4px' }} />
          )}
        </Stack>
      </AccordionSummary>
      <AccordionDetails sx={{ padding: '16px' }}>
        <Stack spacing={2}>
          {children}
        </Stack>
      </AccordionDetails>
    </Accordion>
  );
};

export const CreateInterviewForm = ({ onClose, onSuccess, requirementId, showDialog = true }: CreateInterviewFormProps) => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [consultants, setConsultants] = useState<Consultant[]>([]);
  const [loading, setLoading] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [aiGenerating, setAiGenerating] = useState(false);

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
    meeting_type: '',
    subject_line: '',
    interviewer: '',
    location: '',
    interview_focus: '',
    special_note: '',
    job_description_excerpt: '',
    feedback_notes: '',
  });

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | SelectChangeEvent<string>) => {
    const { name, value } = e.target as { name: string; value: string };
    // Don't trim during typing - only set the value as-is
    setFormData(prevState => ({ ...prevState, [name]: value }));
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
    let cancelled = false;

    const run = async () => {
      await Promise.resolve();
      if (cancelled) return;
      await loadData();
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [loadData]);

  // Auto-populate fields from requirement data and generate interview focus with AI
  useEffect(() => {
    if (!formData.requirement_id) return;

    let cancelled = false;

    const run = async () => {
      await Promise.resolve();
      if (cancelled) return;

      const requirement = requirements.find(r => r.id === formData.requirement_id);
      if (requirement) {
        // Auto-populate job description excerpt
        const jobDescExcerpt = requirement.description || '';
        
        // Auto-populate vendor company
        const vendorCompany = requirement.company || '';
        
        // Update form with these values
        setFormData(prev => ({
          ...prev,
          job_description_excerpt: jobDescExcerpt,
          vendor_company: vendorCompany,
        }));

        // Generate interview focus using AI if tech stack exists
        const techStack = requirement.primary_tech_stack || '';
        if (techStack) {
          setAiGenerating(true);
          const result = await generateInterviewFocus({
            techStack,
            jobDescription: jobDescExcerpt,
            jobTitle: requirement.title || '',
            company: vendorCompany,
          });

          if (!cancelled) {
            if (result.success && result.interviewFocus) {
              setFormData(prev => ({
                ...prev,
                interview_focus: result.interviewFocus || '',
              }));
            }
            setAiGenerating(false);
          }
        }
      }
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [formData.requirement_id, requirements]);

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
    const result = await createInterview(
      {
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
      },
      user.id
    );

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

  const formContent = (
    <form onSubmit={handleSubmit}>
      <Stack spacing={3}>
        {/* Info Banner */}
        <Box sx={{
          p: 2,
          backgroundColor: 'rgba(59, 130, 246, 0.08)',
          border: '1px solid rgba(59, 130, 246, 0.2)',
          borderRadius: 1.5,
          display: 'flex',
          gap: 1.5,
          alignItems: 'flex-start',
        }}>
          <Info size={20} style={{ color: '#3b82f6', marginTop: '2px', flexShrink: 0 }} />
          <Box>
            <Typography variant="body2" sx={{ fontWeight: 600, color: '#3b82f6', mb: 0.25 }}>
              Pro Tip
            </Typography>
            <Typography variant="caption" sx={{ color: '#1e40af' }}>
              Fill out the basic information first (marked with ✓), then customize additional details as needed.
            </Typography>
          </Box>
        </Box>

        {/* Required Information Accordion - Open by default */}
        <AccordionSection title="✓ Basic Information (Required)" defaultOpen={true}>
          <Box sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
            gap: 2,
          }}>
            <FormField
              label="Requirement *"
              name="requirement_id"
              type="select"
              value={formData.requirement_id}
              onChange={handleChange}
              options={requirementOptions}
              required
              error={formErrors.requirement_id}
            />
            <FormField
              label="Interview Date *"
              name="scheduled_date"
              type="date"
              value={formData.scheduled_date}
              onChange={handleChange}
              required
              error={formErrors.scheduled_date}
            />
            <FormField
              label="Interviewee Name *"
              name="interview_with"
              placeholder="Enter interviewee name"
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
          </Box>
          <Box sx={{
            p: 2,
            backgroundColor: 'rgba(249, 115, 22, 0.08)',
            border: '1px solid rgba(249, 115, 22, 0.2)',
            borderRadius: 1,
            display: 'flex',
            gap: 1,
            alignItems: 'flex-start',
          }}>
            <AlertCircle size={18} style={{ color: '#f97316', marginTop: '2px', flexShrink: 0 }} />
            <Typography variant="caption" sx={{ color: '#92400e' }}>
              <strong>Required fields:</strong> Requirement, Interview Date, and Candidate Name must be filled to create an interview.
            </Typography>
          </Box>
        </AccordionSection>

        {/* Interview Details */}
        <AccordionSection title="Interview Details" defaultOpen={false}>
          <Box sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
            gap: 2,
          }}>
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
          </Box>
        </AccordionSection>

        {/* Meeting Configuration */}
        <AccordionSection title="Meeting Configuration" defaultOpen={false}>
          <Box sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
            gap: 2,
          }}>
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
            <Box sx={{ gridColumn: { xs: 'auto', sm: 'span 2' } }}>
              <FormField
                label="Meeting Link or Location"
                name="location"
                placeholder="Enter Zoom link, Meeting room, or Address"
                value={formData.location}
                onChange={handleChange}
              />
            </Box>
          </Box>
        </AccordionSection>

        {/* Participants */}
        <AccordionSection title="Participants & Interviewer" defaultOpen={false}>
          <Box sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
            gap: 2,
          }}>
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
              placeholder="Enter interviewer name"
              value={formData.interviewer}
              onChange={handleChange}
            />
            <FormField
              label="Vendor Company"
              name="vendor_company"
              placeholder="e.g., ABC Staffing"
              value={formData.vendor_company}
              onChange={handleChange}
            />
            <FormField
              label="Subject Line"
              name="subject_line"
              placeholder="Will auto-generate if left blank"
              value={formData.subject_line}
              onChange={handleChange}
            />
          </Box>
        </AccordionSection>

        {/* Interview Notes & Feedback */}
        <AccordionSection title="Notes & Feedback" defaultOpen={false}>
          <Stack spacing={2.5}>
            {/* Interview Focus - Enhanced UI */}
            <Box>
              <Box sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                mb: 1.5,
              }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'text.primary' }}>
                    Interview Focus
                  </Typography>
                  <Box sx={{
                    backgroundColor: 'rgba(212, 175, 55, 0.15)',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    border: '1px solid rgba(212, 175, 55, 0.3)',
                  }}>
                    <Typography variant="caption" sx={{ fontWeight: 600, color: 'rgba(212, 175, 55, 0.9)' }}>
                      AI-Powered
                    </Typography>
                  </Box>
                </Box>
                {aiGenerating && (
                  <Box sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.8,
                    backgroundColor: 'rgba(59, 130, 246, 0.12)',
                    padding: '6px 12px',
                    borderRadius: '6px',
                    border: '1px solid rgba(59, 130, 246, 0.2)',
                    animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                  }}>
                    <Sparkles size={16} style={{ color: '#3b82f6' }} />
                    <Typography variant="caption" sx={{ color: '#3b82f6', fontWeight: 600, fontSize: '0.75rem' }}>
                      Generating...
                    </Typography>
                  </Box>
                )}
                {formData.interview_focus && !aiGenerating && (
                  <Box sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.6,
                    backgroundColor: 'rgba(34, 197, 94, 0.12)',
                    padding: '6px 10px',
                    borderRadius: '6px',
                    border: '1px solid rgba(34, 197, 94, 0.2)',
                  }}>
                    <CheckCircle2 size={14} style={{ color: '#22c55e' }} />
                    <Typography variant="caption" sx={{ color: '#22c55e', fontWeight: 600, fontSize: '0.72rem' }}>
                      Generated
                    </Typography>
                  </Box>
                )}
              </Box>
              <TextField
                fullWidth
                multiline
                minRows={5}
                maxRows={20}
                placeholder="AI will generate key areas to discuss, technical focus areas, and preparation points based on the job description and tech stack..."
                value={formData.interview_focus}
                onChange={handleChange}
                name="interview_focus"
                disabled={aiGenerating}
                slotProps={{
                  input: {
                    sx: {
                      fontFamily: 'inherit',
                      fontSize: '0.9rem',
                      lineHeight: 1.6,
                      color: formData.interview_focus ? 'text.primary' : 'text.secondary',
                      backgroundColor: formData.interview_focus 
                        ? 'rgba(212, 175, 55, 0.03)' 
                        : aiGenerating 
                          ? 'rgba(59, 130, 246, 0.02)' 
                          : 'background.paper',
                      transition: 'all 0.3s ease',
                      resize: 'vertical',
                      '&:hover': {
                        backgroundColor: formData.interview_focus 
                          ? 'rgba(212, 175, 55, 0.05)' 
                          : 'background.paper',
                        borderColor: formData.interview_focus ? 'rgba(212, 175, 55, 0.4)' : 'action.hover',
                      },
                      '&.Mui-focused': {
                        backgroundColor: formData.interview_focus 
                          ? 'rgba(212, 175, 55, 0.05)' 
                          : 'background.paper',
                        borderColor: 'primary.main',
                        boxShadow: '0 0 0 3px rgba(212, 175, 55, 0.1)',
                      },
                      '&.Mui-disabled': {
                        backgroundColor: 'rgba(59, 130, 246, 0.04)',
                        opacity: 1,
                      },
                    },
                  },
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderColor: formData.interview_focus ? 'rgba(212, 175, 55, 0.3)' : 'divider',
                    '& fieldset': {
                      borderColor: formData.interview_focus ? 'rgba(212, 175, 55, 0.3)' : 'divider',
                      transition: 'border-color 0.3s ease',
                    },
                  },
                }}
              />
              {formData.interview_focus && (
                <Typography variant="caption" sx={{ 
                  display: 'block',
                  mt: 1,
                  color: 'text.secondary',
                  fontSize: '0.8rem',
                }}>
                  💡 Tip: This AI-generated content is editable. Customize it to match your interview style.
                </Typography>
              )}
            </Box>

            {/* Special Note */}
            {/* Special Note */}
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'text.primary', mb: 1 }}>
                Special Note
              </Typography>
              <TextField
                fullWidth
                multiline
                minRows={3}
                maxRows={8}
                placeholder="Any special instructions, red flags to discuss, or notes about the candidate..."
                value={formData.special_note}
                onChange={handleChange}
                name="special_note"
                slotProps={{
                  input: {
                    sx: {
                      fontFamily: 'inherit',
                      fontSize: '0.9rem',
                      lineHeight: 1.6,
                      backgroundColor: formData.special_note 
                        ? 'rgba(168, 85, 247, 0.03)' 
                        : 'background.paper',
                      '&:hover': {
                        backgroundColor: formData.special_note 
                          ? 'rgba(168, 85, 247, 0.05)' 
                          : 'background.paper',
                      },
                      '&.Mui-focused': {
                        boxShadow: '0 0 0 3px rgba(168, 85, 247, 0.1)',
                      },
                    },
                  },
                }}
              />
            </Box>
            <FormField
              label="Job Description Excerpt"
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
          </Stack>
        </AccordionSection>

        {/* Form Actions */}
        <Box sx={{
          pt: 2,
          mt: 2,
          borderTop: '1px solid rgba(234, 179, 8, 0.2)',
          display: 'flex',
          gap: 2,
          flexDirection: { xs: 'column', sm: 'row' },
        }}>
          <Box sx={{ flex: 1 }}>
            <BrandButton
              type="submit"
              variant="primary"
              size="md"
              disabled={loading}
            >
              {loading ? 'Scheduling...' : 'Schedule Interview'}
            </BrandButton>
          </Box>
          <Box sx={{ flex: 1 }}>
            <BrandButton
              type="button"
              variant="secondary"
              size="md"
              onClick={onClose}
            >
              Cancel
            </BrandButton>
          </Box>
        </Box>
      </Stack>
    </form>
  );

  if (!showDialog) {
    return formContent;
  }

  return (
    <Dialog 
      open 
      onClose={onClose} 
      fullWidth 
      maxWidth="lg" 
      scroll="paper"
      PaperProps={{
        sx: {
          borderRadius: '12px',
          background: 'linear-gradient(135deg, #ffffff 0%, #f9fafb 100%)',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        },
      }}
      slotProps={{
        backdrop: {
          sx: {
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
          },
        },
      }}
    >
      <DialogTitle 
        sx={{ 
          pr: 7, 
          fontWeight: 700,
          fontSize: '1.25rem',
          fontFamily: '"Poppins", sans-serif',
          color: '#1f2937',
          borderBottom: '1px solid #e5e7eb',
          paddingBottom: '16px',
        }}
      >
        Schedule Interview
        <IconButton 
          onClick={onClose} 
          sx={{ 
            position: 'absolute', 
            right: 8, 
            top: 8,
            color: '#6b7280',
            '&:hover': {
              backgroundColor: 'rgba(0, 0, 0, 0.08)',
            },
          }} 
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </IconButton>
      </DialogTitle>

      <DialogContent 
        dividers 
        sx={{ 
          backgroundColor: '#ffffff',
          padding: '24px',
          overflowY: 'auto',
          '&::-webkit-scrollbar': {
            width: '8px',
          },
          '&::-webkit-scrollbar-track': {
            background: 'transparent',
          },
          '&::-webkit-scrollbar-thumb': {
            background: '#d1d5db',
            borderRadius: '4px',
            '&:hover': {
              background: '#9ca3af',
            },
          },
        }}
      >
        {formContent}
      </DialogContent>
    </Dialog>
  );
};
