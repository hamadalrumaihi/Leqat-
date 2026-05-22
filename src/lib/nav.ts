import { effectiveRole } from '@/lib/utils';

// Effective roles (the three planner roles are collapsed to one).
type Role =
  | 'executive'
  | 'program_planner'
  | 'group_supervisor'
  | 'assistant_supervisor'
  | 'parent'
  | 'student';

export type NavItem = { href: string; key: string; roles: Role[] };
export type NavGroup = { key: string; items: NavItem[] };

const ALL: Role[] = [
  'executive',
  'program_planner',
  'group_supervisor',
  'assistant_supervisor',
  'parent',
  'student',
];

// Grouped sidebar map. Mirrors §15 of the UI brief, limited to routes
// that exist today; schema-dependent items (pickup queue, all-programs,
// audit log, profile) arrive with the 0006 UI phase.
export const NAV_GROUPS: NavGroup[] = [
  {
    key: 'myDay',
    items: [
      { href: '/dashboard', key: 'overview', roles: ALL },
      {
        href: '/dashboard/live',
        key: 'today',
        roles: ['executive', 'program_planner', 'group_supervisor', 'assistant_supervisor'],
      },
      { href: '/dashboard/attendance', key: 'attendance', roles: ['group_supervisor', 'assistant_supervisor'] },
      {
        href: '/dashboard/reports',
        key: 'reports',
        roles: ['executive', 'program_planner', 'group_supervisor', 'assistant_supervisor'],
      },
      { href: '/dashboard/recognition', key: 'recognition', roles: ['group_supervisor', 'assistant_supervisor'] },
      { href: '/dashboard/progress', key: 'myChild', roles: ['parent', 'student'] },
    ],
  },
  {
    key: 'program',
    items: [
      {
        href: '/dashboard/schedule',
        key: 'schedule',
        roles: ['executive', 'program_planner', 'group_supervisor', 'assistant_supervisor', 'parent', 'student'],
      },
      { href: '/dashboard/books', key: 'books', roles: ALL },
      { href: '/dashboard/stories', key: 'stories', roles: ['executive', 'program_planner', 'group_supervisor', 'assistant_supervisor'] },
      { href: '/dashboard/programs', key: 'programs', roles: ['executive', 'program_planner'] },
      { href: '/dashboard/groups', key: 'groups', roles: ['executive', 'program_planner'] },
    ],
  },
  {
    key: 'people',
    items: [
      { href: '/dashboard/group', key: 'myGroup', roles: ['group_supervisor', 'assistant_supervisor'] },
      { href: '/dashboard/chat', key: 'chat', roles: ALL },
      {
        href: '/dashboard/dm',
        key: 'dm',
        roles: ['executive', 'program_planner', 'group_supervisor', 'assistant_supervisor', 'parent'],
      },
      {
        href: '/dashboard/gallery',
        key: 'gallery',
        roles: ['executive', 'program_planner', 'group_supervisor', 'assistant_supervisor', 'parent'],
      },
    ],
  },
  {
    key: 'operations',
    items: [
      { href: '/dashboard/payments', key: 'payments', roles: ['executive'] },
      { href: '/dashboard/analytics', key: 'analytics', roles: ['executive', 'program_planner'] },
      {
        href: '/dashboard/inventory',
        key: 'inventory',
        roles: ['executive', 'program_planner', 'group_supervisor', 'assistant_supervisor'],
      },
      { href: '/dashboard/slips', key: 'slips', roles: ['executive', 'program_planner', 'group_supervisor', 'parent'] },
      { href: '/dashboard/feedback', key: 'feedback', roles: ['executive', 'program_planner', 'parent'] },
      { href: '/dashboard/digest', key: 'digest', roles: ['executive', 'group_supervisor', 'parent'] },
      {
        href: '/dashboard/substitute',
        key: 'substitute',
        roles: ['executive', 'program_planner', 'group_supervisor', 'assistant_supervisor'],
      },
      {
        href: '/dashboard/pickup',
        key: 'pickup',
        roles: ['executive', 'group_supervisor', 'assistant_supervisor', 'parent'],
      },
    ],
  },
  {
    key: 'settings',
    items: [
      { href: '/dashboard/consent', key: 'consent', roles: ['parent'] },
      { href: '/dashboard/authorized', key: 'authorized', roles: ['parent'] },
    ],
  },
];

/** Groups (with non-empty item lists) visible to the given role. */
export function navGroupsFor(rawRole: string): NavGroup[] {
  const role = effectiveRole(rawRole) as Role;
  return NAV_GROUPS.map((g) => ({
    key: g.key,
    items: g.items.filter((i) => i.roles.includes(role)),
  })).filter((g) => g.items.length > 0);
}
