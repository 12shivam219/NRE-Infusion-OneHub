import { useState, useEffect, useCallback } from 'react';
import { TrendingUp, Download, Plus, BarChart3, Calendar, UserPlus } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
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

  const loadData = useCallback(async () => {
    if (!user) return;
    const [reqResult, intResult, conResult] = await Promise.all([
      getRequirements(user.id),
      getInterviews(user.id),
      getConsultants(user.id),
    ]);
    if (reqResult.success && reqResult.requirements) setRequirements(reqResult.requirements);
    if (intResult.success && intResult.interviews) setInterviews(intResult.interviews);
    if (conResult.success && conResult.consultants) setConsultants(conResult.consultants);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

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
  ]
    .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
    .slice(0, 5);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[300px] text-gray-500 animate-pulse">
        Loading dashboard...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6 md:p-10 space-y-10">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-xl shadow-md p-8 md:p-10">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div>
            <p className="text-blue-100 mb-1">Marketing Hub Dashboard</p>
            <h1 className="text-3xl font-semibold">Your Command Center</h1>
            <p className="text-blue-200 text-sm mt-1">
              Manage requirements, interviews & consultants in one place
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => onQuickAdd?.('requirement')}
              className="flex items-center gap-2 bg-white text-blue-600 rounded-lg font-medium px-4 py-2 hover:bg-blue-50 transition"
            >
              <Plus className="w-4 h-4" /> Quick Add
            </button>
            <button className="flex items-center gap-2 bg-blue-700 text-white rounded-lg px-4 py-2 hover:bg-blue-800 transition">
              <Download className="w-4 h-4" /> Export
            </button>
            <button className="flex items-center gap-2 bg-blue-700 text-white rounded-lg px-4 py-2 hover:bg-blue-800 transition">
              <BarChart3 className="w-4 h-4" /> Analytics
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Active Requirements"
          value={stats.activeRequirements}
          icon={<TrendingUp className="w-6 h-6 text-blue-500" />}
          subtitle={`New: ${stats.newRequirements} | In Progress: ${stats.inProgressRequirements}`}
        />
        <StatCard
          title="Upcoming Interviews"
          value={stats.upcomingInterviews}
          icon={<TrendingUp className="w-6 h-6 text-purple-500" />}
          subtitle={`Completed: ${stats.completedInterviews} this month`}
        />
        <StatCard
          title="Active Consultants"
          value={stats.activeConsultants}
          icon={<TrendingUp className="w-6 h-6 text-green-500" />}
          subtitle={`Recently Placed: ${stats.placedConsultants}`}
        />
        <StatCard
          title="Placement Rate"
          value={`${stats.placementRate}%`}
          icon={<TrendingUp className="w-6 h-6 text-orange-500" />}
          subtitle={`${stats.placedConsultants} of ${consultants.length} placed`}
        />
      </section>

      {/* Activity + Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
          <div className="space-y-4">
            {recentActivity.length === 0 ? (
              <p className="text-gray-500 text-sm italic text-center py-8">
                No recent activity
              </p>
            ) : (
              recentActivity.map((activity, idx) => (
                <div key={idx} className="flex items-start gap-4 pb-4 border-b border-gray-100 last:border-none">
                  <div
                    className={`w-2.5 h-2.5 rounded-full mt-2 ${
                      activity.type === 'requirement'
                        ? 'bg-blue-500'
                        : activity.type === 'interview'
                        ? 'bg-purple-500'
                        : 'bg-green-500'
                    }`}
                  ></div>
                  <div className="flex-1">
                    <p className="text-gray-900 text-sm">{activity.title}</p>
                    <p className="text-gray-500 text-xs">{activity.time}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
          <div className="space-y-3">
            <ActionButton
              color="blue"
              label="Add Requirement"
              icon={<Plus className="w-4 h-4" />}
              onClick={() => onQuickAdd?.('requirement')}
            />
            <ActionButton
              color="purple"
              label="Schedule Interview"
              icon={<Calendar className="w-4 h-4" />}
              onClick={() => onQuickAdd?.('interview')}
            />
            <ActionButton
              color="green"
              label="Add Consultant"
              icon={<UserPlus className="w-4 h-4" />}
              onClick={() => onQuickAdd?.('consultant')}
            />
          </div>
        </div>
      </div>

      {/* Tabbed Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="border-b border-gray-200 flex flex-wrap">
          {(['requirements', 'interviews', 'consultants'] as Array<'requirements' | 'interviews' | 'consultants'>).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-4 font-medium text-sm transition ${
                activeTab === tab
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-blue-600 hover:bg-gray-50'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}{' '}
              ({tab === 'requirements'
                ? requirements.length
                : tab === 'interviews'
                ? interviews.length
                : consultants.length})
            </button>
          ))}
        </div>

        <div className="p-6">
          {activeTab === 'requirements' && (
            <ListSection data={requirements} type="requirement" />
          )}
          {activeTab === 'interviews' && (
            <ListSection data={interviews} type="interview" />
          )}
          {activeTab === 'consultants' && (
            <ListSection data={consultants} type="consultant" />
          )}
        </div>
      </div>
    </div>
  );
};

/* --- Reusable Components --- */

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  subtitle?: string;
}

const StatCard = ({ title, value, icon, subtitle }: StatCardProps) => (
  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm text-gray-500">{title}</p>
        <p className="text-3xl font-semibold text-gray-900 mt-1">{value}</p>
      </div>
      <div className="p-3 bg-gray-50 rounded-lg">{icon}</div>
    </div>
    <p className="text-xs text-gray-500 mt-3">{subtitle}</p>
  </div>
);

interface ActionButtonProps {
  color: 'blue' | 'purple' | 'green';
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
}

const ActionButton = ({ color, label, icon, onClick }: ActionButtonProps) => {
  const colors: Record<'blue' | 'purple' | 'green', string> = {
    blue: 'bg-blue-600 hover:bg-blue-700',
    purple: 'bg-purple-600 hover:bg-purple-700',
    green: 'bg-green-600 hover:bg-green-700',
  };
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center justify-center gap-2 text-white py-2.5 rounded-lg font-medium transition ${colors[color]}`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
};

type ListSectionType = 'requirement' | 'interview' | 'consultant';
type ListSectionData = Requirement | Interview | Consultant;

interface ListSectionProps {
  data: ListSectionData[];
  type: ListSectionType;
}

const ListSection = ({ data, type }: ListSectionProps) => {
  if (!data.length)
    return (
      <p className="text-gray-500 text-center italic py-6">
        No {type}s found
      </p>
    );

  return (
    <div className="space-y-3">
      {data.slice(0, 5).map((item) => (
        <div
          key={item.id}
          className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition"
        >
          <div className="flex-1">
            <p className="font-medium text-gray-900">
              {type === 'requirement'
                ? (item as Requirement).title
                : type === 'interview'
                ? 'Interview scheduled'
                : (item as Consultant).name}
            </p>
            <p className="text-sm text-gray-600">
              {type === 'requirement'
                ? (item as Requirement).company
                : type === 'interview'
                ? new Date((item as Interview).scheduled_date).toLocaleDateString()
                : (item as Consultant).email || 'No email'}
            </p>
          </div>
          <span
            className={`px-3 py-1 rounded-full text-xs font-medium ${
              type === 'requirement'
                ? 'bg-blue-100 text-blue-800'
                : type === 'interview'
                ? 'bg-purple-100 text-purple-800'
                : 'bg-green-100 text-green-800'
            }`}
          >
            {item.status}
          </span>
        </div>
      ))}
    </div>
  );
};
