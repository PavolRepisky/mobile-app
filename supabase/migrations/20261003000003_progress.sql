-- A day's work: each task ticked off by photographing it, and the caption
-- written under the day's post.
--
-- A task can only ever be done *today* — today where its member lives. The
-- app used to let any day be written; the server doesn't, so a missed day
-- stays missed and lives mean something.

create table public.task_completions (
  id uuid primary key default gen_random_uuid(),
  membership_id uuid not null references public.memberships on delete cascade,
  task_id uuid not null references public.challenge_tasks on delete cascade,
  day int not null check (day >= 1),
  -- The proof, full size and as a grid thumbnail, in the private
  -- `task-photos` bucket under `<user>/<membership>/<day>/`. Both sizes are
  -- made on the phone: the storage's own resizing bills per source image,
  -- and every completion is a new one.
  photo_path text not null,
  thumb_path text not null,
  -- Which cell of the day's grid it was shot into, in the grid's own order.
  -- Null lets the task take the first free cell.
  slot int check (slot between 0 and 11),
  -- When the task was first done. A retake replaces the photo but not this:
  -- the task was done when it was first photographed.
  completed_at timestamptz not null default now(),
  photo_updated_at timestamptz not null default now(),
  unique (membership_id, task_id, day)
);

create index task_completions_day_idx on public.task_completions (membership_id, day);

create table public.day_captions (
  membership_id uuid not null references public.memberships on delete cascade,
  day int not null check (day >= 1),
  caption text not null check (char_length(btrim(caption)) between 1 and 500),
  updated_at timestamptz not null default now(),
  primary key (membership_id, day)
);

alter table public.task_completions enable row level security;
alter table public.day_captions enable row level security;

-- Who did what and when is public, like the profile it shows on. The photos
-- themselves are guarded separately, by the storage policies — that's where
-- the Community lock lives.
create policy "completions are public" on public.task_completions for select to authenticated using (true);
create policy "captions are public" on public.day_captions for select to authenticated using (true);

revoke insert, update, delete on public.task_completions from anon, authenticated;

-- Captions are plain writes: yours, on a day that has come.
create function public.owns_membership(mid uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.memberships where id = mid and user_id = auth.uid())
$$;

create policy "write your own captions" on public.day_captions for insert to authenticated
  with check (public.owns_membership(membership_id) and day <= public.member_day(membership_id));
create policy "edit your own captions" on public.day_captions for update to authenticated
  using (public.owns_membership(membership_id))
  with check (public.owns_membership(membership_id) and day <= public.member_day(membership_id));
create policy "delete your own captions" on public.day_captions for delete to authenticated
  using (public.owns_membership(membership_id));

revoke insert, update, delete on public.day_captions from anon;

-- ---------------------------------------------------------------------------
-- Completing and undoing
-- ---------------------------------------------------------------------------

-- The shot and the tick land together. The photo is uploaded first, into
-- today's folder; this then records it. Retaking a done task keeps it done
-- and keeps its grid cell unless a new one is given. Hands back the photo
-- paths a retake replaced, for the app to delete from storage.
create function public.complete_task(task uuid, photo_path text, thumb_path text, slot int default null)
returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := public.require_uid();
  m public.memberships;
  r public.rounds;
  today int;
  folder text;
  previous public.task_completions;
  saved public.task_completions;
begin
  select * into m from public.memberships where user_id = uid and status = 'active';
  if not found then
    raise exception 'you are not in a challenge' using errcode = 'P0002';
  end if;
  select * into r from public.rounds where id = m.round_id;

  if not exists (select 1 from public.challenge_tasks where id = task and challenge_id = r.challenge_id) then
    raise exception 'that task isn''t part of your challenge' using errcode = '22023';
  end if;

  today := public.member_day(m.id);
  if today < 1 then
    raise exception 'your challenge hasn''t started yet' using errcode = 'P0001';
  end if;
  if today > r.days then
    raise exception 'your challenge is over' using errcode = 'P0001';
  end if;

  folder := uid::text || '/' || m.id::text || '/' || today::text || '/';
  if complete_task.photo_path not like folder || '%' or complete_task.thumb_path not like folder || '%' then
    raise exception 'photos must be uploaded to today''s folder (%)', folder using errcode = '42501';
  end if;

  select * into previous from public.task_completions
  where membership_id = m.id and task_id = task and day = today;

  insert into public.task_completions as tc (membership_id, task_id, day, photo_path, thumb_path, slot)
  values (m.id, task, today, complete_task.photo_path, complete_task.thumb_path, complete_task.slot)
  on conflict (membership_id, task_id, day) do update
    set photo_path = excluded.photo_path,
        thumb_path = excluded.thumb_path,
        slot = coalesce(excluded.slot, tc.slot),
        photo_updated_at = now()
  returning * into saved;

  return jsonb_build_object(
    'completion', to_jsonb(saved),
    'replaced', case
      when previous.id is null or previous.photo_path = saved.photo_path then '[]'::jsonb
      else jsonb_build_array(previous.photo_path, previous.thumb_path)
    end);
