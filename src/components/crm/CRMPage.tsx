import { useState, useEffect } from 'react';
import { ErrorBoundary } from '../common/ErrorBoundary';
import { LayoutGrid, Briefcase, Calendar, Users, Mail as MailIcon } from 'lucide-react';
import { MarketingHubDashboard } from './MarketingHubDashboard';
import { RequirementsManagement } from './RequirementsManagement';
import { InterviewTracking } from './InterviewTracking';
import { ConsultantProfiles } from './ConsultantProfiles';
import { CreateRequirementForm } from './CreateRequirementForm';
import { CreateInterviewForm } from './CreateInterviewForm';
import { CreateConsultantForm } from './CreateConsultantForm';
import { BulkEmailComposer } from './BulkEmailComposer';

type View = 'dashboard' | 'requirements' | 'interviews' | 'consultants';

type QuickAddType = 'requirement' | 'interview' | 'consultant';

export const CRMPage = () => {
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showCreateInterview, setShowCreateInterview] = useState(false);
  const [selectedRequirementIdForInterview, setSelectedRequirementIdForInterview] = useState<string | undefined>();
  const [showCreateConsultant, setShowCreateConsultant] = useState(false);
  const [showBulkEmailComposer, setShowBulkEmailComposer] = useState(false);

  const navTabs = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutGrid },
    { id: 'requirements', label: 'Requirements', icon: Briefcase },
    { id: 'interviews', label: 'Interviews', icon: Calendar },
    { id: 'consultants', label: 'Consultants', icon: Users },
  ];

  // Accessibility: close modals on navigation change
  useEffect(() => {
    setShowCreateForm(false);
    setShowCreateInterview(false);
    setShowCreateConsultant(false);
    setShowBulkEmailComposer(false);
    setSelectedRequirementIdForInterview(undefined);
  }, [currentView]);

  // Error boundary wrapper
  return (
    <div className="h-full flex flex-col">
      {/* Sticky Tab Navigation */}
      <nav className="sticky top-0 z-30 bg-white border-b border-gray-200 overflow-x-auto shadow-sm flex-shrink-0" aria-label="CRM Navigation">
        <div className="flex min-w-full sm:min-w-0 items-center justify-between">
          <div className="flex min-w-0">
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
                  aria-current={isActive ? 'page' : undefined}
                  aria-label={tab.label}
                >
                  <Icon className="w-5 h-5" />
                  <span className="hidden sm:inline">{tab.label}</span>
                </button>
              );
            })}
          </div>
          <button
            onClick={() => setShowBulkEmailComposer(true)}
            className="flex items-center gap-2 px-4 py-3 sm:px-6 text-blue-600 hover:text-blue-700 font-medium border-l border-gray-200 whitespace-nowrap text-sm sm:text-base"
            aria-label="Send bulk emails"
            title="Send bulk emails to multiple recipients"
          >
            <MailIcon className="w-5 h-5" />
            <span className="hidden sm:inline">Bulk Email</span>
          </button>
        </div>
      </nav>

      {/* Scrollable Content Area with error boundary */}
      <div className="flex-1 overflow-y-auto bg-gray-50">
        <div className="p-4 sm:p-6 md:p-8">
          <ErrorBoundary>
            {/* Keep views mounted to avoid re-fetching data when returning */}
            <div className={currentView === 'dashboard' ? 'block' : 'hidden'} aria-hidden={currentView !== 'dashboard'}>
              <MarketingHubDashboard 
                onQuickAdd={(type: QuickAddType) => {
                  if (type === 'requirement') setShowCreateForm(true);
                  else if (type === 'interview') setShowCreateInterview(true);
                  else if (type === 'consultant') setShowCreateConsultant(true);
                }}
              />
            </div>

            <div className={currentView === 'requirements' ? 'block' : 'hidden'} aria-hidden={currentView !== 'requirements'}>
              <RequirementsManagement 
                onQuickAdd={() => setShowCreateForm(true)}
                onCreateInterview={(requirementId) => {
                  setSelectedRequirementIdForInterview(requirementId);
                  setShowCreateInterview(true);
                }}
              />
            </div>

            <div className={currentView === 'interviews' ? 'block' : 'hidden'} aria-hidden={currentView !== 'interviews'}>
              <InterviewTracking 
                onQuickAdd={() => setShowCreateInterview(true)}
              />
            </div>
          </ErrorBoundary>

          <div className={currentView === 'consultants' ? 'block' : 'hidden'} aria-hidden={currentView !== 'consultants'}>
            <ConsultantProfiles 
              onQuickAdd={() => setShowCreateConsultant(true)}
            />
          </div>
        </div>
      </div>

      {/* Modals */}
      {showCreateForm && (
        <CreateRequirementForm
          onClose={() => setShowCreateForm(false)}
          onSuccess={() => {
            setShowCreateForm(false);
          }}
        />
      )}

      {showCreateInterview && (
        <CreateInterviewForm
          requirementId={selectedRequirementIdForInterview}
          onClose={() => {
            setShowCreateInterview(false);
            setSelectedRequirementIdForInterview(undefined);
          }}
          onSuccess={() => {
            setShowCreateInterview(false);
            setSelectedRequirementIdForInterview(undefined);
          }}
        />
      )}

      {showCreateConsultant && (
        <CreateConsultantForm
          onClose={() => setShowCreateConsultant(false)}
          onSuccess={() => {
            setShowCreateConsultant(false);
          }}
        />
      )}

      {showBulkEmailComposer && (
        <BulkEmailComposer
          onClose={() => setShowBulkEmailComposer(false)}
        />
      )}
    </div>
  );
};
