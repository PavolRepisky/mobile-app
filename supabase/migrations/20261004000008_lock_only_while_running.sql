-- The Community lock only holds while you have a today to prove.
--
-- It keeps someone else's today hidden until you've photographed a task of
-- your own today. But with no challenge, or before your round's Day 1,
-- there is nothing you could photograph — so there's nothing to hold you to,
-- and the lock is open. It closes again on Day 1 morning, until the first
-- photo of the day.
--
-- The app's `feedLocked` reads the same rule, so what it shows and what
-- storage will sign never disagree.

create or replace function public.unlocked_today() returns boolean
language sql stable security definer set search_path = '' as $$
  select
    -- No run of yours is under way today…
    not exists (
      select 1
      from public.memberships m
      join public.rounds r on r.id = m.round_id
      where m.user_id = auth.uid()
        and m.status = 'active'
        and public.member_day(m.id) between 1 and r.days
    )
    -- …or there is, and today already has a photo in it.
    or exists (
      select 1
      from public.memberships m
      join public.task_completions tc on tc.membership_id = m.id
      where m.user_id = auth.uid()
        and m.status = 'active'
        and tc.day = public.member_day(m.id)
    )
$$;