end $$;

-- The other half of that bargain: the tick goes, and the proof goes with it.
-- Today only. Hands back the photo paths for the app to delete.
create function public.undo_task(task uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := public.require_uid();
  mid uuid;
  removed public.task_completions;
begin
  select id into mid from public.memberships where user_id = uid and status = 'active';
  delete from public.task_completions
  where membership_id = mid and task_id = task and day = public.member_day(mid)
  returning * into removed;

  if removed.id is null then
    return '[]'::jsonb;
  end if;
  return jsonb_build_array(removed.photo_path, removed.thumb_path);
end $$;

revoke execute on function public.complete_task(uuid, text, text, int), public.undo_task(uuid) from public, anon;
grant execute on function public.complete_task(uuid, text, text, int), public.undo_task(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Where everyone stands
-- ---------------------------------------------------------------------------

-- One row per membership: what day it's on, how much of today is done, and
-- the days missed — a day fully behind you without every task done. Today
-- is still open however little of it is ticked, so it never counts. Lives
-- are floored at zero: past the allowance the run is lost, and how far past
-- says nothing more.
create view public.membership_progress with (security_invoker = true) as
select
  m.id as membership_id,
  m.user_id,
  m.round_id,
  r.challenge_id,
  m.status,
  r.start_date,
  r.days,
  c.lives,
  t.task_count,
  d.current_day,
  coalesce(today.done, 0) as done_today,
  d.closed_days - coalesce(full_days.n, 0) as missed_days,
  greatest(c.lives - (d.closed_days - coalesce(full_days.n, 0)), 0) as lives_left
from public.memberships m
join public.rounds r on r.id = m.round_id
join public.challenges c on c.id = r.challenge_id
cross join lateral (
  select count(*)::int as task_count from public.challenge_tasks ct where ct.challenge_id = r.challenge_id
) t
cross join lateral (
  select
    public.local_today(m.user_id) - r.start_date + 1 as current_day,
    greatest(least(public.local_today(m.user_id) - r.start_date, r.days), 0) as closed_days
) d
left join lateral (
  select count(*)::int as done from public.task_completions tc
  where tc.membership_id = m.id and tc.day = d.current_day
) today on true
left join lateral (
  select count(*)::int as n from (
    select tc.day from public.task_completions tc
    where tc.membership_id = m.id and tc.day < d.current_day and tc.day <= r.days
    group by tc.day
    having count(*) >= t.task_count
  ) f
) full_days on true;

-- Longest run of fully done days for everyone who was in a round, best
-- first — a finished round's standings. Ties share a place, so the app
-- groups by `longest_streak` rather than trusting row order.
create function public.round_standings(rid uuid)
returns table (user_id uuid, longest_streak int, status public.membership_status)
language sql stable security definer set search_path = '' as $$
  with tasks as (
    select count(*) as n from public.challenge_tasks ct
    join public.rounds r on r.challenge_id = ct.challenge_id where r.id = rid
  ),
  full_days as (
    select tc.membership_id, tc.day
    from public.task_completions tc
    join public.memberships m on m.id = tc.membership_id and m.round_id = rid
    group by tc.membership_id, tc.day
    having count(*) >= (select n from tasks)
  ),
  islands as (
    select membership_id, day - row_number() over (partition by membership_id order by day) as island
    from full_days
  ),
  streaks as (
    select membership_id, max(len)::int as longest
    from (select membership_id, count(*) as len from islands group by membership_id, island) s
    group by membership_id
  )
  select m.user_id, coalesce(s.longest, 0), m.status
  from public.memberships m
  left join streaks s on s.membership_id = m.id
  where m.round_id = rid and m.status <> 'left'
  order by 2 desc
$$;

-- A round's headline numbers: who's in, who's still going, who finished.
create view public.round_stats with (security_invoker = true) as
select
  r.id as round_id,
  count(p.membership_id) filter (where p.status <> 'left')::int as members,
  count(p.membership_id) filter (where p.status = 'active' and p.missed_days <= p.lives)::int as still_going,
  count(p.membership_id) filter (where p.status = 'finished')::int as finished
from public.rounds r
left join public.membership_progress p on p.round_id = r.id
group by r.id;

-- Challenges carried to the last day. One trophy, one finish.
create view public.trophies with (security_invoker = true) as
select m.id as membership_id, m.user_id, c.id as challenge_id, c.slug, c.name,
       r.start_date, (r.start_date + r.days - 1) as finish_date, r.days
from public.memberships m
join public.rounds r on r.id = m.round_id
join public.challenges c on c.id = r.challenge_id
where m.status = 'finished';
