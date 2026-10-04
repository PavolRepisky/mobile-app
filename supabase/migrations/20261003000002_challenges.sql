-- Challenges, the rounds they run in, and who is in them.
--
-- A challenge is the recipe: a name, its tasks, how many days, how many lives.
-- A round is one run of it with a Day 1 everyone in it shares — joining shuts
-- once that day has passed. A membership is one person signed up to a round.
--
-- Nothing here is written to directly from the app. Every write goes through
-- one of the functions at the bottom, which check the rules a row policy
-- can't express (Day 1 not yet passed, only the creator, one round at a
-- time) and keep multi-row changes whole.

create type public.challenge_category as enum ('Fitness', 'Health', 'Mindset', 'Lifestyle', 'Study');

create table public.challenges (
  id uuid primary key default gen_random_uuid(),
  -- Set on the presets only: the key the app files their bundled photos
  -- under ("her75", "hard", …). A challenge without one was built by a user.
  slug text unique,
  -- Who started it — shown as "Created by". Kept when that account is
  -- deleted would mean a dangling face, so it falls back to nobody instead,
  -- and the challenge stays for everyone already in it.
  creator_id uuid references public.profiles on delete set null,
  name text not null check (char_length(btrim(name)) between 1 and 60),
  stamp text not null default 'Custom' check (char_length(stamp) <= 40),
  description text not null default '' check (char_length(description) <= 500),
  category public.challenge_category,
  default_days int not null check (default_days between 1 and 365),
  -- Days anyone in it may miss before their run ends.
  lives int not null default 3 check (lives between 0 and 10),
  -- Paths in the public `challenge-photos` bucket, for a challenge built in
  -- the app. The presets use the photos bundled with the app instead.
  photo_paths text[] not null default '{}',
  created_at timestamptz not null default now()
);

create index challenges_creator_idx on public.challenges (creator_id);

create table public.challenge_tasks (
  id uuid primary key default gen_random_uuid(),
  challenge_id uuid not null references public.challenges on delete cascade,
  -- The preset's own task key ("h1"), which the app's bundled demo photos
  -- are filed under. Null for tasks written on the create form.
  key text,
  position int not null check (position >= 0),
  label text not null check (char_length(btrim(label)) between 1 and 60),
  -- One line on how to do it, so everyone's photo proves the same thing.
  note text check (char_length(note) <= 140),
  -- Deferred so an edit can reorder tasks in one statement without two
  -- briefly sharing a position.
  constraint challenge_tasks_position_key unique (challenge_id, position) deferrable initially deferred
);

create table public.rounds (
  id uuid primary key default gen_random_uuid(),
  challenge_id uuid not null references public.challenges on delete cascade,
  -- Day 1, a calendar date: each member's Day 1 starts at midnight where
  -- they live, so a round in Sydney and one in New York begin on the same
  -- date, not the same instant.
  start_date date not null,
  days int not null check (days between 1 and 365),
  created_at timestamptz not null default now()
);

create index rounds_challenge_idx on public.rounds (challenge_id);
create index rounds_start_idx on public.rounds (start_date);

create type public.membership_status as enum (
  -- Signed up and still in it — including before Day 1.
  'active',
  -- Missed more days than the challenge's lives allow.
  'lost',
  -- Reached the end with lives to spare: a trophy.
  'finished',
  -- Ended it from Settings, or swapped to another challenge.
  'left'
);

