-- A finished day doesn't go up the moment its last photo lands. A short
-- countdown starts first, and until it runs out the day can still be
-- reshot, a photo taken back out, or its caption written — a last look
-- before friends see it. Once it runs out the post is up and fixed.
-- Taking a photo back out stops the countdown; the day's last photo going
-- in again starts it over from the top.
--
-- A minute and a half: long enough to look the post over and write a line
-- under it, short enough that a friend refreshing Community isn't kept
-- waiting on it.

create table public.day_posts (
  membership_id uuid not null references public.memberships on delete cascade,
  day int not null check (day >= 1),
  -- When the day goes up on Community, and stops taking changes.
  posts_at timestamptz not null,
  primary key (membership_id, day)
);

alter table public.day_posts enable row level security;

-- When someone's post goes up is no more private than the post itself.
create policy "post times are public" on public.day_posts for select to authenticated using (true);
revoke insert, update, delete on public.day_posts from anon, authenticated;

create function public.post_countdown() returns interval
language sql immutable as $$ select interval '90 seconds' $$;

-- Whether a member's day is up and so can't be changed any more. A day
-- whose countdown never started — not finished, or finished before
-- countdowns existed — isn't.
create function public.day_posted(mid uuid, d int) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.day_posts
    where membership_id = mid and day = d and posts_at <= now()
  )
$$;

-- Whether a member's day is in its countdown — the only time its caption
-- can be written.
create function public.day_counting_down(mid uuid, d int) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.day_posts
    where membership_id = mid and day = d and posts_at > now()
  )
$$;

-- ---------------------------------------------------------------------------
-- Completing and undoing, now with the countdown
-- ---------------------------------------------------------------------------

