-- ════════════════════════════════════════════════════════════════
--  seed.sql — one realistic semester + test accounts (7 roles)
--  Test password for every account: Leqat@2025
-- ════════════════════════════════════════════════════════════════

-- ── Test auth users ─────────────────────────────────────────────
-- The handle_new_user trigger creates a matching profiles row; we
-- upsert afterwards to set bilingual names and exact roles.
--
-- NOTE: the token columns below are set to '' (not left NULL) because
-- GoTrue scans them as Go strings and errors on NULL → string. The
-- matching auth.identities rows (inserted just after) are also
-- required for email/password sign-in to succeed.
insert into auth.users
  (instance_id, id, aud, role, email, encrypted_password,
   email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
   created_at, updated_at,
   confirmation_token, recovery_token, email_change_token_new,
   email_change_token_current, email_change, phone_change,
   phone_change_token, reauthentication_token)
values
  ('00000000-0000-0000-0000-000000000000','11111111-1111-1111-1111-111111111111','authenticated','authenticated','exec@leqat.qa',   crypt('Leqat@2025', gen_salt('bf', 10)), now(), '{"provider":"email","providers":["email"]}', '{"full_name_ar":"المشرف التنفيذي العام","role":"executive"}', now(), now(), '', '', '', '', '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000','22222222-2222-2222-2222-222222222222','authenticated','authenticated','psup@leqat.qa',   crypt('Leqat@2025', gen_salt('bf', 10)), now(), '{"provider":"email","providers":["email"]}', '{"full_name_ar":"مشرف البرنامج التنفيذي","role":"program_supervisor"}', now(), now(), '', '', '', '', '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000','33333333-3333-3333-3333-333333333333','authenticated','authenticated','pmgr@leqat.qa',   crypt('Leqat@2025', gen_salt('bf', 10)), now(), '{"provider":"email","providers":["email"]}', '{"full_name_ar":"مدير البرنامج","role":"program_manager"}', now(), now(), '', '', '', '', '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000','44444444-4444-4444-4444-444444444444','authenticated','authenticated','gsup@leqat.qa',   crypt('Leqat@2025', gen_salt('bf', 10)), now(), '{"provider":"email","providers":["email"]}', '{"full_name_ar":"مشرف المجموعة","role":"group_supervisor"}', now(), now(), '', '', '', '', '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000','55555555-5555-5555-5555-555555555555','authenticated','authenticated','asup@leqat.qa',   crypt('Leqat@2025', gen_salt('bf', 10)), now(), '{"provider":"email","providers":["email"]}', '{"full_name_ar":"المشرف المساعد","role":"assistant_supervisor"}', now(), now(), '', '', '', '', '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000','66666666-6666-6666-6666-666666666666','authenticated','authenticated','parent@leqat.qa', crypt('Leqat@2025', gen_salt('bf', 10)), now(), '{"provider":"email","providers":["email"]}', '{"full_name_ar":"ولي الأمر","role":"parent"}', now(), now(), '', '', '', '', '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000','77777777-7777-7777-7777-777777777777','authenticated','authenticated','student@leqat.qa',crypt('Leqat@2025', gen_salt('bf', 10)), now(), '{"provider":"email","providers":["email"]}', '{"full_name_ar":"الطالب","role":"student"}', now(), now(), '', '', '', '', '', '', '', '')
on conflict (id) do nothing;

-- ── Auth identities ─────────────────────────────────────────────
-- GoTrue requires a matching auth.identities row for every email/
-- password user; without it sign-in fails even with a correct hash.
insert into auth.identities
  (id, user_id, provider_id, provider, identity_data,
   last_sign_in_at, created_at, updated_at)
select
  gen_random_uuid(),
  id,
  id::text,                      -- provider_id = user id for email provider
  'email',
  jsonb_build_object(
    'sub', id::text,
    'email', email,
    'email_verified', true,
    'phone_verified', false
  ),
  now(), now(), now()
from auth.users
where email in (
  'exec@leqat.qa','psup@leqat.qa','pmgr@leqat.qa','gsup@leqat.qa',
  'asup@leqat.qa','parent@leqat.qa','student@leqat.qa'
)
on conflict do nothing;

