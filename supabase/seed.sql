-- Local development data — `supabase db reset` loads this after the
-- migrations. Never run against production: it creates sign-in-able demo
-- accounts with a shared password.
--
-- It rebuilds the app's own demo world from `data/` on top of the preset
-- challenges their migration loads: Julia on Day 5 of Get Fit for Summer with her
-- friends and the members around her. Every demo account signs in with its
-- email and the password `her75-demo`:
--   julia@her75.test   (the account the app's seed shows as "you")
--   lily@ zoe@  (friends)   mia@ sofia@ elena@ nora@ camila@  (members)
--
-- Task photo paths point where the app would put them, but no files are
-- uploaded, so signed links for seeded photos come back 404. That's
-- expected: the photos the app ships with stand in for them on the phone.

-- ---------------------------------------------------------------------------
-- People
-- ---------------------------------------------------------------------------

create temporary table demo_people (key text primary key, id uuid, name text, handle text, bio text);
insert into demo_people values
  ('julia',  '00000000-0000-4000-8000-000000000001', 'Julia',  'julia_575',     'clean plates, daily walks, no excuses'),
  ('lily',   '00000000-0000-4000-8000-000000000002', 'Lily',   'lily.days',     'one day at a time'),
  ('zoe',    '00000000-0000-4000-8000-000000000003', 'Zoe',    'zoegoesfor',    'going for it'),
  ('mia',    '00000000-0000-4000-8000-000000000004', 'Mia',    'mia.moves',     'mountains on weekends'),
  ('sofia',  '00000000-0000-4000-8000-000000000005', 'Sofia',  'sofia.sleeps',  'smoothies and early nights'),
  ('elena',  '00000000-0000-4000-8000-000000000006', 'Elena',  'elena_drives',  null),
  ('nora',   '00000000-0000-4000-8000-000000000007', 'Nora',   'norainthehood', 'dog walks count'),
  ('camila', '00000000-0000-4000-8000-000000000008', 'Camila', 'camilaglow',    'reading in the park');

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change
)
select
  '00000000-0000-0000-0000-000000000000', p.id, 'authenticated', 'authenticated',
  p.key || '@her75.test', extensions.crypt('her75-demo', extensions.gen_salt('bf')), now(),
  '{"provider": "email", "providers": ["email"]}', jsonb_build_object('full_name', p.name), now(), now(),
  '', '', '', ''
from demo_people p;

insert into auth.identities (id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at)
select gen_random_uuid(), p.id, p.id::text, 'email',
       jsonb_build_object('sub', p.id::text, 'email', p.key || '@her75.test', 'email_verified', true),
       now(), now(), now()
from demo_people p;

-- The sign-up trigger made a profile for each; give them the app's faces.
update public.profiles pr set name = p.name, handle = p.handle, bio = p.bio
from demo_people p where pr.id = p.id;

-- ---------------------------------------------------------------------------
-- Challenges — the presets come from their migration; the seed only names
-- who started each and adds the rounds behind the demo
-- ---------------------------------------------------------------------------

update public.challenges c set creator_id = p.id
from (values
  ('her75', 'mia'),
  ('hard', 'elena'),
  ('medium', 'sofia'),
  ('soft', 'camila'),
  ('steps', 'lily'),
  ('pages', 'zoe'),
  ('rainbow', 'mia'),
  ('study', 'sofia'),
  ('summer-glow', 'zoe')
) as x(slug, person)
join demo_people p on p.key = x.person
where c.slug = x.slug;

-- The round the app's demo is on: Get Fit for Summer, counted back from
-- today so Julia is always on Day 5. And the 75 Hard behind her older
-- trophy.
insert into public.rounds (challenge_id, start_date, days)
select c.id, r.start_date, c.default_days
from (values ('her75', current_date - 4), ('hard', date '2025-01-10')) as r(slug, start_date)
join public.challenges c on c.slug = r.slug;

create temporary table demo_rounds as
select r.id, c.slug, r.start_date from public.rounds r join public.challenges c on c.id = r.challenge_id;

-- ---------------------------------------------------------------------------
-- Who's in what
-- ---------------------------------------------------------------------------

