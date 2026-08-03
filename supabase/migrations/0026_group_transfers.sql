-- ════════════════════════════════════════════════════════════════
--  0026_group_transfers.sql — move a student between groups within a
--  program, preserving history.
--
--  Current group stays in enrollments.group_id; every move is logged to
--  group_assignment_history (never overwritten). Past attendance is
--  session-based (attendance.session_id → the old group's sessions), so
--  it is untouched; future sessions follow the new group. Additive,
--  forward-only.
-- ════════════════════════════════════════════════════════════════

create table group_assignment_history (
  id             uuid primary key default gen_random_uuid(),
  enrollment_id  uuid not null references enrollments(id) on delete cascade,
  from_group_id  uuid references groups(id) on delete set null,
  to_group_id    uuid references groups(id) on delete set null,
  effective_at   timestamptz not null default now(),
  transferred_by uuid references profiles(id) on delete set null,
  reason         text,
  notes          text,
  created_at     timestamptz not null default now()
);
create index gah_enrollment_idx on group_assignment_history (enrollment_id, effective_at desc);

alter table group_assignment_history enable row level security;

-- Management sees all history; the staff of either the source or the
-- destination group can see moves touching their group.
create policy "read transfer history" on group_assignment_history for select using (
  is_management()
  or (from_group_id is not null and is_group_staff(from_group_id))
  or (to_group_id is not null and is_group_staff(to_group_id))
);

grant select, insert, update, delete on group_assignment_history to authenticated, service_role;

-- Transfer RPC. SECURITY DEFINER, management-gated. Validates that the
-- destination group belongs to the same program as the enrollment,
-- logs the move, then updates the current group — atomically.
create or replace function transfer_student(
  p_enrollment uuid,
  p_to_group   uuid,
  p_reason     text default null,
  p_notes      text default null
) returns void
language plpgsql security definer set search_path = public as $$
declare
  e_program uuid;
  e_group   uuid;
  g_program uuid;
begin
  if not is_management() then
    raise exception 'not_authorized';
  end if;

  select program_id, group_id into e_program, e_group
  from enrollments where id = p_enrollment;
  if e_program is null then
    raise exception 'enrollment_not_found';
  end if;

  select program_id into g_program from groups where id = p_to_group;
  if g_program is null then
    raise exception 'group_not_found';
  end if;

  -- Enrollment Program == Destination Group Program.
  if g_program <> e_program then
    raise exception 'program_mismatch';
  end if;

  if e_group is not distinct from p_to_group then
    raise exception 'already_in_group';
  end if;

  insert into group_assignment_history
    (enrollment_id, from_group_id, to_group_id, transferred_by, reason, notes)
  values (p_enrollment, e_group, p_to_group, auth.uid(), p_reason, p_notes);

  update enrollments set group_id = p_to_group where id = p_enrollment;
end;
$$;

revoke all on function transfer_student(uuid, uuid, text, text) from public;
grant execute on function transfer_student(uuid, uuid, text, text) to authenticated, service_role;
