-- ════════════════════════════════════════════════════════════════
--  0016_chat_rls_recursion.sql — fix infinite recursion that makes
--  the entire chat feature non-functional on a real deploy.
--
--  The 0002 policies reference each other's table directly:
--    chat_channels "read channels"  → EXISTS (… from chat_members …)
--    chat_members  "read members"   → EXISTS (… from chat_channels …)
--  Evaluating either forces RLS on the other, which forces RLS back on
--  the first — Postgres aborts with 42P17 "infinite recursion detected
--  in policy for relation chat_members". Proven live: every role's chat
--  page showed "no channels" and a direct PostgREST select on
--  chat_members returns 42P17. (Latent until now — chat was never
--  exercised against a live database.)
--
--  Fix: break each cross-table reference with a SECURITY DEFINER helper
--  that reads the other table WITHOUT re-entering its RLS. Authorization
--  intent is unchanged: a channel is readable by its members or by the
--  staff of its group; a membership row is readable by its owner or by
--  the staff of the channel's group.
-- ════════════════════════════════════════════════════════════════

-- Membership check that does not trigger chat_members RLS.
create or replace function is_channel_member(chan uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from chat_members
    where channel_id = chan and profile_id = auth.uid()
  );
$$;

-- Channel's group_id without triggering chat_channels RLS.
create or replace function channel_group_id(chan uuid)
returns uuid language sql stable security definer set search_path = public as $$
  select group_id from chat_channels where id = chan;
$$;

revoke all on function is_channel_member(uuid) from public;
revoke all on function channel_group_id(uuid) from public;
grant execute on function is_channel_member(uuid), channel_group_id(uuid)
  to authenticated, anon, service_role;

-- chat_channels: member (via definer helper) OR staff of its group.
drop policy if exists "read channels" on chat_channels;
create policy "read channels" on chat_channels for select using (
  is_channel_member(id)
  or (group_id is not null and is_group_staff(group_id))
);

-- chat_members: own row OR staff of the channel's group (group_id via
-- definer helper, so chat_channels RLS is never entered).
drop policy if exists "read members" on chat_members;
create policy "read members" on chat_members for select using (
  profile_id = auth.uid()
  or is_group_staff(channel_group_id(channel_id))
);

drop policy if exists "self or staff member rows" on chat_members;
create policy "self or staff member rows" on chat_members for all using (
  profile_id = auth.uid()
  or is_group_staff(channel_group_id(channel_id))
);
