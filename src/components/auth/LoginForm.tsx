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

    const result = await login(email, password);

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

        <div className="relative overflow-hidden rounded-3xl border border-slate-100 bg-white/90 backdrop-blur-sm shadow-xl px-8 py-10">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-700 rounded-xl mb-4 shadow-lg shadow-primary-200/50">
              <LogIn className="w-8 h-8 text-white" aria-hidden="true" />
            </div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Welcome Back</h1>
            <p className="text-slate-600 mt-2">Sign in to NRETech OneHub</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div
                className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg"
                role="alert"
                aria-live="polite"
              >
                {error}
              </div>
            )}

            <div className="space-y-2">
              <label htmlFor="email" className="block text-sm font-semibold text-slate-700">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                aria-required="true"
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 shadow-sm transition focus:border-amber-400 focus:ring-2 focus:ring-amber-200"
                placeholder="you@example.com"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="block text-sm font-semibold text-slate-700">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                aria-required="true"
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 shadow-sm transition focus:border-amber-400 focus:ring-2 focus:ring-amber-200"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-primary-700 py-3 text-sm font-semibold uppercase tracking-[0.25em] text-white transition hover:bg-primary-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 disabled:cursor-not-allowed disabled:opacity-60"
              aria-busy={loading}
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-slate-600">
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
