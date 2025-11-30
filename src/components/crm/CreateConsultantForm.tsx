import { useState } from 'react';
import { X, Trash2 } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { createConsultant } from '../../lib/api/consultants';

type Project = {
  id: string;
  name: string;
  domain: string;
  city: string;
  state: string;
  start_date: string;
  end_date: string;
  currently_working: boolean;
  description: string;
};

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

interface CreateConsultantFormProps {
  onClose: () => void;
  onSuccess: () => void;
}

export const CreateConsultantForm = ({ onClose, onSuccess }: CreateConsultantFormProps) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [showProjectForm, setShowProjectForm] = useState(false);

  const [formData, setFormData] = useState({
    status: 'Active',
    name: '',
    email: '',
    phone: '',
    location: '',
    primary_skills: '',
    secondary_skills: '',
    total_experience: '',
    linkedin_profile: '',
    portfolio_link: '',
    availability: 'Immediate',
    visa_status: '',
    date_of_birth: '',
    address: '',
    timezone: 'UTC',
    degree_name: '',
    university: '',
    year_of_passing: '',
    ssn: '',
    how_got_visa: '',
    year_came_to_us: '',
    country_of_origin: '',
    why_looking_for_job: '',
    preferred_work_location: '',
    preferred_work_type: '',
    expected_rate: '',
    payroll_company: '',
    payroll_contact_info: '',
  });

  const [projectForm, setProjectForm] = useState({
    name: '',
    domain: '',
    city: '',
    state: '',
    start_date: '',
    end_date: '',
    currently_working: false,
    description: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    const result = await createConsultant({
      user_id: user.id,
      status: formData.status,
      name: formData.name,
      email: formData.email || null,
      phone: formData.phone || null,
      location: formData.location || null,
      primary_skills: formData.primary_skills || null,
      secondary_skills: formData.secondary_skills || null,
      total_experience: formData.total_experience || null,
      linkedin_profile: formData.linkedin_profile || null,
      portfolio_link: formData.portfolio_link || null,
      availability: formData.availability || null,
      visa_status: formData.visa_status || null,
      date_of_birth: formData.date_of_birth || null,
      address: formData.address || null,
      timezone: formData.timezone || null,
      degree_name: formData.degree_name || null,
      university: formData.university || null,
      year_of_passing: formData.year_of_passing || null,
      ssn: formData.ssn || null,
      how_got_visa: formData.how_got_visa || null,
      year_came_to_us: formData.year_came_to_us || null,
      country_of_origin: formData.country_of_origin || null,
      why_looking_for_job: formData.why_looking_for_job || null,
      preferred_work_location: formData.preferred_work_location || null,
      preferred_work_type: formData.preferred_work_type || null,
      expected_rate: formData.expected_rate || null,
      payroll_company: formData.payroll_company || null,
      payroll_contact_info: formData.payroll_contact_info || null,
      projects: projects.length > 0 ? projects : null,
      company: null,
    });

    setLoading(false);
    if (result.success) {
      onSuccess();
    }
  };

  const handleAddProject = () => {
    if (projectForm.name && projectForm.domain) {
      setProjects([
        ...projects,
        {
          id: Date.now().toString(),
          ...projectForm,
        },
      ]);
      setProjectForm({
        name: '',
        domain: '',
        city: '',
        state: '',
        start_date: '',
        end_date: '',
        currently_working: false,
        description: '',
      });
      setShowProjectForm(false);
    }
  };

  const handleRemoveProject = (id: string) => {
    setProjects(projects.filter(p => p.id !== id));
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

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-8 py-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">Add New Consultant</h2>
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
                label="What's your status?"
                name="status"
                type="select"
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                options={[
                  { label: 'Active', value: 'Active' },
                  { label: 'Inactive', value: 'Inactive' },
                  { label: 'Recently Placed', value: 'Recently Placed' },
                  { label: 'Not Available', value: 'Not Available' },
                ]}
                required
              />
              <FormField
                label="What's your full name?"
                name="name"
                placeholder="John Smith"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
              <FormField
                label="What's your email address?"
                name="email"
                type="email"
                placeholder="john@example.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
              <FormField
                label="What's your phone number?"
                name="phone"
                type="tel"
                placeholder="(555) 123-4567"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>
          </FormSection>

          {/* Skills & Experience */}
          <FormSection title="Skills & Experience">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                label="What's your primary skill set?"
                name="primary_skills"
                placeholder="Java, Python, AWS"
                value={formData.primary_skills}
                onChange={(e) => setFormData({ ...formData, primary_skills: e.target.value })}
              />
              <FormField
                label="Any secondary skills?"
                name="secondary_skills"
                placeholder="Docker, Kubernetes, SQL"
                value={formData.secondary_skills}
                onChange={(e) => setFormData({ ...formData, secondary_skills: e.target.value })}
              />
              <FormField
                label="How many years of experience do you have?"
                name="total_experience"
                placeholder="5 years, 10+ years"
                value={formData.total_experience}
                onChange={(e) => setFormData({ ...formData, total_experience: e.target.value })}
              />
              <FormField
                label="When are you available to start?"
                name="availability"
                type="select"
                value={formData.availability}
                onChange={(e) => setFormData({ ...formData, availability: e.target.value })}
                options={[
                  { label: 'Immediate', value: 'Immediate' },
                  { label: 'Two Weeks', value: 'Two Weeks' },
                  { label: 'One Month', value: 'One Month' },
                  { label: 'Two Months', value: 'Two Months' },
                  { label: 'Flexible', value: 'Flexible' },
                ]}
              />
            </div>
          </FormSection>

          {/* Online Presence */}
          <FormSection title="Online Presence">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                label="What's your LinkedIn profile URL?"
                name="linkedin_profile"
                type="url"
                placeholder="https://linkedin.com/in/username"
                value={formData.linkedin_profile}
                onChange={(e) => setFormData({ ...formData, linkedin_profile: e.target.value })}
              />
              <FormField
                label="Do you have a portfolio website?"
                name="portfolio_link"
                type="url"
                placeholder="https://yourportfolio.com"
                value={formData.portfolio_link}
                onChange={(e) => setFormData({ ...formData, portfolio_link: e.target.value })}
              />
            </div>
          </FormSection>

          {/* Location & Timezone */}
          <FormSection title="Location & Timezone">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                label="What's your current location?"
                name="location"
                placeholder="San Francisco, CA"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              />
              <FormField
                label="What's your timezone?"
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
                  { label: 'GST (UTC+4)', value: 'GST' },
                ]}
              />
              <FormField
                label="What's your full address?"
                name="address"
                placeholder="123 Main St, City, State, ZIP"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              />
            </div>
          </FormSection>

          {/* Education */}
          <FormSection title="Education">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                label="What degree did you earn?"
                name="degree_name"
                placeholder="Bachelor's in Computer Science"
                value={formData.degree_name}
                onChange={(e) => setFormData({ ...formData, degree_name: e.target.value })}
              />
              <FormField
                label="Which university did you attend?"
                name="university"
                placeholder="University Name"
                value={formData.university}
                onChange={(e) => setFormData({ ...formData, university: e.target.value })}
              />
              <FormField
                label="When did you graduate?"
                name="year_of_passing"
                type="number"
                placeholder="2020"
                value={formData.year_of_passing}
                onChange={(e) => setFormData({ ...formData, year_of_passing: e.target.value })}
              />
            </div>
          </FormSection>

          {/* Immigration & Personal */}
          <FormSection title="Immigration & Personal Information">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                label="What's your country of origin?"
                name="country_of_origin"
                placeholder="India, Canada, etc."
                value={formData.country_of_origin}
                onChange={(e) => setFormData({ ...formData, country_of_origin: e.target.value })}
              />
              <FormField
                label="What's your visa status?"
                name="visa_status"
                type="select"
                value={formData.visa_status}
                onChange={(e) => setFormData({ ...formData, visa_status: e.target.value })}
                options={[
                  { label: 'US Citizen', value: 'US Citizen' },
                  { label: 'Green Card', value: 'Green Card' },
                  { label: 'H1B', value: 'H1B' },
                  { label: 'L1', value: 'L1' },
                  { label: 'E2', value: 'E2' },
                  { label: 'O1', value: 'O1' },
                  { label: 'Other', value: 'Other' },
                ]}
              />
              <FormField
                label="How did you obtain your visa?"
                name="how_got_visa"
                placeholder="Sponsorship, Self-sponsored, etc."
                value={formData.how_got_visa}
                onChange={(e) => setFormData({ ...formData, how_got_visa: e.target.value })}
              />
              <FormField
                label="What year did you come to the US?"
                name="year_came_to_us"
                type="number"
                placeholder="2018"
                value={formData.year_came_to_us}
                onChange={(e) => setFormData({ ...formData, year_came_to_us: e.target.value })}
              />
              <FormField
                label="What's your date of birth?"
                name="date_of_birth"
                type="date"
                value={formData.date_of_birth}
                onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
              />
              <FormField
                label="What's your SSN (last 4 digits)?"
                name="ssn"
                placeholder="1234"
                value={formData.ssn}
                onChange={(e) => setFormData({ ...formData, ssn: e.target.value })}
              />
            </div>
          </FormSection>

          {/* Work Preferences */}
          <FormSection title="Work Preferences">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                label="What's your preferred work location?"
                name="preferred_work_location"
                type="select"
                value={formData.preferred_work_location}
                onChange={(e) => setFormData({ ...formData, preferred_work_location: e.target.value })}
                options={[
                  { label: 'Remote', value: 'Remote' },
                  { label: 'Hybrid', value: 'Hybrid' },
                  { label: 'Onsite', value: 'Onsite' },
                  { label: 'Flexible', value: 'Flexible' },
                ]}
              />
              <FormField
                label="What type of work are you looking for?"
                name="preferred_work_type"
                type="select"
                value={formData.preferred_work_type}
                onChange={(e) => setFormData({ ...formData, preferred_work_type: e.target.value })}
                options={[
                  { label: 'Full-time', value: 'Full-time' },
                  { label: 'Contract', value: 'Contract' },
                  { label: 'Freelance', value: 'Freelance' },
                  { label: 'Permanent', value: 'Permanent' },
                ]}
              />
              <FormField
                label="What's your expected rate?"
                name="expected_rate"
                placeholder="$80-120/hr or $100k-150k/year"
                value={formData.expected_rate}
                onChange={(e) => setFormData({ ...formData, expected_rate: e.target.value })}
              />
              <FormField
                label="Why are you looking for a new opportunity?"
                name="why_looking_for_job"
                type="textarea"
                placeholder="Career growth, new challenges, relocation, etc."
                value={formData.why_looking_for_job}
                onChange={(e) => setFormData({ ...formData, why_looking_for_job: e.target.value })}
              />
            </div>
          </FormSection>

          {/* Payroll Information */}
          <FormSection title="Payroll Information">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                label="Which payroll company do you prefer?"
                name="payroll_company"
                placeholder="ADP, Paychex, etc."
                value={formData.payroll_company}
                onChange={(e) => setFormData({ ...formData, payroll_company: e.target.value })}
              />
              <FormField
                label="What's your payroll contact information?"
                name="payroll_contact_info"
                placeholder="Name, email, or phone"
                value={formData.payroll_contact_info}
                onChange={(e) => setFormData({ ...formData, payroll_contact_info: e.target.value })}
              />
            </div>
          </FormSection>

          {/* Projects */}
          <FormSection title="Project Experience">
            <div className="space-y-4">
              {projects.length > 0 && (
                <div className="space-y-3">
                  {projects.map(project => (
                    <div key={project.id} className="p-4 bg-blue-50 border border-blue-200 rounded-lg flex justify-between items-start">
                      <div>
                        <p className="font-medium text-gray-900">{project.name}</p>
                        <p className="text-sm text-gray-600">{project.domain} • {project.city}, {project.state}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {project.start_date} - {project.currently_working ? 'Present' : project.end_date}
                        </p>
                        {project.description && (
                          <p className="text-sm text-gray-700 mt-2">{project.description}</p>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveProject(project.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {!showProjectForm ? (
                <button
                  type="button"
                  onClick={() => setShowProjectForm(true)}
                  className="w-full px-4 py-3 border-2 border-dashed border-blue-300 text-blue-600 rounded-lg hover:bg-blue-50 font-medium transition"
                >
                  + Add Project
                </button>
              ) : (
                <div className="p-4 bg-gray-50 border border-gray-300 rounded-lg space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <input
                      type="text"
                      placeholder="Project name"
                      value={projectForm.name}
                      onChange={(e) => setProjectForm({ ...projectForm, name: e.target.value })}
                      className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                    />
                    <input
                      type="text"
                      placeholder="Project domain"
                      value={projectForm.domain}
                      onChange={(e) => setProjectForm({ ...projectForm, domain: e.target.value })}
                      className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                    />
                    <input
                      type="text"
                      placeholder="City"
                      value={projectForm.city}
                      onChange={(e) => setProjectForm({ ...projectForm, city: e.target.value })}
                      className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                    />
                    <input
                      type="text"
                      placeholder="State"
                      value={projectForm.state}
                      onChange={(e) => setProjectForm({ ...projectForm, state: e.target.value })}
                      className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                    />
                    <input
                      type="date"
                      value={projectForm.start_date}
                      onChange={(e) => setProjectForm({ ...projectForm, start_date: e.target.value })}
                      className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                    />
                    <div className="flex items-center gap-3">
                      <input
                        type="date"
                        disabled={projectForm.currently_working}
                        value={projectForm.end_date}
                        onChange={(e) => setProjectForm({ ...projectForm, end_date: e.target.value })}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                      />
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={projectForm.currently_working}
                          onChange={(e) => setProjectForm({ ...projectForm, currently_working: e.target.checked })}
                          className="rounded"
                        />
                        <span>Currently working</span>
                      </label>
                    </div>
                  </div>
                  <textarea
                    placeholder="Project description"
                    value={projectForm.description}
                    onChange={(e) => setProjectForm({ ...projectForm, description: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                  />
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={handleAddProject}
                      className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 text-sm"
                    >
                      Save Project
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowProjectForm(false)}
                      className="flex-1 px-3 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 text-sm"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </FormSection>

          {/* Form Actions */}
          <div className="flex gap-3 pt-6 border-t border-gray-200">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-400 transition"
            >
              {loading ? 'Adding...' : 'Add Consultant'}
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
