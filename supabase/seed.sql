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
  ('00000000-0000-0000-0000-000000000000','77777777-7777-7777-7777-777777777777','authenticated','authenticated','student@leqat.qa',crypt('Leqat@2025', gen_salt('bf', 10)), now(), '{"provider":"email","providers":["email"]}', '{"full_name_ar":"الطالب","role":"student"}', now(), now(), '', '', '', '', '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000','88888888-8888-8888-8888-888888888888','authenticated','authenticated','founder@leqat.qa',crypt('Leqat@2025', gen_salt('bf', 10)), now(), '{"provider":"email","providers":["email"]}', '{"full_name_ar":"المؤسّس","role":"founder"}', now(), now(), '', '', '', '', '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000','99999999-9999-9999-9999-999999999999','authenticated','authenticated','teacher@leqat.qa',crypt('Leqat@2025', gen_salt('bf', 10)), now(), '{"provider":"email","providers":["email"]}', '{"full_name_ar":"المعلّم المختص","role":"specialist_teacher"}', now(), now(), '', '', '', '', '', '', '', '')
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
  'asup@leqat.qa','parent@leqat.qa','student@leqat.qa','founder@leqat.qa',
  'teacher@leqat.qa'
)
on conflict do nothing;

-- Role model: psup/pmgr are now Managers (the legacy planner trio folds
-- into the Manager role); a Founder sits above the Executive.
insert into profiles (id, role, full_name_ar, full_name_en, email, phone) values
  ('88888888-8888-8888-8888-888888888888','founder','المؤسّس','Founder','founder@leqat.qa',null),
  ('11111111-1111-1111-1111-111111111111','executive','المشرف التنفيذي العام','Executive Supervisor','exec@leqat.qa','72054558'),
  ('22222222-2222-2222-2222-222222222222','manager','مدير الفترة الصباحية','Morning Manager','psup@leqat.qa',null),
  ('33333333-3333-3333-3333-333333333333','manager','مدير الفترة المسائية','Afternoon Manager','pmgr@leqat.qa',null),
  ('44444444-4444-4444-4444-444444444444','group_supervisor','مشرف المجموعة','Group Supervisor','gsup@leqat.qa',null),
  ('55555555-5555-5555-5555-555555555555','assistant_supervisor','المشرف المساعد','Assistant Supervisor','asup@leqat.qa',null),
  ('66666666-6666-6666-6666-666666666666','parent','ولي الأمر','Parent','parent@leqat.qa','55667788'),
  ('77777777-7777-7777-7777-777777777777','student','الطالب','Student','student@leqat.qa',null),
  ('99999999-9999-9999-9999-999999999999','specialist_teacher','المعلّم المختص','Specialist Teacher','teacher@leqat.qa',null)
on conflict (id) do update set role = excluded.role, full_name_ar = excluded.full_name_ar,
  full_name_en = excluded.full_name_en, email = excluded.email, phone = excluded.phone;

-- ── Program: weekly semester for فتيان (10–14), focus = SQ ──────
insert into programs (id, name_ar, name_en, description_ar, description_en, type, age_grp, gender, quotient, value_ar, value_en, start_date, end_date, weeks, capacity, price_qar, status, created_by)
values ('a0000000-0000-0000-0000-0000000000a1',
  'الفصل الدراسي — فتيان (الإحسان)', 'Semester — Fityan (Ihsan)',
  'برنامج فصلي مدته ١٠ أسابيع، جلسة أسبوعية ٤ ساعات، يركّز على البعد الروحي (SQ) وقيمة الإحسان.',
  '10-week semester, weekly 4-hour session, focused on the spiritual quotient (SQ) and the value of Ihsan.',
  'weekly','boys','male','SQ','الإحسان','Ihsan',
  date '2025-09-06', date '2025-11-15', 10, 15, 1500.00, 'open',
  '11111111-1111-1111-1111-111111111111')
on conflict (id) do nothing;

insert into program_staff (program_id, profile_id, role) values
  ('a0000000-0000-0000-0000-0000000000a1','22222222-2222-2222-2222-222222222222','manager'),
  ('a0000000-0000-0000-0000-0000000000a1','33333333-3333-3333-3333-333333333333','manager')
on conflict do nothing;

-- Manager shifts: the two managers run morning and afternoon.
insert into manager_shifts (program_id, profile_id, shift) values
  ('a0000000-0000-0000-0000-0000000000a1','22222222-2222-2222-2222-222222222222','morning'),
  ('a0000000-0000-0000-0000-0000000000a1','33333333-3333-3333-3333-333333333333','afternoon')
on conflict do nothing;

