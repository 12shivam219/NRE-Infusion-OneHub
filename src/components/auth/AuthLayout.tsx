import { ReactNode } from 'react';
import { AuthPromoPanel } from './AuthPromoPanel';

type AuthLayoutProps = {
  children: ReactNode;
  variant?: 'login' | 'register';
};

export const AuthLayout = ({ children, variant = 'login' }: AuthLayoutProps) => {
  return (
    <div className="min-h-screen bg-slate-100">
      <div className="mx-auto grid min-h-screen w-full max-w-6xl grid-cols-1 overflow-hidden rounded-3xl bg-white shadow-2xl md:grid-cols-2">
        <div className="order-2 flex items-center justify-center p-6 md:order-1 md:p-10 lg:p-16">
          <div className="w-full max-w-md">{children}</div>
        </div>
        <div className="order-1 hidden md:block"><AuthPromoPanel variant={variant} /></div>
      </div>
    </div>
  );
};
