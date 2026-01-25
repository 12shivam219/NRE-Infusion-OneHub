import { memo, useCallback } from 'react';
import { Trash2, Clock, ExternalLink, AlertCircle } from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';
import { isValidStatusTransition, isValidUrl, isMeetingLink } from '../../lib/interviewValidation';
import type { Database } from '../../lib/database.types';
import { BrandButton } from '../brand';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardActions from '@mui/material/CardActions';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import Avatar from '@mui/material/Avatar';
import Divider from '@mui/material/Divider';

type Interview = Database['public']['Tables']['interviews']['Row'];

interface InterviewCardProps {
  interview: Interview;
  requirementTitle: string;
  onStatusChange: (id: string, status: string) => void;
  onDelete: (id: string) => void;
  onViewDetails: (interview: Interview) => void;
}

const InterviewCard = memo(({
  interview,
  requirementTitle,
  onStatusChange,
  onDelete,
  onViewDetails,
}: InterviewCardProps) => {
  const { showToast } = useToast();

  const interviewDate = new Date(interview.scheduled_date);
  const monthStr = interviewDate.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
  const dayStr = String(interviewDate.getDate()).padStart(2, '0');
  const timeStr = interview.scheduled_time || '--:--';
  const jobTitle = requirementTitle.split(' - ')[0];
  const company = requirementTitle.split(' - ')[1] || 'Company';
  const candidateInitial = interview.interview_with?.charAt(0)?.toUpperCase() || 'A';

  // Calculate urgency indicator
  const now = new Date();
  const interviewDateTime = new Date(`${interview.scheduled_date}T${interview.scheduled_time || '00:00'}`);
  const daysUntilInterview = Math.floor((interviewDateTime.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  const isToday = interviewDate.toDateString() === now.toDateString();
  const isSoon = daysUntilInterview >= 0 && daysUntilInterview <= 3;
  const isOverdue = daysUntilInterview < 0 && interview.status !== 'Completed' && interview.status !== 'Cancelled';

  // Validate meeting link
  const isMeetingUrl = interview.location ? isValidUrl(interview.location) && isMeetingLink(interview.location) : false;

  const handleStatusChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const newStatus = String(e.target.value);
    
    // Check if transition is valid
    if (!isValidStatusTransition(interview.status, newStatus)) {
      showToast({
        type: 'error',
        title: 'Invalid Status Transition',
        message: `Cannot change from ${interview.status} to ${newStatus}`,
      });
      return;
    }
    
    onStatusChange(interview.id, newStatus);
  }, [interview.id, interview.status, onStatusChange, showToast]);

  // Get valid status transitions
  const getValidStatuses = useCallback(() => {
    const allStatuses = ['Scheduled', 'Confirmed', 'Completed', 'Cancelled', 'Re-Scheduled', 'Pending', 'No Show'];
    return allStatuses.filter(status => isValidStatusTransition(interview.status, status) || status === interview.status);
  }, [interview.status]);

  const handleDelete = useCallback(() => {
    onDelete(interview.id);
  }, [interview.id, onDelete]);

  const handleJoinCall = useCallback(() => {
    if (isMeetingUrl && interview.location) {
      window.open(interview.location, '_blank', 'noopener,noreferrer');
      showToast({
        type: 'success',
        title: 'Joining Call',
        message: `Opening meeting link`,
      });
    }
  }, [isMeetingUrl, interview.location, showToast]);

  return (
    <Card
      variant="outlined"
      sx={{
        overflow: 'hidden',
        bgcolor: isOverdue ? 'rgba(239,68,68,0.06)' : isToday ? 'rgba(249,115,22,0.06)' : isSoon ? 'rgba(234,179,8,0.06)' : 'var(--darkbg-surface)',
        borderColor: isOverdue ? 'rgba(239,68,68,0.45)' : isToday ? 'rgba(249,115,22,0.45)' : isSoon ? 'rgba(234,179,8,0.45)' : 'rgba(234,179,8,0.2)',
        transition: 'box-shadow 200ms ease, transform 200ms ease',
        '&:hover': { boxShadow: '0 2px 8px rgba(0,0,0,0.1)', transform: 'translateY(-2px)' },
        minHeight: 320,
      }}
    >
      <Box
        sx={{
          px: 2,
          py: 1.5,
          background: '#FFFFFF',
          borderBottom: '1px solid #E5E7EB',
          color: '#0F172A',
        }}
      >
        <Stack direction="row" spacing={2} alignItems="flex-start" justifyContent="space-between">
          <Stack direction="row" spacing={2} alignItems="center" sx={{ minWidth: 0 }}>
            <Box
              sx={{
                px: 1.25,
                py: 0.75,
                borderRadius: 2,
                bgcolor: 'var(--dark-bg)',
                color: 'var(--gold)',
                textAlign: 'center',
                minWidth: 56,
              }}
            >
              <Typography variant="caption" sx={{ fontWeight: 900, letterSpacing: 0.5, display: 'block', fontFamily: 'var(--font-heading)' }}>
                {monthStr}
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 900, lineHeight: 1, fontFamily: 'var(--font-heading)' }}>
                {dayStr}
              </Typography>
            </Box>

            <Box sx={{ minWidth: 0 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, fontFamily: 'var(--font-heading)' }} noWrap title={jobTitle}>
                {jobTitle}
              </Typography>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ opacity: 0.95 }}>
                <Clock className="w-4 h-4" />
                <Typography variant="caption" sx={{ fontFamily: 'var(--font-body)' }} noWrap title={`${timeStr} • ${interview.timezone || 'IST'}`}>
                  {timeStr} • {interview.timezone || 'IST'}
                </Typography>
              </Stack>
            </Box>
          </Stack>

          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" justifyContent="flex-end">
            {isOverdue ? (
              <Chip
                size="small"
                icon={<AlertCircle className="w-4 h-4" />}
                label="Overdue"
                sx={{ bgcolor: 'rgba(255,255,255,0.12)', color: 'var(--dark-bg)', borderColor: 'rgba(255,255,255,0.25)', fontFamily: 'var(--font-heading)', fontWeight: 700 }}
                variant="outlined"
              />
            ) : isToday ? (
              <Chip
                size="small"
                label="Today"
                sx={{ bgcolor: 'rgba(255,255,255,0.12)', color: 'var(--dark-bg)', borderColor: 'rgba(255,255,255,0.25)', fontFamily: 'var(--font-heading)', fontWeight: 700 }}
                variant="outlined"
              />
            ) : isSoon ? (
              <Chip
                size="small"
                label="Soon"
                sx={{ bgcolor: 'rgba(255,255,255,0.12)', color: 'var(--dark-bg)', borderColor: 'rgba(255,255,255,0.25)', fontFamily: 'var(--font-heading)', fontWeight: 700 }}
                variant="outlined"
              />
            ) : null}

            <Chip
              size="small"
              label={interview.status}
              sx={{ bgcolor: 'rgba(255,255,255,0.12)', color: 'var(--dark-bg)', borderColor: 'rgba(255,255,255,0.25)', fontFamily: 'var(--font-heading)', fontWeight: 700 }}
              variant="outlined"
            />
          </Stack>
        </Stack>
      </Box>

      <CardContent sx={{ bgcolor: 'var(--darkbg-surface)' }}>
        <Stack spacing={2}>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Avatar sx={{ bgcolor: 'var(--gold)', width: 40, height: 40, fontWeight: 500, color: 'var(--dark-bg)', fontFamily: 'var(--font-heading)' }}>
              {candidateInitial}
            </Avatar>
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, fontFamily: 'var(--font-heading)', color: 'var(--text)' }} noWrap title={interview.interview_with || 'TBD'}>
                {interview.interview_with || 'TBD'}
              </Typography>
              <Typography variant="caption" sx={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-body)' }} noWrap title={company}>
                {company}
              </Typography>
            </Box>
          </Stack>

          {(interview.type || interview.meeting_type || interview.result) ? (
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' },
                gap: 1,
              }}
            >
              {interview.type ? <Chip size="small" label={`Type: ${interview.type}`} variant="outlined" /> : null}
              {interview.meeting_type ? <Chip size="small" label={`Platform: ${interview.meeting_type}`} variant="outlined" /> : null}
              {interview.result ? <Chip size="small" label={`Result: ${interview.result}`} variant="outlined" /> : null}
            </Box>
          ) : null}

          {(interview.interviewer || interview.mode || interview.duration_minutes) ? (
            <Box>
              <Divider sx={{ mb: 1.5 }} />
              <Stack spacing={0.5}>
                {interview.interviewer ? (
                  <Typography variant="caption" color="text.secondary">
                    <Box component="span" sx={{ fontWeight: 500 }}>Panel:</Box> {interview.interviewer}
                  </Typography>
                ) : null}
                {interview.mode ? (
                  <Typography variant="caption" color="text.secondary">
                    <Box component="span" sx={{ fontWeight: 500 }}>Mode:</Box> {interview.mode}
                  </Typography>
                ) : null}
                {interview.duration_minutes ? (
                  <Typography variant="caption" color="text.secondary">
                    <Box component="span" sx={{ fontWeight: 500 }}>Duration:</Box> {interview.duration_minutes} mins
                  </Typography>
                ) : null}
              </Stack>
            </Box>
          ) : null}
        </Stack>
      </CardContent>

      <CardActions sx={{ px: 2, pb: 2, pt: 0 }}>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ width: '100%' }} useFlexGap flexWrap="wrap">
          <BrandButton
            variant="primary"
            size="md"
            onClick={() => onViewDetails(interview)}
            className="flex-1"
          >
            Details
          </BrandButton>

          {isMeetingUrl ? (
            <BrandButton 
              variant="secondary"
              size="md"
              onClick={handleJoinCall}
              title="Join the meeting"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Join Call
            </BrandButton>
          ) : null}

          <div className="min-w-[160px] bg-[color:var(--darkbg-surface)] border border-[color:var(--gold)] border-opacity-20 rounded-lg p-2">
            <label className="text-xs font-heading font-bold text-[color:var(--text-secondary)] uppercase letter-spacing-wide block mb-1">
              Status
            </label>
            <select
              value={interview.status}
              onChange={handleStatusChange}
              aria-label="Change status"
              className="w-full bg-[color:var(--darkbg-surface)] text-[color:var(--text)] border border-[color:var(--gold)] border-opacity-20 rounded px-2 py-1 focus:outline-none focus:border-[color:var(--gold)] focus:border-opacity-100 transition-colors"
            >
              {getValidStatuses().map(status => (
                <option key={status} value={status} className="bg-[color:var(--darkbg)] text-[color:var(--text)]">{status}</option>
              ))}
            </select>
          </div>

          <BrandButton
            variant="danger"
            size="md"
            onClick={handleDelete}
            title="Delete interview"
            aria-label="Delete interview"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Delete
          </BrandButton>
        </Stack>
      </CardActions>
    </Card>
  );
}, (prevProps, nextProps) => {
  // Custom comparison for performance
  return (
    prevProps.interview.id === nextProps.interview.id &&
    prevProps.interview.status === nextProps.interview.status &&
    prevProps.interview.result === nextProps.interview.result &&
    prevProps.interview.interview_focus === nextProps.interview.interview_focus &&
    prevProps.requirementTitle === nextProps.requirementTitle
  );
});

InterviewCard.displayName = 'InterviewCard';

export default InterviewCard;
