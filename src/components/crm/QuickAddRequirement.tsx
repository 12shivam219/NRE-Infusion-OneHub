import { useState } from 'react';
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

export const QuickAddRequirement = ({ onClose, onSubmit }: QuickAddRequirementProps) => {
  const [formData, setFormData] = useState({
    title: '',
    company: '',
    description: '',
    timeline: '2 weeks',
  });

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
            <label className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 cursor-pointer">
              <input type="checkbox" className="w-5 h-5" checked readOnly />
              <div>
                <div className="font-medium text-gray-900">What's the job title?</div>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Senior Java Developer"
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>
            </label>
          </div>

          <div>
            <label className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 cursor-pointer">
              <input type="checkbox" className="w-5 h-5" checked={!!formData.company} readOnly />
              <div>
                <div className="font-medium text-gray-900">Which company?</div>
                <input
                  type="text"
                  value={formData.company}
                  onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                  placeholder="TechCorp"
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>
            </label>
          </div>

          <div>
            <label className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 cursor-pointer">
              <input type="checkbox" className="w-5 h-5" checked={!!formData.timeline} readOnly />
              <div>
                <div className="font-medium text-gray-900">Timeline?</div>
                <select
                  value={formData.timeline}
                  onChange={(e) => setFormData({ ...formData, timeline: e.target.value })}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                >
                  <option>ASAP</option>
                  <option>1 week</option>
                  <option>2 weeks</option>
                  <option>1 month</option>
                  <option>2 months</option>
                </select>
              </div>
            </label>
          </div>

          <div>
            <label className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 cursor-pointer">
              <input type="checkbox" className="w-5 h-5" checked={!!formData.description} readOnly />
              <div>
                <div className="font-medium text-gray-900">Any special requirements?</div>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Optional"
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>
            </label>
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
