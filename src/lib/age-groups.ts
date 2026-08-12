import type { AgeGroup } from '@/lib/supabase/database.types';

export type { AgeGroup };

// ── The program's two age categories (single source of truth) ───────
//   nashia — الناشئة، وهم الصغار  / Nashia — the younger participants
//   fityan — الفتيان، وهم الكبار  / Fityan — the older participants
//
// Only these two are ever selectable. Every prior band (children/
// boys/youth, baraem/shabab) and the adult legacy values
// (university/parents) remain valid enum members so historical rows
// still render, but they never appear in a picker.

export const VISIBLE_AGE_GROUPS: AgeGroup[] = ['nashia', 'fityan'];

export const AGE_LABEL_AR: Record<AgeGroup, string> = {
  nashia: 'ناشئة (الصغار)',
  fityan: 'فتيان (الكبار)',
  // legacy — retained so old records display, never selectable
  children: 'أطفال (٥–٦)',
  boys: 'أولاد (٧–١٣)',
  youth: 'شباب (١٤–١٧)',
  baraem: 'براعم (٥–٦)',
  shabab: 'شباب (١٥–١٨)',
  university: 'الجامعيون',
  parents: 'الوالدون',
};

export const AGE_LABEL_EN: Record<AgeGroup, string> = {
  nashia: 'Nashia (younger)',
  fityan: 'Fityan (older)',
  // legacy
  children: 'Children (5–6)',
  boys: 'Boys (7–13)',
  youth: 'Youth (14–17)',
  baraem: 'Baraem (5–6)',
  shabab: 'Shabab (15–18)',
  university: 'University',
  parents: 'Parents',
};

/** Suggest an age category from a date of birth: the younger half
 *  (≤ 9) is ناشئة, 10 and up is فتيان. */
export function ageGroupFromDob(dob: string): AgeGroup {
  const age = Math.floor((Date.now() - new Date(dob).getTime()) / (365.25 * 86400e3));
  return age <= 9 ? 'nashia' : 'fityan';
}