-- As before, plus: a day that's up takes no more photos, and the photo that
-- finishes the day starts its countdown. Hands back when the day goes up
-- (`posts_at`, null while it's unfinished) alongside the completion.
create or replace function public.complete_task(task uuid, photo_path text, thumb_path text, slot int default null)
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
  goes_up timestamptz;
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
  if public.day_posted(m.id, today) then
    raise exception 'today''s post is already up' using errcode = 'P0001';
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

  -- The day's last photo starts the countdown; a retake during it leaves
  -- the countdown where it is.
  if (select count(*) from public.task_completions where membership_id = m.id and day = today)
     >= (select count(*) from public.challenge_tasks where challenge_id = r.challenge_id) then
    insert into public.day_posts (membership_id, day, posts_at)
    values (m.id, today, now() + public.post_countdown())
    on conflict (membership_id, day) do nothing;
  end if;
  select posts_at into goes_up from public.day_posts where membership_id = m.id and day = today;

  return jsonb_build_object(
    'completion', to_jsonb(saved),
    'posts_at', goes_up,
    'replaced', case
      when previous.id is null or previous.photo_path = saved.photo_path then '[]'::jsonb
      else jsonb_build_array(previous.photo_path, previous.thumb_path)
    end);
end $$;

-- As before, plus: a day that's up keeps its photos, and taking one out of
-- a day in its countdown stops the countdown.
create or replace function public.undo_task(task uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := public.require_uid();
  mid uuid;
  today int;
  removed public.task_completions;
begin
  select id into mid from public.memberships where user_id = uid and status = 'active';
  today := public.member_day(mid);
  if public.day_posted(mid, today) then
    raise exception 'today''s post is already up' using errcode = 'P0001';
  end if;

  delete from public.task_completions
  where membership_id = mid and task_id = task and day = today
  returning * into removed;

  if removed.id is null then
    return '[]'::jsonb;
  end if;
  delete from public.day_posts where membership_id = mid and day = today;
  return jsonb_build_array(removed.photo_path, removed.thumb_path);
end $$;

-- Slide to post: ends today's countdown now rather than waiting it out.
-- Hands back when the day went up, or null if it wasn't counting down.
create function public.post_now() returns timestamptz
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := public.require_uid();
  mid uuid;
  went_up timestamptz;
begin
  select id into mid from public.memberships where user_id = uid and status = 'active';
  update public.day_posts set posts_at = now()
  where membership_id = mid and day = public.member_day(mid) and posts_at > now()
  returning posts_at into went_up;
  return went_up;
end $$;

revoke execute on function public.post_now() from public, anon;
grant execute on function public.post_now() to authenticated;

-- ---------------------------------------------------------------------------
-- Captions: written in the countdown, fixed once the day is up
-- ---------------------------------------------------------------------------

drop policy "write your own captions" on public.day_captions;
drop policy "edit your own captions" on public.day_captions;
drop policy "delete your own captions" on public.day_captions;

create policy "write your own caption in the countdown" on public.day_captions for insert to authenticated
  with check (public.owns_membership(membership_id) and public.day_counting_down(membership_id, day));
create policy "edit your own caption in the countdown" on public.day_captions for update to authenticated
  using (public.owns_membership(membership_id) and public.day_counting_down(membership_id, day))
  with check (public.owns_membership(membership_id) and public.day_counting_down(membership_id, day));
create policy "clear your own caption in the countdown" on public.day_captions for delete to authenticated
  using (public.owns_membership(membership_id) and public.day_counting_down(membership_id, day));

-- ---------------------------------------------------------------------------
-- The Community tab, with when each day goes up
-- ---------------------------------------------------------------------------

-- As before, plus `posts_at`: a finished day only shows as a post once it
-- has passed. A changed return type can't be replaced in place.
drop function public.community_today(text);

create function public.community_today(scope text)
returns table (
  membership_id uuid,
  user_id uuid,
  name text,
  handle text,
  avatar_path text,
  challenge_id uuid,
  day int,
  done int,
  task_count int,
  lives_left int,
  caption text,
  last_completed_at timestamptz,
  views int,
  reactions int,
  my_reaction text,
  comments int,
  is_friend boolean,
  request_sent boolean,
  unlocked boolean,
  posts_at timestamptz
)
language sql stable security definer set search_path = '' as $$
  with me as (select auth.uid() as id),
  my_round as (
    select round_id from public.memberships where user_id = (select id from me) and status = 'active'
  ),
  people as (
    select p.*
    from public.membership_progress p
    where p.status = 'active'
      and p.current_day between 1 and p.days
      and p.user_id <> (select id from me)
      and case scope
        when 'friends' then p.user_id in (select friend_id from public.friends where user_id = (select id from me))
        when 'members' then p.round_id in (select round_id from my_round)
          and p.user_id not in (select friend_id from public.friends where user_id = (select id from me))
        else false
      end
  )
  select
    p.membership_id,
    p.user_id,
    pr.name,
    pr.handle,
    pr.avatar_path,
    p.challenge_id,
    p.current_day,
    p.done_today,
    p.task_count,
    p.lives_left,
    dc.caption,
    (select max(tc.completed_at) from public.task_completions tc
      where tc.membership_id = p.membership_id and tc.day = p.current_day),
    (select count(distinct v.viewer_id)::int from public.photo_views v
      join public.task_completions tc on tc.id = v.completion_id
      where tc.membership_id = p.membership_id and tc.day = p.current_day),
    (select count(*)::int from public.reactions r
      where r.membership_id = p.membership_id and r.day = p.current_day),
    (select r.emoji from public.reactions r
      where r.membership_id = p.membership_id and r.day = p.current_day and r.user_id = (select id from me)),
    (select count(*)::int from public.comments c
      where c.membership_id = p.membership_id and c.day = p.current_day),
    exists (select 1 from public.friends f where f.user_id = (select id from me) and f.friend_id = p.user_id),
    exists (select 1 from public.friendships f
      where f.requester_id = (select id from me) and f.addressee_id = p.user_id and f.status = 'pending'),
    public.unlocked_today(),
    dp.posts_at
  from people p
  join public.profiles pr on pr.id = p.user_id
  left join public.day_captions dc on dc.membership_id = p.membership_id and dc.day = p.current_day
  left join public.day_posts dp on dp.membership_id = p.membership_id and dp.day = p.current_day
  order by p.done_today desc, 12 desc nulls last
$$;

revoke execute on function public.community_today(text) from public, anon;
grant execute on function public.community_today(text) to authenticated;
