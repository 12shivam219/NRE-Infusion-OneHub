import { useState, useEffect } from 'react';
import { Mail, Plus, Trash2, Check, Loader, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../contexts/ToastContext';
import {
  getEmailAccounts,
  addEmailAccount,
  deleteEmailAccount,
  testEmailAccount,
} from '../../lib/api/emailAccounts';

interface EmailAccount {
  id: string;
  user_id: string;
  email_address: string;
  app_password_encrypted: string;
  email_limit_per_rotation: number;
  is_active: boolean;
  order_index: number;
  created_at: string;
  updated_at: string;
}

/**
 * Email Accounts Settings Component
 * Allows users to configure multiple email accounts for bulk sending
 */
export const EmailAccountsSettings = () => {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [accounts, setAccounts] = useState<EmailAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showPassword, setShowPassword] = useState<string | null>(null);
  const [testing, setTesting] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    emailLimitPerRotation: 5,
  });

  const [submitting, setSubmitting] = useState(false);

  // Load accounts callback
  const loadAccounts = async () => {
    if (!user) return;

    setLoading(true);
    const result = await getEmailAccounts(user.id);

    if (result.success && result.accounts) {
      setAccounts(result.accounts);
    } else {
      showToast({
        type: 'error',
        message: result.error || 'Failed to load email accounts',
      });
    }

    setLoading(false);
  };

  // Load on mount
  useEffect(() => {
    loadAccounts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAddAccount = async () => {
    if (!user) return;

    if (!formData.email || !formData.password) {
      showToast({
        type: 'warning',
        message: 'Please fill in all fields',
      });
      return;
    }

    setSubmitting(true);
    const result = await addEmailAccount(
      user.id,
      formData.email,
      formData.password,
      formData.emailLimitPerRotation
    );

    if (result.success) {
      showToast({
        type: 'success',
        message: 'Email account added successfully',
      });
      setFormData({ email: '', password: '', emailLimitPerRotation: 5 });
      setShowAddForm(false);
      loadAccounts();
    } else {
      showToast({
        type: 'error',
        message: result.error || 'Failed to add email account',
      });
    }

    setSubmitting(false);
  };

  const handleTestAccount = async (email: string) => {
    setTesting(email);
    const result = await testEmailAccount(email);

    if (result.success) {
      showToast({
        type: 'success',
        message: result.message || 'Test email sent successfully',
      });
    } else {
      showToast({
        type: 'error',
        message: result.error || 'Test email failed',
      });
    }

    setTesting(null);
  };

  const handleDeleteAccount = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this email account?')) {
      return;
    }

    const result = await deleteEmailAccount(id);

    if (result.success) {
      showToast({
        type: 'success',
        message: 'Email account deleted',
      });
      loadAccounts();
    } else {
      showToast({
        type: 'error',
        message: result.error || 'Failed to delete email account',
      });
    }
  };

  if (!user) {
    return (
      <div className="text-center p-6 text-gray-600">
        Please sign in to manage email accounts
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Mail className="w-6 h-6 text-blue-600" />
          <h2 className="text-2xl font-bold text-gray-900">Email Accounts</h2>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          <Plus className="w-4 h-4" />
          Add Account
        </button>
      </div>

      {/* Add Form */}
      {showAddForm && (
        <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200 space-y-4">
          <h3 className="font-semibold text-gray-900">Add New Email Account</h3>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email Address
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
              placeholder="your-email@gmail.com"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              App Password
            </label>
            <div className="flex gap-2">
              <input
                type={showPassword === 'new' ? 'text' : 'password'}
                value={formData.password}
                onChange={(e) =>
                  setFormData({ ...formData, password: e.target.value })
                }
                placeholder="xxxx xxxx xxxx xxxx"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm font-mono"
              />
              <button
                onClick={() =>
                  setShowPassword(showPassword === 'new' ? null : 'new')
                }
                className="px-3 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition"
              >
                {showPassword === 'new' ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
            <p className="text-xs text-gray-600 mt-1">
              Generate at: https://myaccount.google.com/apppasswords
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Emails per Rotation
            </label>
            <select
              value={formData.emailLimitPerRotation}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  emailLimitPerRotation: parseInt(e.target.value),
                })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value={5}>5 emails</option>
              <option value={10}>10 emails</option>
              <option value={15}>15 emails</option>
              <option value={20}>20 emails</option>
              <option value={25}>25 emails</option>
            </select>
            <p className="text-xs text-gray-600 mt-1">
              How many emails to send before rotating to next account
            </p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleAddAccount}
              disabled={submitting}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <Loader className="w-4 h-4 animate-spin" />
                  Adding...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  Add Account
                </>
              )}
            </button>
            <button
              onClick={() => setShowAddForm(false)}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Accounts List */}
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader className="w-6 h-6 text-blue-600 animate-spin" />
        </div>
      ) : accounts.length === 0 ? (
        <div className="text-center py-12">
          <Mail className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-600 mb-4">No email accounts configured</p>
          <button
            onClick={() => setShowAddForm(true)}
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            Add your first email account
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {accounts.map((account) => (
            <div
              key={account.id}
              className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition flex items-center justify-between"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-gray-900">
                    {account.email_address}
                  </p>
                  {account.is_active && (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-medium">
                      <Check className="w-3 h-3" />
                      Active
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-600 mt-1">
                  Limit: {account.email_limit_per_rotation} emails per rotation
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => handleTestAccount(account.email_address)}
                  disabled={testing === account.email_address}
                  className="px-3 py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition disabled:opacity-50 text-sm font-medium"
                >
                  {testing === account.email_address ? (
                    <Loader className="w-4 h-4 animate-spin" />
                  ) : (
                    'Test'
                  )}
                </button>
                <button
                  onClick={() => handleDeleteAccount(account.id)}
                  className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition text-sm font-medium"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Info Box */}
      {accounts.length > 0 && (
        <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <h4 className="font-semibold text-gray-900 mb-2">💡 Bulk Email Tip</h4>
          <p className="text-sm text-gray-700">
            You have {accounts.length} email account(s) configured. When sending bulk emails,
            the system will automatically rotate between these accounts based on the
            "emails per rotation" setting to distribute the load.
          </p>
        </div>
      )}
    </div>
  );
};
