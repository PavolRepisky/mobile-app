-- The rules the app relies on the server to hold, checked as the people they
-- apply to. Runs with `npx supabase test db`; everything is rolled back.
begin;
create extension if not exists pgtap with schema extensions;
select plan(42);

-- ---------------------------------------------------------------------------
-- Cast, written as the database owner: Alice built a challenge and is on
-- Day 3 of it with Bob; Carol is new. Day 1 was fully done, Day 2 half.
-- ---------------------------------------------------------------------------

insert into auth.users (id, email, raw_user_meta_data) values
  ('aaaaaaaa-0000-4000-8000-000000000001', 'alice@test.dev', '{"full_name": "Alice Example"}'),
  ('bbbbbbbb-0000-4000-8000-000000000002', 'bob@test.dev', '{}'),
  ('cccccccc-0000-4000-8000-000000000003', 'carol@test.dev', '{"name": "Carol"}');

insert into public.challenges (id, creator_id, name, default_days, lives) values
  ('11111111-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000001', 'Test run', 10, 1);
insert into public.challenge_tasks (id, challenge_id, position, label) values
  ('22222222-0000-4000-8000-000000000001', '11111111-0000-4000-8000-000000000001', 0, 'Walk'),
  ('22222222-0000-4000-8000-000000000002', '11111111-0000-4000-8000-000000000001', 1, 'Read');
insert into public.rounds (id, challenge_id, start_date, days) values
  ('33333333-0000-4000-8000-000000000001', '11111111-0000-4000-8000-000000000001', current_date - 2, 10),
  ('33333333-0000-4000-8000-000000000002', '11111111-0000-4000-8000-000000000001', current_date + 3, 10);
insert into public.memberships (id, round_id, user_id) values
  ('44444444-0000-4000-8000-00000000000a', '33333333-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000001'),
  ('44444444-0000-4000-8000-00000000000b', '33333333-0000-4000-8000-000000000001', 'bbbbbbbb-0000-4000-8000-000000000002');
insert into public.task_completions (membership_id, task_id, day, photo_path, thumb_path) values
  ('44444444-0000-4000-8000-00000000000a', '22222222-0000-4000-8000-000000000001', 1, 'x', 'x'),
  ('44444444-0000-4000-8000-00000000000a', '22222222-0000-4000-8000-000000000002', 1, 'x', 'x'),
  ('44444444-0000-4000-8000-00000000000a', '22222222-0000-4000-8000-000000000001', 2, 'x', 'x');

-- ---------------------------------------------------------------------------
-- Profiles
-- ---------------------------------------------------------------------------

select matches((select handle from public.profiles where id = 'aaaaaaaa-0000-4000-8000-000000000001'),
  '^alice_[0-9]{4}$', 'sign-up makes a profile with a handle from the first name');
select is((select name from public.profiles where id = 'aaaaaaaa-0000-4000-8000-000000000001'),
  'Alice Example', 'the provider''s full name becomes the profile name');
select matches((select handle from public.profiles where id = 'bbbbbbbb-0000-4000-8000-000000000002'),
  '^bob_[0-9]{4}$', 'with no name, the handle comes from the email');
select throws_ok(
  $$update public.profiles set timezone = 'Mars/Olympus' where id = 'aaaaaaaa-0000-4000-8000-000000000001'$$,
  '22023', null, 'an unknown time zone is refused');

-- ---------------------------------------------------------------------------
-- Alice, on Day 3
-- ---------------------------------------------------------------------------

set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "aaaaaaaa-0000-4000-8000-000000000001", "role": "authenticated"}', true);

select is((select missed_days from public.membership_progress where membership_id = '44444444-0000-4000-8000-00000000000a'),
  1, 'a half-done day behind you is a missed day');
select is((select lives_left from public.membership_progress where membership_id = '44444444-0000-4000-8000-00000000000a'),
  0, 'and costs a life');
select is((select current_day from public.membership_progress where membership_id = '44444444-0000-4000-8000-00000000000a'),
  3, 'Day 1 two days ago makes today Day 3');

select throws_ok(
  $$select public.complete_task('22222222-0000-4000-8000-000000000001',
    'aaaaaaaa-0000-4000-8000-000000000001/44444444-0000-4000-8000-00000000000a/2/late.jpg',
    'aaaaaaaa-0000-4000-8000-000000000001/44444444-0000-4000-8000-00000000000a/2/late_thumb.jpg')$$,
  '42501', null, 'a photo filed under an earlier day can''t complete a task');

select lives_ok(
  $$select public.complete_task('22222222-0000-4000-8000-000000000001',
    'aaaaaaaa-0000-4000-8000-000000000001/44444444-0000-4000-8000-00000000000a/3/walk.jpg',
    'aaaaaaaa-0000-4000-8000-000000000001/44444444-0000-4000-8000-00000000000a/3/walk_thumb.jpg', 1)$$,
  'a photo in today''s folder completes the task');

