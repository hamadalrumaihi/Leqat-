-- ════════════════════════════════════════════════════════════════
--  0023_activity_execution.sql — Operations Platform, Phase C.
--
--  Lets the people running an activity update its execution state
--  (scheduled → ready → in_progress → completed / delayed / cancelled /
--  moved) with an operational note and an optional request for
--  executive support. The schedule_exec_status enum already exists
--  (0022); this adds the note/support columns and a scoped RPC.
--
--  Authorization: the WRITE policy on schedule_entries stays management-
--  only (planners shouldn't have their times edited by delivery staff).
--  Status updates go through a SECURITY DEFINER RPC that permits
--  management, the group's staff, OR the assigned specialist teacher —
--  and only touches the status/note columns, never the schedule itself.
-- ════════════════════════════════════════════════════════════════

alter table schedule_entries add column if not exists exec_note         text;
alter table schedule_entries add column if not exists support_requested boolean not null default false;
alter table schedule_entries add column if not exists status_updated_by uuid references profiles(id) on delete set null;
alter table schedule_entries add column if not exists status_updated_at timestamptz;

create or replace function update_activity_status(
  entry uuid,
  new_status schedule_exec_status,
  note text default null,
  support boolean default false
) returns void
language plpgsql security definer set search_path = public as $$
declare
  gid uuid;
  tid uuid;
begin
  select group_id, teacher_id into gid, tid
  from schedule_entries where id = entry;
  if gid is null then
    raise exception 'not_found';
  end if;
  -- Delivery staff for THIS entry only: management, the group's staff,
  -- or the specialist teacher assigned to it. coalesce the teacher
  -- check to false — when tid is null, `tid = auth.uid()` is NULL, and
  -- `not (… or NULL)` is NULL, which would skip the guard and let an
  -- unassigned entry be updated by anyone.
  if not (is_management() or is_group_staff(gid) or coalesce(tid = auth.uid(), false)) then
    raise exception 'not_authorized';
  end if;

  update schedule_entries set
    exec_status       = new_status,
    exec_note         = nullif(btrim(coalesce(note, '')), ''),
    support_requested = coalesce(support, false),
    status_updated_by = auth.uid(),
    status_updated_at = now(),
    updated_at        = now()
  where id = entry;
end;
$$;

revoke all on function update_activity_status(uuid, schedule_exec_status, text, boolean) from public;
grant execute on function update_activity_status(uuid, schedule_exec_status, text, boolean)
  to authenticated, service_role;
