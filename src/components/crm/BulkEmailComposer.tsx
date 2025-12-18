import { useState, useEffect } from 'react';
import { Send, Loader, Mail as MailIcon } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../contexts/ToastContext';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Stepper from '@mui/material/Stepper';
import Step from '@mui/material/Step';
import StepLabel from '@mui/material/StepLabel';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import FormControlLabel from '@mui/material/FormControlLabel';
import Checkbox from '@mui/material/Checkbox';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import Paper from '@mui/material/Paper';
import LinearProgress from '@mui/material/LinearProgress';
import { createBulkEmailCampaign, sendBulkEmailCampaign } from '../../lib/api/bulkEmailCampaigns';
import { getEmailAccounts } from '../../lib/api/emailAccounts';

interface BulkEmailCampaignRow {
  id: string;
  user_id: string;
  requirement_id: string | null;
  subject: string;
  body: string;
  total_recipients: number;
  rotation_enabled: boolean;
  emails_per_account: number;
  status: string;
  created_at: string;
}

interface EmailAccountRow {
  id: string;
  user_id: string;
  email_address: string;
  email_limit_per_rotation: number;
  is_active: boolean;
}

interface BulkEmailComposerProps {
  requirementId?: string;
  onClose?: () => void;
}

/**
 * Bulk Email Composer Component
 * Allows users to send emails to multiple recipients with account rotation
 */
