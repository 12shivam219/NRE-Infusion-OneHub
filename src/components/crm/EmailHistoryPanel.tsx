import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Mail, Calendar, User, AlertCircle, CheckCircle, Clock } from 'lucide-react';

interface RequirementEmail {
  id: string;
  recipient_email: string;
  recipient_name: string;
  sent_via: 'loster_app' | 'gmail_synced';
  subject: string;
  body_preview: string;
  sent_date: string;
  status: 'sent' | 'failed' | 'bounced' | 'pending';
  match_confidence: number;
  needs_user_confirmation: boolean;
}

interface EmailHistoryPanelProps {
  requirementId: string;
}

const EmailHistoryPanel: React.FC<EmailHistoryPanelProps> = ({ requirementId }) => {
  const [emails, setEmails] = useState<RequirementEmail[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    const loadEmailsCallback = async () => {
      try {
        setLoading(true);
        const { data, error: fetchError } = await supabase
          .from('requirement_emails')
          .select('*')
          .eq('requirement_id', requirementId)
          .order('sent_date', { ascending: false });

        if (fetchError) throw fetchError;
        setEmails(data || []);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load emails');
      } finally {
        setLoading(false);
      }
    };

    loadEmailsCallback();

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
          loadEmailsCallback();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [requirementId]);

  function getStatusIcon(status: string) {
    switch (status) {
      case 'sent':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'failed':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-500" />;
      default:
        return <Mail className="w-4 h-4 text-gray-500" />;
    }
  }

  function getSourceBadge(sentVia: string) {
    if (sentVia === 'gmail_synced') {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-primary-50 text-primary-800">
          Gmail Auto-Sync
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
        Loster App
      </span>
    );
  }

  function getConfidenceBadge(confidence: number) {
    let color = 'gray';
    let label = 'Unknown';

    if (confidence >= 95) {
      color = 'green';
      label = 'Very High';
    } else if (confidence >= 80) {
      color = 'blue';
      label = 'High';
    } else if (confidence >= 70) {
      color = 'yellow';
      label = 'Good';
    } else if (confidence >= 50) {
      color = 'orange';
      label = 'Fair';
    } else {
      color = 'red';
      label = 'Low';
    }

    const badgeColor = color === 'blue' ? 'primary' : color;
    return (
      <span
        className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-${badgeColor}-100 text-${badgeColor}-800`}
      >
        {label} ({confidence}%)
      </span>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-medium flex items-center gap-2">
          <Mail className="w-5 h-5" />
          Email History
        </h3>
        <span className="text-xs font-medium text-gray-600">{emails.length} emails</span>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-4">
          <div className="flex gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-red-700">{error}</p>
          </div>
        </div>
      )}

      {emails.length === 0 ? (
        <div className="rounded-lg bg-gray-50 border border-gray-200 p-8 text-center">
          <Mail className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-600">No emails sent for this requirement yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {emails.map((email) => (
            <div
              key={email.id}
              className="rounded-lg border border-gray-200 hover:border-gray-300 transition-all"
            >
              <button
                onClick={() => setExpandedId(expandedId === email.id ? null : email.id)}
                className="w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1">
                    {getStatusIcon(email.status)}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate">
                        {email.subject || '(No subject)'}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <User className="w-3 h-3 text-gray-400" />
                        <p className="text-xs text-gray-600 truncate">
                          {email.recipient_name || email.recipient_email}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="flex items-center gap-2 mb-2 justify-end">
                      {getSourceBadge(email.sent_via)}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <Calendar className="w-3 h-3" />
                      {new Date(email.sent_date).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              </button>

              {expandedId === email.id && (
                <div className="border-t border-gray-200 bg-gray-50 px-4 py-3 space-y-3">
                  {/* Recipient details */}
                  <div>
                    <p className="text-xs font-medium text-gray-700 uppercase tracking-wide mb-1">
                      Recipient
                    </p>
                    <p className="text-xs text-gray-900 break-all">{email.recipient_email}</p>
                  </div>

                  {/* Match confidence for Gmail synced emails */}
                  {email.sent_via === 'gmail_synced' && (
                    <div>
                      <p className="text-xs font-medium text-gray-700 uppercase tracking-wide mb-1">
                        Match Confidence
                      </p>
                      <div className="flex items-center gap-2">
                        {getConfidenceBadge(email.match_confidence)}
                        {email.needs_user_confirmation && (
                          <span className="text-xs text-orange-600 font-medium">
                            Needs Review
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Email preview */}
                  {email.body_preview && (
                    <div>
                      <p className="text-xs font-medium text-gray-700 uppercase tracking-wide mb-1">
                        Preview
                      </p>
                      <p className="text-xs text-gray-700 bg-white rounded p-2 border border-gray-200 line-clamp-3">
                        {email.body_preview}
                      </p>
                    </div>
                  )}

                  {/* Status */}
                  <div>
                    <p className="text-xs font-medium text-gray-700 uppercase tracking-wide mb-1">
                      Status
                    </p>
                    <p className="text-xs text-gray-900 capitalize flex items-center gap-2">
                      {getStatusIcon(email.status)}
                      {email.status}
                    </p>
                  </div>

                  {/* Sent date and time */}
                  <div>
                    <p className="text-xs font-medium text-gray-700 uppercase tracking-wide mb-1">
                      Sent
                    </p>
                    <p className="text-xs text-gray-900">
                      {new Date(email.sent_date).toLocaleString()}
                    </p>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default EmailHistoryPanel;
