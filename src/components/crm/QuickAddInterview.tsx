import { useState, useCallback } from 'react';
import { X, Plus } from 'lucide-react';

interface QuickAddInterviewProps {
  onClose: () => void;
  onSubmit: (data: {
    requirementId: string;
    consultantName: string;
    dateTime: string;
    mode: string;
    interviewer: string;
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

export const QuickAddInterview = ({ onClose, onSubmit }: QuickAddInterviewProps) => {
  const [formData, setFormData] = useState({
    requirementId: '',
    consultantName: '',
    dateTime: '',
    mode: 'phone',
    interviewer: '',
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
          <h3 className="text-xl font-bold text-gray-900">Schedule Interview</h3>
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
              <StepIndicator completed={Boolean(formData.requirementId)} />
              <div>
                <div className="font-medium text-gray-900">Which requirement?</div>
                <input
                  type="text"
                  name="requirementId"
                  value={formData.requirementId}
                  onChange={handleChange}
                  placeholder="Senior Java Developer - TechCorp"
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>
            </div>
          </div>

          <div>
            <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50">
              <StepIndicator completed={Boolean(formData.consultantName)} />
              <div>
                <div className="font-medium text-gray-900">Which consultant?</div>
                <input
                  type="text"
                  name="consultantName"
                  value={formData.consultantName}
                  onChange={handleChange}
                  placeholder="Sarah Chen"
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>
            </div>
          </div>

          <div>
            <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50">
              <StepIndicator completed={Boolean(formData.dateTime)} />
              <div>
                <div className="font-medium text-gray-900">When? (date & time)</div>
                <input
                  type="datetime-local"
                  name="dateTime"
                  value={formData.dateTime}
                  onChange={handleChange}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>
            </div>
          </div>

          <div>
            <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50">
              <StepIndicator completed={Boolean(formData.mode)} />
              <div>
                <div className="font-medium text-gray-900">How are we meeting?</div>
                <select
                  name="mode"
                  value={formData.mode}
                  onChange={handleChange}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                >
                  <option value="phone">Phone Call</option>
                  <option value="video">Video Call</option>
                  <option value="inperson">In-Person</option>
                </select>
              </div>
            </div>
          </div>

          <div>
            <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50">
              <StepIndicator completed={Boolean(formData.interviewer)} />
              <div>
                <div className="font-medium text-gray-900">Who's interviewing?</div>
                <input
                  type="text"
                  name="interviewer"
                  value={formData.interviewer}
                  onChange={handleChange}
                  placeholder="John Smith"
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
              Schedule
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
