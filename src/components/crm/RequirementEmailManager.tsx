import { useState, useEffect } from 'react';
import { Mail, Send, Plus } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../contexts/ToastContext';
import { supabase } from '../../lib/supabase';
import { getEmailAccounts } from '../../lib/api/emailAccounts';
import { createBulkEmailCampaign, sendBulkEmailCampaign, pollCampaignStatus } from '../../lib/api/bulkEmailCampaigns';
import { parseEmailList, deduplicateEmails } from '../../lib/emailParser';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';
import TextField from '@mui/material/TextField';
import LinearProgress from '@mui/material/LinearProgress';
import { LogoLoader } from '../common/LogoLoader';

interface RequirementEmailManagerProps {
  requirementId: string;
  requirementTitle?: string;
  vendorEmail?: string | null;
}

interface RequirementEmail {
  id: string;
  recipient_email: string;
  recipient_name?: string;
  sent_via: 'loster_app' | 'gmail_synced' | 'bulk_email';
  subject: string;
  body_preview?: string;
  sent_date: string;
  status: 'sent' | 'failed' | 'bounced' | 'pending';
}

interface EmailAccountRow {
  id: string;
  user_id: string;
  email_address: string;
  email_limit_per_rotation: number;
  is_active: boolean;
}

export const RequirementEmailManager = ({
  requirementId,
  requirementTitle,
  vendorEmail,
}: RequirementEmailManagerProps) => {
  const { user } = useAuth();
  const { showToast } = useToast();

  // States
  const [emails, setEmails] = useState<RequirementEmail[]>([]);
  const [emailsLoading, setEmailsLoading] = useState(true);
  const [expandedEmailId, setExpandedEmailId] = useState<string | null>(null);
  const [showMultipleEmailsHint, setShowMultipleEmailsHint] = useState(false);

  // Bulk email states
  const [showBulkEmailModal, setShowBulkEmailModal] = useState(false);
  const [bulkEmailStep, setBulkEmailStep] = useState<'recipients' | 'accounts' | 'assignment' | 'compose' | 'review' | 'sending'>('recipients');
  const [accounts, setAccounts] = useState<EmailAccountRow[]>([]);
  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>([]);
  const [recipientAccountMap, setRecipientAccountMap] = useState<Record<string, string>>({}); // Maps recipient email -> account ID
  const [recipientsText, setRecipientsText] = useState('');
  const [recipients, setRecipients] = useState<Array<{ email: string; name?: string }>>([]);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [bulkLoading, setBulkLoading] = useState(false);
  const [sendingProgress, setSendingProgress] = useState<{
    total: number;
    sent: number;
    failed: number;
    processed: number;
    progress: number;
    status: string;
  } | null>(null);
  const [currentCampaignId, setCurrentCampaignId] = useState<string | null>(null);

  // Load emails for this requirement
  useEffect(() => {
    const loadEmails = async () => {
      try {
        setEmailsLoading(true);
        const { data, error } = await supabase
          .from('requirement_emails')
          .select('*')
          .eq('requirement_id', requirementId)
          .order('sent_date', { ascending: false });

        if (error) throw error;
        setEmails(data || []);
      } catch (err) {
        console.error('Error loading emails:', err);
        showToast({
          type: 'error',
          message: 'Failed to load emails',
        });
      } finally {
        setEmailsLoading(false);
      }
    };

    loadEmails();

    // Subscribe to real-time updates
    const subscription = supabase
      .channel(`requirement_emails_${requirementId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'requirement_emails',
          filter: `requirement_id=eq.${requirementId}`,
        },
        () => {
          loadEmails();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [requirementId, showToast]);

  // Load email accounts
  useEffect(() => {
    const loadAccounts = async () => {
      if (!user) return;
      const result = await getEmailAccounts(user.id);
      if (result.success && result.accounts) {
        setAccounts(result.accounts);
      }
    };

    if (showBulkEmailModal) {
      loadAccounts();
    }
  }, [showBulkEmailModal, user]);

  // Auto-populate vendor email when modal opens
  useEffect(() => {
    if (showBulkEmailModal && vendorEmail) {
      // Parse vendor email - could be space-separated, comma-separated, or semicolon-separated
      const emailArray = vendorEmail
        .split(/[,;\s]+/)
        .map(e => e.trim())
        .filter(e => e.length > 0 && e.includes('@'));

      if (emailArray.length > 0) {
        // Format as semicolon-separated for display
        const formattedEmails = emailArray.join(';\n');
        setRecipientsText(formattedEmails);
        
        // Show hint if multiple emails
        if (emailArray.length > 1) {
          setShowMultipleEmailsHint(true);
        }
      }
    }
  }, [showBulkEmailModal, vendorEmail]);

  // Parse recipients
  const parseRecipients = (text: string) => {
    // Use robust email parser that handles various formats
    const parsedEmails = parseEmailList(text);
    // Deduplicate by email address (case-insensitive)
    return deduplicateEmails(parsedEmails);
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
    setBulkEmailStep('accounts');
  };

  const handleSelectAccount = (accountId: string) => {
    setSelectedAccountIds(prev => 
      prev.includes(accountId) 
        ? prev.filter(id => id !== accountId)
        : [...prev, accountId]
    );
  };

  const handleAssignRecipientToAccount = (recipientEmail: string, accountId: string) => {
    setRecipientAccountMap(prev => ({
      ...prev,
      [recipientEmail]: accountId,
    }));
  };

  const handleRemoveRecipientAssignment = (recipientEmail: string) => {
    setRecipientAccountMap(prev => {
      const newMap = { ...prev };
      delete newMap[recipientEmail];
      return newMap;
    });
  };

  const handleAutoAssignRecipients = () => {
    // Auto-assign recipients to accounts in round-robin fashion
    if (selectedAccountIds.length === 0) {
      showToast({
        type: 'warning',
        message: 'Please select at least one email account first',
      });
      return;
    }

    const newMap: Record<string, string> = {};
    recipients.forEach((recipient, index) => {
      const accountId = selectedAccountIds[index % selectedAccountIds.length];
      newMap[recipient.email] = accountId;
    });
    setRecipientAccountMap(newMap);
    showToast({
      type: 'success',
      message: `Auto-assigned ${recipients.length} recipients to ${selectedAccountIds.length} account(s)`,
    });
  };

  const handleProceedToCompose = () => {
    if (selectedAccountIds.length === 0) {
      showToast({
        type: 'warning',
        message: 'Please select at least one email account',
      });
      return;
    }
    // Move to assignment step instead of compose
    setBulkEmailStep('assignment');
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

    setBulkLoading(true);
    const result = await createBulkEmailCampaign({
      userId: user.id,
      subject,
      body,
      recipients,
      rotationEnabled: false,
      emailsPerAccount: 1,
      requirementId,
      selectedAccountIds,
      recipientAccountMap, // Pass the recipient-account mappings
    });

    if (result.success && result.campaign) {
      setCurrentCampaignId(result.campaign.id);
      setBulkEmailStep('review');
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
    setBulkLoading(false);
  };

  const handleSendCampaign = async () => {
    if (!user || !currentCampaignId) return;

    if (accounts.length === 0) {
      showToast({
        type: 'error',
        message: 'No email accounts configured. Please add accounts in settings first.',
      });
      return;
    }

    setBulkEmailStep('sending');
    setSendingProgress({ total: recipients.length, sent: 0, failed: 0, processed: 0, progress: 0, status: 'queued' });

    try {
      const result = await sendBulkEmailCampaign(currentCampaignId);

      if (result?.success) {
        // Use the email server's campaign ID for polling (not the frontend campaign ID)
        const emailServerCampaignId = (result as any).emailServerCampaignId || currentCampaignId; // eslint-disable-line @typescript-eslint/no-explicit-any
        
        console.log(`[handleSendCampaign] Using campaign ID for polling: ${emailServerCampaignId}`);
        
        // Start polling for real-time progress
        const pollResult = await pollCampaignStatus(emailServerCampaignId, (status) => {
          // Update UI with each status update
          setSendingProgress({
            total: status.total,
            sent: status.sent,
            failed: status.failed,
            processed: status.processed,
            progress: status.progress,
            status: status.status,
          });
        });

        // Polling completed, show final result
        if (pollResult.success && pollResult.result) {
          const finalStatus = pollResult.result;
          showToast({
            type: finalStatus.failed === 0 ? 'success' : 'warning',
            message: `Campaign complete: ${finalStatus.sent} sent, ${finalStatus.failed} failed`,
          });
        } else {
          showToast({
            type: 'warning',
            message: pollResult.error || 'Campaign polling completed',
          });
        }

        // Auto-close after a short delay
        setTimeout(() => {
          closeBulkEmailModal();
        }, 1500);
      } else {
        showToast({
          type: 'error',
          message: result?.error || 'Failed to send campaign',
        });
        setBulkEmailStep('review');
      }
    } catch (error) {
      console.error('Error sending campaign:', error);
      showToast({
        type: 'error',
        message: 'An error occurred while sending the campaign',
      });
      setBulkEmailStep('review');
    }
  };

  const closeBulkEmailModal = () => {
    setShowBulkEmailModal(false);
    setBulkEmailStep('recipients');
    setRecipientsText('');
    setRecipients([]);
    setSelectedAccountIds([]);
    setRecipientAccountMap({});
    setSubject('');
    setBody('');
    setSendingProgress(null);
    setCurrentCampaignId(null);
    setShowMultipleEmailsHint(false);
  };

  const getStatusIcon = (status: string) => {
    const iconClass = 'w-4 h-4';
    switch (status) {
      case 'sent':
        return <span className={`${iconClass} text-green-500`}>✓</span>;
      case 'failed':
        return <span className={`${iconClass} text-red-500`}>✕</span>;
      case 'pending':
        return <span className={`${iconClass} text-yellow-500`}>⏳</span>;
      default:
        return <span className={`${iconClass} text-gray-500`}>📧</span>;
    }
  };

  if (emailsLoading) {
    return <LogoLoader size="md" showText label="Loading emails..." />;
  }

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 2 }}>
      {/* Header */}
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Typography variant="h6" sx={{ fontWeight: 600 }}>
          Email Management
          {requirementTitle && (
            <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary' }}>
              for: {requirementTitle}
            </Typography>
          )}
        </Typography>
        <Button
          variant="contained"
          startIcon={<Plus className="w-4 h-4" />}
          onClick={() => setShowBulkEmailModal(true)}
          size="small"
        >
          Send Email
        </Button>
      </Stack>

      {/* Email History */}
      <Box sx={{ flex: 1, overflowY: 'auto' }}>
        {emails.length === 0 ? (
          <Paper
            variant="outlined"
            sx={{
              p: 3,
              textAlign: 'center',
              bgcolor: 'rgba(0,0,0,0.02)',
              borderStyle: 'dashed',
            }}
          >
            <Mail className="w-12 h-12 mx-auto mb-2 text-gray-300" />
            <Typography color="text.secondary" variant="body2">
              No emails sent for this requirement yet
            </Typography>
          </Paper>
        ) : (
          <Stack spacing={1.5}>
            {emails.map((email) => (
              <Paper
                key={email.id}
                variant="outlined"
                sx={{
                  p: 2,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  '&:hover': { boxShadow: 1, borderColor: 'primary.light' },
                }}
                onClick={() => setExpandedEmailId(expandedEmailId === email.id ? null : email.id)}
              >
                <Stack direction="row" spacing={2} alignItems="flex-start">
                  {getStatusIcon(email.status)}
                  <Stack sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      {email.recipient_email}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {email.subject}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {new Date(email.sent_date).toLocaleString()}
                    </Typography>
                  </Stack>
                  <Typography
                    variant="caption"
                    sx={{
                      px: 1,
                      py: 0.5,
                      borderRadius: 1,
                      bgcolor:
                        email.status === 'sent'
                          ? 'rgba(34,197,94,0.1)'
                          : email.status === 'failed'
                            ? 'rgba(239,68,68,0.1)'
                            : 'rgba(234,179,8,0.1)',
                      color:
                        email.status === 'sent'
                          ? 'rgb(34,197,94)'
                          : email.status === 'failed'
                            ? 'rgb(239,68,68)'
                            : 'rgb(234,179,8)',
                      fontWeight: 600,
                      textTransform: 'capitalize',
                    }}
                  >
                    {email.status}
                  </Typography>
                </Stack>

                {/* Expanded Details */}
                {expandedEmailId === email.id && email.body_preview && (
                  <Box sx={{ mt: 2, pt: 2, borderTop: 1, borderColor: 'divider' }}>
                    <Typography variant="caption" component="div" color="text.secondary" sx={{ whiteSpace: 'pre-wrap' }}>
                      {email.body_preview}
                    </Typography>
                  </Box>
                )}
              </Paper>
            ))}
          </Stack>
        )}
      </Box>

      {/* Bulk Email Modal */}
      <Dialog
        open={showBulkEmailModal}
        onClose={closeBulkEmailModal}
        fullWidth
        maxWidth="md"
        scroll="paper"
      >
        <DialogTitle sx={{ pr: 7 }}>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Send className="w-5 h-5" />
            <Typography variant="h6" sx={{ fontWeight: 500 }}>
              Send Bulk Email - {requirementTitle}
            </Typography>
          </Stack>
        </DialogTitle>

        <DialogContent dividers>
          <Stack spacing={2} sx={{ pt: 1 }}>
            {/* Step 1: Recipients */}
            {bulkEmailStep === 'recipients' && (
              <Stack spacing={2}>
                <Box>
                  <Typography variant="subtitle2" sx={{ mb: 1 }}>
                    Paste Recipients
                  </Typography>
                  <TextField
                    fullWidth
                    multiline
                    rows={6}
                    placeholder="email@example.com&#10;email2@example.com, John Doe&#10;..."
                    value={recipientsText}
                    onChange={(e) => setRecipientsText(e.target.value)}
                    size="small"
                  />
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                    Format: email@example.com or email@example.com, Name
                  </Typography>
                  {showMultipleEmailsHint && (
                    <Box
                      sx={{
                        mt: 1.5,
                        p: 1.5,
                        bgcolor: 'rgba(33, 150, 243, 0.08)',
                        border: '1px solid rgba(33, 150, 243, 0.3)',
                        borderRadius: 1,
                      }}
                    >
                      <Typography variant="caption" color="primary" sx={{ fontWeight: 500 }}>
                        💡 Multiple emails detected from requirement vendor. You can separate them using semicolons (;) or newlines.
                      </Typography>
                    </Box>
                  )}
                </Box>
              </Stack>
            )}

            {/* Step 2: Select Email Accounts */}
            {bulkEmailStep === 'accounts' && (
              <Stack spacing={2}>
                <Box>
                  <Typography variant="subtitle2" sx={{ mb: 2 }}>
                    Select Email Account(s) to Send From
                  </Typography>
                  {accounts.length === 0 ? (
                    <Paper
                      variant="outlined"
                      sx={{
                        p: 2,
                        textAlign: 'center',
                        bgcolor: 'rgba(239,68,68,0.08)',
                        borderColor: 'rgba(239,68,68,0.3)',
                      }}
                    >
                      <Typography variant="body2" color="error" sx={{ fontWeight: 500 }}>
                        ⚠️ No email accounts configured
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                        Please set up email accounts in settings first
                      </Typography>
                    </Paper>
                  ) : (
                    <Stack spacing={1.5}>
                      {accounts.map((account) => (
                        <Paper
                          key={account.id}
                          variant="outlined"
                          sx={{
                            p: 2,
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            bgcolor: selectedAccountIds.includes(account.id) ? 'rgba(33, 150, 243, 0.08)' : 'transparent',
                            borderColor: selectedAccountIds.includes(account.id) ? 'primary.main' : 'divider',
                            '&:hover': {
                              borderColor: 'primary.main',
                              boxShadow: 1,
                            },
                          }}
                          onClick={() => handleSelectAccount(account.id)}
                        >
                          <Stack direction="row" spacing={2} alignItems="center">
                            <input
                              type="checkbox"
                              checked={selectedAccountIds.includes(account.id)}
                              onChange={() => handleSelectAccount(account.id)}
                              style={{ cursor: 'pointer', width: 20, height: 20 }}
                            />
                            <Stack sx={{ flex: 1 }}>
                              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                {account.email_address}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                Limit: {account.email_limit_per_rotation} emails per rotation
                              </Typography>
                            </Stack>
                            {account.is_active ? (
                              <Typography variant="caption" sx={{ px: 1, py: 0.5, bgcolor: 'rgba(34,197,94,0.1)', borderRadius: 1, color: 'rgb(34,197,94)', fontWeight: 600 }}>
                                Active
                              </Typography>
                            ) : (
                              <Typography variant="caption" sx={{ px: 1, py: 0.5, bgcolor: 'rgba(107,114,128,0.1)', borderRadius: 1, color: 'rgb(107,114,128)', fontWeight: 600 }}>
                                Inactive
                              </Typography>
                            )}
                          </Stack>
                        </Paper>
                      ))}
                    </Stack>
                  )}
                </Box>
              </Stack>
            )}

            {/* Step 3: Assign Recipients to Accounts */}
            {bulkEmailStep === 'assignment' && (
              <Stack spacing={2}>
                <Box>
                  <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                    <Typography variant="subtitle2">
                      Assign Recipients to Email Accounts
                    </Typography>
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={handleAutoAssignRecipients}
                    >
                      Auto-Assign (Round-robin)
                    </Button>
                  </Stack>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
                    Select which email account will send to each recipient. Unassigned recipients will use the first available account.
                  </Typography>

                  <Stack spacing={1.5} sx={{ maxHeight: 400, overflowY: 'auto' }}>
                    {recipients.map((recipient) => (
                      <Paper
                        key={recipient.email}
                        variant="outlined"
                        sx={{
                          p: 2,
                          bgcolor: recipientAccountMap[recipient.email] ? 'rgba(33, 150, 243, 0.05)' : 'transparent',
                        }}
                      >
                        <Stack direction="row" spacing={2} alignItems="center">
                          <Stack sx={{ flex: 1, minWidth: 0 }}>
                            <Typography variant="body2" sx={{ fontWeight: 500, wordBreak: 'break-all' }}>
                              {recipient.email}
                            </Typography>
                            {recipient.name && (
                              <Typography variant="caption" color="text.secondary">
                                {recipient.name}
                              </Typography>
                            )}
                          </Stack>
                          <Stack direction="row" spacing={1} sx={{ minWidth: 'auto' }}>
                            <select
                              value={recipientAccountMap[recipient.email] || ''}
                              onChange={(e) => {
                                if (e.target.value) {
                                  handleAssignRecipientToAccount(recipient.email, e.target.value);
                                } else {
                                  handleRemoveRecipientAssignment(recipient.email);
                                }
                              }}
                              style={{
                                padding: '8px 12px',
                                borderRadius: '4px',
                                border: '1px solid #ddd',
                                fontFamily: 'inherit',
                                fontSize: '12px',
                                cursor: 'pointer',
                              }}
                            >
                              <option value="">Select account...</option>
                              {accounts
                                .filter(acc => selectedAccountIds.includes(acc.id))
                                .map(acc => (
                                  <option key={acc.id} value={acc.id}>
                                    {acc.email_address}
                                  </option>
                                ))}
                            </select>
                            {recipientAccountMap[recipient.email] && (
                              <Typography
                                variant="caption"
                                sx={{
                                  px: 1,
                                  py: 0.5,
                                  borderRadius: 1,
                                  bgcolor: 'rgba(34,197,94,0.1)',
                                  color: 'rgb(34,197,94)',
                                  fontWeight: 600,
                                  minWidth: 'fit-content',
                                }}
                              >
                                ✓ Assigned
                              </Typography>
                            )}
                          </Stack>
                        </Stack>
                      </Paper>
                    ))}
                  </Stack>
                </Box>
              </Stack>
            )}

            {/* Step 4: Compose */}
            {bulkEmailStep === 'compose' && (
              <Stack spacing={2}>
                <Box>
                  <Typography variant="subtitle2" sx={{ mb: 1 }}>
                    Recipients: {recipients.length}
                  </Typography>
                  <Paper variant="outlined" sx={{ p: 1.5, maxHeight: 150, overflowY: 'auto', bgcolor: 'rgba(0,0,0,0.02)' }}>
                    <Typography variant="caption" component="div">
                      {recipients.map((r, i) => (
                        <div key={i}>{r.email}</div>
                      ))}
                    </Typography>
                  </Paper>
                </Box>

                <TextField
                  fullWidth
                  label="Subject"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Email subject"
                  size="small"
                />

                <TextField
                  fullWidth
                  label="Body"
                  multiline
                  rows={6}
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Email message"
                  size="small"
                />
              </Stack>
            )}

            {/* Step 4: Review */}
            {bulkEmailStep === 'review' && (
              <Stack spacing={2}>
                <Paper variant="outlined" sx={{ p: 1.5, bgcolor: 'rgba(34,197,94,0.08)', borderColor: 'rgba(34,197,94,0.3)' }}>
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>
                    ✓ Campaign Ready to Send
                  </Typography>
                </Paper>

                <Stack spacing={1}>
                  <Typography variant="body2" color="text.secondary">
                    Recipients: {recipients.length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Subject: {subject}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Email Account(s): {selectedAccountIds.length > 0 ? `${selectedAccountIds.length} account${selectedAccountIds.length > 1 ? 's' : ''}` : 'None'}
                  </Typography>
                  {selectedAccountIds.length > 1 && (
                    <Typography variant="caption" color="info.main" sx={{ fontWeight: 500, mt: 1 }}>
                      💡 Each of the {selectedAccountIds.length} selected accounts will send to all {recipients.length} recipients
                    </Typography>
                  )}
                </Stack>

                <Paper variant="outlined" sx={{ p: 2, maxHeight: 220, overflowY: 'auto', bgcolor: 'rgba(0,0,0,0.02)' }}>
                  <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                    {body}
                  </Typography>
                </Paper>
              </Stack>
            )}

            {/* Step 5: Sending */}
            {bulkEmailStep === 'sending' && sendingProgress && (
              <Stack spacing={3}>
                <Stack alignItems="center" spacing={1}>
                  <LogoLoader size="lg" showText label="Sending Campaign..." />
                  <Typography variant="caption" color="text.secondary">
                    {sendingProgress.status === 'completed' && 'Campaign completed!'}
                    {sendingProgress.status === 'failed' && 'Campaign failed'}
                    {sendingProgress.status === 'queued' && 'Queuing emails...'}
                    {sendingProgress.status === 'sending' && 'Sending emails...'}
                  </Typography>
                </Stack>

                <Stack spacing={2}>
                  {/* Progress Bar */}
                  <Stack spacing={1}>
                    <Stack direction="row" justifyContent="space-between" alignItems="baseline">
                      <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                        Progress
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {sendingProgress.progress}%
                      </Typography>
                    </Stack>
                    <LinearProgress
                      variant="determinate"
                      value={sendingProgress.progress}
                      sx={{ height: 8, borderRadius: 4 }}
                    />
                  </Stack>

                  {/* Stats Grid */}
                  <Stack direction="row" spacing={2}>
                    <Paper variant="outlined" sx={{ flex: 1, p: 1.5, textAlign: 'center', bgcolor: 'rgba(34,197,94,0.08)', borderColor: 'rgba(34,197,94,0.3)' }}>
                      <Typography variant="body2" color="text.secondary">Sent</Typography>
                      <Typography variant="h6" sx={{ color: 'rgb(34,197,94)', fontWeight: 700 }}>
                        {sendingProgress.sent}
                      </Typography>
                    </Paper>
                    <Paper variant="outlined" sx={{ flex: 1, p: 1.5, textAlign: 'center', bgcolor: 'rgba(239,68,68,0.08)', borderColor: 'rgba(239,68,68,0.3)' }}>
                      <Typography variant="body2" color="text.secondary">Failed</Typography>
                      <Typography variant="h6" sx={{ color: 'rgb(239,68,68)', fontWeight: 700 }}>
                        {sendingProgress.failed}
                      </Typography>
                    </Paper>
                    <Paper variant="outlined" sx={{ flex: 1, p: 1.5, textAlign: 'center', bgcolor: 'rgba(59,130,246,0.08)', borderColor: 'rgba(59,130,246,0.3)' }}>
                      <Typography variant="body2" color="text.secondary">Total</Typography>
                      <Typography variant="h6" sx={{ color: 'rgb(59,130,246)', fontWeight: 700 }}>
                        {sendingProgress.total}
                      </Typography>
                    </Paper>
                  </Stack>

                  {/* Details */}
                  <Stack spacing={0.5}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500 }}>
                      Processed: {sendingProgress.processed}/{sendingProgress.total}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Remaining: {sendingProgress.total - sendingProgress.processed}
                    </Typography>
                  </Stack>

                  {/* Status message */}
                  {sendingProgress.status === 'completed' && sendingProgress.failed === 0 && (
                    <Paper variant="outlined" sx={{ p: 1.5, bgcolor: 'rgba(34,197,94,0.08)', borderColor: 'rgba(34,197,94,0.3)' }}>
                      <Typography variant="body2" sx={{ color: 'rgb(34,197,94)', fontWeight: 500 }}>
                        ✓ All emails sent successfully!
                      </Typography>
                    </Paper>
                  )}
                  {sendingProgress.status === 'completed' && sendingProgress.failed > 0 && (
                    <Paper variant="outlined" sx={{ p: 1.5, bgcolor: 'rgba(251,146,60,0.08)', borderColor: 'rgba(251,146,60,0.3)' }}>
                      <Typography variant="body2" sx={{ color: 'rgb(251,146,60)', fontWeight: 500 }}>
                        ⚠️ Campaign completed with {sendingProgress.failed} failed email(s)
                      </Typography>
                    </Paper>
                  )}
                </Stack>
              </Stack>
            )}
          </Stack>
        </DialogContent>

        <DialogActions>
          {bulkEmailStep === 'recipients' && (
            <>
              <Button onClick={closeBulkEmailModal}>Cancel</Button>
              <Button variant="contained" onClick={handleParseRecipients} disabled={!recipientsText.trim()}>
                Continue
              </Button>
            </>
          )}

          {bulkEmailStep === 'accounts' && (
            <>
              <Button onClick={() => setBulkEmailStep('recipients')}>Back</Button>
              <Button onClick={closeBulkEmailModal}>Cancel</Button>
              <Button variant="contained" onClick={handleProceedToCompose} disabled={accounts.length === 0 || selectedAccountIds.length === 0}>
                Continue
              </Button>
            </>
          )}

          {bulkEmailStep === 'assignment' && (
            <>
              <Button onClick={() => setBulkEmailStep('accounts')}>Back</Button>
              <Button onClick={closeBulkEmailModal}>Cancel</Button>
              <Button variant="contained" onClick={() => setBulkEmailStep('compose')}>
                Continue to Compose
              </Button>
            </>
          )}

          {bulkEmailStep === 'compose' && (
            <>
              <Button onClick={() => setBulkEmailStep('assignment')}>Back</Button>
              <Button onClick={closeBulkEmailModal}>Cancel</Button>
              <Button variant="contained" onClick={handleCreateCampaign} disabled={bulkLoading || !subject || !body}>
                Review
              </Button>
            </>
          )}

          {bulkEmailStep === 'review' && (
            <>
              <Button onClick={() => setBulkEmailStep('compose')}>Back</Button>
              <Button onClick={closeBulkEmailModal}>Cancel</Button>
              <Button variant="contained" color="success" onClick={handleSendCampaign} disabled={bulkLoading}>
                Send Campaign
              </Button>
            </>
          )}

          {bulkEmailStep === 'sending' && (
            <Button onClick={closeBulkEmailModal} disabled={sendingProgress === null}>
              Close
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
};
