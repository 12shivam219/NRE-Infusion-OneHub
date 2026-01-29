import { useState, useEffect, useLayoutEffect, useCallback, lazy, Suspense } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ErrorBoundary } from '../common/ErrorBoundary';
import Box from '@mui/material/Box';
import ScopedCssBaseline from '@mui/material/ScopedCssBaseline';
import type { ExtractedJobDetails as JdExtractionResult } from '../../lib/agents/types';

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
  const [parsedFormData, setParsedFormData] = useState<{
    title?: string;
    company?: string;
    primary_tech_stack?: string;
    rate?: string;
    remote?: string;
    location?: string;
    duration?: string;
    vendor_company?: string;
    vendor_person_name?: string;
    vendor_phone?: string;
    vendor_email?: string;
    description?: string;
  } | undefined>();

  // Define all callbacks at top level (before any conditional rendering)
  const handleCreateInterview = useCallback((requirementId: string) => {
    setSelectedRequirementIdForInterview(requirementId);
    setShowCreateInterview(true);
  }, []);

  const handleParsedJDData = useCallback((extraction: JdExtractionResult, cleanedText: string) => {
    setParsedFormData({
      title: extraction.jobTitle ?? undefined,
      company: extraction.hiringCompany ?? undefined,
      primary_tech_stack: (extraction.keySkills ?? []).length > 0 ? (extraction.keySkills ?? []).join(', ') : undefined,
      rate: extraction.rate ?? undefined,
      remote: extraction.workLocationType ?? undefined,
      location: extraction.location ?? undefined,
      duration: extraction.duration ?? undefined,
      vendor_company: extraction.vendor ?? undefined,
      vendor_person_name: extraction.vendorContact ?? undefined,
      vendor_phone: extraction.vendorPhone ?? undefined,
      vendor_email: extraction.vendorEmail ?? undefined,
      description: cleanedText || undefined,
    });
    setShowCreateForm(true);
  }, []);

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
                  <Suspense fallback={null}>
                    <RequirementsManagement
                      onCreateInterview={handleCreateInterview}
                      onParsedJDData={handleParsedJDData}
                      toolbarPortalTargetId="crm-requirements-actions"
                    />
                  </Suspense>
                ) : null}

                {currentView === 'interviews' ? (
                  <Suspense fallback={null}>
                    <InterviewTracking />
                  </Suspense>
                ) : null}

                {currentView === 'consultants' ? (
                  <Suspense fallback={null}>
                    <ConsultantProfiles />
                  </Suspense>
                ) : null}
              </ErrorBoundary>
            </Box>
          </Box>

          {showCreateForm && (
            <Suspense fallback={null}>
              <CreateRequirementForm
                onClose={() => {
                  setShowCreateForm(false);
                  setParsedFormData(undefined);
                }}
                onSuccess={() => {
                  setShowCreateForm(false);
                  setParsedFormData(undefined);
                }}
                initialData={parsedFormData}
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
