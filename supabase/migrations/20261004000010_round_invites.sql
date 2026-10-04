-- Asking a friend into a round. The create form's "Invite" sends one; it
-- lands in the friend's activity like a request or a comment does, naming
-- the round so it can open straight onto it.

alter type public.notification_kind add value if not exists 'invite';

alter table public.notifications
  add column round_id uuid references public.rounds on delete cascade;

-- Only a friend, and only into a round they could still join. Asking again
-- replaces the earlier invite rather than stacking a second one.
create function public.invite_to_round(target uuid, rid uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := public.require_uid();
begin
  if not exists (select 1 from public.friends where user_id = uid and friend_id = target) then
    raise exception 'you can only invite your friends' using errcode = '42501';
  end if;
  if not exists (
    select 1 from public.rounds r where r.id = rid and public.local_today(target) <= r.start_date
  ) then
    raise exception 'joining has closed for that round' using errcode = 'P0001';
  end if;

  delete from public.notifications
  where recipient_id = target and actor_id = uid and kind = 'invite' and round_id = rid;
  insert into public.notifications (recipient_id, actor_id, kind, round_id)
  values (target, uid, 'invite', rid);
end $$;

revoke execute on function public.invite_to_round(uuid, uuid) from public, anon;
grant execute on function public.invite_to_round(uuid, uuid) to authenticated;
