import { useState, useEffect, useMemo } from 'react';
import { FileText, Briefcase, Users, TrendingUp, Upload, Plus, Calendar } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { getDocuments } from '../../lib/api/documents';
import { getRequirements } from '../../lib/api/requirements';

export const Dashboard = () => {
  const { user } = useAuth();
  const [documentCount, setDocumentCount] = useState(0);
  const [requirementCount, setRequirementCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      if (!user) return;
      const [docsResult, reqsResult] = await Promise.all([
        getDocuments(user.id),
        getRequirements(user.id),
      ]);

      if (cancelled) return;

      if (docsResult.success && docsResult.documents)
        setDocumentCount(docsResult.documents.length);
      if (reqsResult.success && reqsResult.requirements)
        setRequirementCount(reqsResult.requirements.length);
      setLoading(false);
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [user]);

  const stats = useMemo(() => [
    { label: 'Total Documents', value: documentCount, icon: FileText, color: 'text-primary-800 bg-primary-50' },
    { label: 'Active Requirements', value: requirementCount, icon: Briefcase, color: 'text-green-600 bg-green-50' },
    { label: 'Interviews', value: 0, icon: Users, color: 'text-orange-600 bg-orange-50' },
    { label: 'Success Rate', value: '0%', icon: TrendingUp, color: 'text-purple-600 bg-purple-50' },
  ], [documentCount, requirementCount]);

  return (
    <div className="min-h-screen bg-gray-50 p-6 md:p-10">
      {/* Header */}
      <header className="mb-8">
        <h1 className="text-xs font-medium text-gray-900">
          Welcome back, {user?.full_name} 👋
        </h1>
        <p className="text-gray-500 mt-1">
          Here’s your updated resume management overview
        </p>
      </header>

      {/* Stats Section */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded w-24 mb-2 animate-pulse" />
                  <div className="h-8 bg-gray-200 rounded w-16 animate-pulse" />
                </div>
                <div className="w-12 h-12 bg-gray-200 rounded-lg animate-pulse" />
              </div>
            </div>
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
                  <p className="text-xs text-gray-500">{label}</p>
                  <p className="text-xs font-medium text-gray-900 mt-1">{value}</p>
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
          <h2 className="text-xs font-medium text-gray-900 mb-4">Quick Actions</h2>
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
    blue: 'bg-primary-800 hover:bg-primary-900',
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
