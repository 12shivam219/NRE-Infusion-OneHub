import { useState } from 'react';
import { LayoutGrid, Briefcase, Calendar, Users } from 'lucide-react';
import { MarketingHubDashboard } from './MarketingHubDashboard';
import { RequirementsManagement } from './RequirementsManagement';
import { InterviewTracking } from './InterviewTracking';
import { ConsultantProfiles } from './ConsultantProfiles';
import { CreateRequirementForm } from './CreateRequirementForm';
import { CreateInterviewForm } from './CreateInterviewForm';
import { CreateConsultantForm } from './CreateConsultantForm';
import { useAuth } from '../../contexts/AuthContext';

type View = 'dashboard' | 'requirements' | 'interviews' | 'consultants';

export const CRMPage = () => {
  const { user } = useAuth();
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showCreateInterview, setShowCreateInterview] = useState(false);
  const [showCreateConsultant, setShowCreateConsultant] = useState(false);
  const navTabs = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutGrid },
    { id: 'requirements', label: 'Requirements', icon: Briefcase },
    { id: 'interviews', label: 'Interviews', icon: Calendar },
    { id: 'consultants', label: 'Consultants', icon: Users },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Tab Navigation */}
      <div className="bg-white border-b border-gray-200 overflow-x-auto">
        <div className="flex min-w-full sm:min-w-0">
          {navTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = currentView === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setCurrentView(tab.id as View)}
                className={`flex items-center gap-2 px-3 sm:px-6 py-4 font-medium border-b-2 transition whitespace-nowrap text-sm sm:text-base ${
                  isActive
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Content */}
      <div className="p-4 sm:p-6 md:p-8">
        {currentView === 'dashboard' && (
          <MarketingHubDashboard 
            onQuickAdd={(type) => setQuickAddType(type)}
          />
        )}

        {currentView === 'requirements' && (
          <RequirementsManagement 
            onQuickAdd={() => setShowCreateForm(true)}
          />
        )}
        {currentView === 'interviews' && (
          <InterviewTracking 
            onQuickAdd={() => setShowCreateInterview(true)}
          />
        )}

        {currentView === 'consultants' && (
          <ConsultantProfiles 
            onQuickAdd={() => setShowCreateConsultant(true)}
          />
        )}
      </div>

      {/* Modals */}
      {showCreateForm && (
        <CreateRequirementForm
          onClose={() => setShowCreateForm(false)}
          onSuccess={() => {
            setShowCreateForm(false);
            window.location.reload();
          }}
        />
      )}

      {showCreateInterview && (
        <CreateInterviewForm
          onClose={() => setShowCreateInterview(false)}
          onSuccess={() => {
            setShowCreateInterview(false);
            window.location.reload();
          }}
        />
      )}

      {showCreateConsultant && (
        <CreateConsultantForm
          onClose={() => setShowCreateConsultant(false)}
          onSuccess={() => {
            setShowCreateConsultant(false);
            window.location.reload();
          }}
        />
      )}
    </div>
  );
};
