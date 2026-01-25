import { ReactNode } from 'react';
import { AuthPromoPanel } from './AuthPromoPanel';

type AuthLayoutProps = {
  children: ReactNode;
  variant?: 'login' | 'register';
};

export const AuthLayout = ({ children, variant = 'login' }: AuthLayoutProps) => {
  return (
    <div className="flex min-h-screen w-full items-center justify-center overflow-x-hidden bg-white px-4 py-8 sm:px-6 sm:py-10 md:py-12 lg:py-16">
      <div className="grid w-full max-w-7xl grid-cols-1 overflow-hidden rounded-3xl bg-white border border-slate-200 shadow-lg lg:grid-cols-[1fr_1.1fr]">
        {/* Left: Login Form Section */}
        <div className="flex min-h-[600px] flex-col items-center justify-center px-6 py-12 sm:px-8 sm:py-14 md:min-h-[680px] md:px-10 md:py-16 lg:min-h-auto lg:px-14">
          <div className="w-full max-w-md">{children}</div>
        </div>
        
        {/* Right: Promo Panel - Desktop */}
        <div className="relative hidden flex-col overflow-hidden border-l border-slate-200 lg:flex">
          <AuthPromoPanel variant={variant} />
        </div>
        
        {/* Promo Panel - Mobile/Tablet */}
        <div className="relative flex min-h-[320px] flex-col overflow-hidden border-t border-slate-200 sm:min-h-[360px] lg:hidden">
          <AuthPromoPanel variant={variant} />
        </div>
      </div>
    </div>
  );
};
