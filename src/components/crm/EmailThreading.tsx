import { useState, useCallback, useEffect } from 'react';
import { Mail, Send, Trash2, Reply, ChevronDown, ChevronUp, Loader } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../contexts/ToastContext';
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

  // Reply form state
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyBody, setReplyBody] = useState('');
  const [replying, setReplying] = useState(false);

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
    if (user) {
      loadThreads();
    }
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

  const handleDelete = useCallback(
    async (threadId: string) => {
      if (!window.confirm('Are you sure you want to delete this email thread?')) {
        return;
      }

      const result = await deleteEmailThread(threadId);

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
    [showToast, loadThreads]
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
    return <div className="text-center p-6 text-gray-600">Please sign in to view emails</div>;
  }

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden flex flex-col h-[600px]">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center gap-2">
          <Mail className="w-5 h-5 text-blue-600" />
          <h2 className="text-lg font-semibold text-gray-900">Email Threads</h2>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowCompose(!showCompose)}
            className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition text-sm"
            aria-label="Compose new email"
          >
            <Send className="w-4 h-4" />
            Compose
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="px-3 py-2 text-gray-600 hover:bg-gray-100 rounded transition"
              aria-label="Close email panel"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Compose Form */}
      {showCompose && (
        <div className="p-4 border-b border-gray-200 bg-blue-50 space-y-3">
          <input
            type="text"
            placeholder="Subject"
            value={composeData.subject}
            onChange={(e) =>
              setComposeData((prev) => ({ ...prev, subject: e.target.value }))
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
            aria-label="Email subject"
          />
          <input
            type="email"
            placeholder="To"
            value={composeData.toEmail}
            onChange={(e) =>
              setComposeData((prev) => ({ ...prev, toEmail: e.target.value }))
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
            aria-label="Recipient email"
          />
          <textarea
            placeholder="Message"
            value={composeData.body}
            onChange={(e) => setComposeData((prev) => ({ ...prev, body: e.target.value }))}
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm resize-none"
            aria-label="Email body"
          />
          <div className="flex gap-2">
            <button
              onClick={handleCompose}
              disabled={composing}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 transition text-sm"
            >
              {composing ? (
                <>
                  <Loader className="w-4 h-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Send
                </>
              )}
            </button>
            <button
              onClick={() => setShowCompose(false)}
              className="px-3 py-2 border border-gray-300 rounded hover:bg-gray-100 transition text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Threads List */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader className="w-6 h-6 text-blue-600 animate-spin" />
        </div>
      ) : threads.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-gray-500">
          <Mail className="w-12 h-12 mb-3 opacity-50" />
          <p>No email threads</p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto">
          <div className="divide-y divide-gray-200">
            {threads.map((thread) => {
              const isExpanded = expandedThreads.has(thread.thread_id!);

              return (
                <div key={thread.id} className="border-b last:border-b-0">
                  {/* Thread Header */}
                  <button
                    onClick={() => handleToggleThreadExpand(thread.thread_id!)}
                    className="w-full flex items-center gap-3 p-4 hover:bg-gray-50 transition text-left"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate">{thread.subject}</p>
                      <div className="flex gap-2 text-sm text-gray-600 mt-1">
                        <span className="truncate">From: {thread.from_email}</span>
                        <span className="text-gray-400">→</span>
                        <span className="truncate">To: {thread.to_email}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-xs text-gray-500 whitespace-nowrap">
                        {formatDate(thread.created_at)}
                      </span>
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-gray-400" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-gray-400" />
                      )}
                    </div>
                  </button>

                  {/* Expanded Thread Content */}
                  {isExpanded && (
                    <div className="px-4 pb-4 bg-gray-50 space-y-3">
                      {/* Thread Body */}
                      <div className="bg-white p-3 rounded border border-gray-200 text-sm">
                        <p className="text-gray-700 whitespace-pre-wrap">{thread.body}</p>
                      </div>

                      {/* Reply Form */}
                      {replyingTo === thread.thread_id ? (
                        <div className="space-y-2 bg-blue-50 p-3 rounded">
                          <textarea
                            placeholder="Type your reply..."
                            value={replyBody}
                            onChange={(e) => setReplyBody(e.target.value)}
                            rows={3}
                            className="w-full px-3 py-2 border border-gray-300 rounded text-sm resize-none focus:ring-2 focus:ring-blue-500"
                            aria-label="Reply text"
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={handleReply}
                              disabled={replying}
                              className="flex-1 flex items-center justify-center gap-2 px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 transition text-sm"
                            >
                              {replying ? (
                                <>
                                  <Loader className="w-3 h-3 animate-spin" />
                                  Sending...
                                </>
                              ) : (
                                <>
                                  <Send className="w-3 h-3" />
                                  Send Reply
                                </>
                              )}
                            </button>
                            <button
                              onClick={() => {
                                setReplyingTo(null);
                                setReplyBody('');
                              }}
                              className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-100 transition text-sm"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          <button
                            onClick={() => setReplyingTo(thread.thread_id!)}
                            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 border border-gray-300 rounded hover:bg-gray-100 transition text-sm"
                            aria-label="Reply to email"
                          >
                            <Reply className="w-4 h-4" />
                            Reply
                          </button>
                          <button
                            onClick={() => handleDelete(thread.thread_id!)}
                            className="px-3 py-2 border border-red-300 text-red-600 rounded hover:bg-red-50 transition text-sm"
                            aria-label="Delete email"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};