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
      <div className="relative">
        <div className="absolute -left-4 -top-6 hidden h-20 w-20 rounded-full bg-primary-100 md:block" aria-hidden="true" />
        <div className="absolute -right-6 -bottom-8 hidden h-24 w-24 rounded-full bg-amber-100/80 md:block" aria-hidden="true" />

        <div className="relative w-full overflow-hidden rounded-2xl border border-slate-100 bg-white/90 px-3 py-4 shadow-xl backdrop-blur-sm sm:rounded-3xl sm:px-5 sm:py-5 md:px-6 md:py-6">
          <div className="mb-4 space-y-2 text-center sm:mb-5 sm:space-y-2.5">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-lg bg-primary-700 shadow-lg shadow-primary-200/50 sm:h-13 sm:w-13">
              <LogIn className="h-6 w-6 text-white sm:h-6.5 sm:w-6.5" aria-hidden="true" />
            </div>
            <div className="space-y-0.5 sm:space-y-1">
              <h1 className="text-[clamp(1.25rem,3.5vw,2rem)] font-bold tracking-tight text-slate-900">Welcome Back</h1>
              <p className="text-[0.75rem] text-slate-600 sm:text-[0.8125rem] md:text-sm">Sign in to NRETech OneHub</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-3.5 md:space-y-4">
            {error && (
              <div
                className="rounded-lg border border-red-200 bg-red-50 px-2.5 py-1.5 text-[0.75rem] text-red-700 sm:px-3 sm:py-2 sm:text-[0.8125rem]"
                role="alert"
                aria-live="polite"
              >
                {error}
              </div>
            )}

            <div className="space-y-1 sm:space-y-1.5">
              <label htmlFor="email" className="block text-[0.75rem] font-semibold text-slate-700 sm:text-[0.8125rem]">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                aria-required="true"
                className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[0.75rem] text-slate-900 shadow-sm transition sm:rounded-lg sm:px-3 sm:py-2 sm:text-[0.8125rem] focus:border-amber-400 focus:ring-2 focus:ring-amber-200"
                placeholder="you@example.com"
              />
            </div>

            <div className="space-y-1 sm:space-y-1.5">
              <label htmlFor="password" className="block text-[0.75rem] font-semibold text-slate-700 sm:text-[0.8125rem]">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                aria-required="true"
                className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[0.75rem] text-slate-900 shadow-sm transition sm:rounded-lg sm:px-3 sm:py-2 sm:text-[0.8125rem] focus:border-amber-400 focus:ring-2 focus:ring-amber-200"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-primary-700 py-1.5 text-[0.75rem] font-semibold uppercase tracking-[0.25em] text-white transition hover:bg-primary-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 disabled:cursor-not-allowed disabled:opacity-60 sm:rounded-lg sm:py-2 sm:text-[0.8125rem]"
              aria-busy={loading}
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <div className="mt-2.5 text-center text-[0.75rem] text-slate-600 sm:mt-3.5 sm:text-[0.8125rem] md:text-xs">
            <span>Don't have an account? </span>
            <button
              onClick={onSwitchToRegister}
              className="font-semibold text-primary-700 hover:text-primary-900 transition"
              aria-label="Switch to registration form"
            >
              Create Account
            </button>
          </div>
        </div>
      </div>
    </AuthLayout>
  );
};
