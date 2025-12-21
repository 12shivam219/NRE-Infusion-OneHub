import type { LucideIcon } from 'lucide-react';
import {
  LayoutDashboard,
  LineChart,
  Briefcase,
  Users,
  Bot,
  MessagesSquare,
} from 'lucide-react';
import type { ThemeKey } from '../../contexts/ThemeSyncContext';

export type NavigationItem = {
  id: string;
  label: string;
  description?: string;
  href: string;
  icon: LucideIcon;
  roles?: string[];
  themeKey: ThemeKey;
};

export const NAV_ITEMS: NavigationItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    description: 'Mission telemetry at a glance',
    href: '/dashboard',
    icon: LayoutDashboard,
    roles: ['user', 'marketing', 'admin'],
    themeKey: 'dashboard',
  },
  {
    id: 'crm',
    label: 'CRM Command',
    description: 'Campaign intelligence and outreach',
    href: '/crm?view=dashboard',
    icon: LineChart,
    roles: ['user', 'marketing', 'admin'],
    themeKey: 'crm',
  },
  {
    id: 'requirements',
    label: 'Requirements',
    description: 'Active engagements and pipelines',
    href: '/crm?view=requirements',
    icon: Briefcase,
    roles: ['user', 'marketing', 'admin'],
    themeKey: 'requirements',
  },
  {
    id: 'interviews',
    label: 'Interviews',
    description: 'Conversation timelines and scheduling',
    href: '/crm?view=interviews',
    icon: MessagesSquare,
    roles: ['user', 'marketing', 'admin'],
    themeKey: 'interviews',
  },
  {
    id: 'consultants',
    label: 'Consultants',
    description: 'Expert network and availability',
    href: '/crm?view=consultants',
    icon: Users,
    roles: ['user', 'marketing', 'admin'],
    themeKey: 'consultants',
  },
  {
    id: 'automation',
    label: 'AI Automation',
    description: 'Systems intelligence and orchestration',
    href: '/admin',
    icon: Bot,
    roles: ['admin'],
    themeKey: 'ai',
  },
];
