import { ArrowRight, Award, ShieldCheck, Workflow, Sparkles } from 'lucide-react';

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
  const primaryCtaLabel = variant === 'login' ? 'Launch OneHub' : 'Create my OneHub account';

  return (
    <div className="relative h-full w-full bg-gradient-to-br from-[#0b1220] via-[#0f172a] to-[#05070a] text-white overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-y-0 left-[-30%] w-[60%] bg-[radial-gradient(circle_at_center,_rgba(234,179,8,0.2),_transparent_75%)] blur-3xl" />
        <div className="absolute inset-y-0 right-[-25%] w-[55%] bg-[radial-gradient(circle_at_center,_rgba(234,179,8,0.15),_transparent_70%)] blur-3xl" />
      </div>
      <div className="relative h-full py-12 px-8 md:px-12 flex flex-col gap-10">
        <div className="space-y-4">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-amber-200">
            <Award className="h-4 w-4" aria-hidden="true" />
            NRETech OneHub
          </span>
          <h1 className="text-3xl md:text-4xl 2xl:text-5xl font-semibold leading-tight">
            Your talent operations, perfectly in orbit.
          </h1>
          <p className="text-base md:text-lg text-white/80 leading-relaxed max-w-xl">
            Centralize resumes, CRM, interviews, and outreach in a single intelligent workspace built for premium staffing teams.
          </p>
        </div>

        <div className="grid gap-4">
          {features.map(({ icon: Icon, title, description }) => (
            <div key={title} className="flex items-start gap-4">
              <div className="mt-1 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-white/10 text-amber-300">
                <Icon className="h-5 w-5" aria-hidden="true" />
              </div>
              <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-amber-200/80">{title}</p>
                <p className="text-sm text-white/70 leading-relaxed">{description}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-auto space-y-3">
          <button
            type="button"
            className="group inline-flex items-center gap-2 rounded-xl bg-amber-400/90 px-6 py-3 text-sm font-semibold text-gray-900 transition duration-200 hover:bg-amber-300"
            aria-label={primaryCtaLabel}
          >
            {primaryCtaLabel}
            <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" aria-hidden="true" />
          </button>
          <p className="text-xs uppercase tracking-[0.35em] text-white/50">
            One platform. Every mission-critical orbit.
          </p>
        </div>
      </div>
    </div>
  );
};
