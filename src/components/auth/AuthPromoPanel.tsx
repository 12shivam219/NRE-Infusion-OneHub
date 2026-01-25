import { Award, ShieldCheck, Workflow, Sparkles } from 'lucide-react';

interface AuthPromoPanelProps {
  variant?: 'login' | 'register';
}

const features = [
  {
    icon: Workflow,
    title: 'Resume intelligence',
    description: 'Import, version, and deliver DOCX-ready resumes with collaborative editing.',
  },
  {
    icon: Sparkles,
    title: 'Pipeline mastery',
    description: 'Track requirements, interviews, and consultants with live status telemetry.',
  },
  {
    icon: ShieldCheck,
    title: 'Enterprise safeguards',
    description: 'JWT auth, granular roles, audit logs, and rate limiting keep every action protected.',
  },
];

export const AuthPromoPanel = ({ variant = 'login' }: AuthPromoPanelProps) => {
  const heroCopy =
    variant === 'login'
      ? 'Centralize resumes, CRM, interviews, and outreach in a single intelligent workspace built for premium staffing teams.'
      : 'Spin up your unified staffing command center with CRM, resume intelligence, and interview orchestration all working from day one.';

  return (
    <div className="relative min-h-full w-full overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
      {/* Subtle gradient elements */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -right-40 -top-40 h-80 w-80 rounded-full bg-blue-500/10 blur-3xl" />
        <div className="absolute -left-40 -bottom-40 h-80 w-80 rounded-full bg-blue-500/5 blur-3xl" />
      </div>

      <div className="relative flex h-full flex-col gap-8 px-6 py-10 sm:gap-10 sm:px-8 sm:py-12 md:gap-12 md:px-10 md:py-14 lg:gap-10 lg:px-12 lg:py-14">
        {/* Header Section */}
        <div className="space-y-4 text-pretty sm:space-y-5 md:space-y-6">
          <span className="inline-flex items-center gap-2 rounded-full bg-blue-500/20 border border-blue-400/30 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-blue-300">
            <Award className="h-4 w-4" aria-hidden="true" />
            NRETech OneHub
          </span>
          <h2 className="text-balance text-4xl font-bold leading-tight text-white sm:text-5xl md:text-[2.75rem] lg:text-5xl">
            Your talent operations, perfectly in orbit.
          </h2>
          <p className="max-w-lg text-balance text-base leading-relaxed text-slate-300 sm:text-lg md:text-lg">
            {heroCopy}
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid gap-4 sm:gap-5 md:gap-6">
          {features.map(({ icon: Icon, title, description }) => (
            <div key={title} className="flex items-start gap-4 rounded-xl bg-white/5 border border-white/10 p-4 backdrop-blur-sm transition-colors hover:bg-white/8 sm:rounded-xl sm:gap-4 sm:p-4 md:gap-4 md:p-4">
              <div className="mt-1 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-blue-500/20 border border-blue-400/30 text-blue-200 sm:h-12 sm:w-12 md:h-12 md:w-12">
                <Icon className="h-5 w-5 sm:h-6 sm:w-6 md:h-6 md:w-6" aria-hidden="true" />
              </div>
              <div className="space-y-1.5 text-pretty flex-1">
                <p className="text-sm font-semibold uppercase tracking-wide text-blue-200 sm:text-sm md:text-base">{title}</p>
                <p className="text-sm leading-relaxed text-slate-300 sm:text-sm md:text-base">{description}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Footer Text */}
        <div className="mt-auto pt-4 sm:pt-6 md:pt-8">
          <p className="text-xs uppercase tracking-wider text-slate-400">
            One platform. Every mission-critical orbit.
          </p>
        </div>
      </div>
    </div>
  );
};
