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
    <div className="relative min-h-full w-full overflow-hidden bg-gradient-to-br from-[#0b1220] via-[#0f172a] to-[#05070a] text-white">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="hidden sm:block absolute inset-y-0 left-[-30%] w-[60%] bg-[radial-gradient(circle_at_center,_rgba(234,179,8,0.2),_transparent_75%)] blur-3xl" />
        <div className="hidden sm:block absolute inset-y-0 right-[-25%] w-[55%] bg-[radial-gradient(circle_at_center,_rgba(234,179,8,0.15),_transparent_70%)] blur-3xl" />
      </div>
      <div className="relative flex h-full flex-col gap-4 px-3 py-6 sm:gap-5 sm:px-5 sm:py-8 md:gap-6 md:px-6 md:py-10 lg:gap-8 lg:px-10 lg:py-12">
        <div className="space-y-2 text-pretty sm:space-y-2.5">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-2.5 py-0.5 text-[0.6rem] font-semibold uppercase tracking-[0.3em] text-amber-200 sm:px-3 sm:text-[0.65rem] md:text-[0.7rem]">
            <Award className="h-3 w-3 sm:h-3.5 sm:w-3.5" aria-hidden="true" />
            NRETech OneHub
          </span>
          <h1 className="text-balance text-[clamp(1.1rem,3vw,2.25rem)] font-semibold leading-tight">
            Your talent operations, perfectly in orbit.
          </h1>
          <p className="max-w-xl text-pretty text-[0.7rem] leading-snug text-white/80 sm:text-[0.75rem] md:text-[0.8125rem] md:leading-relaxed">
            Centralize resumes, CRM, interviews, and outreach in a single intelligent workspace built for premium staffing teams.
          </p>
        </div>

        <div className="grid gap-2 sm:gap-3 md:gap-4">
          {features.map(({ icon: Icon, title, description }) => (
            <div key={title} className="flex items-start gap-2.5 rounded-lg bg-white/5 p-2.5 backdrop-blur-sm sm:rounded-xl sm:bg-transparent sm:gap-3 sm:p-0 md:gap-3.5">
              <div className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-white/10 text-amber-300 sm:h-9 sm:w-9 md:h-10 md:w-10">
                <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4 md:h-5 md:w-5" aria-hidden="true" />
              </div>
              <div className="space-y-0.5 text-pretty sm:space-y-0.5">
                <p className="text-[0.7rem] font-semibold uppercase tracking-wide text-amber-200/90 sm:text-[0.75rem] md:text-[0.8125rem]">{title}</p>
                <p className="text-[0.65rem] leading-snug text-white/70 sm:text-[0.7rem] md:text-[0.75rem] md:leading-snug">{description}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-auto space-y-1.5 sm:space-y-2">
          <p className="text-[0.55rem] uppercase tracking-[0.35em] text-white/60 sm:text-[0.6rem] md:text-[0.65rem]">
            One platform. Every mission-critical orbit.
          </p>
        </div>
      </div>
    </div>
  );
};
