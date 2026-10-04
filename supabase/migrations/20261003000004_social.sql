-- Friends, and everything said about a day: comments, reactions, views.
--
-- A "post" has no table of its own. It is one member's day — a membership
-- and a day number — drawn from that day's completions and caption, so
-- everything that hangs off a post is keyed by (membership_id, day).

-- ---------------------------------------------------------------------------
-- Who can see a day
-- ---------------------------------------------------------------------------

-- True once the signed-in account has photographed a task today — today in
-- its own challenge, where it lives. Yesterday's photo doesn't stand in for
-- today's. This is the Community lock.
create function public.unlocked_today() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1
    from public.memberships m
    join public.task_completions tc on tc.membership_id = m.id
    where m.user_id = auth.uid()
      and m.status = 'active'
      and tc.day = public.member_day(m.id)
  )
$$;

-- Whether the signed-in account may see one member's day. Your own, always.
-- Anyone's past days, always: profiles are public, and a day that is over
-- has nothing left to race. Someone's *today* only once you've proven your
-- own — a day nobody has photographed yet has no post of its own to read
-- anyone else's against.
create function public.can_view_day(mid uuid, d int) returns boolean
language sql stable security definer set search_path = '' as $$
  select case
    when auth.uid() is null then false
    when public.owns_membership(mid) then true
    when d < public.member_day(mid) then true
    else public.unlocked_today()
  end
$$;

-- ---------------------------------------------------------------------------
-- Friends
-- ---------------------------------------------------------------------------

create type public.friendship_status as enum ('pending', 'accepted');

-- One row per pair, whoever asked first.
create table public.friendships (
  requester_id uuid not null references public.profiles on delete cascade,
  addressee_id uuid not null references public.profiles on delete cascade,
  status public.friendship_status not null default 'pending',
  created_at timestamptz not null default now(),
  accepted_at timestamptz,
  primary key (requester_id, addressee_id),
  check (requester_id <> addressee_id)
);

create unique index friendships_pair_idx on public.friendships
  (least(requester_id, addressee_id), greatest(requester_id, addressee_id));
create index friendships_addressee_idx on public.friendships (addressee_id);

alter table public.friendships enable row level security;

-- Who's friends with whom is as public as the profiles are; a request is
-- only for the two people in it.
create policy "friendships are public, requests are private" on public.friendships
  for select to authenticated
  using (status = 'accepted' or requester_id = (select auth.uid()) or addressee_id = (select auth.uid()));

revoke insert, update, delete on public.friendships from anon, authenticated;

-- Both directions of every friendship, for joining against.
create view public.friends with (security_invoker = true) as
select requester_id as user_id, addressee_id as friend_id, accepted_at from public.friendships where status = 'accepted'
union all
select addressee_id, requester_id, accepted_at from public.friendships where status = 'accepted';

-- Add. If they had already asked you, this accepts instead of asking back.
create function public.request_friend(target uuid) returns public.friendship_status
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := public.require_uid();
  result public.friendship_status;
begin
  if target = uid then
    raise exception 'you can''t add yourself' using errcode = '22023';
  end if;

  update public.friendships set status = 'accepted', accepted_at = now()
  where requester_id = target and addressee_id = uid and status = 'pending'
  returning status into result;
  if found then
    return result;
  end if;

  insert into public.friendships (requester_id, addressee_id) values (uid, target)
  on conflict do nothing;
  select status into result from public.friendships
  where least(requester_id, addressee_id) = least(uid, target)
    and greatest(requester_id, addressee_id) = greatest(uid, target);
  return result;
end $$;

