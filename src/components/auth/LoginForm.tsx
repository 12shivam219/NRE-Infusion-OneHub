import { useState } from 'react';
import { LogIn } from 'lucide-react';
import { login } from '../../lib/auth';
import { AuthLayout } from './AuthLayout';

interface LoginFormProps {
  onSuccess: () => void;
  onSwitchToRegister: () => void;
}

export const LoginForm = ({ onSuccess, onSwitchToRegister }: LoginFormProps) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Validate inputs
    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      setError('Please enter a valid email address');
      setLoading(false);
      return;
    }

    // Validate password is not empty
    if (!trimmedPassword) {
      setError('Password is required');
      setLoading(false);
      return;
    }

    // Validate password is at least 6 characters (Supabase minimum)
    if (trimmedPassword.length < 6) {
      setError('Password must be at least 6 characters');
      setLoading(false);
      return;
    }

    const result = await login(trimmedEmail, trimmedPassword);

    if (result.success) {
      onSuccess();
    } else {
      setError(result.error || 'Login failed');
    }

    setLoading(false);
  };

  return (
    <AuthLayout variant="login">
      <div className="w-full">
        <div className="relative w-full overflow-hidden rounded-3xl border border-slate-200 bg-white px-6 py-8 shadow-sm md:px-8 md:py-10">
          {/* Decorative elements - more subtle */}
          <div className="absolute -right-20 -top-20 h-40 w-40 rounded-full bg-blue-50/40 blur-3xl" aria-hidden="true" />
          <div className="absolute -left-20 -bottom-20 h-40 w-40 rounded-full bg-slate-100/30 blur-3xl" aria-hidden="true" />

          <div className="relative">
            <div className="mb-8 space-y-2 text-center md:mb-10">
              <div className="inline-flex h-14 w-14 items-center justify-center rounded-xl bg-blue-600 shadow-lg shadow-blue-600/20">
                <LogIn className="h-7 w-7 text-white" aria-hidden="true" />
              </div>
              <div className="space-y-1.5 pt-2 md:pt-3">
                <h1 className="text-3xl font-bold text-slate-900 md:text-4xl">Welcome Back</h1>
                <p className="text-sm text-slate-600 md:text-base">Sign in to your NRETech OneHub account</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5 md:space-y-6">
              {error && (
                <div
                  className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
                  role="alert"
                  aria-live="polite"
                >
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <label htmlFor="email" className="block text-sm font-medium text-slate-700">
                  Email Address
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  aria-required="true"
                  autoComplete="email"
                  className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 placeholder-slate-500 transition-all duration-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-none"
                  placeholder="you@example.com"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="password" className="block text-sm font-medium text-slate-700">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  aria-required="true"
                  autoComplete="current-password"
                  className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 placeholder-slate-500 transition-all duration-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-none"
                  placeholder="••••••••"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-lg bg-blue-600 py-3 text-sm font-semibold text-white transition-all duration-200 hover:bg-blue-700 active:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-slate-300"
                aria-busy={loading}
              >
                {loading ? 'Signing in...' : 'Sign In'}
              </button>
            </form>

            <div className="mt-6 text-center text-sm text-slate-600 md:mt-8">
              <span>Don't have an account? </span>
              <button
                onClick={onSwitchToRegister}
                className="font-semibold text-blue-600 hover:text-blue-700 transition-colors"
                aria-label="Switch to registration form"
              >
                Create Account
              </button>
            </div>
          </div>
        </div>
      </div>
    </AuthLayout>
  );
};
