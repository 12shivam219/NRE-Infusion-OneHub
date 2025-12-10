import { useState } from 'react';
import { UserPlus } from 'lucide-react';
import { register } from '../../lib/auth';

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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-green-600 rounded-xl mb-4">
            <UserPlus className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Create Account</h1>
          <p className="text-gray-600 mt-2">Join NRE Infusion OneHub Suite</p>
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

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Full Name
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition"
              placeholder="John Doe"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={12}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition"
              placeholder="••••••••••••"
            />
            {password && (
              <div className={`mt-2 p-3 rounded-lg text-sm ${
                passwordIsStrong 
                  ? 'bg-green-50 border border-green-200' 
                  : 'bg-yellow-50 border border-yellow-200'
              }`}>
                {passwordIsStrong ? (
                  <div className="text-green-700">✓ Strong password</div>
                ) : (
                  <div className="text-yellow-700">
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
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Confirm Password
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={8}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading || !passwordIsStrong || !fullName || !email}
            className="w-full bg-green-600 text-white py-3 rounded-lg font-medium hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            aria-busy={loading}
          >
            {loading ? 'Creating Account...' : 'Create Account'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-gray-600">
            Already have an account?{' '}
            <button
              onClick={onSwitchToLogin}
              className="text-green-600 font-medium hover:text-green-700 transition"
            >
              Sign In
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};
