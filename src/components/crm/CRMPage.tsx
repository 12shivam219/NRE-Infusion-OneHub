import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ErrorBoundary } from '../common/ErrorBoundary';
import { LayoutGrid, Briefcase, Calendar, Users } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import ScopedCssBaseline from '@mui/material/ScopedCssBaseline';
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
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
  const [searchParams] = useSearchParams();
  const viewParam = searchParams.get('view') as View | null;
  const [currentView, setCurrentView] = useState<View>(viewParam || 'dashboard');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showCreateInterview, setShowCreateInterview] = useState(false);
  const [selectedRequirementIdForInterview, setSelectedRequirementIdForInterview] = useState<string | undefined>();
  const [showCreateConsultant, setShowCreateConsultant] = useState(false);
  const [showBulkEmailComposer, setShowBulkEmailComposer] = useState(false);

  // Define all callbacks at top level (before any conditional rendering)
  const handleDashboardQuickAdd = useCallback((type: QuickAddType) => {
    if (type === 'requirement') setShowCreateForm(true);
    else if (type === 'interview') setShowCreateInterview(true);
    else if (type === 'consultant') setShowCreateConsultant(true);
  }, []);

  const handleRequirementsQuickAdd = useCallback(() => setShowCreateForm(true), []);

  const handleCreateInterview = useCallback((requirementId: string) => {
    setSelectedRequirementIdForInterview(requirementId);
    setShowCreateInterview(true);
  }, []);

  const handleInterviewsQuickAdd = useCallback(() => setShowCreateInterview(true), []);

  const handleConsultantsQuickAdd = useCallback(() => setShowCreateConsultant(true), []);

  // Accessibility: close modals on navigation change
  const closeAllModals = useCallback(() => {
    setShowCreateForm(false);
    setShowCreateInterview(false);
    setShowCreateConsultant(false);
    setShowBulkEmailComposer(false);
    setSelectedRequirementIdForInterview(undefined);
  }, []);

  // Sync currentView with query parameter
  useEffect(() => {
    if (viewParam && viewParam !== currentView) {
      setCurrentView(viewParam);
    }
  }, [viewParam, currentView]);

  // Handle overflow for requirements view
  useEffect(() => {
    const main = document.getElementById('main-content');
    if (!main) return;

    const prevOverflowY = main.style.overflowY;
    const prevOverflow = main.style.overflow;

    if (currentView === 'requirements') {
      main.style.overflowY = 'hidden';
      main.style.overflow = 'hidden';
    }

    return () => {
      main.style.overflowY = prevOverflowY;
      main.style.overflow = prevOverflow;
    };
  }, [currentView]);

  const navTabs: Array<{ id: View; label: string; icon: LucideIcon }> = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutGrid },
    { id: 'requirements', label: 'Requirements', icon: Briefcase },
    { id: 'interviews', label: 'Interviews', icon: Calendar },
    { id: 'consultants', label: 'Consultants', icon: Users },
  ];

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      await Promise.resolve();
      if (cancelled) return;
      closeAllModals();
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [currentView, closeAllModals]);

  // Listen for global event to open bulk email composer (header trigger)
  useEffect(() => {
    const handler = () => setShowBulkEmailComposer(true);
    window.addEventListener('open-bulk-email', handler as EventListener);
    return () => window.removeEventListener('open-bulk-email', handler as EventListener);
  }, []);

  // Error boundary wrapper
  return (
    <ScopedCssBaseline>
      <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
          <AppBar
            position="sticky"
            elevation={0}
            color="inherit"
            sx={{ borderBottom: 1, borderColor: 'rgba(234,179,8,0.2)', zIndex: 30, bgcolor: 'var(--darkbg-surface)' }}
          >
            <Box sx={{ px: 2, py: 1.5 }}>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 2,
                  flexWrap: { xs: 'wrap', md: 'nowrap' },
                }}
              >
                <Typography variant="h6" sx={{ fontWeight: 700, minWidth: 0, color: 'var(--text)', fontFamily: 'var(--font-heading)' }}>
                  {navTabs.find(tab => tab.id === currentView)?.label || 'Marketing & CRM'}
                </Typography>

                <Box
                  id="crm-requirements-actions"
                  sx={{
                    display: currentView === 'requirements' ? 'flex' : 'none',
                    alignItems: 'center',
                    gap: 1,
                    width: { xs: '100%', md: 'auto' },
                    justifyContent: { xs: 'flex-start', md: 'flex-end' },
                  }}
                />
              </Box>
            </Box>
          </AppBar>

          <Box
            sx={{
              flex: 1,
              overflowY: currentView === 'requirements' ? 'hidden' : 'auto',
              bgcolor: 'var(--darkbg)',
            }}
          >
            <Box
              sx={{
                px: { xs: 2, sm: 3, md: 4 },
                pt: currentView === 'requirements' ? { xs: 1, sm: 1.5, md: 2 } : { xs: 2, sm: 3, md: 4 },
                pb: { xs: 2, sm: 3, md: 4 },
              }}
            >
              <ErrorBoundary>
                {currentView === 'dashboard' ? (
                    <MarketingHubDashboard
                      onQuickAdd={handleDashboardQuickAdd}
                    />
                ) : null}

                {currentView === 'requirements' ? (
                    <RequirementsManagement
                      onQuickAdd={handleRequirementsQuickAdd}
                      onCreateInterview={handleCreateInterview}
                      toolbarPortalTargetId="crm-requirements-actions"
                    />
                ) : null}

                {currentView === 'interviews' ? (
                    <InterviewTracking onQuickAdd={handleInterviewsQuickAdd} />
                ) : null}

                {currentView === 'consultants' ? (
                    <ConsultantProfiles onQuickAdd={handleConsultantsQuickAdd} />
                ) : null}
              </ErrorBoundary>
            </Box>
          </Box>

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
      </Box>
    </ScopedCssBaseline>
  );
};