export const BulkEmailComposer = ({ requirementId, onClose }: BulkEmailComposerProps) => {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [step, setStep] = useState<'recipients' | 'compose' | 'review' | 'sending'>('recipients');
  const [loading, setLoading] = useState(false);
  const [accounts, setAccounts] = useState<EmailAccountRow[]>([]);

  // Form state
  const [recipientsText, setRecipientsText] = useState('');
  const [recipients, setRecipients] = useState<Array<{ email: string; name?: string }>>([]);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [rotationEnabled, setRotationEnabled] = useState(true);
  const [emailsPerAccount, setEmailsPerAccount] = useState(5);

  // Campaign state
  const [campaign, setCampaign] = useState<BulkEmailCampaignRow | null>(null);
  const [sendingProgress, setSendingProgress] = useState<{
    total: number;
    sent: number;
    failed: number;
  } | null>(null);

  // Load email accounts callback
  const loadAccounts = async () => {
    if (!user) return;

    const result = await getEmailAccounts(user.id);
    if (result.success && result.accounts) {
      setAccounts(result.accounts);
    }
  };

  useEffect(() => {
    loadAccounts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const parseRecipients = (text: string) => {
    const lines = text.trim().split('\n');
    const parsed = lines.map((line) => {
      const [email, ...nameParts] = line.split(',').map((s) => s.trim());
      return {
        email: email,
        name: nameParts.length > 0 ? nameParts.join(',') : undefined,
      };
    }).filter((r) => r.email && r.email.includes('@'));

    return parsed;
  };

  const handleParseRecipients = () => {
    const parsed = parseRecipients(recipientsText);

    if (parsed.length === 0) {
      showToast({
        type: 'error',
        message: 'No valid email addresses found',
      });
      return;
    }

    setRecipients(parsed);
    setStep('compose');
  };

  const handleCreateCampaign = async () => {
    if (!user) return;

    if (!subject || !body) {
      showToast({
        type: 'warning',
        message: 'Please fill in subject and body',
      });
      return;
    }

    setLoading(true);
    const result = await createBulkEmailCampaign({
      userId: user.id,
      subject,
      body,
      recipients,
      rotationEnabled,
      emailsPerAccount,
      requirementId,
    });

    if (result.success && result.campaign) {
      setCampaign(result.campaign);
      setStep('review');
      showToast({
        type: 'success',
        message: 'Campaign created successfully',
      });
    } else {
      showToast({
        type: 'error',
        message: result.error || 'Failed to create campaign',
      });
    }

    setLoading(false);
  };

  const handleSendCampaign = async () => {
    if (!campaign) return;

    if (accounts.length === 0) {
      showToast({
        type: 'error',
        message: 'No email accounts configured. Please add accounts first.',
      });
      return;
    }

    setStep('sending');
    setSendingProgress({ total: recipients.length, sent: 0, failed: 0 });

    const result = await sendBulkEmailCampaign(campaign.id);

    if (result.success && result.result) {
      setSendingProgress({
        total: result.result.total,
        sent: result.result.sent,
        failed: result.result.failed,
      });

      showToast({
        type: result.result.failed === 0 ? 'success' : 'warning',
        message: `Campaign sent: ${result.result.sent} sent, ${result.result.failed} failed`,
      });
    } else {
      showToast({
        type: 'error',
        message: result.error || 'Failed to send campaign',
      });
    }
  };

  if (!user) {
    return (
      <Paper variant="outlined" sx={{ p: 3, textAlign: 'center' }}>
        <Typography variant="body2" color="text.secondary">
          Please sign in to send bulk emails
        </Typography>
      </Paper>
    );
  }

  const steps = ['recipients', 'compose', 'review', 'sending'] as const;
  const activeStepIndex = steps.indexOf(step);

  return (
    <Dialog
      open
      onClose={() => onClose?.()}
      fullWidth
      maxWidth="md"
      scroll="paper"
      slotProps={{
        backdrop: { sx: { backdropFilter: 'blur(4px)' } }
      }}
      PaperProps={{
        sx: {
          boxShadow: 24,
        }
      }}
    >
      {/* Header */}
      <DialogTitle sx={{ pr: 7 }}>
        <Stack direction="row" spacing={1.5} alignItems="center">
          <MailIcon className="w-5 h-5" />
          <Typography variant="h6" sx={{ fontWeight: 800 }}>
            Bulk Email Campaign
          </Typography>
        </Stack>
        {onClose ? (
          <IconButton onClick={onClose} sx={{ position: 'absolute', right: 8, top: 8 }} aria-label="Close">
            <Box component="span">✕</Box>
          </IconButton>
        ) : null}
      </DialogTitle>

      {/* Progress Indicator */}
      <DialogContent dividers>
        <Stack spacing={2}>
          <Stepper activeStep={Math.max(0, activeStepIndex)} alternativeLabel>
            <Step>
              <StepLabel>Recipients</StepLabel>
            </Step>
            <Step>
              <StepLabel>Compose</StepLabel>
            </Step>
            <Step>
              <StepLabel>Review</StepLabel>
            </Step>
            <Step>
              <StepLabel>Sending</StepLabel>
            </Step>
          </Stepper>

          {/* Content */}
          <Box>
            {/* Step 1: Recipients */}
            {step === 'recipients' && (
              <Stack spacing={2}>
                <TextField
                  label="Enter Recipients"
                  multiline
                  minRows={8}
                  value={recipientsText}
                  onChange={(e) => setRecipientsText(e.target.value)}
                  placeholder="Email addresses (one per line or comma-separated):\njohn@example.com,John Doe\njane@example.com,Jane Smith"
                  fullWidth
                />
                <Typography variant="caption" color="text.secondary">
                  Format: email@example.com or email@example.com,Name
                </Typography>
              </Stack>
            )}

            {/* Step 2: Compose */}
            {step === 'compose' && (
              <Stack spacing={2}>
                <Paper variant="outlined" sx={{ p: 1.5, bgcolor: 'rgba(212,175,55,0.10)', borderColor: 'rgba(212,175,55,0.35)' }}>
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>
                    ✓ {recipients.length} recipients selected
                  </Typography>
                </Paper>

                <TextField
                  label="Subject"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Email subject"
                  fullWidth
                />

                <TextField
                  label="Body"
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Email message"
                  multiline
                  minRows={6}
                  fullWidth
                />

                <FormControlLabel
                  control={<Checkbox checked={rotationEnabled} onChange={(e) => setRotationEnabled(e.target.checked)} />}
                  label="Enable Email Rotation"
                />

                {rotationEnabled && (
                  <Stack spacing={1} sx={{ pl: 1 }}>
                    <FormControl size="small" sx={{ maxWidth: 220 }}>
                      <InputLabel id="emails-per-account-label">Emails per Account</InputLabel>
                      <Select
                        labelId="emails-per-account-label"
                        value={String(emailsPerAccount)}
                        label="Emails per Account"
                        onChange={(e) => setEmailsPerAccount(parseInt(String(e.target.value), 10))}
                      >
                        <MenuItem value="5">5 emails</MenuItem>
                        <MenuItem value="10">10 emails</MenuItem>
                        <MenuItem value="15">15 emails</MenuItem>
                      </Select>
                    </FormControl>
                    <Typography variant="caption" color="text.secondary">
                      {accounts.length > 0
                        ? `Will use ${accounts.length} accounts: ${accounts.map((a) => a.email_address).join(', ')}`
                        : 'No accounts configured'}
                    </Typography>
                  </Stack>
                )}
              </Stack>
            )}

            {/* Step 3: Review */}
            {step === 'review' && campaign && (
              <Stack spacing={2}>
                <Paper variant="outlined" sx={{ p: 1.5, bgcolor: 'rgba(34,197,94,0.08)', borderColor: 'rgba(34,197,94,0.30)' }}>
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>
                    ✓ Campaign Ready to Send
                  </Typography>
                </Paper>

                <Stack spacing={0.5}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                    Campaign Summary
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Recipients: {campaign.total_recipients}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Subject: {campaign.subject}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Rotation: {campaign.rotation_enabled ? `Enabled (${campaign.emails_per_account} per account)` : 'Disabled'}
                  </Typography>
                </Stack>

                <Paper variant="outlined" sx={{ p: 2, maxHeight: 220, overflowY: 'auto', bgcolor: 'background.default' }}>
                  <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                    {campaign.body}
                  </Typography>
                </Paper>
              </Stack>
            )}

            {/* Step 4: Sending */}
            {step === 'sending' && sendingProgress && (
              <Stack spacing={2}>
                <Stack spacing={0.5} alignItems="center">
                  <Loader className="w-10 h-10 animate-spin" />
                  <Typography variant="h6" sx={{ fontWeight: 800 }}>
                    Sending Campaign
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Please wait while we send your emails...
                  </Typography>
                </Stack>

                <Stack spacing={1}>
                  <Stack direction="row" justifyContent="space-between">
                    <Typography variant="body2" color="text.secondary">Progress</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>
                      {sendingProgress.sent + sendingProgress.failed}/{sendingProgress.total}
                    </Typography>
                  </Stack>
                  <LinearProgress
                    variant="determinate"
                    value={sendingProgress.total > 0 ? ((sendingProgress.sent + sendingProgress.failed) / sendingProgress.total) * 100 : 0}
                  />
                </Stack>

                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: 1,
                  }}
                >
                  <Paper variant="outlined" sx={{ p: 1.5, textAlign: 'center' }}>
                    <Typography variant="h5" sx={{ fontWeight: 900, color: 'success.main' }}>{sendingProgress.sent}</Typography>
                    <Typography variant="caption" color="text.secondary">Sent</Typography>
                  </Paper>
                  <Paper variant="outlined" sx={{ p: 1.5, textAlign: 'center' }}>
                    <Typography variant="h5" sx={{ fontWeight: 900, color: 'error.main' }}>{sendingProgress.failed}</Typography>
                    <Typography variant="caption" color="text.secondary">Failed</Typography>
                  </Paper>
                  <Paper variant="outlined" sx={{ p: 1.5, textAlign: 'center' }}>
                    <Typography variant="h5" sx={{ fontWeight: 900, color: 'text.secondary' }}>{sendingProgress.total}</Typography>
                    <Typography variant="caption" color="text.secondary">Total</Typography>
                  </Paper>
                </Box>
              </Stack>
            )}
          </Box>
        </Stack>
      </DialogContent>

      {/* Footer */}
      <DialogActions>
        {step !== 'sending' ? (
          <Stack direction="row" spacing={1} sx={{ width: '100%' }}>
            {step !== 'recipients' ? (
              <Button
                variant="outlined"
                color="inherit"
                onClick={() => {
                  if (step === 'compose') setStep('recipients');
                  if (step === 'review') setStep('compose');
                }}
                sx={{ flex: 1 }}
              >
                Back
              </Button>
            ) : (
              <Button
                variant="outlined"
                color="inherit"
                onClick={() => onClose?.()}
                sx={{ flex: 1 }}
              >
                Cancel
              </Button>
            )}

            {step === 'recipients' ? (
              <Button
                variant="contained"
                color="primary"
                onClick={handleParseRecipients}
                disabled={!recipientsText.trim()}
                sx={{ flex: 1 }}
              >
                Continue with {parseRecipients(recipientsText).length} Recipients
              </Button>
            ) : step === 'compose' ? (
              <Button
                variant="contained"
                color="primary"
                onClick={handleCreateCampaign}
                disabled={loading}
                startIcon={loading ? <Loader className="w-4 h-4 animate-spin" /> : undefined}
                sx={{ flex: 1 }}
              >
                {loading ? 'Creating...' : 'Review Campaign'}
              </Button>
            ) : step === 'review' && campaign ? (
              <Button
                variant="contained"
                color="success"
                onClick={handleSendCampaign}
                startIcon={<Send className="w-4 h-4" />}
                sx={{ flex: 1 }}
              >
                Send Campaign Now
              </Button>
            ) : null}
          </Stack>
        ) : null}
      </DialogActions>
    </Dialog>
  );
};