-- Julia and the members on today's round; Lily and Zoe, her friends, on 75
-- Hard. Julia's two trophies are finished memberships in old rounds.
insert into public.memberships (round_id, user_id, status, signed_at, ended_at)
select r.id, p.id, m.status::public.membership_status, r.start_date - 1, m.ended
from (values
  ('julia', 'her75', current_date - 4, 'active', null::timestamptz),
  ('mia', 'her75', current_date - 4, 'active', null),
  ('sofia', 'her75', current_date - 4, 'active', null),
  ('elena', 'her75', current_date - 4, 'active', null),
  ('nora', 'her75', current_date - 4, 'active', null),
  ('camila', 'her75', current_date - 4, 'active', null),
  ('lily', 'hard', date '2026-09-03', 'active', null),
  ('zoe', 'hard', date '2026-09-03', 'active', null),
  ('julia', 'her75', date '2026-06-01', 'finished', timestamptz '2026-08-15 00:00+00'),
  ('julia', 'hard', date '2025-01-10', 'finished', timestamptz '2025-03-26 00:00+00')
) as m(person, slug, start_date, status, ended)
join demo_people p on p.key = m.person
join demo_rounds r on r.slug = m.slug and r.start_date = m.start_date;

-- ---------------------------------------------------------------------------
-- Days so far
-- ---------------------------------------------------------------------------

-- Every past day fully done by everyone, so nobody has lost a life. Today:
-- Julia has a clean slate, as the app's demo does; the others are part way
-- through, Mia finished.
insert into public.task_completions (membership_id, task_id, day, photo_path, thumb_path, completed_at)
select m.id, t.id, d.day,
       m.user_id || '/' || m.id || '/' || d.day || '/' || t.key || '.jpg',
       m.user_id || '/' || m.id || '/' || d.day || '/' || t.key || '_thumb.jpg',
       (r.start_date + d.day - 1) + make_interval(hours => 7 + t.position, mins => (t.position * 7) % 60)
from public.memberships m
join public.rounds r on r.id = m.round_id
join public.challenge_tasks t on t.challenge_id = r.challenge_id
cross join lateral generate_series(1, (current_date - r.start_date + 1)::int) as d(day)
join demo_people p on p.id = m.user_id
where m.status = 'active'
  and (
    d.day < current_date - r.start_date + 1
    or t.position < case p.key
      when 'mia' then 5 when 'camila' then 4 when 'sofia' then 3 when 'elena' then 2 when 'nora' then 1
      when 'lily' then 3 when 'zoe' then 1 else 0 end);

insert into public.day_captions (membership_id, day, caption)
select m.id, c.day, c.caption
from (values
  (1, 'Day one done. Slow start, but I showed up.'),
  (2, 'Legs are sore and the bottle is empty. Counting that as a win.'),
  (3, 'Sunday meal prep paid off today.'),
  (4, 'Almost skipped the walk. So glad I didn''t.')
) as c(day, caption)
join public.memberships m on m.user_id = (select id from demo_people where key = 'julia') and m.status = 'active';

insert into public.day_captions (membership_id, day, caption)
select m.id, 5, 'Up the mountain before breakfast. Every task done by noon.'
from public.memberships m where m.user_id = (select id from demo_people where key = 'mia') and m.status = 'active';

-- ---------------------------------------------------------------------------
-- Friends and talk
-- ---------------------------------------------------------------------------

insert into public.friendships (requester_id, addressee_id, status, accepted_at)
select a.id, b.id, 'accepted', now() - interval '30 days'
from demo_people a, demo_people b
where (a.key, b.key) in (('julia', 'lily'), ('julia', 'zoe'), ('lily', 'zoe'), ('lily', 'mia'), ('zoe', 'sofia'));

-- Camila has asked to be Julia's friend — something for the activity list.
insert into public.friendships (requester_id, addressee_id)
select a.id, b.id from demo_people a, demo_people b where a.key = 'camila' and b.key = 'julia';

-- Talk under Julia's Day 4 and Mia's today.
insert into public.comments (membership_id, day, author_id, body)
select m.id, 4, (select id from demo_people where key = c.author), c.body
from (values ('lily', 'So proud of you for getting out there!'), ('zoe', 'The walk is always worth it.')) as c(author, body)
join public.memberships m on m.user_id = (select id from demo_people where key = 'julia') and m.status = 'active';

insert into public.comments (membership_id, day, author_id, body)
select m.id, 5, (select id from demo_people where key = 'sofia'), 'That view though 😍'
from public.memberships m where m.user_id = (select id from demo_people where key = 'mia') and m.status = 'active';

insert into public.reactions (membership_id, day, user_id, emoji)
select m.id, 4, (select id from demo_people where key = r.person), r.emoji
from (values ('lily', '❤️'), ('zoe', '🔥'), ('mia', '👏')) as r(person, emoji)
join public.memberships m on m.user_id = (select id from demo_people where key = 'julia') and m.status = 'active';
