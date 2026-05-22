export type AgeGroup = 'baraem' | 'nashia' | 'fityan' | 'shabab';

export const AGE_GROUPS: { value: AgeGroup; ar: string }[] = [
  { value: 'baraem', ar: 'براعم (٥–٦)' },
  { value: 'nashia', ar: 'ناشئة (٧–٩)' },
  { value: 'fityan', ar: 'فتيان (١٠–١٤)' },
  { value: 'shabab', ar: 'شباب (١٥–١٨)' },
];

/** Suggest an age group from a DOB (maps to the program's enum). */
export function ageGroupFromDob(dob: string): AgeGroup {
  const age = Math.floor((Date.now() - new Date(dob).getTime()) / (365.25 * 86400e3));
  if (age <= 6) return 'baraem';
  if (age <= 9) return 'nashia';
  if (age <= 14) return 'fityan';
  return 'shabab';
}