-- Takes back a request, declines one, or ends a friendship — whichever the
-- two of you have.
create function public.unfriend(target uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := public.require_uid();
begin
  delete from public.friendships
  where (requester_id = uid and addressee_id = target) or (requester_id = target and addressee_id = uid);
end $$;

-- People you might know: friends of your friends you aren't connected to
-- yet, most mutual friends first, with up to two of those friends named.
create function public.friend_suggestions(max_rows int default 20)
returns table (user_id uuid, mutual_count int, mutual_ids uuid[])
language sql stable security definer set search_path = '' as $$
  with mine as (select friend_id from public.friends where user_id = auth.uid())
  select f.friend_id, count(*)::int, (array_agg(f.user_id order by f.accepted_at))[1:2]
  from public.friends f
  where f.user_id in (select friend_id from mine)
    and f.friend_id <> auth.uid()
    and not exists (
      select 1 from public.friendships x
      where least(x.requester_id, x.addressee_id) = least(auth.uid(), f.friend_id)
        and greatest(x.requester_id, x.addressee_id) = greatest(auth.uid(), f.friend_id))
  group by f.friend_id
  order by count(*) desc
  limit max_rows
$$;

-- ---------------------------------------------------------------------------
-- Comments, reactions, views
-- ---------------------------------------------------------------------------

create table public.comments (
  id uuid primary key default gen_random_uuid(),
  membership_id uuid not null references public.memberships on delete cascade,
  day int not null check (day >= 1),
  author_id uuid not null references public.profiles on delete cascade,
  -- A reply hangs under the exact comment it answered, at any depth.
  parent_id uuid references public.comments on delete cascade,
  body text not null check (char_length(btrim(body)) between 1 and 1000),
  created_at timestamptz not null default now()
);

create index comments_post_idx on public.comments (membership_id, day, created_at);
create index comments_parent_idx on public.comments (parent_id);

-- A reply has to be on the same post as what it answers.
create function public.check_comment_parent() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.parent_id is not null and not exists (
    select 1 from public.comments p
    where p.id = new.parent_id and p.membership_id = new.membership_id and p.day = new.day
  ) then
    raise exception 'a reply must be on the same post' using errcode = '22023';
  end if;
  return new;
end $$;

create trigger comments_check_parent before insert on public.comments
  for each row execute function public.check_comment_parent();

-- One emoji per person per post; tapping the one already on it takes it off.
create table public.reactions (
  membership_id uuid not null references public.memberships on delete cascade,
  day int not null check (day >= 1),
  user_id uuid not null references public.profiles on delete cascade,
  emoji text not null check (emoji in ('❤️', '🔥', '👏', '😂')),
  created_at timestamptz not null default now(),
  primary key (membership_id, day, user_id)
);

-- One row the first time someone sees a photo — the story ring's "seen",
-- and the view count on a post.
create table public.photo_views (
  completion_id uuid not null references public.task_completions on delete cascade,
  viewer_id uuid not null references public.profiles on delete cascade,
  viewed_at timestamptz not null default now(),
  primary key (completion_id, viewer_id)
);

create index photo_views_viewer_idx on public.photo_views (viewer_id);

alter table public.comments enable row level security;
alter table public.reactions enable row level security;
alter table public.photo_views enable row level security;

create policy "read comments on days you can see" on public.comments for select to authenticated
  using (public.can_view_day(membership_id, day));
create policy "comment as yourself on days you can see" on public.comments for insert to authenticated
  with check (author_id = (select auth.uid()) and public.can_view_day(membership_id, day));
-- Your own comments, and anything said under your own post.
create policy "delete your comments or ones on your post" on public.comments for delete to authenticated
  using (author_id = (select auth.uid()) or public.owns_membership(membership_id));

create policy "reactions are public" on public.reactions for select to authenticated using (true);
create policy "react as yourself on days you can see" on public.reactions for insert to authenticated
  with check (user_id = (select auth.uid()) and public.can_view_day(membership_id, day));
create policy "change your reaction" on public.reactions for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()) and public.can_view_day(membership_id, day));
create policy "take your reaction back" on public.reactions for delete to authenticated
  using (user_id = (select auth.uid()));

-- Who saw what is between the viewer and the photo's owner.
create policy "your views, and views of your photos" on public.photo_views for select to authenticated
  using (
    viewer_id = (select auth.uid())
    or exists (
      select 1 from public.task_completions tc
      where tc.id = completion_id and public.owns_membership(tc.membership_id)));
create policy "record your own views of photos you can see" on public.photo_views for insert to authenticated
  with check (
    viewer_id = (select auth.uid())
    and exists (
      select 1 from public.task_completions tc
      where tc.id = completion_id and public.can_view_day(tc.membership_id, tc.day)));

revoke update on public.comments, public.photo_views from anon, authenticated;
revoke insert, update, delete on public.comments, public.reactions, public.photo_views from anon;
revoke update on public.reactions from authenticated;
grant update (emoji) on public.reactions to authenticated;

-- ---------------------------------------------------------------------------
-- Notifications
-- ---------------------------------------------------------------------------

-- Something someone else did that concerns you. Written by the triggers
-- below, read by the app's activity list — and, once the app ships as a real
-- build, the rows remote push is sent from.
create type public.notification_kind as enum ('friend_request', 'friend_accepted', 'comment', 'reply', 'reaction');

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.profiles on delete cascade,
  actor_id uuid not null references public.profiles on delete cascade,
  kind public.notification_kind not null,
  membership_id uuid references public.memberships on delete cascade,
  day int,
  comment_id uuid references public.comments on delete cascade,
  emoji text,
  created_at timestamptz not null default now(),
  read_at timestamptz
);

