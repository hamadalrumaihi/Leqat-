// Conflict detection for the master schedule. Pure functions over the
// fetched entries so they're trivially testable and run the same way on
// the server render and in the harness.

export type ScheduleEntry = {
  id: string;
  date: string; // YYYY-MM-DD
  start_time: string; // HH:MM[:SS]
  end_time: string;
  group_id: string;
  teacher_id: string | null;
  room_id: string | null;
  groupName?: string | null;
  teacherName?: string | null;
  roomName?: string | null;
  activityName?: string | null;
};

export type ProgramHours = {
  daily_start: string | null; // HH:MM[:SS]
  daily_end: string | null;
};

export type ConflictKind =
  | 'teacher_double_booked'
  | 'group_double_booked'
  | 'room_double_booked'
  | 'no_teacher'
  | 'out_of_hours';

export type Conflict = { kind: ConflictKind; entryIds: string[]; label: string };

const toMin = (t: string) => {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + (m || 0);
};

// Half-open overlap on the same date: a.start < b.end && b.start < a.end.
function overlaps(a: ScheduleEntry, b: ScheduleEntry): boolean {
  if (a.date !== b.date) return false;
  return toMin(a.start_time) < toMin(b.end_time) && toMin(b.start_time) < toMin(a.end_time);
}

// Pairwise double-booking on a shared key (teacher/group/room).
function doubleBookings(
  entries: ScheduleEntry[],
  key: (e: ScheduleEntry) => string | null,
  kind: ConflictKind,
  labelFor: (e: ScheduleEntry) => string,
): Conflict[] {
  const out: Conflict[] = [];
  for (let i = 0; i < entries.length; i++) {
    for (let j = i + 1; j < entries.length; j++) {
      const a = entries[i];
      const b = entries[j];
      const ka = key(a);
      if (ka && ka === key(b) && overlaps(a, b)) {
        out.push({ kind, entryIds: [a.id, b.id], label: labelFor(a) });
      }
    }
  }
  return out;
}

export function detectConflicts(entries: ScheduleEntry[], program: ProgramHours): Conflict[] {
  const conflicts: Conflict[] = [];

  conflicts.push(
    ...doubleBookings(entries, (e) => e.teacher_id, 'teacher_double_booked', (e) => e.teacherName ?? ''),
  );
  conflicts.push(
    ...doubleBookings(entries, (e) => e.group_id, 'group_double_booked', (e) => e.groupName ?? ''),
  );
  conflicts.push(
    ...doubleBookings(entries, (e) => e.room_id, 'room_double_booked', (e) => e.roomName ?? ''),
  );

  for (const e of entries) {
    if (!e.teacher_id) {
      conflicts.push({ kind: 'no_teacher', entryIds: [e.id], label: e.activityName ?? '' });
    }
    if (program.daily_start && program.daily_end) {
      const ps = toMin(program.daily_start);
      const pe = toMin(program.daily_end);
      if (toMin(e.start_time) < ps || toMin(e.end_time) > pe) {
        conflicts.push({ kind: 'out_of_hours', entryIds: [e.id], label: e.activityName ?? '' });
      }
    }
  }

  return conflicts;
}

/** Ids of every entry involved in any conflict (for row highlighting). */
export function conflictedEntryIds(conflicts: Conflict[]): Set<string> {
  const s = new Set<string>();
  for (const c of conflicts) c.entryIds.forEach((id) => s.add(id));
  return s;
}
