import { useState, useEffect } from 'react';
import { FileText, Briefcase, Users, TrendingUp } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { getDocuments } from '../../lib/api/documents';
import { getRequirements } from '../../lib/api/requirements';

export const Dashboard = () => {
  const { user } = useAuth();
  const [documentCount, setDocumentCount] = useState(0);
  const [requirementCount, setRequirementCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, [user]);

  const loadStats = async () => {
    if (!user) return;

    const [docsResult, reqsResult] = await Promise.all([
      getDocuments(user.id),
      getRequirements(user.id),
    ]);

    if (docsResult.success && docsResult.documents) {
      setDocumentCount(docsResult.documents.length);
    }

    if (reqsResult.success && reqsResult.requirements) {
      setRequirementCount(reqsResult.requirements.length);
    }

    setLoading(false);
  };

  const stats = [
    {
      label: 'Total Documents',
      value: documentCount,
      icon: FileText,
      color: 'bg-blue-500',
    },
    {
      label: 'Active Requirements',
      value: requirementCount,
      icon: Briefcase,
      color: 'bg-green-500',
    },
    {
      label: 'Interviews',
      value: 0,
      icon: Users,
      color: 'bg-orange-500',
    },
    {
      label: 'Success Rate',
      value: '0%',
      icon: TrendingUp,
      color: 'bg-purple-500',
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 md:p-8">
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Welcome back, {user?.full_name}!</h1>
        <p className="text-gray-600 mt-2 text-sm sm:text-base">Here's your resume management overview</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6 hover:shadow-md transition"
            >
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-xs sm:text-sm text-gray-600 mb-1">{stat.label}</p>
                  <p className="text-2xl sm:text-3xl font-bold text-gray-900">{stat.value}</p>
                </div>
                <div className={`${stat.color} w-10 h-10 sm:w-12 sm:h-12 rounded-lg flex items-center justify-center flex-shrink-0 ml-2`}>
                  <Icon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
          <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-4">Recent Activity</h2>
          <div className="text-gray-500 text-center py-8">
            No recent activity to display
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
          <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-4">Quick Actions</h2>
          <div className="space-y-3">
            <button className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg font-medium text-sm sm:text-base hover:bg-blue-700 transition">
              Upload New Resume
            </button>
            <button className="w-full px-4 py-3 bg-green-600 text-white rounded-lg font-medium text-sm sm:text-base hover:bg-green-700 transition">
              Create Requirement
            </button>
            <button className="w-full px-4 py-3 bg-orange-600 text-white rounded-lg font-medium text-sm sm:text-base hover:bg-orange-700 transition">
              Schedule Interview
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
