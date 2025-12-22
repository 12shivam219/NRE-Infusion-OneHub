import { useState, useEffect, useCallback, useMemo, memo } from 'react';
import { TrendingUp, Download, Plus, BarChart3, Calendar, UserPlus, ChevronDown } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { getRequirementsPage } from '../../lib/api/requirements';
import { getInterviewsPage } from '../../lib/api/interviews';
import { getConsultantsPage } from '../../lib/api/consultants';
import { clearCachedRequirements } from '../../lib/offlineDB';
import type { Database } from '../../lib/database.types';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import Divider from '@mui/material/Divider';
import Skeleton from '@mui/material/Skeleton';
import ListItemButton from '@mui/material/ListItemButton';
import Collapse from '@mui/material/Collapse';
import { alpha, type Theme } from '@mui/material/styles';

type Requirement = Database['public']['Tables']['requirements']['Row'];
type Interview = Database['public']['Tables']['interviews']['Row'];
type Consultant = Database['public']['Tables']['consultants']['Row'];

interface MarketingHubDashboardProps {
  onQuickAdd?: (type: 'requirement' | 'interview' | 'consultant') => void;
}

export const MarketingHubDashboard = memo(({ onQuickAdd }: MarketingHubDashboardProps) => {
  const { user } = useAuth();
  const [showOrgWide, setShowOrgWide] = useState(false);
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [consultants, setConsultants] = useState<Consultant[]>([]);
  const [totalConsultants, setTotalConsultants] = useState<number | null>(null);
  
  // Track which accordion sections are expanded
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['overview']));

  const [counts, setCounts] = useState({
    activeRequirements: 0,
    newRequirements: 0,
    inProgressRequirements: 0,
    interviewRequirements: 0,
    offerRequirements: 0,
    upcomingInterviews: 0,
    completedInterviews: 0,
    activeConsultants: 0,
    placedConsultants: 0,
    placementRate: 0,
  });

  const [loading, setLoading] = useState(true);

  const toggleSection = (sectionId: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(sectionId)) {
      newExpanded.delete(sectionId);
    } else {
      newExpanded.add(sectionId);
    }
    setExpandedSections(newExpanded);
  };

  const loadData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    // Clear cached requirements to ensure fresh data from server
    await clearCachedRequirements(user.id);

    const reqUserId = showOrgWide ? undefined : user.id;
    const nowIso = new Date().toISOString();

    const [
      totalReqRes,
      newReqRes,
      inProgressReqRes,
      interviewReqRes,
      offerReqRes,
      closedReqRes,
      rejectedReqRes,
      recentReqRes,
      upcomingInterviewsRes,
      completedInterviewsRes,
      interviewsPreviewRes,
      totalConsultantsRes,
      activeConsultantsRes,
      placedConsultantsRes,
      consultantsPreviewRes,
    ] = await Promise.all([
      getRequirementsPage({ userId: reqUserId, includeCount: true, limit: 1, offset: 0 }),
      getRequirementsPage({ userId: reqUserId, includeCount: true, limit: 1, offset: 0, status: 'NEW' }),
      getRequirementsPage({ userId: reqUserId, includeCount: true, limit: 1, offset: 0, status: 'IN_PROGRESS' }),
      getRequirementsPage({ userId: reqUserId, includeCount: true, limit: 1, offset: 0, status: 'INTERVIEW' }),
      getRequirementsPage({ userId: reqUserId, includeCount: true, limit: 1, offset: 0, status: 'OFFER' }),
      getRequirementsPage({ userId: reqUserId, includeCount: true, limit: 1, offset: 0, status: 'CLOSED' }),
      getRequirementsPage({ userId: reqUserId, includeCount: true, limit: 1, offset: 0, status: 'REJECTED' }),
      getRequirementsPage({ userId: reqUserId, includeCount: false, limit: 10, offset: 0, orderBy: 'created_at', orderDir: 'desc' }),
      getInterviewsPage({ userId: user.id, includeCount: true, limit: 1, offset: 0, scheduledFrom: nowIso, excludeStatus: 'Cancelled', orderBy: 'scheduled_date', orderDir: 'asc' }),
      getInterviewsPage({ userId: user.id, includeCount: true, limit: 1, offset: 0, status: 'Completed', orderBy: 'scheduled_date', orderDir: 'desc' }),
      getInterviewsPage({ userId: user.id, includeCount: false, limit: 10, offset: 0, orderBy: 'scheduled_date', orderDir: 'asc' }),
      getConsultantsPage({ userId: user.id, limit: 1, offset: 0 }),
      getConsultantsPage({ userId: user.id, limit: 1, offset: 0, status: 'Active' }),
      getConsultantsPage({ userId: user.id, limit: 1, offset: 0, status: 'Recently Placed' }),
      getConsultantsPage({ userId: user.id, limit: 10, offset: 0 }),
    ]);

    const totalReq = totalReqRes.success ? (totalReqRes.total ?? 0) : 0;
    const newReq = newReqRes.success ? (newReqRes.total ?? 0) : 0;
    const inProgressReq = inProgressReqRes.success ? (inProgressReqRes.total ?? 0) : 0;
    const interviewReq = interviewReqRes.success ? (interviewReqRes.total ?? 0) : 0;
    const offerReq = offerReqRes.success ? (offerReqRes.total ?? 0) : 0;
    const closedReq = closedReqRes.success ? (closedReqRes.total ?? 0) : 0;
    const rejectedReq = rejectedReqRes.success ? (rejectedReqRes.total ?? 0) : 0;
    const activeReq = Math.max(0, totalReq - closedReq - rejectedReq);

    const upcomingCount = upcomingInterviewsRes.success ? (upcomingInterviewsRes.total ?? 0) : 0;
    const completedCount = completedInterviewsRes.success ? (completedInterviewsRes.total ?? 0) : 0;

    const totalCon = totalConsultantsRes.success ? (totalConsultantsRes.total ?? 0) : 0;
    const activeCon = activeConsultantsRes.success ? (activeConsultantsRes.total ?? 0) : 0;
    const placedCon = placedConsultantsRes.success ? (placedConsultantsRes.total ?? 0) : 0;
    const placementRate = totalCon > 0 ? Math.round((placedCon / totalCon) * 100) : 0;
    setTotalConsultants(totalCon);
    setCounts({
      activeRequirements: activeReq,
      newRequirements: newReq,
      inProgressRequirements: inProgressReq,
      interviewRequirements: interviewReq,
      offerRequirements: offerReq,
      upcomingInterviews: upcomingCount,
      completedInterviews: completedCount,
      activeConsultants: activeCon,
      placedConsultants: placedCon,
      placementRate,
    });

    if (recentReqRes.success && recentReqRes.requirements) setRequirements(recentReqRes.requirements);
    if (interviewsPreviewRes.success && interviewsPreviewRes.interviews) setInterviews(interviewsPreviewRes.interviews);
    if (consultantsPreviewRes.success && consultantsPreviewRes.consultants) setConsultants(consultantsPreviewRes.consultants);

    setLoading(false);
  }, [user, showOrgWide]);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      await Promise.resolve();
      if (cancelled) return;
      await loadData();
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [loadData]);

  // Memoize recent activity calculation - sort all data first, then take most recent 2 of each
  const recentActivity = useMemo(() => {
    try {
      const activities = [
        ...(requirements || []).slice(0, 2).map(r => ({
          type: 'requirement' as const,
          title: `New requirement: ${r.title || 'Untitled'} at ${r.company || 'Unknown'}`,
          time: new Date(r.created_at),
        })),
        ...(interviews || []).slice(0, 2).map(i => ({
          type: 'interview' as const,
          title: `Interview scheduled for requirement`,
          time: new Date(i.scheduled_date),
        })),
        ...(consultants || []).slice(0, 2).map(c => ({
          type: 'consultant' as const,
          title: `${c.name || 'Unknown'} status: ${c.status || 'Unknown'}`,
          time: new Date(c.updated_at),
        })),
      ].filter(a => !isNaN(a.time.getTime())); // Filter out invalid dates
      
      return activities
        .sort((a, b) => b.time.getTime() - a.time.getTime())
        .slice(0, 5)
        .map(a => ({
          type: a.type,
          title: a.title,
          time: a.time.toLocaleDateString(),
        }));
    } catch {
      return [];
    }
  }, [requirements, interviews, consultants]);

  if (loading) {
    return (
      <Box sx={{ minHeight: '100vh', p: { xs: 2, sm: 3, md: 4 } }}>
        <Stack spacing={2}>
          {/* Header skeleton */}
          <Paper sx={{ p: { xs: 3, sm: 4 }, borderRadius: 3 }}>
            <Skeleton variant="text" width={260} height={36} />
            <Skeleton variant="text" width={420} />
          </Paper>

          {/* Overview accordion skeleton */}
          <Card sx={{ borderRadius: 2 }}>
            <CardContent sx={{ pb: 3 }}>
              <Skeleton variant="text" width={200} height={32} />
            </CardContent>
            <CardContent>
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' },
                  gap: 2,
                }}
              >
                {[...Array(4)].map((_, i) => (
                  <Box key={i}>
                    <Skeleton variant="text" width={140} />
                    <Skeleton variant="text" width={80} height={40} />
                    <Skeleton variant="text" width={200} />
                  </Box>
                ))}
              </Box>
            </CardContent>
          </Card>

          {/* Activity and Actions accordion skeleton */}
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', lg: '2fr 1fr' },
              gap: 2,
            }}
          >
            <Card sx={{ borderRadius: 2 }}>
              <CardContent sx={{ pb: 3 }}>
                <Skeleton variant="text" width={180} height={32} />
              </CardContent>
              <CardContent>
                <Stack spacing={2}>
                  {[...Array(3)].map((_, i) => (
                    <Skeleton key={i} variant="rounded" height={56} />
                  ))}
                </Stack>
              </CardContent>
            </Card>
            <Card sx={{ borderRadius: 2 }}>
              <CardContent sx={{ pb: 3 }}>
                <Skeleton variant="text" width={150} height={32} />
              </CardContent>
              <CardContent>
                <Stack spacing={1.5}>
                  {[...Array(3)].map((_, i) => (
                    <Skeleton key={i} variant="rounded" height={44} />
                  ))}
                </Stack>
              </CardContent>
            </Card>
          </Box>
        </Stack>
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', p: { xs: 2, sm: 3, md: 4 } }}>
      <Stack spacing={2}>
        {/* Header Section */}
        <Paper
          sx={{
            p: { xs: 3, sm: 4 },
            borderRadius: 3,
            color: 'common.white',
            background: 'linear-gradient(90deg, var(--color-primary-dark) 0%, var(--color-primary) 100%)',
          }}
        >
          <Stack spacing={2} direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', md: 'center' }}>
            <Box>
              <Typography variant="overline" sx={{ opacity: 0.9 }}>
                Marketing Hub Dashboard
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
                Your Command Center
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.9, mt: 0.5 }}>
                Manage requirements, interviews & consultants in one place
              </Typography>
            </Box>

            <Stack direction="row" spacing={1.5} flexWrap="wrap">
              <Button
                variant="contained"
                color="secondary"
                startIcon={<Plus className="w-4 h-4" />}
                onClick={() => onQuickAdd?.('requirement')}
              >
                Quick Add
              </Button>
              <Button
                variant={showOrgWide ? 'contained' : 'outlined'}
                color="secondary"
                onClick={() => {
                  setShowOrgWide(prev => !prev);
                  setLoading(true);
                }}
              >
                {showOrgWide ? 'Org: All' : 'Org: Mine'}
              </Button>
              <Button variant="outlined" color="secondary" startIcon={<Download className="w-4 h-4" />} disabled>
                Export
              </Button>
              <Button variant="outlined" color="secondary" startIcon={<BarChart3 className="w-4 h-4" />} disabled>
                Analytics
              </Button>
            </Stack>
          </Stack>
        </Paper>

        {/* Accordion Sections */}
        {/* Overview Section */}
        <Card sx={{ borderRadius: 2 }}>
          <ListItemButton
            onClick={() => toggleSection('overview')}
            aria-expanded={expandedSections.has('overview')}
            aria-controls="accordion-overview"
            sx={{
              backgroundColor: (theme: Theme) => alpha(theme.palette.primary.main, 0.08),
              '&:hover': {
                backgroundColor: (theme: Theme) => alpha(theme.palette.primary.main, 0.12),
              },
            }}
          >
            <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Typography variant="body1" sx={{ fontWeight: 700 }}>
                📊 Overview & Metrics
              </Typography>
              <ChevronDown
                className={`w-5 h-5 transition-transform duration-300 ${expandedSections.has('overview') ? 'rotate-180' : ''}`}
                aria-hidden="true"
              />
            </Box>
          </ListItemButton>

          <Collapse in={expandedSections.has('overview')} timeout="auto" id="accordion-overview">
            <CardContent>
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(2, 1fr)' },
                  gap: 2,
                }}
              >
                <StatCard
                  title="Active Requirements"
                  value={counts.activeRequirements}
                  subtitle={`New: ${counts.newRequirements} | In Progress: ${counts.inProgressRequirements}`}
                  icon={<TrendingUp className="w-6 h-6" />}
                />
                <StatCard
                  title="Placement Rate"
                  value={`${counts.placementRate}%`}
                  subtitle={`${counts.placedConsultants} of ${totalConsultants ?? 0} placed`}
                  icon={<TrendingUp className="w-6 h-6" />}
                />
              </Box>
            </CardContent>
          </Collapse>
        </Card>

        {/* Activity & Quick Actions Section */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', lg: '2fr 1fr' },
            gap: 2,
          }}
        >
          <Card sx={{ borderRadius: 2 }}>
            <CardContent>
              <Typography variant="body1" sx={{ fontWeight: 700, mb: 2 }}>
                📋 Recent Activity
              </Typography>
              {recentActivity.length === 0 ? (
                <Typography variant="body2" color="text.secondary" sx={{ py: 3, textAlign: 'center' }}>
                  No recent activity
                </Typography>
              ) : (
                <List disablePadding>
                  {recentActivity.map((activity, idx) => (
                    <Box key={idx}>
                      <ListItem disableGutters>
                        <ListItemText
                          primary={activity.title}
                          secondary={activity.time}
                          primaryTypographyProps={{ variant: 'body2', sx: { fontWeight: 600 } }}
                          secondaryTypographyProps={{ variant: 'caption' }}
                        />
                        <Chip
                          size="small"
                          label={activity.type}
                          color={activity.type === 'requirement' ? 'primary' : activity.type === 'interview' ? 'secondary' : 'default'}
                          variant="outlined"
                        />
                      </ListItem>
                      {idx < recentActivity.length - 1 ? <Divider /> : null}
                    </Box>
                  ))}
                </List>
              )}
            </CardContent>
          </Card>

          <Card sx={{ borderRadius: 2 }}>
            <CardContent>
              <Typography variant="body1" sx={{ fontWeight: 700, mb: 2 }}>
                ⚡ Quick Actions
              </Typography>
              <Stack spacing={1.5}>
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<Plus className="w-4 h-4" />}
                  onClick={() => onQuickAdd?.('requirement')}
                >
                  Add Requirement
                </Button>
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<Calendar className="w-4 h-4" />}
                  onClick={() => onQuickAdd?.('interview')}
                >
                  Schedule Interview
                </Button>
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<UserPlus className="w-4 h-4" />}
                  onClick={() => onQuickAdd?.('consultant')}
                >
                  Add Consultant
                </Button>
              </Stack>
            </CardContent>
          </Card>
        </Box>
      </Stack>
    </Box>
  );
});

/* --- Reusable Components --- */

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  subtitle?: string;
}

const StatCard = ({ title, value, icon, subtitle }: StatCardProps) => (
  <Card>
    <CardContent>
      <Stack direction="row" alignItems="flex-start" justifyContent="space-between" spacing={2}>
        <Box>
          <Typography variant="body2" color="text.secondary">
            {title}
          </Typography>
          <Typography variant="h4" sx={{ fontWeight: 800, mt: 0.5 }}>
            {value}
          </Typography>
        </Box>
        <Box sx={{ p: 1.25, borderRadius: 2, bgcolor: 'action.hover', color: 'text.primary' }}>
          {icon}
        </Box>
      </Stack>
      {subtitle ? (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1.5 }}>
          {subtitle}
        </Typography>
      ) : null}
    </CardContent>
  </Card>
);
