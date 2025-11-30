import { useState, useEffect } from 'react';
import { TrendingUp, Download, Plus, BarChart3 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { getRequirements } from '../../lib/api/requirements';
import { getInterviews } from '../../lib/api/interviews';
import { getConsultants } from '../../lib/api/consultants';
import type { Database } from '../../lib/database.types';

type Requirement = Database['public']['Tables']['requirements']['Row'];
type Interview = Database['public']['Tables']['interviews']['Row'];
type Consultant = Database['public']['Tables']['consultants']['Row'];

interface MarketingHubDashboardProps {
  onQuickAdd?: (type: 'requirement' | 'interview' | 'consultant') => void;
}

export const MarketingHubDashboard = ({ onQuickAdd }: MarketingHubDashboardProps) => {
  const { user } = useAuth();
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [consultants, setConsultants] = useState<Consultant[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'requirements' | 'interviews' | 'consultants'>('requirements');

  useEffect(() => {
    const loadData = async () => {
      if (!user) return;

      const [reqResult, intResult, conResult] = await Promise.all([
        getRequirements(user.id),
        getInterviews(user.id),
        getConsultants(user.id),
      ]);

      if (reqResult.success && reqResult.requirements) {
        setRequirements(reqResult.requirements);
      }
      if (intResult.success && intResult.interviews) {
        setInterviews(intResult.interviews);
      }
      if (conResult.success && conResult.consultants) {
        setConsultants(conResult.consultants);
      }
      setLoading(false);
    };

    if (user) {
      loadData();
    }
  }, [user]);

  const getStats = () => {
    const activeRequirements = requirements.filter(r => r.status !== 'CLOSED' && r.status !== 'REJECTED');
    const upcomingInterviews = interviews.filter(i => {
      const date = new Date(i.scheduled_date);
      const now = new Date();
      return date > now && i.status !== 'Cancelled';
    });
    const activeConsultants = consultants.filter(c => c.status === 'Active');
    const placedConsultants = consultants.filter(c => c.status === 'Recently Placed');

    return {
      activeRequirements: activeRequirements.length,
      newRequirements: requirements.filter(r => r.status === 'NEW').length,
      inProgressRequirements: requirements.filter(r => r.status === 'IN_PROGRESS').length,
      interviewRequirements: requirements.filter(r => r.status === 'INTERVIEW').length,
      offerRequirements: requirements.filter(r => r.status === 'OFFER').length,
      upcomingInterviews: upcomingInterviews.length,
      completedInterviews: interviews.filter(i => i.status === 'Completed').length,
      activeConsultants: activeConsultants.length,
      placedConsultants: placedConsultants.length,
      placementRate: consultants.length > 0 
        ? Math.round((placedConsultants.length / consultants.length) * 100)
        : 0,
    };
  };

  const stats = getStats();

  const recentActivity = [
    ...requirements.slice(0, 2).map(r => ({
      type: 'requirement',
      title: `New requirement: ${r.title} at ${r.company}`,
      time: new Date(r.created_at).toLocaleDateString(),
    })),
    ...interviews.slice(0, 2).map(i => ({
      type: 'interview',
      title: `Interview scheduled for requirement`,
      time: new Date(i.scheduled_date).toLocaleDateString(),
    })),
    ...consultants.slice(0, 2).map(c => ({
      type: 'consultant',
      title: `${c.name} status: ${c.status}`,
      time: new Date(c.updated_at).toLocaleDateString(),
    })),
  ].sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()).slice(0, 5);

  if (loading) {
    return <div className="p-6 text-center text-gray-500">Loading dashboard...</div>;
  }

  return (
    <div className="space-y-8">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white rounded-lg p-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <p className="text-blue-100 mb-1">Marketing Hub Dashboard</p>
            <h1 className="text-3xl font-bold">Your Command Center</h1>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => onQuickAdd?.('requirement')}
              className="px-4 py-2 bg-white text-blue-600 rounded-lg font-medium hover:bg-blue-50 flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Quick Add
            </button>
            <button className="px-4 py-2 bg-blue-700 text-white rounded-lg font-medium hover:bg-blue-800 flex items-center gap-2">
              <Download className="w-4 h-4" />
              Export
            </button>
            <button className="px-4 py-2 bg-blue-700 text-white rounded-lg font-medium hover:bg-blue-800 flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Analytics
            </button>
          </div>
        </div>
      </div>

      {/* Headline Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Active Requirements</p>
              <p className="text-3xl font-bold text-gray-900">{stats.activeRequirements}</p>
            </div>
            <TrendingUp className="w-8 h-8 text-blue-600" />
          </div>
          <div className="mt-4 text-xs text-gray-500">
            <p>New: {stats.newRequirements} | In Progress: {stats.inProgressRequirements}</p>
            <p>Interview: {stats.interviewRequirements} | Offer: {stats.offerRequirements}</p>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Upcoming Interviews</p>
              <p className="text-3xl font-bold text-gray-900">{stats.upcomingInterviews}</p>
            </div>
            <TrendingUp className="w-8 h-8 text-purple-600" />
          </div>
          <div className="mt-4 text-xs text-gray-500">
            <p>Completed: {stats.completedInterviews} this month</p>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Active Consultants</p>
              <p className="text-3xl font-bold text-gray-900">{stats.activeConsultants}</p>
            </div>
            <TrendingUp className="w-8 h-8 text-green-600" />
          </div>
          <div className="mt-4 text-xs text-gray-500">
            <p>Recently Placed: {stats.placedConsultants}</p>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Placement Rate</p>
              <p className="text-3xl font-bold text-gray-900">{stats.placementRate}%</p>
            </div>
            <TrendingUp className="w-8 h-8 text-orange-600" />
          </div>
          <div className="mt-4 text-xs text-gray-500">
            <p>{stats.placedConsultants} of {consultants.length} placed</p>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
          <div className="space-y-4">
            {recentActivity.length === 0 ? (
              <p className="text-gray-500 text-sm">No recent activity</p>
            ) : (
              recentActivity.map((activity, idx) => (
                <div key={idx} className="flex items-start gap-4 pb-4 border-b border-gray-200 last:border-b-0">
                  <div className="w-2 h-2 rounded-full mt-2" style={{
                    backgroundColor: activity.type === 'requirement' ? '#3B82F6' : 
                                   activity.type === 'interview' ? '#A855F7' : '#10B981'
                  }}></div>
                  <div className="flex-1">
                    <p className="text-gray-900 text-sm">{activity.title}</p>
                    <p className="text-gray-500 text-xs">{activity.time}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
          <div className="space-y-3">
            <button
              onClick={() => onQuickAdd?.('requirement')}
              className="w-full px-4 py-2 bg-blue-50 text-blue-600 rounded-lg font-medium hover:bg-blue-100 text-sm"
            >
              ➕ Add Requirement
            </button>
            <button
              onClick={() => onQuickAdd?.('interview')}
              className="w-full px-4 py-2 bg-purple-50 text-purple-600 rounded-lg font-medium hover:bg-purple-100 text-sm"
            >
              📅 Schedule Interview
            </button>
            <button
              onClick={() => onQuickAdd?.('consultant')}
              className="w-full px-4 py-2 bg-green-50 text-green-600 rounded-lg font-medium hover:bg-green-100 text-sm"
            >
              👤 Add Consultant
            </button>
          </div>
        </div>
      </div>

      {/* Tabbed Content */}
      <div className="bg-white border border-gray-200 rounded-lg">
        <div className="border-b border-gray-200">
          <div className="flex">
            <button
              onClick={() => setActiveTab('requirements')}
              className={`px-6 py-4 font-medium border-b-2 transition ${
                activeTab === 'requirements'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              Requirements ({requirements.length})
            </button>
            <button
              onClick={() => setActiveTab('interviews')}
              className={`px-6 py-4 font-medium border-b-2 transition ${
                activeTab === 'interviews'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              Interviews ({interviews.length})
            </button>
            <button
              onClick={() => setActiveTab('consultants')}
              className={`px-6 py-4 font-medium border-b-2 transition ${
                activeTab === 'consultants'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              Consultants ({consultants.length})
            </button>
          </div>
        </div>

        <div className="p-6">
          {activeTab === 'requirements' && (
            <div className="space-y-3">
              {requirements.slice(0, 5).map(req => (
                <div key={req.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition">
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{req.title}</p>
                    <p className="text-sm text-gray-600">{req.company}</p>
                  </div>
                  <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">{req.status}</span>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'interviews' && (
            <div className="space-y-3">
              {interviews.slice(0, 5).map(int => (
                <div key={int.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition">
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">Interview scheduled</p>
                    <p className="text-sm text-gray-600">{new Date(int.scheduled_date).toLocaleDateString()}</p>
                  </div>
                  <span className="px-3 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">{int.status}</span>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'consultants' && (
            <div className="space-y-3">
              {consultants.slice(0, 5).map(con => (
                <div key={con.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition">
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{con.name}</p>
                    <p className="text-sm text-gray-600">{con.email || 'No email'}</p>
                  </div>
                  <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">{con.status}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