insert into profiles (id, role, full_name_ar, full_name_en, email, phone) values
  ('11111111-1111-1111-1111-111111111111','executive','المشرف التنفيذي العام','Executive Supervisor','exec@leqat.qa','72054558'),
  ('22222222-2222-2222-2222-222222222222','program_supervisor','مشرف البرنامج التنفيذي','Program Supervisor','psup@leqat.qa',null),
  ('33333333-3333-3333-3333-333333333333','program_manager','مدير البرنامج','Program Manager','pmgr@leqat.qa',null),
  ('44444444-4444-4444-4444-444444444444','group_supervisor','مشرف المجموعة','Group Supervisor','gsup@leqat.qa',null),
  ('55555555-5555-5555-5555-555555555555','assistant_supervisor','المشرف المساعد','Assistant Supervisor','asup@leqat.qa',null),
  ('66666666-6666-6666-6666-666666666666','parent','ولي الأمر','Parent','parent@leqat.qa','55667788'),
  ('77777777-7777-7777-7777-777777777777','student','الطالب','Student','student@leqat.qa',null)
on conflict (id) do update set role = excluded.role, full_name_ar = excluded.full_name_ar,
  full_name_en = excluded.full_name_en, email = excluded.email, phone = excluded.phone;

-- ── Program: weekly semester for فتيان (10–14), focus = SQ ──────
insert into programs (id, name_ar, name_en, description_ar, description_en, type, age_grp, gender, quotient, value_ar, value_en, start_date, end_date, weeks, capacity, price_qar, status, created_by)
values ('a0000000-0000-0000-0000-0000000000a1',
  'الفصل الدراسي — فتيان (الإحسان)', 'Semester — Fityan (Ihsan)',
  'برنامج فصلي مدته ١٠ أسابيع، جلسة أسبوعية ٤ ساعات، يركّز على البعد الروحي (SQ) وقيمة الإحسان.',
  '10-week semester, weekly 4-hour session, focused on the spiritual quotient (SQ) and the value of Ihsan.',
  'weekly','fityan','male','SQ','الإحسان','Ihsan',
  date '2025-09-06', date '2025-11-15', 10, 15, 1500.00, 'open',
  '11111111-1111-1111-1111-111111111111')
on conflict (id) do nothing;

insert into program_staff (program_id, profile_id, role) values
  ('a0000000-0000-0000-0000-0000000000a1','22222222-2222-2222-2222-222222222222','program_supervisor'),
  ('a0000000-0000-0000-0000-0000000000a1','33333333-3333-3333-3333-333333333333','program_manager')
on conflict do nothing;

insert into groups (id, program_id, name_ar, name_en, capacity)
values ('b0000000-0000-0000-0000-0000000000b1','a0000000-0000-0000-0000-0000000000a1','مجموعة الفرسان','Knights Group',15)
on conflict (id) do nothing;

insert into group_staff (group_id, profile_id, role) values
  ('b0000000-0000-0000-0000-0000000000b1','44444444-4444-4444-4444-444444444444','group_supervisor'),
  ('b0000000-0000-0000-0000-0000000000b1','55555555-5555-5555-5555-555555555555','assistant_supervisor')
on conflict do nothing;

-- ── Book + assignment ───────────────────────────────────────────
insert into books (id, title_ar, title_en, year, type, description_ar, description_en)
values ('c0000000-0000-0000-0000-0000000000c1','لأنها الحياة تصان بالقيم','Because Life Is Preserved by Values',2022,'book',
  'إصدار برنامج مهندس الحياة لعام ٢٠٢٢ — متاح للاستخدام غير التجاري.',
  'A 2022 Life Engineer publication — available for non-commercial use.')
on conflict (id) do nothing;

insert into books (id, title_ar, title_en, year, type) values
  ('c0000000-0000-0000-0000-0000000000c2','هيا بنا نمضي معا','Let Us Move Forward Together',2018,'book'),
  ('c0000000-0000-0000-0000-0000000000c3','قم بعزم الشباب','Rise With the Resolve of Youth',2024,'book'),
  ('c0000000-0000-0000-0000-0000000000c4','بهذا الطرح نسموا','With This Vision We Rise',2025,'book')
on conflict (id) do nothing;

insert into book_assignments (book_id, group_id, chapter, due_date)
values ('c0000000-0000-0000-0000-0000000000c1','b0000000-0000-0000-0000-0000000000b1','الفصل الأول: معنى الإحسان', date '2025-09-20')
on conflict do nothing;

