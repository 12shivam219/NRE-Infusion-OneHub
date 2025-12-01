import { useState, useCallback } from 'react';
import { X, Plus } from 'lucide-react';

interface QuickAddRequirementProps {
  onClose: () => void;
  onSubmit: (data: {
    title: string;
    company: string;
    description: string;
    timeline: string;
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

export const QuickAddRequirement = ({ onClose, onSubmit }: QuickAddRequirementProps) => {
  const [formData, setFormData] = useState({
    title: '',
    company: '',
    description: '',
    timeline: '2 weeks',
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
          <h3 className="text-xl font-bold text-gray-900">Quick Add Requirement</h3>
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
              <StepIndicator completed={Boolean(formData.title)} />
              <div>
                <div className="font-medium text-gray-900">What's the job title?</div>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  placeholder="Senior Java Developer"
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>
            </div>
          </div>

          <div>
            <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50">
              <StepIndicator completed={Boolean(formData.company)} />
              <div>
                <div className="font-medium text-gray-900">Which company?</div>
                <input
                  type="text"
                  name="company"
                  value={formData.company}
                  onChange={handleChange}
                  placeholder="TechCorp"
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>
            </div>
          </div>

          <div>
            <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50">
              <StepIndicator completed={Boolean(formData.timeline)} />
              <div>
                <div className="font-medium text-gray-900">Timeline?</div>
                <select
                  name="timeline"
                  value={formData.timeline}
                  onChange={handleChange}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                >
                  <option>ASAP</option>
                  <option>1 week</option>
                  <option>2 weeks</option>
                  <option>1 month</option>
                  <option>2 months</option>
                </select>
              </div>
            </div>
          </div>

          <div>
            <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50">
              <StepIndicator completed={Boolean(formData.description)} />
              <div>
                <div className="font-medium text-gray-900">Any special requirements?</div>
                <input
                  type="text"
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  placeholder="Optional"
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
              Add to List
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
