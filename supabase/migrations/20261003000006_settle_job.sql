-- Closing the books on runs. Every membership's standing is computed live by
-- `membership_progress`, but "lost" and "finished" have to be written down
-- at some point: a trophy is a finished membership, and a lost one stops
-- taking photos. This does that, every quarter hour, so it lands within
-- minutes of midnight in every time zone.

create function public.settle_memberships() returns int
language plpgsql security definer set search_path = '' as $$
declare
  settled int;
begin
  update public.memberships m
  set status = case when p.missed_days > p.lives then 'lost' else 'finished' end::public.membership_status,
      ended_at = now()
  from public.membership_progress p
  where p.membership_id = m.id
    and m.status = 'active'
    and (p.missed_days > p.lives or p.current_day > p.days);
  get diagnostics settled = row_count;
  return settled;
end $$;

revoke execute on function public.settle_memberships() from public, anon, authenticated;

create extension if not exists pg_cron;

select cron.schedule('settle-memberships', '*/15 * * * *', 'select public.settle_memberships()');
