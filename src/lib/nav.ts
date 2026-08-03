import { effectiveRole } from '@/lib/utils';

// Effective roles (planner trio + manager collapse to `manager`;
// founder is distinct and sits above executive).
type Role =
  | 'founder'
  | 'executive'
  | 'manager'
  | 'group_supervisor'
  | 'assistant_supervisor'
  | 'specialist_teacher'
  | 'parent'
  | 'student';

export type NavItem = { href: string; key: string; roles: Role[] };
export type NavGroup = { key: string; items: NavItem[] };

const ALL: Role[] = [
  'founder',
  'executive',
  'manager',
  'group_supervisor',
  'assistant_supervisor',
  'specialist_teacher',
  'parent',
  'student',
];

// Management tier (founder ≥ executive ≥ manager) and the common staff
// sets, so founder mirrors executive everywhere without duplicating it
// by hand.
const MGMT: Role[] = ['founder', 'executive', 'manager'];
const TOP: Role[] = ['founder', 'executive']; // founder + executive only
const MGMT_GROUP: Role[] = [...MGMT, 'group_supervisor'];
const MGMT_STAFF: Role[] = [...MGMT, 'group_supervisor', 'assistant_supervisor'];
const GROUP_STAFF: Role[] = ['group_supervisor', 'assistant_supervisor'];
// Everyone on staff, including specialist teachers (activity library).
const STAFF_ALL: Role[] = [...MGMT_STAFF, 'specialist_teacher'];

// Grouped sidebar map.
export const NAV_GROUPS: NavGroup[] = [
  {
    key: 'myDay',
    items: [
      { href: '/dashboard', key: 'overview', roles: ALL },
      { href: '/dashboard/ops', key: 'opsBoard', roles: MGMT },
      { href: '/dashboard/live', key: 'today', roles: MGMT_STAFF },
      { href: '/dashboard/attendance', key: 'attendance', roles: GROUP_STAFF },
      { href: '/dashboard/reports', key: 'reports', roles: MGMT_STAFF },
      { href: '/dashboard/recognition', key: 'recognition', roles: GROUP_STAFF },
      { href: '/dashboard/progress', key: 'myChild', roles: ['parent', 'student'] },
    ],
  },
  {
    key: 'program',
    items: [
      { href: '/dashboard/schedule', key: 'schedule', roles: [...MGMT_STAFF, 'parent', 'student'] },
      { href: '/dashboard/master-schedule', key: 'masterSchedule', roles: STAFF_ALL },
      { href: '/dashboard/activities', key: 'activities', roles: STAFF_ALL },
      { href: '/dashboard/books', key: 'books', roles: ALL },
      { href: '/dashboard/stories', key: 'stories', roles: MGMT_STAFF },
      { href: '/dashboard/programs', key: 'programs', roles: MGMT },
      { href: '/dashboard/groups', key: 'groups', roles: MGMT },
      { href: '/dashboard/rooms', key: 'rooms', roles: MGMT },
    ],
  },
  {
    key: 'people',
    items: [
      { href: '/dashboard/group', key: 'myGroup', roles: GROUP_STAFF },
      { href: '/dashboard/transfers', key: 'transfers', roles: MGMT },
      { href: '/dashboard/announcements', key: 'announcements', roles: STAFF_ALL },
      { href: '/dashboard/chat', key: 'chat', roles: ALL },
      { href: '/dashboard/dm', key: 'dm', roles: [...MGMT_STAFF, 'parent'] },
      { href: '/dashboard/gallery', key: 'gallery', roles: [...MGMT_STAFF, 'parent'] },
    ],
  },
  {
    key: 'operations',
    items: [
      { href: '/dashboard/payments', key: 'payments', roles: TOP },
      { href: '/dashboard/analytics', key: 'analytics', roles: MGMT },
      { href: '/dashboard/inventory', key: 'inventory', roles: MGMT_STAFF },
      { href: '/dashboard/slips', key: 'slips', roles: [...MGMT_GROUP, 'parent'] },
      { href: '/dashboard/feedback', key: 'feedback', roles: [...MGMT, 'parent'] },
      { href: '/dashboard/digest', key: 'digest', roles: [...TOP, 'group_supervisor', 'parent'] },
      { href: '/dashboard/substitute', key: 'substitute', roles: MGMT_STAFF },
      { href: '/dashboard/issues', key: 'issues', roles: STAFF_ALL },
      { href: '/dashboard/pickup', key: 'pickup', roles: [...TOP, 'group_supervisor', 'assistant_supervisor', 'parent'] },
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
