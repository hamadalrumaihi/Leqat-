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
//   executive | program_planner | group_supervisor |
//   assistant_supervisor | parent | student
// (program_supervisor / program_manager / program_planner → program_planner)
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

const PLANNER = 'program_planner';
const GS = 'group_supervisor';
const AS = 'assistant_supervisor';
const EXEC = 'executive';

// Values are EFFECTIVE roles.
const CAPABILITY_ROLES: Record<Capability, readonly string[]> = {
  managePrograms: [EXEC, PLANNER],
  manageGroups: [EXEC, PLANNER],
  manageRoster: [EXEC, PLANNER, GS, AS],
  planSchedule: [EXEC, PLANNER],
  manageSlips: [EXEC, PLANNER, GS],
  manageSubstitute: [EXEC, PLANNER, GS],
  staffGallery: [EXEC, PLANNER, GS, AS],
  manageInventory: [EXEC, PLANNER, GS, AS],
  useDm: [EXEC, PLANNER, GS, AS],
  moderateChat: [EXEC, PLANNER, GS, AS],
  staffBooks: [EXEC, PLANNER, GS, AS],
  staffPickup: [EXEC, PLANNER, GS, AS],
  awardRecognition: [EXEC, GS, AS],
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
  return r === EXEC || r === PLANNER || r === GS || r === AS;
}

/** Management tier (executive + planner-tier; founder later). */
export function isManagement(role: string | null | undefined): boolean {
  if (!role) return false;
  const r = effectiveRole(role);
  return r === EXEC || r === PLANNER;
}
