import type { AppRole } from '@/lib/supabase/database.types';

export type NavItem = {
  href: string;
  key: string;
  roles: AppRole[];
};

const ALL: AppRole[] = [
  'executive',
  'program_supervisor',
  'program_manager',
  'group_supervisor',
  'assistant_supervisor',
  'parent',
  'student',
];

export const NAV: NavItem[] = [
  { href: '/dashboard', key: 'overview', roles: ALL },
  {
    href: '/dashboard/attendance',
    key: 'attendance',
    roles: ['executive', 'program_supervisor', 'program_manager', 'group_supervisor', 'assistant_supervisor'],
  },
  {
    href: '/dashboard/reports',
    key: 'reports',
    roles: ['executive', 'program_supervisor', 'program_manager', 'group_supervisor', 'assistant_supervisor', 'parent'],
  },
  {
    href: '/dashboard/progress',
    key: 'myChild',
    roles: ['executive', 'program_supervisor', 'group_supervisor', 'assistant_supervisor', 'parent', 'student'],
  },
  { href: '/dashboard/chat', key: 'chat', roles: ALL },
  { href: '/dashboard/books', key: 'books', roles: ALL },
  {
    href: '/dashboard/gallery',
    key: 'gallery',
    roles: ['executive', 'program_supervisor', 'program_manager', 'group_supervisor', 'assistant_supervisor', 'parent'],
  },
  { href: '/dashboard/consent', key: 'consent', roles: ['parent'] },
  {
    href: '/dashboard/schedule',
    key: 'schedule',
    roles: ['executive', 'program_supervisor', 'program_manager', 'group_supervisor', 'student', 'parent'],
  },
  {
    href: '/dashboard/payments',
    key: 'payments',
    roles: ['executive', 'parent'],
  },
  {
    href: '/dashboard/analytics',
    key: 'analytics',
    roles: ['executive', 'program_supervisor'],
  },
];

export function navFor(role: AppRole) {
  return NAV.filter((n) => n.roles.includes(role));
}