-- ── 15 students (children of the parent account) + the test student
do $$
declare i int;
declare sid uuid;
begin
  for i in 1..14 loop
    sid := gen_random_uuid();
    insert into students (id, parent_id, full_name_ar, full_name_en, dob, gender, age_grp, photo_consent)
    values (sid, '66666666-6666-6666-6666-666666666666',
            'طالب ' || i, 'Student ' || i,
            date '2013-01-01' + (i * 20), 'male', 'fityan', (i % 2 = 0));
    insert into enrollments (student_id, program_id, group_id, status, tier)
    values (sid, 'a0000000-0000-0000-0000-0000000000a1','b0000000-0000-0000-0000-0000000000b1','active','full_semester');
  end loop;

  -- The seeded student test account
  insert into students (id, profile_id, parent_id, full_name_ar, full_name_en, dob, gender, age_grp, photo_consent)
  values ('d0000000-0000-0000-0000-0000000000d1','77777777-7777-7777-7777-777777777777',
          '66666666-6666-6666-6666-666666666666','الطالب','Student', date '2013-05-01','male','fityan', true)
  on conflict (id) do nothing;
  insert into enrollments (student_id, program_id, group_id, status, tier)
  values ('d0000000-0000-0000-0000-0000000000d1','a0000000-0000-0000-0000-0000000000a1','b0000000-0000-0000-0000-0000000000b1','active','full_semester')
  on conflict do nothing;
end $$;

insert into consents (student_id, parent_id, photo_consent)
select id, parent_id, photo_consent from students where parent_id = '66666666-6666-6666-6666-666666666666'
on conflict do nothing;

-- ── 10 weekly sessions, each with 4 stations (default template) ─
do $$
declare w int;
declare sess uuid;
begin
  for w in 1..10 loop
    sess := gen_random_uuid();
    insert into sessions (id, program_id, group_id, week_no, date, status)
    values (sess,'a0000000-0000-0000-0000-0000000000a1','b0000000-0000-0000-0000-0000000000b1',
            w, date '2025-09-06' + ((w-1) * 7), case when w = 1 then 'closed' else 'planned' end);

    insert into stations (session_id, order_index, title_ar, title_en, duration_min, quotient, skill, value_ar)
    values
      (sess,1,'طابور + كلمات توجيهية (REPEAT)','Assembly + REPEAT talk',30,'SQ','communication','الإحسان'),
      (sess,2,'الرياضة والحركة','Sport / movement',45,'PQ','collaboration','الصحة'),
      (sess,3,'النشاط الرئيسي — الإحسان','Main activity — Ihsan',90,'SQ','critical','الإحسان'),
      (sess,4,'قصة تربوية + حوافز ووجبة','Educational story + incentives & snack',45,'EQ','creative','الإحسان');
  end loop;
end $$;

-- ── Week 1: attendance + a submitted report ─────────────────────
do $$
declare s1 uuid;
declare rep uuid;
declare st record;
begin
  select id into s1 from sessions where group_id = 'b0000000-0000-0000-0000-0000000000b1' and week_no = 1;

  for st in select id from students where parent_id = '66666666-6666-6666-6666-666666666666' loop
    insert into attendance (session_id, student_id, status, marked_by)
    values (s1, st.id, (array['present','present','present','late','present','excused']::attendance_t[])[1 + floor(random()*6)::int],
            '44444444-4444-4444-4444-444444444444')
    on conflict do nothing;
  end loop;

  insert into reports (id, session_id, group_id, author_id, summary_ar, summary_en,
                       highlights_ar, quotient_tags, skill_tags, stage)
  values (gen_random_uuid(), s1, 'b0000000-0000-0000-0000-0000000000b1',
          '44444444-4444-4444-4444-444444444444',
          'افتتحنا الفصل بمحطة الطابور وكلمات REPEAT حول الإحسان، ثم نشاط رياضي، فالنشاط الرئيسي وقصة تربوية.',
          'We opened the semester with the assembly + REPEAT talk on Ihsan, then sport, the main activity, and an educational story.',
          'تفاعل ممتاز من المجموعة في النشاط الرئيسي.',
          array['SQ','PQ']::quotient_t[], array['communication','collaboration']::skill_t[],
          'submitted_executive')
  returning id into rep;
end $$;

-- ── Group chat channel + members + a pinned announcement ────────
insert into chat_channels (id, type, group_id, title_ar, title_en)
values ('e0000000-0000-0000-0000-0000000000e1','group','b0000000-0000-0000-0000-0000000000b1','مجموعة الفرسان — أولياء الأمور','Knights Group — Parents')
on conflict (id) do nothing;

