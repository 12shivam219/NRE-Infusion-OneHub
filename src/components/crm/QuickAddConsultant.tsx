import { useState } from 'react';
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

export const QuickAddConsultant = ({ onClose, onSubmit }: QuickAddConsultantProps) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    status: 'Active',
    skills: '',
  });

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
            <label className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 cursor-pointer">
              <input type="checkbox" className="w-5 h-5" checked={!!formData.name} readOnly />
              <div>
                <div className="font-medium text-gray-900">What's their name?</div>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Michael Johnson"
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>
            </label>
          </div>

          <div>
            <label className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 cursor-pointer">
              <input type="checkbox" className="w-5 h-5" checked={!!formData.email} readOnly />
              <div>
                <div className="font-medium text-gray-900">Email & phone?</div>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="michael@email.com"
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="555-0123"
                  className="mt-2 block w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>
            </label>
          </div>

          <div>
            <label className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 cursor-pointer">
              <input type="checkbox" className="w-5 h-5" checked={!!formData.status} readOnly />
              <div>
                <div className="font-medium text-gray-900">Current status?</div>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                >
                  <option>Active</option>
                  <option>Not Active</option>
                  <option>Recently Placed</option>
                </select>
              </div>
            </label>
          </div>

          <div>
            <label className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 cursor-pointer">
              <input type="checkbox" className="w-5 h-5" checked={!!formData.skills} readOnly />
              <div>
                <div className="font-medium text-gray-900">Key skill area?</div>
                <input
                  type="text"
                  value={formData.skills}
                  onChange={(e) => setFormData({ ...formData, skills: e.target.value })}
                  placeholder="Full-Stack Developer"
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
