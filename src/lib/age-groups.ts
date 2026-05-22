import type { AgeGroup } from '@/lib/supabase/database.types';

export type { AgeGroup };

// Pickers only offer the kids' age groups. `university` and `parents`
// remain valid enum values (for any legacy records) but are never
// selectable. `thanawi` is intentionally absent until 0007a is applied.
export const VISIBLE_AGE_GROUPS: AgeGroup[] = [
  'baraem',
  'nashia',
  'fityan',
  'shabab',
];

export const AGE_LABEL_AR: Record<AgeGroup, string> = {
  baraem: 'براعم (٥–٦)',
  nashia: 'ناشئة (٧–٩)',
  fityan: 'فتيان (١٠–١٤)',
  shabab: 'شباب (١٥–١٨)',
  university: 'الجامعيين', // legacy, not shown in pickers
  parents: 'الوالدين', // legacy, not shown in pickers
};

export const AGE_LABEL_EN: Record<AgeGroup, string> = {
  baraem: 'Baraem (5–6)',
  nashia: 'Nashia (7–9)',
  fityan: 'Fityan (10–14)',
  shabab: 'Shabab (15–18)',
  university: 'University',
  parents: 'Parents',
};
