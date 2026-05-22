export type RosterStudent = {
  enrollmentId: string;
  studentId: string;
  parentId: string | null;
  nameAr: string;
  ageGrp: string | null;
  dob: string | null;
  parentName: string | null;
  parentPhone: string | null;
};

// Enrollment + student + the student's parent profile (disambiguated
// from students.profile_id via the parent_id FK).
export const ROSTER_SELECT = `
  id, student_id,
  students!inner(
    id, full_name_ar, age_grp, dob,
    parent:profiles!students_parent_id_fkey(id, full_name_ar, phone)
  )
`;

export function mapRosterRows(rows: unknown[]): RosterStudent[] {
  return (rows ?? [])
    .filter((r) => (r as { students: unknown }).students)
    .map((r) => {
      const row = r as {
        id: string;
        student_id: string;
        students: {
          full_name_ar: string;
          age_grp: string | null;
          dob: string | null;
          parent: { id: string; full_name_ar: string; phone: string | null } | null;
        };
      };
      const s = row.students;
      return {
        enrollmentId: row.id,
        studentId: row.student_id,
        parentId: s.parent?.id ?? null,
        nameAr: s.full_name_ar ?? '—',
        ageGrp: s.age_grp ?? null,
        dob: s.dob ?? null,
        parentName: s.parent?.full_name_ar ?? null,
        parentPhone: s.parent?.phone ?? null,
      };
    });
}