create index notifications_recipient_idx on public.notifications (recipient_id, created_at desc);

alter table public.notifications enable row level security;

create policy "your notifications" on public.notifications for select to authenticated
  using (recipient_id = (select auth.uid()));
create policy "mark your notifications read" on public.notifications for update to authenticated
  using (recipient_id = (select auth.uid())) with check (recipient_id = (select auth.uid()));
create policy "clear your notifications" on public.notifications for delete to authenticated
  using (recipient_id = (select auth.uid()));

revoke insert, update, delete on public.notifications from anon, authenticated;
grant update (read_at) on public.notifications to authenticated;
grant delete on public.notifications to authenticated;

create function public.notify_friendship() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' and new.status = 'pending' then
    insert into public.notifications (recipient_id, actor_id, kind)
    values (new.addressee_id, new.requester_id, 'friend_request');
  elsif tg_op = 'UPDATE' and old.status = 'pending' and new.status = 'accepted' then
    insert into public.notifications (recipient_id, actor_id, kind)
    values (new.requester_id, new.addressee_id, 'friend_accepted');
    -- The request has been answered; it no longer needs answering.
    delete from public.notifications
    where recipient_id = new.addressee_id and actor_id = new.requester_id and kind = 'friend_request';
  end if;
  return new;
end $$;

-- A request taken back shouldn't linger in the other person's list.
create function public.unnotify_friendship() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if old.status = 'pending' then
    delete from public.notifications
    where recipient_id = old.addressee_id and actor_id = old.requester_id and kind = 'friend_request';
  end if;
  return old;
end $$;

create trigger friendships_notify after insert or update on public.friendships
  for each row execute function public.notify_friendship();
create trigger friendships_unnotify after delete on public.friendships
  for each row execute function public.unnotify_friendship();

-- A comment tells the post's owner; a reply also tells whoever it answered.
-- Nobody hears about their own words.
create function public.notify_comment() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  owner uuid := (select user_id from public.memberships where id = new.membership_id);
  answered uuid := (select author_id from public.comments where id = new.parent_id);
begin
  if answered is not null and answered <> new.author_id then
    insert into public.notifications (recipient_id, actor_id, kind, membership_id, day, comment_id)
    values (answered, new.author_id, 'reply', new.membership_id, new.day, new.id);
  end if;
  if owner <> new.author_id and owner is distinct from answered then
    insert into public.notifications (recipient_id, actor_id, kind, membership_id, day, comment_id)
    values (owner, new.author_id, 'comment', new.membership_id, new.day, new.id);
  end if;
  return new;
end $$;

create trigger comments_notify after insert on public.comments
  for each row execute function public.notify_comment();

-- A reaction tells the post's owner — once, changed in place if the emoji
-- changes, and gone if it's taken back.
create function public.notify_reaction() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  owner uuid;
begin
  if tg_op in ('UPDATE', 'DELETE') then
    delete from public.notifications
    where kind = 'reaction' and actor_id = old.user_id and membership_id = old.membership_id and day = old.day;
  end if;
  if tg_op in ('INSERT', 'UPDATE') then
    owner := (select user_id from public.memberships where id = new.membership_id);
    if owner <> new.user_id then
      insert into public.notifications (recipient_id, actor_id, kind, membership_id, day, emoji)
      values (owner, new.user_id, 'reaction', new.membership_id, new.day, new.emoji);
    end if;
    return new;
  end if;
  return old;
end $$;

create trigger reactions_notify after insert or update or delete on public.reactions
  for each row execute function public.notify_reaction();

-- ---------------------------------------------------------------------------
-- The Community tab
-- ---------------------------------------------------------------------------

-- Today, for everyone the tab shows: `friends` is your friends in any
-- challenge, `members` everyone else in your own round. One row per person
-- with how far through today they are and what's been said about it, so the
-- tab is one call. The photos themselves come from `task_completions`, and
-- are only served once the lock is open — `unlocked` says whether it is.
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
  unlocked boolean
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
    public.unlocked_today()
  from people p
  join public.profiles pr on pr.id = p.user_id
  left join public.day_captions dc on dc.membership_id = p.membership_id and dc.day = p.current_day
  order by p.done_today desc, 12 desc nulls last
$$;

revoke execute on function
  public.request_friend(uuid), public.unfriend(uuid), public.friend_suggestions(int), public.community_today(text)
  from public, anon;
grant execute on function
  public.request_friend(uuid), public.unfriend(uuid), public.friend_suggestions(int), public.community_today(text)
  to authenticated;
