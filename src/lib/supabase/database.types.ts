// Pragmatic typing layer. Run `supabase gen types typescript` against
// your project to replace this with fully-generated types. The shape
// below keeps the typed client permissive without losing the helper
// generics the @supabase/supabase-js client expects.

export type AppRole =
  | 'founder'
  | 'executive'
  | 'manager'
  | 'program_planner' // legacy compat aliases → manager
  | 'program_supervisor'
  | 'program_manager'
  | 'group_supervisor'
  | 'assistant_supervisor'
  | 'parent'
  | 'student';

export type AgeGroup =
  // current categories: الناشئة (younger) and الفتيان (older)
  | 'nashia'
  | 'fityan'
  // legacy — retained so historical rows still type-check, never selectable
  | 'children'
  | 'boys'
  | 'youth'
  | 'baraem'
  | 'shabab'
  | 'university'
  | 'parents';

export type Quotient = 'SQ' | 'EQ' | 'IQ' | 'PQ';
export type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused';

type GenericTable = {
  Row: Record<string, unknown>;
  Insert: Record<string, unknown>;
  Update: Record<string, unknown>;
  Relationships: [];
};

export type Database = {
  public: {
    Tables: Record<string, GenericTable>;
    Views: Record<string, GenericTable>;
    Functions: Record<string, { Args: Record<string, unknown>; Returns: unknown }>;
    Enums: {
      app_role: AppRole;
      age_group: AgeGroup;
      quotient_t: Quotient;
      attendance_t: AttendanceStatus;
    };
    CompositeTypes: Record<string, never>;
  };
};
