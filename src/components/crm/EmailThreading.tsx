import { useState, useCallback, useEffect } from 'react';
import { Mail, Send, Trash2, Reply, ChevronDown, ChevronUp } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../contexts/ToastContext';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { LogoLoader } from '../common/LogoLoader';
import { RichTextEditor, SignatureManager, TemplateManager, DraftManager, AdvancedOptions, type EmailSignature, type EmailTemplate, type EmailDraft, type AdvancedEmailOptions } from '../email';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import TextField from '@mui/material/TextField';
import Divider from '@mui/material/Divider';
import Collapse from '@mui/material/Collapse';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import CircularProgress from '@mui/material/CircularProgress';
import { BrandButton } from '../brand';
import {
  getEmailThreads,
  createEmailThread,
  replyToEmailThread,
  deleteEmailThread,
  getRequirementEmailThreads,
} from '../../lib/api/emailThreading';
import type { Database } from '../../lib/database.types';

type EmailThread = Database['public']['Tables']['email_threads']['Row'];

interface EmailThreadingProps {
  requirementId?: string;
  onClose?: () => void;
}

/**
 * Email Threading Component
 * Displays email threads and allows composing/replying to emails
 */
export const EmailThreading = ({ requirementId, onClose }: EmailThreadingProps) => {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [threads, setThreads] = useState<EmailThread[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [expandedThreads, setExpandedThreads] = useState<Set<string>>(new Set());

  // Compose form state
  const [showCompose, setShowCompose] = useState(false);
  const [composeData, setComposeData] = useState({
    subject: '',
    toEmail: '',
    body: '',
  });
  const [composing, setComposing] = useState(false);
  const [threadToDelete, setThreadToDelete] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Reply form state
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyBody, setReplyBody] = useState('');
  const [replying, setReplying] = useState(false);

  // New email features
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [signatures, setSignatures] = useState<EmailSignature[]>([]);
  const [drafts, setDrafts] = useState<EmailDraft[]>([]);
  const [advancedOptions, setAdvancedOptions] = useState<AdvancedEmailOptions>({
    priority: 'normal',
  });

  // Load email threads
  const loadThreads = useCallback(async () => {
    if (!user) return; // Guard clause

    setLoading(true);
    let result;

    if (requirementId) {
      result = await getRequirementEmailThreads(requirementId);
    } else {
      result = await getEmailThreads(user.id);
    }

    if (result.success && result.threads) {
      // Group by thread_id and get only root threads
      const rootThreads = result.threads.filter((t) => !t.parent_id);
      setThreads(rootThreads);
    } else {
      showToast({
        type: 'error',
        message: result.error || 'Failed to load emails',
      });
    }

    setLoading(false);
  }, [user, requirementId, showToast]);

  useEffect(() => {
    if (!user) return;

    let cancelled = false;

    const run = async () => {
      await Promise.resolve();
      if (cancelled) return;
      await loadThreads();
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [loadThreads, user]);

  const handleToggleThreadExpand = useCallback((threadId: string) => {
    setExpandedThreads((prev) => {
      const next = new Set(prev);
      if (next.has(threadId)) {
        next.delete(threadId);
      } else {
        next.add(threadId);
      }
      return next;
    });
    setSelectedThreadId(threadId);
  }, []);

  const handleCompose = useCallback(async () => {
    if (!user) return; // Guard clause

    if (!composeData.subject || !composeData.toEmail || !composeData.body) {
      showToast({
        type: 'warning',
        message: 'Please fill in all fields',
      });
      return;
    }

    setComposing(true);
    const result = await createEmailThread(
      user.id,
      composeData.subject,
      user.email,
      composeData.toEmail,
      composeData.body,
      requirementId
    );

    if (result.success) {
      showToast({
        type: 'success',
        message: 'Email sent successfully',
      });
      setComposeData({ subject: '', toEmail: '', body: '' });
      setShowCompose(false);
      loadThreads();
    } else {
      showToast({
        type: 'error',
        message: result.error || 'Failed to send email',
      });
    }
    setComposing(false);
  }, [composeData, user, requirementId, showToast, loadThreads]);

  const handleReply = useCallback(async () => {
    if (!user) return; // Guard clause

    if (!replyBody || !selectedThreadId) {
      showToast({
        type: 'warning',
        message: 'Please enter a reply',
      });
      return;
    }

    const thread = threads.find((t) => t.thread_id === selectedThreadId);
    if (!thread) return;

    setReplying(true);
    const result = await replyToEmailThread(
      user.id,
      selectedThreadId,
      user.email,
      thread.from_email,
      replyBody
    );

    if (result.success) {
      showToast({
        type: 'success',
        message: 'Reply sent successfully',
      });
      setReplyBody('');
      setReplyingTo(null);
      loadThreads();
    } else {
      showToast({
        type: 'error',
        message: result.error || 'Failed to send reply',
      });
    }
    setReplying(false);
  }, [replyBody, selectedThreadId, threads, user, showToast, loadThreads]);

  const handleDeleteClick = useCallback((threadId: string) => {
    setThreadToDelete(threadId);
    setShowDeleteConfirm(true);
  }, []);

  const handleDelete = useCallback(
    async () => {
      if (!threadToDelete) return;
      const result = await deleteEmailThread(threadToDelete);

      if (result.success) {
        showToast({
          type: 'success',
          message: 'Email thread deleted',
        });
        setSelectedThreadId(null);
        loadThreads();
      } else {
        showToast({
          type: 'error',
          message: result.error || 'Failed to delete thread',
        });
      }
    },
    [threadToDelete, showToast, loadThreads]
  );

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  };

  // --- MOVED EARLY RETURN HERE, AFTER ALL HOOKS ---
  if (!user) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography variant="body2" color="text.secondary">
          Please sign in to view emails
        </Typography>
      </Box>
    );
  }

  return (
    <Paper variant="outlined" sx={{ overflow: 'hidden', display: 'flex', flexDirection: 'column', height: 600 }}>
      {/* Header */}
      <Stack direction="row" spacing={2} alignItems="center" justifyContent="space-between" sx={{ p: 2, bgcolor: 'grey.50' }}>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ minWidth: 0 }}>
          <Mail className="w-5 h-5" />
          <Typography variant="h6" sx={{ fontWeight: 500 }} noWrap>
            Email Threads
          </Typography>
        </Stack>

        <Stack direction="row" spacing={1} alignItems="center">
          <BrandButton
            variant="primary"
            size="sm"
            onClick={() => setShowCompose(!showCompose)}
            aria-label="Compose new email"
          >
            <Send className="w-4 h-4 mr-2" />
            Compose
          </BrandButton>
          {onClose && (
            <IconButton onClick={onClose} aria-label="Close email panel" size="small">
              <span aria-hidden>✕</span>
            </IconButton>
          )}
        </Stack>
      </Stack>
      <Divider />

      {/* Compose Form */}
      {showCompose && (
        <Box sx={{ p: 2, bgcolor: 'rgba(212,175,55,0.08)' }}>
          <Stack spacing={2}>
            <TextField
              label="Subject"
              value={composeData.subject}
              onChange={(e) => setComposeData((prev) => ({ ...prev, subject: e.target.value }))}
              size="small"
              fullWidth
              inputProps={{ 'aria-label': 'Email subject' }}
            />
            <TextField
              label="To"
              type="email"
              value={composeData.toEmail}
              onChange={(e) => setComposeData((prev) => ({ ...prev, toEmail: e.target.value }))}
              size="small"
              fullWidth
              inputProps={{ 'aria-label': 'Recipient email' }}
            />

            {/* Templates */}
            <TemplateManager
              templates={templates}
              onTemplatesChange={setTemplates}
              onTemplateSelect={(template) => {
                setComposeData((prev) => ({
                  ...prev,
                  subject: template.subject,
                  body: template.body,
                }));
              }}
            />

            {/* Signatures */}
            <SignatureManager
              signatures={signatures}
              onSignaturesChange={setSignatures}
              onSignatureSelect={(sig) => {
                setComposeData((prev) => ({
                  ...prev,
                  body: prev.body + '\n\n' + sig.content,
                }));
              }}
            />

            {/* Rich Text Editor */}
            <RichTextEditor
              value={composeData.body}
              onChange={(body) => setComposeData((prev) => ({ ...prev, body }))}
              placeholder="Type your message..."
              minRows={4}
              showFormatting={true}
            />

            {/* Drafts */}
            <DraftManager
              drafts={drafts}
              currentDraft={{
                subject: composeData.subject,
                body: composeData.body,
                to: [composeData.toEmail],
              }}
              onDraftsChange={setDrafts}
              onDraftSelect={(draft) => {
                setComposeData({
                  subject: draft.subject,
                  toEmail: draft.to[0] || '',
                  body: draft.body,
                });
              }}
              autoSaveEnabled={true}
            />

            {/* Advanced Options */}
            <AdvancedOptions
              options={advancedOptions}
              onOptionsChange={setAdvancedOptions}
            />

            <Stack direction="row" spacing={1}>
              <Button
                variant="contained"
                color="primary"
                onClick={handleCompose}
                disabled={composing}
                startIcon={composing ? <span className="w-4 h-4"><LogoLoader size="sm" /></span> : <Send className="w-4 h-4" />}
                sx={{ flex: 1 }}
              >
                {composing ? 'Sending...' : 'Send'}
              </Button>
              <Button
                variant="outlined"
                color="inherit"
                onClick={() => setShowCompose(false)}
              >
                Cancel
              </Button>
            </Stack>
          </Stack>
        </Box>
      )}
      <Divider />

      {/* Threads List */}
      {loading ? (
        <Box sx={{ flex: 1, display: 'grid', placeItems: 'center' }}>
          <CircularProgress size={24} />
        </Box>
      ) : threads.length === 0 ? (
        <Box sx={{ flex: 1, display: 'grid', placeItems: 'center', p: 3 }}>
          <Stack spacing={1} alignItems="center">
            <Mail className="w-10 h-10" />
            <Typography variant="body2" color="text.secondary">
              No email threads
            </Typography>
          </Stack>
        </Box>
      ) : (
        <Box sx={{ flex: 1, overflowY: 'auto' }}>
          <List disablePadding>
            {threads.map((thread) => {
              const isExpanded = expandedThreads.has(thread.thread_id!);

              return (
                <Box key={thread.id}>
                  {/* Thread Header */}
                  <ListItemButton onClick={() => handleToggleThreadExpand(thread.thread_id!)}>
                    <ListItemText
                      primary={
                        <Typography variant="subtitle2" sx={{ fontWeight: 800 }} noWrap>
                          {thread.subject}
                        </Typography>
                      }
                      secondary={
                        <Typography variant="body2" color="text.secondary" noWrap>
                          From: {thread.from_email}  To: {thread.to_email}
                        </Typography>
                      }
                    />
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ flexShrink: 0 }}>
                      <Typography variant="caption" color="text.secondary" noWrap>
                        {formatDate(thread.created_at)}
                      </Typography>
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </Stack>
                  </ListItemButton>

                  {/* Expanded Thread Content */}
                  <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                    <Box sx={{ px: 2, pb: 2, bgcolor: 'grey.50' }}>
                      <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
                        <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                          {thread.body}
                        </Typography>
                      </Paper>

                      {/* Reply Form */}
                      {replyingTo === thread.thread_id ? (
                        <Paper variant="outlined" sx={{ p: 2, bgcolor: 'rgba(212,175,55,0.08)' }}>
                          <Stack spacing={2}>
                            {/* Rich Text Editor for Reply */}
                            <RichTextEditor
                              value={replyBody}
                              onChange={setReplyBody}
                              placeholder="Type your reply..."
                              minRows={3}
                              showFormatting={true}
                            />

                            {/* Signature in Reply */}
                            {signatures.length > 0 && (
                              <Paper sx={{ p: 1, bgcolor: '#F8F9FA', borderColor: '#E5E7EB', border: '1px solid' }}>
                                <Button
                                  size="small"
                                  onClick={() => {
                                    const defaultSig = signatures.find(s => s.isDefault) || signatures[0];
                                    if (defaultSig) {
                                      setReplyBody(replyBody + '\n\n' + defaultSig.content);
                                    }
                                  }}
                                >
                                  Add Signature
                                </Button>
                              </Paper>
                            )}

                            <Stack direction="row" spacing={1}>
                              <Button
                                variant="contained"
                                color="primary"
                                onClick={handleReply}
                                disabled={replying}
                                startIcon={replying ? <span className="w-4 h-4"><LogoLoader size="sm" /></span> : <Send className="w-4 h-4" />}
                                sx={{ flex: 1 }}
                              >
                                {replying ? 'Sending...' : 'Send Reply'}
                              </Button>
                              <Button
                                variant="outlined"
                                color="inherit"
                                onClick={() => {
                                  setReplyingTo(null);
                                  setReplyBody('');
                                }}
                              >
                                Cancel
                              </Button>
                            </Stack>
                          </Stack>
                        </Paper>
                      ) : (
                        <Stack direction="row" spacing={1}>
                          <Button
                            variant="outlined"
                            color="inherit"
                            onClick={() => setReplyingTo(thread.thread_id!)}
                            startIcon={<Reply className="w-4 h-4" />}
                            sx={{ flex: 1 }}
                            aria-label="Reply to email"
                          >
                            Reply
                          </Button>
                          <IconButton
                            onClick={() => handleDeleteClick(thread.thread_id!)}
                            color="error"
                            aria-label="Delete email"
                          >
                            <Trash2 className="w-4 h-4" />
                          </IconButton>
                        </Stack>
                      )}
                    </Box>
                  </Collapse>
                  <Divider />
                </Box>
              );
            })}
          </List>
        </Box>
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => {
          setShowDeleteConfirm(false);
          setThreadToDelete(null);
        }}
        onConfirm={handleDelete}
        title="Delete Email Thread"
        message="Are you sure you want to delete this email thread? This action cannot be undone."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
      />
    </Paper>
  );
};