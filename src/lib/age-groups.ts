import type { AgeGroup } from '@/lib/supabase/database.types';

export type { AgeGroup };

// ── The program's three age groups (single source of truth) ─────────
//   children — أطفال بين ٥–٦ سنوات   / Children 5–6
//   boys     — للأولاد بين ٧–١٣ سنة  / Boys 7–13
//   youth    — للشباب بين ١٤–١٧ سنة  / Youth 14–17
//
// Only these three are ever selectable. The prior kid bands
// (baraem/nashia/fityan/shabab) and the adult legacy values
// (university/parents) remain valid enum members so historical rows
// still render, but they never appear in a picker.

export const VISIBLE_AGE_GROUPS: AgeGroup[] = ['children', 'boys', 'youth'];

export const AGE_LABEL_AR: Record<AgeGroup, string> = {
  children: 'أطفال (٥–٦)',
  boys: 'أولاد (٧–١٣)',
  youth: 'شباب (١٤–١٧)',
  // legacy — retained so old records display, never selectable
  baraem: 'براعم (٥–٦)',
  nashia: 'ناشئة (٧–٩)',
  fityan: 'فتيان (١٠–١٤)',
  shabab: 'شباب (١٥–١٨)',
  university: 'الجامعيون',
  parents: 'الوالدون',
};

export const AGE_LABEL_EN: Record<AgeGroup, string> = {
  children: 'Children (5–6)',
  boys: 'Boys (7–13)',
  youth: 'Youth (14–17)',
  // legacy
  baraem: 'Baraem (5–6)',
  nashia: 'Nashia (7–9)',
  fityan: 'Fityan (10–14)',
  shabab: 'Shabab (15–18)',
  university: 'University',
  parents: 'Parents',
};

/** Suggest an age group from a date of birth. Bands: ≤6 children,
 *  7–13 boys, 14–17 youth; 18+ clamps to youth (oldest kid band). */
export function ageGroupFromDob(dob: string): AgeGroup {
  const age = Math.floor((Date.now() - new Date(dob).getTime()) / (365.25 * 86400e3));
  if (age <= 6) return 'children';
  if (age <= 13) return 'boys';
  return 'youth';
}
