import { useState } from 'react';
import { UserPlus } from 'lucide-react';
import { register } from '../../lib/auth';
import { checkPasswordWithHibp } from '../../lib/hibp';
import { validatePasswordStrength } from '../../lib/formValidation';
import { AuthLayout } from './AuthLayout';

interface RegisterFormProps {
  onSwitchToLogin: () => void;
}

// SECURITY: Password validation helper
const isStrongPassword = (pwd: string): boolean => {
  // Requirements: at least 12 chars, 1 uppercase, 1 lowercase, 1 number, 1 special char
  const minLength = pwd.length >= 12;
  const hasUppercase = /[A-Z]/.test(pwd);
  const hasLowercase = /[a-z]/.test(pwd);
  const hasNumber = /\d/.test(pwd);
  const hasSpecialChar = /[@$!%*?&]/.test(pwd);
  
  return minLength && hasUppercase && hasLowercase && hasNumber && hasSpecialChar;
};

const getPasswordStrengthFeedback = (pwd: string): string[] => {
  const feedback = [];
  if (pwd.length < 12) feedback.push('At least 12 characters');
  if (!/[A-Z]/.test(pwd)) feedback.push('One uppercase letter');
  if (!/[a-z]/.test(pwd)) feedback.push('One lowercase letter');
  if (!/\d/.test(pwd)) feedback.push('One number');
  if (!/[@$!%*?&]/.test(pwd)) feedback.push('One special character (@$!%*?&)');
  return feedback;
};

export const RegisterForm = ({ onSwitchToLogin }: RegisterFormProps) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [isCheckingPassword, setIsCheckingPassword] = useState(false);
  const [hibpMessage, setHibpMessage] = useState('');
  const [hibpError, setHibpError] = useState('');

  const handlePasswordChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const newPassword = e.target.value;
    setPassword(newPassword);
    setError('');
    setHibpMessage('');
    setHibpError('');

    if (!newPassword) return;

    // First validate strength
    const strengthCheck = validatePasswordStrength(newPassword);
    if (!strengthCheck.isValid) {
      setError(strengthCheck.errors[0]);
      return;
    }

    // If password meets strength requirements, check HIBP
    setIsCheckingPassword(true);
    const hibpResult = await checkPasswordWithHibp(newPassword);
    setIsCheckingPassword(false);

    if (hibpResult.error) {
      setHibpError(hibpResult.error);
    } else if (!hibpResult.isSecure) {
      setError(
        `Password has been compromised in ${hibpResult.leakCount} breaches. Please choose a different password.`
      );
    } else {
      setHibpMessage('✓ Password is secure and not found in known breaches');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    // SECURITY: Enforce strong password
    if (!isStrongPassword(password)) {
      setError('Password does not meet security requirements');
      return;
    }

    setLoading(true);

    const result = await register(email, password, fullName);

    if (result.success) {
      setSuccess('Registration successful! Your account is pending verification.');
      setTimeout(() => {
        onSwitchToLogin();
      }, 2000);
    } else {
      setError(result.error || 'Registration failed');
    }

    setLoading(false);
  };

  const passwordFeedback = getPasswordStrengthFeedback(password);
  const passwordIsStrong = isStrongPassword(password);

  return (
    <AuthLayout variant="register">
      <div className="relative">
        <div className="absolute -left-4 -top-6 hidden h-20 w-20 rounded-full bg-emerald-100 md:block" aria-hidden="true" />
        <div className="absolute -right-6 -bottom-8 hidden h-24 w-24 rounded-full bg-emerald-200/80 md:block" aria-hidden="true" />

        <div className="relative overflow-hidden rounded-3xl border border-slate-100 bg-white/95 backdrop-blur-sm shadow-xl px-8 py-10">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-green-600 rounded-xl mb-4 shadow-lg shadow-emerald-200/60">
              <UserPlus className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Create Account</h1>
            <p className="text-slate-600 mt-2">Join NRETech OneHub</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                {error}
              </div>
            )}

            {success && (
              <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
                {success}
              </div>
            )}

            <div className="space-y-2">
              <label className="block text-sm font-semibold text-slate-700">
                Full Name
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 shadow-sm transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-200"
                placeholder="John Doe"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-semibold text-slate-700">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 shadow-sm transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-200"
                placeholder="your.email@example.com"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-semibold text-slate-700">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={handlePasswordChange}
                required
                minLength={12}
                disabled={isCheckingPassword}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 shadow-sm transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-200 disabled:opacity-50"
                placeholder="••••••••••••"
              />
              {isCheckingPassword && (
                <p className="mt-2 text-sm text-slate-500 animate-pulse">Checking password security...</p>
              )}
              {password && (
                <div
                  className={`mt-2 rounded-xl border p-3 text-sm ${
                    passwordIsStrong
                      ? 'border-green-200 bg-green-50 text-green-700'
                      : 'border-yellow-200 bg-yellow-50 text-yellow-700'
                  }`}
                >
                  {passwordIsStrong ? (
                    <div className="font-semibold">✓ Strong password</div>
                  ) : (
                    <div>
                      <div className="font-semibold mb-1">Password must have:</div>
                      <ul className="list-disc list-inside space-y-1">
                        {passwordFeedback.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
              {hibpMessage && <p className="mt-2 text-sm text-emerald-600 font-medium">{hibpMessage}</p>}
              {hibpError && <p className="mt-2 text-sm text-slate-500">{hibpError}</p>}
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-semibold text-slate-700">
                Confirm Password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={12}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 shadow-sm transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-200"
                placeholder="••••••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading || !passwordIsStrong || !fullName || !email}
              className="w-full rounded-xl bg-green-600 py-3 text-sm font-semibold uppercase tracking-[0.25em] text-white transition hover:bg-green-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
              aria-busy={loading}
            >
              {loading ? 'Creating Account...' : 'Create Account'}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-slate-600">
            <span>Already have an account? </span>
            <button
              onClick={onSwitchToLogin}
              className="font-semibold text-green-600 hover:text-green-700 transition"
            >
              Sign In
            </button>
          </div>
        </div>
      </div>
    </AuthLayout>
  );
}
