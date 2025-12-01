import { useState, useCallback } from 'react';
import { X, Plus } from 'lucide-react';

interface QuickAddConsultantProps {
  onClose: () => void;
  onSubmit: (data: {
    name: string;
    email: string;
    phone: string;
    status: string;
    skills: string;
  }) => void;
}

const StepIndicator = ({ completed }: { completed: boolean }) => (
  <span
    aria-hidden="true"
    className={`flex items-center justify-center w-5 h-5 rounded border text-xs font-semibold transition-colors ${
      completed
        ? 'bg-blue-600 border-blue-600 text-white'
        : 'border-gray-300 text-transparent'
    }`}
  >
    ✓
  </span>
);

export const QuickAddConsultant = ({ onClose, onSubmit }: QuickAddConsultantProps) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    status: 'Active',
    skills: '',
  });

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-gray-900">Add to Team</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50">
              <StepIndicator completed={Boolean(formData.name)} />
              <div>
                <div className="font-medium text-gray-900">What's their name?</div>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Michael Johnson"
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>
            </div>
          </div>

          <div>
            <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50">
              <StepIndicator completed={Boolean(formData.email)} />
              <div>
                <div className="font-medium text-gray-900">Email & phone?</div>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="michael@email.com"
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="555-0123"
                  className="mt-2 block w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>
            </div>
          </div>

          <div>
            <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50">
              <StepIndicator completed={Boolean(formData.status)} />
              <div>
                <div className="font-medium text-gray-900">Current status?</div>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                >
                  <option>Active</option>
                  <option>Not Active</option>
                  <option>Recently Placed</option>
                </select>
              </div>
            </div>
          </div>

          <div>
            <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50">
              <StepIndicator completed={Boolean(formData.skills)} />
              <div>
                <div className="font-medium text-gray-900">Key skill area?</div>
                <input
                  type="text"
                  name="skills"
                  value={formData.skills}
                  onChange={handleChange}
                  placeholder="Full-Stack Developer"
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
            >
              <Plus className="w-4 h-4 inline mr-2" />
              Add to Team
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
