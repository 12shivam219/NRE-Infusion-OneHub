import { ReactNode } from 'react';
import { AuthPromoPanel } from './AuthPromoPanel';

type AuthLayoutProps = {
  children: ReactNode;
  variant?: 'login' | 'register';
};

export const AuthLayout = ({ children, variant = 'login' }: AuthLayoutProps) => {
  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-slate-100 px-3 py-4 sm:px-4 sm:py-5 md:py-6">
      <div className="mx-auto grid w-full max-w-6xl grid-cols-1 overflow-hidden rounded-2xl bg-white shadow-2xl sm:rounded-3xl md:min-h-[640px] lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
        <div className="flex min-h-[500px] flex-col items-center justify-center px-3 py-6 sm:min-h-auto sm:px-4 md:px-6 lg:px-12 lg:py-10">
          <div className="w-full max-w-md">{children}</div>
        </div>
        <div className="relative hidden flex-col overflow-hidden border-l border-slate-100/60 lg:flex">
          <AuthPromoPanel variant={variant} />
        </div>
        <div className="relative flex min-h-[280px] flex-col overflow-hidden border-t border-slate-100 sm:min-h-[320px] lg:hidden">
          <AuthPromoPanel variant={variant} />
        </div>
      </div>
    </div>
  );
};