-- The two nudges picked while joining: a time for each task by task id, and
-- the last call, as minutes after midnight, or null for Never. The phone
-- schedules them itself; the server only keeps them so they survive a
-- reinstall or a new phone.
create function public.valid_reminders(r jsonb) returns boolean
language sql immutable set search_path = '' as $$
  select coalesce(
    jsonb_typeof(r) = 'object'
    and jsonb_typeof(r -> 'tasks') = 'object'
    and jsonb_typeof(r -> 'lastCall') in ('null', 'number')
    and (jsonb_typeof(r -> 'lastCall') = 'null' or (r ->> 'lastCall')::numeric between 0 and 1439)
    and not exists (
      select 1 from jsonb_each(r -> 'tasks') e
      where not (
        jsonb_typeof(e.value) = 'null'
        or (jsonb_typeof(e.value) = 'number' and (e.value #>> '{}')::numeric between 0 and 1439)
      )
    ),
    false)
$$;

create table public.memberships (
  id uuid primary key default gen_random_uuid(),
  round_id uuid not null references public.rounds on delete cascade,
  user_id uuid not null references public.profiles on delete cascade,
  status public.membership_status not null default 'active',
  -- Signing the pledge is what joins.
  signed_at timestamptz not null default now(),
  ended_at timestamptz,
  -- Ten at night by default: two hours before midnight ends the day.
  reminders jsonb not null default '{"tasks": {}, "lastCall": 1320}'
    check (public.valid_reminders(reminders)),
  unique (round_id, user_id)
);

-- One challenge at a time, the way the app's Tasks tab only ever shows one.
create unique index memberships_one_active on public.memberships (user_id) where status = 'active';
create index memberships_round_idx on public.memberships (round_id, status);

alter table public.challenges enable row level security;
alter table public.challenge_tasks enable row level security;
alter table public.rounds enable row level security;
alter table public.memberships enable row level security;

create policy "challenges are public" on public.challenges for select to authenticated using (true);
create policy "tasks are public" on public.challenge_tasks for select to authenticated using (true);
create policy "rounds are public" on public.rounds for select to authenticated using (true);
-- Who's in a round is public: the challenge page shows its members, and
-- profiles are public.
create policy "memberships are public" on public.memberships for select to authenticated using (true);

revoke insert, update, delete on public.challenges, public.challenge_tasks, public.rounds, public.memberships
  from anon, authenticated;

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

create function public.require_uid() returns uuid
language plpgsql stable set search_path = '' as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'sign in first' using errcode = '42501';
  end if;
  return uid;
end $$;

-- Which day of its round a membership is on, in its member's own zone. Zero
-- or less before Day 1, past `days` once the round is over — callers clamp
-- to what they need.
create function public.member_day(mid uuid) returns int
language sql stable security definer set search_path = '' as $$
  select public.local_today(m.user_id) - r.start_date + 1
  from public.memberships m
  join public.rounds r on r.id = m.round_id
  where m.id = mid
$$;

-- The account's current challenge, if it has one.
create function public.my_membership_id() returns uuid
language sql stable security definer set search_path = '' as $$
  select id from public.memberships where user_id = auth.uid() and status = 'active'
$$;

-- Writes the form's task list onto a challenge: tasks handed back with an id
-- are kept (so photos and reminders keyed by it survive an edit), new ones
-- are added, and any left out are removed. Order is the list's own.
create function public.write_challenge_tasks(cid uuid, tasks jsonb) returns void
language plpgsql security definer set search_path = '' as $$
declare
  kept uuid[];
begin
  if jsonb_typeof(tasks) is distinct from 'array' or jsonb_array_length(tasks) not between 1 and 12 then
    raise exception 'a challenge needs between 1 and 12 tasks' using errcode = '22023';
  end if;

  kept := array(
    select (t ->> 'id')::uuid from jsonb_array_elements(tasks) t
    where nullif(t ->> 'id', '') is not null);

  if exists (
    select 1 from unnest(kept) k
    where not exists (select 1 from public.challenge_tasks ct where ct.id = k and ct.challenge_id = cid)
  ) then
    raise exception 'unknown task id' using errcode = '22023';
  end if;

  delete from public.challenge_tasks where challenge_id = cid and id <> all (kept);

  insert into public.challenge_tasks (id, challenge_id, position, label, note)
  select coalesce(nullif(t ->> 'id', '')::uuid, gen_random_uuid()), cid, (ord - 1)::int,
         btrim(t ->> 'label'), nullif(btrim(coalesce(t ->> 'note', '')), '')
  from jsonb_array_elements(tasks) with ordinality as x(t, ord)
  on conflict (id) do update
    set position = excluded.position, label = excluded.label, note = excluded.note;
end $$;

-- Challenge photos must be the creator's own uploads.
create function public.check_own_paths(uid uuid, paths jsonb) returns text[]
language plpgsql immutable set search_path = '' as $$
declare
  result text[] := array(select jsonb_array_elements_text(coalesce(paths, '[]'::jsonb)));
begin
  if exists (select 1 from unnest(result) p where p not like uid::text || '/%') then
    raise exception 'photos must be uploaded to your own folder' using errcode = '42501';
  end if;
  if cardinality(result) > 6 then
    raise exception 'at most 6 photos' using errcode = '22023';
  end if;
  return result;
end $$;

revoke execute on function public.write_challenge_tasks(uuid, jsonb), public.check_own_paths(uuid, jsonb)
  from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- What the app calls
-- ---------------------------------------------------------------------------

-- The create form: { name, description, category?, photo_paths[], tasks:
-- [{ label, note? }], days, start_date, lives }. Builds the challenge and its
-- one round, and hands back the challenge id. It doesn't join you — signing
-- the pledge does that.
create function public.create_challenge(p jsonb) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := public.require_uid();
  start date := (p ->> 'start_date')::date;
  cid uuid;
begin
  if start is null or start < public.local_today(uid) then
    raise exception 'Day 1 can''t be in the past' using errcode = '22023';
  end if;

  insert into public.challenges (creator_id, name, description, category, default_days, lives, photo_paths)
  values (
    uid,
    btrim(p ->> 'name'),
    coalesce(p ->> 'description', ''),
    nullif(p ->> 'category', '')::public.challenge_category,
    (p ->> 'days')::int,
    coalesce((p ->> 'lives')::int, 3),
    public.check_own_paths(uid, p -> 'photo_paths'))
  returning id into cid;

  perform public.write_challenge_tasks(cid, p -> 'tasks');
  insert into public.rounds (challenge_id, start_date, days) values (cid, start, (p ->> 'days')::int);
  return cid;
end $$;

-- Rewrites a challenge you built from the same form. Only before Day 1 —
-- once it has started, people have joined on its terms.
create function public.update_challenge(cid uuid, p jsonb) returns void
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := public.require_uid();
  c public.challenges;
  r public.rounds;
  start date := (p ->> 'start_date')::date;
begin
  select * into c from public.challenges where id = cid for update;
  if not found or c.creator_id is distinct from uid or c.slug is not null then
    raise exception 'only its creator can edit this challenge' using errcode = '42501';
  end if;

  select * into r from public.rounds where challenge_id = cid order by start_date limit 1 for update;
  if public.local_today(uid) >= r.start_date then
    raise exception 'this challenge has already started' using errcode = 'P0001';
  end if;
  if start is null or start < public.local_today(uid) then
    raise exception 'Day 1 can''t be in the past' using errcode = '22023';
  end if;

  update public.challenges set
    name = btrim(p ->> 'name'),
    description = coalesce(p ->> 'description', ''),
    category = nullif(p ->> 'category', '')::public.challenge_category,
    default_days = (p ->> 'days')::int,
    lives = coalesce((p ->> 'lives')::int, lives),
    photo_paths = public.check_own_paths(uid, p -> 'photo_paths')
  where id = cid;

  perform public.write_challenge_tasks(cid, p -> 'tasks');
  update public.rounds set start_date = start, days = (p ->> 'days')::int where id = r.id;
end $$;

-- Takes a challenge you built down, with everyone's place in it.
create function public.delete_challenge(cid uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := public.require_uid();
begin
  delete from public.challenges where id = cid and creator_id = uid and slug is null;
  if not found then
    raise exception 'only its creator can delete this challenge' using errcode = '42501';
  end if;
end $$;

-- Signing the pledge. Joining shuts once Day 1 has passed where you live.
-- Being in one challenge at a time, joining a new one ends the one you were
-- on, the way picking a challenge in the app always has.
create function public.join_round(rid uuid, reminders jsonb default null) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := public.require_uid();
  r public.rounds;
  mid uuid;
begin
  select * into r from public.rounds where id = rid;
  if not found then
    raise exception 'no such round' using errcode = 'P0002';
  end if;
  if public.local_today(uid) > r.start_date then
    raise exception 'joining closed when this round started' using errcode = 'P0001';
  end if;

  update public.memberships set status = 'left', ended_at = now()
  where user_id = uid and status = 'active' and round_id <> rid;

  insert into public.memberships (round_id, user_id, reminders)
  values (rid, uid, coalesce(reminders, '{"tasks": {}, "lastCall": 1320}'))
  on conflict (round_id, user_id) do update
    set status = 'active', ended_at = null, signed_at = now(),
        reminders = coalesce(join_round.reminders, public.memberships.reminders)
  returning id into mid;
  return mid;
end $$;

-- Settings' Reminders sheet.
create function public.set_reminders(reminders jsonb) returns void
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := public.require_uid();
begin
  update public.memberships set reminders = set_reminders.reminders
  where user_id = uid and status = 'active';
  if not found then
    raise exception 'you are not in a challenge' using errcode = 'P0002';
  end if;
end $$;

-- Settings' End challenge.
create function public.leave_round() returns void
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := public.require_uid();
begin
  update public.memberships set status = 'left', ended_at = now()
  where user_id = uid and status = 'active';
end $$;

revoke execute on function
  public.create_challenge(jsonb), public.update_challenge(uuid, jsonb), public.delete_challenge(uuid),
  public.join_round(uuid, jsonb), public.set_reminders(jsonb), public.leave_round()
  from public, anon;
grant execute on function
  public.create_challenge(jsonb), public.update_challenge(uuid, jsonb), public.delete_challenge(uuid),
  public.join_round(uuid, jsonb), public.set_reminders(jsonb), public.leave_round()
  to authenticated;