select is(
  public.complete_task('22222222-0000-4000-8000-000000000001',
    'aaaaaaaa-0000-4000-8000-000000000001/44444444-0000-4000-8000-00000000000a/3/walk2.jpg',
    'aaaaaaaa-0000-4000-8000-000000000001/44444444-0000-4000-8000-00000000000a/3/walk2_thumb.jpg') -> 'replaced',
  jsonb_build_array(
    'aaaaaaaa-0000-4000-8000-000000000001/44444444-0000-4000-8000-00000000000a/3/walk.jpg',
    'aaaaaaaa-0000-4000-8000-000000000001/44444444-0000-4000-8000-00000000000a/3/walk_thumb.jpg'),
  'a retake hands back the photos it replaced');
select is((select slot from public.task_completions
  where membership_id = '44444444-0000-4000-8000-00000000000a' and day = 3),
  1, 'and keeps the grid cell it was shot into');

select throws_ok(
  $$insert into public.task_completions (membership_id, task_id, day, photo_path, thumb_path)
    values ('44444444-0000-4000-8000-00000000000a', '22222222-0000-4000-8000-000000000002', 2, 'x', 'x')$$,
  '42501', null, 'completions can''t be written around complete_task');

select is(public.undo_task('22222222-0000-4000-8000-000000000001') ->> 0,
  'aaaaaaaa-0000-4000-8000-000000000001/44444444-0000-4000-8000-00000000000a/3/walk2.jpg',
  'undo removes today''s tick and hands back its photo');
select is(public.undo_task('22222222-0000-4000-8000-000000000002'), '[]'::jsonb,
  'undoing a task that isn''t done is a no-op');
select is((select count(*)::int from public.task_completions
  where membership_id = '44444444-0000-4000-8000-00000000000a' and day = 2), 1,
  'undo never reaches an earlier day');

select ok(public.can_upload_task_photo(
  'aaaaaaaa-0000-4000-8000-000000000001/44444444-0000-4000-8000-00000000000a/3/new.jpg'),
  'you can upload into today''s folder');
select ok(not public.can_upload_task_photo(
  'aaaaaaaa-0000-4000-8000-000000000001/44444444-0000-4000-8000-00000000000a/2/new.jpg'),
  'but not into an earlier day''s');

-- Put today's photo back for Bob to look at.
select public.complete_task('22222222-0000-4000-8000-000000000001',
  'aaaaaaaa-0000-4000-8000-000000000001/44444444-0000-4000-8000-00000000000a/3/walk.jpg',
  'aaaaaaaa-0000-4000-8000-000000000001/44444444-0000-4000-8000-00000000000a/3/walk_thumb.jpg');

-- ---------------------------------------------------------------------------
-- Bob, who hasn't photographed anything today
-- ---------------------------------------------------------------------------

select set_config('request.jwt.claims', '{"sub": "bbbbbbbb-0000-4000-8000-000000000002", "role": "authenticated"}', true);

select ok(not public.can_view_day('44444444-0000-4000-8000-00000000000a', 3),
  'the lock: someone else''s today stays shut until you prove yours');
select ok(public.can_view_day('44444444-0000-4000-8000-00000000000a', 2),
  'their past days are open — profiles are public');
select ok(not public.can_read_task_photo(
  'aaaaaaaa-0000-4000-8000-000000000001/44444444-0000-4000-8000-00000000000a/3/walk.jpg'),
  'storage won''t sign a locked photo');
select throws_ok(
  $$insert into public.comments (membership_id, day, author_id, body)
    values ('44444444-0000-4000-8000-00000000000a', 3, 'bbbbbbbb-0000-4000-8000-000000000002', 'Nice!')$$,
  '42501', null, 'nor can you comment on a day you can''t see');

select is((select bool_and(unlocked) from public.community_today('members')), false,
  'the Community tab reports the lock as shut');

update public.profiles set name = 'Hacked' where id = 'aaaaaaaa-0000-4000-8000-000000000001';
select is((select name from public.profiles where id = 'aaaaaaaa-0000-4000-8000-000000000001'),
  'Alice Example', 'nobody edits someone else''s profile');

select public.complete_task('22222222-0000-4000-8000-000000000002',
  'bbbbbbbb-0000-4000-8000-000000000002/44444444-0000-4000-8000-00000000000b/3/read.jpg',
  'bbbbbbbb-0000-4000-8000-000000000002/44444444-0000-4000-8000-00000000000b/3/read_thumb.jpg');

select ok(public.can_view_day('44444444-0000-4000-8000-00000000000a', 3),
  'one photographed task opens the lock');
