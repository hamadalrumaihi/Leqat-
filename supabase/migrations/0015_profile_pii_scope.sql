-- ════════════════════════════════════════════════════════════════
--  0015_profile_pii_scope.sql — stop leaking parent/staff email+phone
--  to chat co-members.
--
--  0010 added "channel co-members read profiles" so group-chat sender
--  names would resolve (WhatsApp-group parity). But Postgres RLS is
--  row-level: that policy exposes the ENTIRE profiles row — including
--  email and phone — to every co-member of any shared channel. Group
--  channels are multi-parent by design, so any parent could read every
--  other family's email and phone via
--  `GET /rest/v1/profiles?id=eq.<uuid>&select=email,phone` (co-member
--  UUIDs are visible on chat_messages.sender_id). The feature only
--  needs display names.
--
--  Fix: drop the whole-row co-member policy and expose names ONLY
--  through a SECURITY DEFINER function. Staff who legitimately need a
--  parent's phone still get it via the separate is_staff_for_parent
--  policy (untouched); a member's own row is still readable.
-- ════════════════════════════════════════════════════════════════

drop policy if exists "channel co-members read profiles" on profiles;

-- Names of everyone who shares a channel with the caller (plus self).
-- Returns id + names only — never email/phone. Definer so it can read
-- profiles after the broad policy is gone; the projection is the guard.
create or replace function channel_peer_directory()
returns table (id uuid, full_name_ar text, full_name_en text)
language sql stable security definer set search_path = public as $$
  select p.id, p.full_name_ar, p.full_name_en
  from profiles p
  where p.id = auth.uid() or shares_channel_with(p.id)
$$;

revoke all on function channel_peer_directory() from public;
grant execute on function channel_peer_directory() to authenticated;
