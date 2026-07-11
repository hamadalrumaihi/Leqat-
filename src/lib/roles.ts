import { effectiveRole } from '@/lib/utils';

// ── Single source of truth for role-based capability gates ──────────
//
// Server actions previously hard-coded inconsistent role arrays and
// checked the RAW role, so a `program_planner` account (the documented
// planner role, which effectiveRole collapses the legacy trio onto)
// was silently denied slips, substitute, gallery, inventory, and DM.
// Every gate now resolves through effectiveRole and this capability
// map, so the three planner-tier values behave identically.
//
// Effective roles after effectiveRole():
//   founder | executive | manager | group_supervisor |
//   assistant_supervisor | parent | student
// (program_supervisor / program_manager / program_planner / manager → manager)
// Founder holds ≥ Executive authority, so it appears wherever executive
// does (and RLS grants it the same via is_executive() including founder).
//
// These gates are convenience/UX authorization. Row-level authority is
// still enforced by Supabase RLS — never trust these alone for data
// access.

export type Capability =
  | 'managePrograms' // create/edit programs, generate invites
  | 'manageGroups' // create/edit groups + color
  | 'manageRoster' // search-to-add / remove students
  | 'planSchedule' // create sessions/stations, publish
  | 'manageSlips' // create permission slips
  | 'manageSubstitute' // generate substitute links, view substitute page
  | 'staffGallery' // create albums, upload, generate highlights
  | 'manageInventory' // checkout/return, add items
  | 'useDm' // start staff↔student DMs
  | 'moderateChat' // approve media, toggle parents_can_post
  | 'staffBooks' // workbook progress editor, signed PDF
  | 'staffPickup' // pickup queue + release
  | 'awardRecognition'; // award معنوي tokens

const FOUNDER = 'founder';
const MANAGER = 'manager'; // effective planner-tier (legacy trio → manager)
const GS = 'group_supervisor';
const AS = 'assistant_supervisor';
const EXEC = 'executive';

// Management-tier shorthand: founder ≥ executive ≥ manager for the
// scheduling/program capabilities the old planner held.
const MGMT = [FOUNDER, EXEC, MANAGER] as const;

// Values are EFFECTIVE roles.
const CAPABILITY_ROLES: Record<Capability, readonly string[]> = {
  managePrograms: [...MGMT],
  manageGroups: [...MGMT],
  manageRoster: [...MGMT, GS, AS],
  planSchedule: [...MGMT],
  manageSlips: [...MGMT, GS],
  manageSubstitute: [...MGMT, GS],
  staffGallery: [...MGMT, GS, AS],
  manageInventory: [...MGMT, GS, AS],
  useDm: [...MGMT, GS, AS],
  moderateChat: [...MGMT, GS, AS],
  staffBooks: [...MGMT, GS, AS],
  staffPickup: [...MGMT, GS, AS],
  awardRecognition: [EXEC, FOUNDER, GS, AS],
};

/** True if the given (raw) role holds the capability. */
export function can(role: string | null | undefined, capability: Capability): boolean {
  if (!role) return false;
  return CAPABILITY_ROLES[capability].includes(effectiveRole(role));
}

/** Any staff role (not parent/student). */
export function isStaff(role: string | null | undefined): boolean {
  if (!role) return false;
  const r = effectiveRole(role);
  return r === FOUNDER || r === EXEC || r === MANAGER || r === GS || r === AS;
}

/** Management tier: founder, executive, or manager (legacy planner tier). */
export function isManagement(role: string | null | undefined): boolean {
  if (!role) return false;
  const r = effectiveRole(role);
  return r === FOUNDER || r === EXEC || r === MANAGER;
}