select ok(public.can_read_task_photo(
  'aaaaaaaa-0000-4000-8000-000000000001/44444444-0000-4000-8000-00000000000a/3/walk.jpg'),
  'and storage signs the photo');
select lives_ok(
  $$insert into public.comments (membership_id, day, author_id, body)
    values ('44444444-0000-4000-8000-00000000000a', 3, 'bbbbbbbb-0000-4000-8000-000000000002', 'Nice!')$$,
  'and the post takes comments');
select lives_ok(
  $$insert into public.reactions (membership_id, day, user_id, emoji)
    values ('44444444-0000-4000-8000-00000000000a', 3, 'bbbbbbbb-0000-4000-8000-000000000002', '🔥')$$,
  'and reactions');
select throws_ok(
  $$insert into public.reactions (membership_id, day, user_id, emoji)
    values ('44444444-0000-4000-8000-00000000000a', 2, 'bbbbbbbb-0000-4000-8000-000000000002', '🍕')$$,
  '23514', null, 'only the four app emoji are reactions');

select is(public.request_friend('aaaaaaaa-0000-4000-8000-000000000001'), 'pending'::public.friendship_status,
  'Add sends a request');

-- ---------------------------------------------------------------------------
-- Back to Alice
-- ---------------------------------------------------------------------------

select set_config('request.jwt.claims', '{"sub": "aaaaaaaa-0000-4000-8000-000000000001", "role": "authenticated"}', true);

select is(
  (select array_agg(kind::text order by kind::text) from public.notifications),
  array['comment', 'friend_request', 'reaction'],
  'Alice hears about the comment, the reaction and the request');
select is(public.request_friend('bbbbbbbb-0000-4000-8000-000000000002'), 'accepted'::public.friendship_status,
  'adding someone who asked you accepts them');
select is((select count(*)::int from public.notifications where kind = 'friend_request'), 0,
  'and the answered request leaves the list');
select is((select count(*)::int from public.community_today('friends')), 1,
  'Bob is now on Alice''s Friends tab');

-- ---------------------------------------------------------------------------
-- Carol, joining and building
-- ---------------------------------------------------------------------------

select set_config('request.jwt.claims', '{"sub": "cccccccc-0000-4000-8000-000000000003", "role": "authenticated"}', true);

-- With no challenge there's no today to prove, so nothing is held back.
select ok(public.can_view_day('44444444-0000-4000-8000-00000000000a', 3),
  'in no challenge, someone else''s today is open');
select ok(public.can_read_task_photo(
  'aaaaaaaa-0000-4000-8000-000000000001/44444444-0000-4000-8000-00000000000a/3/walk.jpg'),
  'and storage signs its photo');

select throws_ok($$select public.join_round('33333333-0000-4000-8000-000000000001')$$,
  'P0001', null, 'joining shuts once Day 1 has passed');
select lives_ok($$select public.join_round('33333333-0000-4000-8000-000000000002')$$,
  'a round that hasn''t started can be joined');

-- Joined but before Day 1: still nothing to photograph, so still open.
select ok(public.can_view_day('44444444-0000-4000-8000-00000000000a', 3),
  'waiting for Day 1, someone else''s today is open');
select throws_ok(
  $$select public.create_challenge('{"name": "Late", "days": 10, "start_date": "2000-01-01", "tasks": [{"label": "x"}]}')$$,
  '22023', null, 'Day 1 can''t be in the past');
select throws_ok(
  $$select public.update_challenge('11111111-0000-4000-8000-000000000001',
    '{"name": "Mine now", "days": 10, "start_date": "2100-01-01", "tasks": [{"label": "x"}]}')$$,
  '42501', null, 'only the creator edits a challenge');

-- Built and joined in two statements: a statement can't see rows that a
-- function it calls inserts.
select set_config('test.challenge', public.create_challenge(
  jsonb_build_object('name', 'Carol''s', 'days', 7, 'start_date', current_date + 1,
    'tasks', jsonb_build_array(jsonb_build_object('label', 'Stretch', 'note', 'Ten minutes'))))::text, true);
select public.join_round((select r.id from public.rounds r
  where r.challenge_id = current_setting('test.challenge')::uuid));
select is(
  (select array_agg(status::text order by status::text) from public.memberships
    where user_id = 'cccccccc-0000-4000-8000-000000000003'),
  array['active', 'left'], 'joining a new challenge ends the one you were in');

-- ---------------------------------------------------------------------------
-- The quarter-hourly settle
-- ---------------------------------------------------------------------------

reset role;
update public.challenges set lives = 0 where id = '11111111-0000-4000-8000-000000000001';
select public.settle_memberships();
select is((select status::text from public.memberships where id = '44444444-0000-4000-8000-00000000000a'),
  'lost', 'missing more days than the lives allow loses the run');

select * from finish();
rollback;