-- Fityan (10–14) group is a teen division. A second group in the same
-- program gives transfers a valid destination.
insert into groups (id, program_id, name_ar, name_en, color, capacity, division)
values ('b0000000-0000-0000-0000-0000000000b1','a0000000-0000-0000-0000-0000000000a1','مجموعة الفرسان','Knights Group','#1F5C3A',15,'teen'),
       ('b0000000-0000-0000-0000-0000000000b2','a0000000-0000-0000-0000-0000000000a1','مجموعة النجوم','Stars Group','#3FA34D',15,'teen')
on conflict (id) do update set division = excluded.division;

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
            date '2013-01-01' + (i * 20), 'male', 'boys', (i % 2 = 0));
    insert into enrollments (student_id, program_id, group_id, status, tier)
    values (sid, 'a0000000-0000-0000-0000-0000000000a1','b0000000-0000-0000-0000-0000000000b1','active','full_semester');
  end loop;

  -- The seeded student test account
  insert into students (id, profile_id, parent_id, full_name_ar, full_name_en, dob, gender, age_grp, photo_consent)
  values ('d0000000-0000-0000-0000-0000000000d1','77777777-7777-7777-7777-777777777777',
          '66666666-6666-6666-6666-666666666666','الطالب','Student', date '2013-05-01','male','boys', true)
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

  -- The assistant supervisor helps the whole group in week 1.
  insert into session_assistant_assignments (session_id, profile_id, kind)
  values (s1, '55555555-5555-5555-5555-555555555555', 'group_assistant')
  on conflict do nothing;

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
  ('قصة الإحسان في الطريق','Kindness on the road','قصة تربوية قصيرة عن الإحسان للمارة وكبار السن.','الإحسان','boys','SQ','11111111-1111-1111-1111-111111111111'),
  ('الفريق الواحد','One team','قصة عن التعاون والعمل الجماعي في الرياضة.','التعاون','boys','EQ','11111111-1111-1111-1111-111111111111')
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

-- ════════════════════════════════════════════════════════════════
--  0006 alignment — populate the new columns/tables for the demo
-- ════════════════════════════════════════════════════════════════

-- §3 group color
update groups set color = '#3FA34D'
where id = 'b0000000-0000-0000-0000-0000000000b1';

-- §4/§5 explicit times + publish all of the group's sessions
update sessions
set start_time = time '16:00', end_time = time '20:00',
    published_at = now(), published_by = '22222222-2222-2222-2222-222222222222'
where group_id = 'b0000000-0000-0000-0000-0000000000b1';

-- §8 turn the 2022 title into the program workbook + seed progress
update books
set kind = 'workbook', program_id = 'a0000000-0000-0000-0000-0000000000a1'
where id = 'c0000000-0000-0000-0000-0000000000c1';

insert into group_workbook_progress (group_id, book_id, current_page, last_section)
values ('b0000000-0000-0000-0000-0000000000b1','c0000000-0000-0000-0000-0000000000c1',12,'الفصل الأول: معنى الإحسان')
on conflict do nothing;

-- §10 an authorized pickup person for the seeded family
insert into authorized_pickup_persons (student_id, parent_id, name, phone, relation)
values ('d0000000-0000-0000-0000-0000000000d1','66666666-6666-6666-6666-666666666666','سائق العائلة','55009911','سائق')
on conflict do nothing;

-- §11 program-wide broadcast channel (parents read-only by default)
insert into chat_channels (id, type, group_id, title_ar, title_en, parents_can_post)
values ('e0000000-0000-0000-0000-0000000000e2','program','b0000000-0000-0000-0000-0000000000b1','إعلانات البرنامج','Program announcements', false)
on conflict (id) do nothing;

insert into chat_members (channel_id, profile_id) values
  ('e0000000-0000-0000-0000-0000000000e2','22222222-2222-2222-2222-222222222222'),
  ('e0000000-0000-0000-0000-0000000000e2','44444444-4444-4444-4444-444444444444'),
  ('e0000000-0000-0000-0000-0000000000e2','66666666-6666-6666-6666-666666666666')
on conflict do nothing;

-- ── Ops foundation: rooms + activity library samples (0021) ─────
insert into rooms (id, program_id, name_ar, name_en, capacity, notes_ar) values
  ('c1000000-0000-0000-0000-000000000001','a0000000-0000-0000-0000-0000000000a1','قاعة الابتكار','Innovation Room',20,'أجهزة حاسب ومستلزمات روبوتيك'),
  ('c1000000-0000-0000-0000-000000000002','a0000000-0000-0000-0000-0000000000a1','القاعة الرياضية','Gymnasium',40,null),
  ('c1000000-0000-0000-0000-000000000003','a0000000-0000-0000-0000-0000000000a1','قاعة ٢','Room 2',15,null)
