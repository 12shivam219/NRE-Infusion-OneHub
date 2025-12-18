import { useState, useEffect } from 'react';
import { ErrorBoundary } from '../common/ErrorBoundary';
import { LayoutGrid, Briefcase, Calendar, Users } from 'lucide-react';
import ScopedCssBaseline from '@mui/material/ScopedCssBaseline';
import AppBar from '@mui/material/AppBar';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
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

  const navTabs = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutGrid },
    { id: 'requirements', label: 'Requirements', icon: Briefcase },
    { id: 'interviews', label: 'Interviews', icon: Calendar },
    { id: 'consultants', label: 'Consultants', icon: Users },
  ];

  // Accessibility: close modals on navigation change
  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      await Promise.resolve();
      if (cancelled) return;
      setShowCreateForm(false);
      setShowCreateInterview(false);
      setShowCreateConsultant(false);
      setShowBulkEmailComposer(false);
      setSelectedRequirementIdForInterview(undefined);
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [currentView]);

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
            sx={{ borderBottom: 1, borderColor: 'divider', zIndex: 30 }}
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
                <Box sx={{ display: { xs: 'block', md: 'none' }, width: { xs: '100%', md: 'auto' } }}>
                  <FormControl fullWidth size="small">
                    <InputLabel id="crm-nav-select-label">Section</InputLabel>
                    <Select
                      labelId="crm-nav-select-label"
                      value={currentView}
                      label="Section"
                      onChange={(e) => setCurrentView(e.target.value as View)}
                      aria-label="CRM Navigation"
                    >
                      {navTabs.map((tab) => {
                        const Icon = tab.icon;
                        return (
                          <MenuItem key={tab.id} value={tab.id}>
                            <Stack direction="row" spacing={1} alignItems="center">
                              <Icon className="w-5 h-5" />
                              <span>{tab.label}</span>
                            </Stack>
                          </MenuItem>
                        );
                      })}
                    </Select>
                  </FormControl>
                </Box>

                <Tabs
                  value={currentView}
                  onChange={(_, value) => setCurrentView(value as View)}
                  variant="scrollable"
                  scrollButtons="auto"
                  aria-label="CRM Navigation"
                  sx={{ display: { xs: 'none', md: 'flex' }, flex: 1, minWidth: 0 }}
                >
                  {navTabs.map((tab) => {
                    const Icon = tab.icon;
                    return (
                      <Tab
                        key={tab.id}
                        value={tab.id}
                        label={tab.label}
                        icon={<Icon className="w-5 h-5" />}
                        iconPosition="start"
                        aria-label={tab.label}
                      />
                    );
                  })}
                </Tabs>

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
              bgcolor: 'background.default',
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
                      onQuickAdd={(type: QuickAddType) => {
                        if (type === 'requirement') setShowCreateForm(true);
                        else if (type === 'interview') setShowCreateInterview(true);
                        else if (type === 'consultant') setShowCreateConsultant(true);
                      }}
                    />
                ) : null}

                {currentView === 'requirements' ? (
                    <RequirementsManagement
                      onQuickAdd={() => setShowCreateForm(true)}
                      onCreateInterview={(requirementId) => {
                        setSelectedRequirementIdForInterview(requirementId);
                        setShowCreateInterview(true);
                      }}
                      toolbarPortalTargetId="crm-requirements-actions"
                    />
                ) : null}

                {currentView === 'interviews' ? (
                    <InterviewTracking onQuickAdd={() => setShowCreateInterview(true)} />
                ) : null}

                {currentView === 'consultants' ? (
                    <ConsultantProfiles onQuickAdd={() => setShowCreateConsultant(true)} />
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
