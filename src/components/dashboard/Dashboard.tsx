import { useState, useEffect, useCallback } from 'react';
import { FileText, Briefcase, Users, TrendingUp, Upload, Plus, Calendar } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { getDocuments } from '../../lib/api/documents';
import { getRequirements } from '../../lib/api/requirements';

export const Dashboard = () => {
  const { user } = useAuth();
  const [documentCount, setDocumentCount] = useState(0);
  const [requirementCount, setRequirementCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const loadStats = useCallback(async () => {
    if (!user) return;
    const [docsResult, reqsResult] = await Promise.all([
      getDocuments(user.id),
      getRequirements(user.id),
    ]);

    if (docsResult.success && docsResult.documents)
      setDocumentCount(docsResult.documents.length);
    if (reqsResult.success && reqsResult.requirements)
      setRequirementCount(reqsResult.requirements.length);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  const stats = [
    { label: 'Total Documents', value: documentCount, icon: FileText, color: 'text-blue-600 bg-blue-50' },
    { label: 'Active Requirements', value: requirementCount, icon: Briefcase, color: 'text-green-600 bg-green-50' },
    { label: 'Interviews', value: 0, icon: Users, color: 'text-orange-600 bg-orange-50' },
    { label: 'Success Rate', value: '0%', icon: TrendingUp, color: 'text-purple-600 bg-purple-50' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-6 md:p-10">
      {/* Header */}
      <header className="mb-8">
        <h1 className="text-3xl font-semibold text-gray-900">
          Welcome back, {user?.full_name} 👋
        </h1>
        <p className="text-gray-500 mt-1">
          Here’s your updated resume management overview
        </p>
      </header>

      {/* Stats Section */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8 animate-pulse">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="h-28 bg-white rounded-xl shadow-sm border border-gray-200"
            ></div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          {stats.map(({ label, value, icon: Icon, color }) => (
            <div
              key={label}
              className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md hover:-translate-y-0.5 transition-transform"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">{label}</p>
                  <p className="text-3xl font-semibold text-gray-900 mt-1">{value}</p>
                </div>
                <div className={`p-3 rounded-lg ${color}`}>
                  <Icon className="w-6 h-6" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Activity + Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activity */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h2>
          <div className="text-gray-500 text-center py-10 italic">
            No recent activity to display
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="space-y-3">
            <ActionButton color="blue" icon={<Upload className="w-4 h-4" />} label="Upload New Resume" />
            <ActionButton color="green" icon={<Plus className="w-4 h-4" />} label="Create Requirement" />
            <ActionButton color="orange" icon={<Calendar className="w-4 h-4" />} label="Schedule Interview" />
          </div>
        </div>
      </div>
    </div>
  );
};

/* --- Reusable Quick Action Button --- */
interface ActionButtonProps {
  color: 'blue' | 'green' | 'orange';
  icon: React.ReactNode;
  label: string;
}

const ActionButton = ({ color, icon, label }: ActionButtonProps) => {
  const colorClasses: Record<string, string> = {
    blue: 'bg-blue-600 hover:bg-blue-700',
    green: 'bg-green-600 hover:bg-green-700',
    orange: 'bg-orange-600 hover:bg-orange-700',
  };
  return (
    <button
      className={`w-full flex items-center justify-center space-x-2 text-white font-medium py-3 rounded-lg transition ${colorClasses[color]}`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
};