on conflict (id) do nothing;

insert into activities
  (id, title_ar, title_en, category, objective_ar, duration_min, age_grp, max_group_size, materials_ar, status, proposed_by, reviewed_by) values
  ('ac000000-0000-0000-0000-000000000001','تحدي الروبوتيك','Robotics Challenge','STEM','بناء وبرمجة روبوت بسيط ضمن فريق',40,'boys',12,'مجموعات ليغو، حواسيب','approved','88888888-8888-8888-8888-888888888888','11111111-1111-1111-1111-111111111111'),
  ('ac000000-0000-0000-0000-000000000002','ورشة المهارات الحياتية','Life Skills Workshop','life-skills','تنمية مهارات التواصل واتخاذ القرار',40,'boys',15,'بطاقات، سبورة','approved','88888888-8888-8888-8888-888888888888','11111111-1111-1111-1111-111111111111'),
  ('ac000000-0000-0000-0000-000000000003','حل المشكلات الإبداعي','Creative Problem Solving','life-skills','التفكير الناقد وحل المشكلات',45,'youth',15,null,'proposed','88888888-8888-8888-8888-888888888888',null)
on conflict (id) do nothing;

-- Program operating hours + location (MVP example: 4pm–8pm, Sun–Thu).
update programs set
  daily_start = '16:00', daily_end = '20:00',
  operating_days = '{0,1,2,3,4}', location_ar = 'المقر الرئيسي', location_en = 'Main Campus'
where id = 'a0000000-0000-0000-0000-0000000000a1';

-- Master schedule: two activities for today's date for the Knights group.
insert into schedule_entries
  (program_id, group_id, activity_id, teacher_id, room_id, date, start_time, end_time, created_by) values
  ('a0000000-0000-0000-0000-0000000000a1','b0000000-0000-0000-0000-0000000000b1',
   'ac000000-0000-0000-0000-000000000002',null,'c1000000-0000-0000-0000-000000000003',
   current_date,'16:20','17:00','11111111-1111-1111-1111-111111111111'),
  ('a0000000-0000-0000-0000-0000000000a1','b0000000-0000-0000-0000-0000000000b1',
   'ac000000-0000-0000-0000-000000000001','99999999-9999-9999-9999-999999999999','c1000000-0000-0000-0000-000000000001',
   current_date,'17:00','17:40','11111111-1111-1111-1111-111111111111')
on conflict do nothing;

-- ── Targeted announcements (0024) ──────────────────────────────
insert into announcements (program_id, title_ar, body_ar, audience, target_group_id, target_profile_id, created_by) values
  ('a0000000-0000-0000-0000-0000000000a1','نُشر جدول الغد','راجعوا جداولكم قبل بداية اليوم.','all_staff',null,null,'11111111-1111-1111-1111-111111111111'),
  ('a0000000-0000-0000-0000-0000000000a1','المواد جاهزة للاستلام','مواد أنشطة اليوم متاحة في قاعة الابتكار.','specialist_teachers',null,null,'11111111-1111-1111-1111-111111111111'),
  ('a0000000-0000-0000-0000-0000000000a1','تبقى المجموعة في قاعتها','تبقى مجموعة الفرسان في قاعتها الحالية حتى إشعار آخر.','group','b0000000-0000-0000-0000-0000000000b1',null,'11111111-1111-1111-1111-111111111111'),
  ('a0000000-0000-0000-0000-0000000000a1','تأخّر بسيط','ستبدأ حصتك القادمة متأخرة ١٠ دقائق.','teacher',null,'99999999-9999-9999-9999-999999999999','11111111-1111-1111-1111-111111111111');

-- ── Operational issues (0025) ──────────────────────────────────
insert into issues (program_id, group_id, reporter_id, kind, location_ar, description_ar, priority, status, assigned_to) values
  ('a0000000-0000-0000-0000-0000000000a1','b0000000-0000-0000-0000-0000000000b1','44444444-4444-4444-4444-444444444444','missing_materials','قاعة الابتكار','ينقص جهازا حاسب لنشاط الروبوتيك.','high','new',null),
  ('a0000000-0000-0000-0000-0000000000a1','b0000000-0000-0000-0000-0000000000b1','99999999-9999-9999-9999-999999999999','teacher_delay','المدخل','سأتأخر ٥ دقائق عن الحصة القادمة.','normal','acknowledged','11111111-1111-1111-1111-111111111111');
