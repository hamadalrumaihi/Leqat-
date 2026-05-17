-- ════════════════════════════════════════════════════════════════
--  0005_storage.sql — private Storage buckets + object RLS
--  Path convention: <group_id>/<filename>. Access is scoped to the
--  group the object belongs to, mirroring the table RLS in 0002.
-- ════════════════════════════════════════════════════════════════

insert into storage.buckets (id, name, public) values
  ('gallery','gallery',false),
  ('chat-media','chat-media',false),
  ('books','books',false)
on conflict (id) do nothing;

-- First path segment = group_id.
create or replace function storage_group_id(name text)
returns uuid language sql immutable as $$
  select nullif(split_part(name, '/', 1), '')::uuid;
$$;

-- ── gallery ─────────────────────────────────────────────────────
create policy "gallery read by group" on storage.objects for select using (
  bucket_id = 'gallery' and (
    is_group_staff(storage_group_id(name))
    or storage_group_id(name) in (select parent_group_ids())
    or storage_group_id(name) in (select student_group_ids())
  )
);
create policy "gallery write by staff" on storage.objects for insert with check (
  bucket_id = 'gallery' and is_group_staff(storage_group_id(name))
);
create policy "gallery update by staff" on storage.objects for update using (
  bucket_id = 'gallery' and is_group_staff(storage_group_id(name))
);
create policy "gallery delete by staff" on storage.objects for delete using (
  bucket_id = 'gallery' and is_group_staff(storage_group_id(name))
);

-- ── chat-media ──────────────────────────────────────────────────
create policy "chat media read by member" on storage.objects for select using (
  bucket_id = 'chat-media' and (
    is_group_staff(storage_group_id(name))
    or storage_group_id(name) in (select parent_group_ids())
  )
);
create policy "chat media write by member" on storage.objects for insert with check (
  bucket_id = 'chat-media' and (
    is_group_staff(storage_group_id(name))
    or storage_group_id(name) in (select parent_group_ids())
  )
);

-- ── books (read for authenticated; write executive) ─────────────
create policy "books read auth" on storage.objects for select using (
  bucket_id = 'books' and auth.uid() is not null
);
create policy "books write exec" on storage.objects for insert with check (
  bucket_id = 'books' and is_executive()
);
