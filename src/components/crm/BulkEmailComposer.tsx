import { useState, useEffect } from 'react';
import { Send, Loader, Users, Mail as MailIcon } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../contexts/ToastContext';
import {
  createBulkEmailCampaign,
  sendBulkEmailCampaign,
} from '../../lib/api/bulkEmailCampaigns';
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
      <div className="text-center p-6 text-gray-600">
        Please sign in to send bulk emails
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden flex flex-col h-[700px]">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center gap-2">
          <MailIcon className="w-5 h-5 text-blue-600" />
          <h2 className="text-lg font-semibold text-gray-900">Bulk Email Campaign</h2>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="px-3 py-2 text-gray-600 hover:bg-gray-100 rounded transition"
          >
            ✕
          </button>
        )}
      </div>

      {/* Progress Indicator */}
      <div className="flex gap-2 px-4 py-3 bg-gray-100 text-sm border-b border-gray-200">
        {(['recipients', 'compose', 'review', 'sending'] as const).map((s, i) => (
          <div key={s} className="flex items-center">
            <div
              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold ${
                step === s
                  ? 'bg-blue-600 text-white'
                  : step > s || ['sending'].includes(step)
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-300 text-gray-700'
              }`}
            >
              {i + 1}
            </div>
            <span className="ml-2 font-medium text-gray-700">
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </span>
            {i < 3 && <div className="w-4 h-px bg-gray-300 mx-2" />}
          </div>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {/* Step 1: Recipients */}
        {step === 'recipients' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                <Users className="w-4 h-4 inline mr-2" />
                Enter Recipients
              </label>
              <textarea
                value={recipientsText}
                onChange={(e) => setRecipientsText(e.target.value)}
                placeholder="Email addresses (one per line or comma-separated):&#10;john@example.com,John Doe&#10;jane@example.com,Jane Smith"
                rows={8}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
              />
              <p className="text-xs text-gray-600 mt-2">
                Format: email@example.com or email@example.com,Name
              </p>
            </div>

            <button
              onClick={handleParseRecipients}
              disabled={!recipientsText.trim()}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition font-medium"
            >
              Continue with {parseRecipients(recipientsText).length} Recipients
            </button>
          </div>
        )}

        {/* Step 2: Compose */}
        {step === 'compose' && (
          <div className="space-y-4">
            <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm text-blue-900">
                ✓ {recipients.length} recipients selected
              </p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Subject
              </label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Email subject"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Body
              </label>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Email message"
                rows={6}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="space-y-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rotationEnabled}
                  onChange={(e) => setRotationEnabled(e.target.checked)}
                  className="w-4 h-4"
                />
                <span className="text-sm font-medium text-gray-900">
                  Enable Email Rotation
                </span>
              </label>

              {rotationEnabled && (
                <div className="ml-7">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Emails per Account
                  </label>
                  <select
                    value={emailsPerAccount}
                    onChange={(e) => setEmailsPerAccount(parseInt(e.target.value))}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value={5}>5 emails</option>
                    <option value={10}>10 emails</option>
                    <option value={15}>15 emails</option>
                  </select>
                  <p className="text-xs text-gray-600 mt-1">
                    {accounts.length > 0
                      ? `Will use ${accounts.length} accounts: ${accounts.map((a) => a.email_address).join(', ')}`
                      : 'No accounts configured'}
                  </p>
                </div>
              )}
            </div>

            <button
              onClick={handleCreateCampaign}
              disabled={loading}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition font-medium flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader className="w-4 h-4 animate-spin" />
                  Creating...
                </>
              ) : (
                'Review Campaign'
              )}
            </button>
          </div>
        )}

        {/* Step 3: Review */}
        {step === 'review' && campaign && (
          <div className="space-y-4">
            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
              <p className="text-sm text-green-900 font-medium">✓ Campaign Ready to Send</p>
            </div>

            <div className="space-y-2">
              <h4 className="font-semibold text-gray-900">Campaign Summary</h4>
              <div className="text-sm text-gray-700 space-y-1">
                <p><span className="font-medium">Recipients:</span> {campaign.total_recipients}</p>
                <p><span className="font-medium">Subject:</span> {campaign.subject}</p>
                <p><span className="font-medium">Rotation:</span> {campaign.rotation_enabled ? `Enabled (${campaign.emails_per_account} per account)` : 'Disabled'}</p>
              </div>
            </div>

            <div className="p-3 bg-gray-50 rounded-lg border border-gray-200 max-h-40 overflow-y-auto">
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{campaign.body}</p>
            </div>

            <button
              onClick={handleSendCampaign}
              className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-medium flex items-center justify-center gap-2"
            >
              <Send className="w-4 h-4" />
              Send Campaign Now
            </button>
          </div>
        )}

        {/* Step 4: Sending */}
        {step === 'sending' && sendingProgress && (
          <div className="space-y-4">
            <div className="text-center">
              <Loader className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-gray-900">Sending Campaign</h3>
              <p className="text-sm text-gray-600 mt-1">
                Please wait while we send your emails...
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-700">Progress</span>
                <span className="font-medium">
                  {sendingProgress.sent + sendingProgress.failed}/{sendingProgress.total}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all"
                  style={{
                    width: `${((sendingProgress.sent + sendingProgress.failed) / sendingProgress.total) * 100}%`,
                  }}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="p-3 bg-green-50 rounded-lg text-center">
                <p className="text-2xl font-bold text-green-600">{sendingProgress.sent}</p>
                <p className="text-xs text-gray-600">Sent</p>
              </div>
              <div className="p-3 bg-red-50 rounded-lg text-center">
                <p className="text-2xl font-bold text-red-600">{sendingProgress.failed}</p>
                <p className="text-xs text-gray-600">Failed</p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg text-center">
                <p className="text-2xl font-bold text-gray-600">{sendingProgress.total}</p>
                <p className="text-xs text-gray-600">Total</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      {step !== 'sending' && (
        <div className="border-t border-gray-200 bg-gray-50 p-4 flex gap-2">
          {step !== 'recipients' && (
            <button
              onClick={() => {
                if (step === 'compose') setStep('recipients');
                if (step === 'review') setStep('compose');
              }}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 transition font-medium"
            >
              Back
            </button>
          )}
          {step === 'recipients' && (
            <button
              onClick={() => onClose?.()}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 transition font-medium"
            >
              Cancel
            </button>
          )}
        </div>
      )}
    </div>
  );
};
