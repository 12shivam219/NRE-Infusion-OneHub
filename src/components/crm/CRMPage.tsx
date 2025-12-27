import { useState, useEffect, useLayoutEffect, useCallback, lazy, Suspense } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ErrorBoundary } from '../common/ErrorBoundary';
import { Briefcase, Calendar, Users } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import ScopedCssBaseline from '@mui/material/ScopedCssBaseline';
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { LogoLoader } from '../common/LogoLoader';

// Lazy load CRM sub-components to reduce initial load time
const RequirementsManagement = lazy(() => import('./RequirementsManagement').then(m => ({ default: m.RequirementsManagement })));
const InterviewTracking = lazy(() => import('./InterviewTracking').then(m => ({ default: m.InterviewTracking })));
const ConsultantProfiles = lazy(() => import('./ConsultantProfiles').then(m => ({ default: m.ConsultantProfiles })));
const CreateRequirementForm = lazy(() => import('./CreateRequirementForm').then(m => ({ default: m.CreateRequirementForm })));
const CreateInterviewForm = lazy(() => import('./CreateInterviewForm').then(m => ({ default: m.CreateInterviewForm })));
const CreateConsultantForm = lazy(() => import('./CreateConsultantForm').then(m => ({ default: m.CreateConsultantForm })));

type View = 'dashboard' | 'requirements' | 'interviews' | 'consultants';

export const CRMPage = () => {
  const [searchParams] = useSearchParams();
  const viewParam = searchParams.get('view') as View | null;
  const [currentView, setCurrentView] = useState<View>(viewParam || 'requirements');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showCreateInterview, setShowCreateInterview] = useState(false);
  const [selectedRequirementIdForInterview, setSelectedRequirementIdForInterview] = useState<string | undefined>();
  const [showCreateConsultant, setShowCreateConsultant] = useState(false);

  // Define all callbacks at top level (before any conditional rendering)
  const handleRequirementsQuickAdd = useCallback(() => setShowCreateForm(true), []);

  const handleCreateInterview = useCallback((requirementId: string) => {
    setSelectedRequirementIdForInterview(requirementId);
    setShowCreateInterview(true);
  }, []);

  const handleInterviewsQuickAdd = useCallback(() => setShowCreateInterview(true), []);

  const handleConsultantsQuickAdd = useCallback(() => setShowCreateConsultant(true), []);

  // Sync currentView with query parameter
  useLayoutEffect(() => {
    if (viewParam && viewParam !== currentView) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCurrentView(viewParam as typeof currentView);
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
    { id: 'requirements', label: 'Requirements', icon: Briefcase },
    { id: 'interviews', label: 'Interviews', icon: Calendar },
    { id: 'consultants', label: 'Consultants', icon: Users },
  ];

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      await Promise.resolve();
      if (cancelled) return;
      // Close form modals on view change, but NOT bulk email composer (it's global)
      setShowCreateForm(false);
      setShowCreateInterview(false);
      setShowCreateConsultant(false);
      setSelectedRequirementIdForInterview(undefined);
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [currentView]);

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
                {currentView === 'requirements' ? (
                  <Suspense fallback={<LogoLoader fullScreen size="lg" showText label="Loading..." />}>
                    <RequirementsManagement
                      onQuickAdd={handleRequirementsQuickAdd}
                      onCreateInterview={handleCreateInterview}
                      toolbarPortalTargetId="crm-requirements-actions"
                    />
                  </Suspense>
                ) : null}

                {currentView === 'interviews' ? (
                  <Suspense fallback={<LogoLoader fullScreen size="lg" showText label="Loading..." />}>
                    <InterviewTracking onQuickAdd={handleInterviewsQuickAdd} />
                  </Suspense>
                ) : null}

                {currentView === 'consultants' ? (
                  <Suspense fallback={<LogoLoader fullScreen size="lg" showText label="Loading..." />}>
                    <ConsultantProfiles onQuickAdd={handleConsultantsQuickAdd} />
                  </Suspense>
                ) : null}
              </ErrorBoundary>
            </Box>
          </Box>

          {showCreateForm && (
            <Suspense fallback={null}>
              <CreateRequirementForm
                onClose={() => setShowCreateForm(false)}
                onSuccess={() => {
                  setShowCreateForm(false);
                }}
              />
            </Suspense>
          )}

          {showCreateInterview && (
            <Suspense fallback={null}>
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
            </Suspense>
          )}

          {showCreateConsultant && (
            <Suspense fallback={null}>
              <CreateConsultantForm
                onClose={() => setShowCreateConsultant(false)}
                onSuccess={() => {
                  setShowCreateConsultant(false);
                }}
              />
            </Suspense>
          )}
      </Box>
    </ScopedCssBaseline>
  );
};
