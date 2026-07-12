-- ════════════════════════════════════════════════════════════════
--  0010_staff_visibility.sql — fix roster + contact RLS gaps
--
--  Defects fixed (proven by probe on a local stack):
--  F-A1  Group supervisors could not see or claim unassigned
--        enrollments (group_id IS NULL): the SELECT policy required
--        is_program_staff / is_group_staff(group_id), and UPDATE
--        required is_program_staff — so the search-to-add roster
--        flow returned zero rows and assignment was denied for the
--        very role it was built for.
--  F-A2  The profiles SELECT policy was own-row-or-executive only, so
--        supervisors could not read parent names/phones (WhatsApp
--        contact, pickup queue) and chat sender names resolved to "—"
--        for everyone except executives.
--  R3    updateParentPhone used the service role with only an
--        app-level staff check — any staff member could edit any
--        parent's phone. Replaced by a definer RPC scoped to parents
--        of children in the caller's programs.
--
--  All new policy predicates go through SECURITY DEFINER helpers,
--  matching the 0002 pattern, to avoid RLS-in-RLS recursion.
-- ════════════════════════════════════════════════════════════════

-- Programs where the user is program staff or staffs any group.
create or replace function staff_program_ids()
returns setof uuid language sql stable security definer set search_path = public as $$
  select program_id from program_staff where profile_id = auth.uid()
  union
  select gr.program_id
  from group_staff gs join groups gr on gr.id = gs.group_id
  where gs.profile_id = auth.uid();
$$;

-- Can the current user (as staff) see this student?
-- True when the student has an enrollment in a group they staff, or
-- an unassigned enrollment in a program they staff.
create or replace function staff_can_see_student(sid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from enrollments e
    where e.student_id = sid
      and (is_group_staff(e.group_id)
           or (e.group_id is null
               and e.program_id in (select staff_program_ids())))
  );
$$;

-- Is the current user staff for any child of this parent?
create or replace function is_staff_for_parent(p uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from students st
    where st.parent_id = p and staff_can_see_student(st.id)
  );
$$;

-- Do the current user and this profile share a chat channel?
-- (Sender names in group chat — parity with the WhatsApp groups the
-- program migrated from, where members see each other.)
create or replace function shares_channel_with(p uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from chat_members me
    join chat_members them on them.channel_id = me.channel_id
    where me.profile_id = auth.uid() and them.profile_id = p
  );
$$;

-- ── F-A1: enrollments ───────────────────────────────────────────
create policy "group staff reads unassigned enrollments"
  on enrollments for select using (
    group_id is null and program_id in (select staff_program_ids())
  );

-- Claim an unassigned student into a group the user staffs, or
-- unassign from a group they staff — never into someone else's group.
create policy "group staff assigns roster"
  on enrollments for update using (
    (group_id is null and program_id in (select staff_program_ids()))
    or is_group_staff(group_id)
  ) with check (
    group_id is null or is_group_staff(group_id)
  );

-- ── F-A1: students (roster search, alerts, attendance) ─────────
create policy "group staff reads program students"
  on students for select using (staff_can_see_student(id));

-- ── F-A2: profiles ──────────────────────────────────────────────
create policy "staff reads parent profiles"
  on profiles for select using (is_staff_for_parent(id));

create policy "channel co-members read profiles"
  on profiles for select using (shares_channel_with(id));

-- ── R3: scoped parent-phone correction (replaces service role) ──
create or replace function update_parent_phone(parent uuid, new_phone text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if new_phone is null or length(trim(new_phone)) = 0 then
    raise exception 'phone_required';
  end if;
  if not is_staff_for_parent(parent) then
    raise exception 'not_authorized';
  end if;
  update profiles set phone = trim(new_phone) where id = parent;
end;
$$;