insert into chat_members (channel_id, profile_id) values
  ('e0000000-0000-0000-0000-0000000000e1','44444444-4444-4444-4444-444444444444'),
  ('e0000000-0000-0000-0000-0000000000e1','55555555-5555-5555-5555-555555555555'),
  ('e0000000-0000-0000-0000-0000000000e1','66666666-6666-6666-6666-666666666666')
on conflict do nothing;

insert into chat_messages (channel_id, sender_id, body, is_announcement, moderation)
values ('e0000000-0000-0000-0000-0000000000e1','44444444-4444-4444-4444-444444444444',
        'أهلًا بكم في مجموعة الفرسان. تبدأ الجلسة الأولى السبت ٦ سبتمبر الساعة ٤ عصرًا. نرجو الالتزام بالحضور.',
        true,'approved')
on conflict do nothing;

-- ── Gallery album for week 1 ────────────────────────────────────
insert into gallery_albums (group_id, title_ar, title_en, is_highlight)
values ('b0000000-0000-0000-0000-0000000000b1','الأسبوع الأول','Week 1', false)
on conflict do nothing;

-- ════════════════════════════════════════════════════════════════
--  v2 layers seed (stories, recognition, slips, feedback, inventory)
-- ════════════════════════════════════════════════════════════════

insert into stories (title_ar, title_en, body_ar, value_ar, age_grp, quotient, created_by) values
  ('قصة الإحسان في الطريق','Kindness on the road','قصة تربوية قصيرة عن الإحسان للمارة وكبار السن.','الإحسان','fityan','SQ','11111111-1111-1111-1111-111111111111'),
  ('الفريق الواحد','One team','قصة عن التعاون والعمل الجماعي في الرياضة.','التعاون','fityan','EQ','11111111-1111-1111-1111-111111111111')
on conflict do nothing;

-- More chat history for a realistic demo
insert into chat_messages (channel_id, sender_id, body, moderation) values
  ('e0000000-0000-0000-0000-0000000000e1','66666666-6666-6666-6666-666666666666','جزاكم الله خيرًا، سيحضر إن شاء الله.','approved'),
  ('e0000000-0000-0000-0000-0000000000e1','44444444-4444-4444-4444-444444444444','تذكير: يوم السبت رحلة قصيرة، يرجى التوقيع على إذن المشاركة.','approved')
on conflict do nothing;

-- Recognition tokens for the seeded student (private wall)
insert into recognition_tokens (student_id, awarded_by, value_ar, note_ar) values
  ('d0000000-0000-0000-0000-0000000000d1','44444444-4444-4444-4444-444444444444','الإحسان','ساعد زميله دون أن يُطلب منه.'),
  ('d0000000-0000-0000-0000-0000000000d1','55555555-5555-5555-5555-555555555555','التعاون','قاد فريقه بروح إيجابية.')
on conflict do nothing;

-- A trip permission slip + the parent's e-signature
do $$
declare slip uuid;
begin
  insert into permission_slips (program_id, title_ar, body_ar, due_date, created_by)
  values ('a0000000-0000-0000-0000-0000000000a1','إذن مشاركة في رحلة تعليمية',
          'أوافق على مشاركة ابني في الرحلة التعليمية وأقر بصحة البيانات الطبية.',
          date '2025-10-01','22222222-2222-2222-2222-222222222222')
  returning id into slip;

  insert into permission_slip_signatures (slip_id, student_id, parent_id, signed_name)
  values (slip,'d0000000-0000-0000-0000-0000000000d1','66666666-6666-6666-6666-666666666666','ولي الأمر')
  on conflict do nothing;
end $$;

-- Parent satisfaction pulse on week 1
do $$
declare s1 uuid;
begin
  select id into s1 from sessions where group_id = 'b0000000-0000-0000-0000-0000000000b1' and week_no = 1;
  insert into session_feedback (session_id, parent_id, rating, comment)
  values (s1,'66666666-6666-6666-6666-666666666666',5,'يوم رائع، شكرًا لكم.')
  on conflict do nothing;
end $$;

-- Inventory
insert into inventory_items (name_ar, name_en, total_qty) values
  ('كرات قدم','Footballs',12),
  ('سترات سباحة','Swim vests',15),
  ('نسخ الكتاب المقرر','Assigned book copies',20)
on conflict do nothing;
