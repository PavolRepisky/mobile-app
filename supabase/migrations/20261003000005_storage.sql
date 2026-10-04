-- Where the photos live.
--
-- Everyone uploads into a folder named after their own user id, and only
-- there. Faces and challenge covers are public — profiles and challenges
-- are. Task photos are private: the app asks for a short-lived signed link,
-- and storage only signs one for someone `can_view_day` lets in. That is
-- what makes the Community lock real rather than a blur over a photo the
-- phone already downloaded.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('avatars', 'avatars', true, 5 * 1024 * 1024, array['image/jpeg', 'image/png', 'image/webp']),
  ('challenge-photos', 'challenge-photos', true, 5 * 1024 * 1024, array['image/jpeg', 'image/png', 'image/webp']),
  -- Task photos: `<user>/<membership>/<day>/<name>.jpg`, plus a `_thumb`
  -- beside each. Made on the phone, so the limit only has to catch mistakes.
  ('task-photos', 'task-photos', false, 5 * 1024 * 1024, array['image/jpeg', 'image/png', 'image/webp']);

-- Whether an object path sits in the signed-in account's own folder.
create function public.in_own_folder(object_name text) returns boolean
language sql stable set search_path = '' as $$
  select (storage.foldername(object_name))[1] = auth.uid()::text
$$;

-- A task photo may be uploaded only into today's folder of your current
-- challenge — the same rule `complete_task` checks when it records it.
create function public.can_upload_task_photo(object_name text) returns boolean
language plpgsql stable security definer set search_path = '' as $$
declare
  parts text[] := storage.foldername(object_name);
begin
  if parts[1] is distinct from auth.uid()::text
     or parts[2] !~ '^[0-9a-f-]{36}$' or parts[3] !~ '^[0-9]{1,3}$' then
    return false;
  end if;
  return exists (
    select 1 from public.memberships m
    where m.id = parts[2]::uuid and m.user_id = auth.uid() and m.status = 'active'
      and public.member_day(m.id) = parts[3]::int);
end $$;

-- A task photo may be read by whoever may see its day.
create function public.can_read_task_photo(object_name text) returns boolean
language plpgsql stable security definer set search_path = '' as $$
declare
  parts text[] := storage.foldername(object_name);
begin
  if parts[1] = auth.uid()::text then
    return true;
  end if;
  if parts[2] !~ '^[0-9a-f-]{36}$' or parts[3] !~ '^[0-9]{1,3}$' then
    return false;
  end if;
  return exists (
    select 1 from public.memberships m
    where m.id = parts[2]::uuid and m.user_id::text = parts[1]
      and public.can_view_day(m.id, parts[3]::int));
end $$;

create policy "upload your own face and covers" on storage.objects for insert to authenticated
  with check (bucket_id in ('avatars', 'challenge-photos') and public.in_own_folder(name));
create policy "replace your own face and covers" on storage.objects for update to authenticated
  using (bucket_id in ('avatars', 'challenge-photos') and public.in_own_folder(name));
create policy "remove your own face and covers" on storage.objects for delete to authenticated
  using (bucket_id in ('avatars', 'challenge-photos') and public.in_own_folder(name));

create policy "upload today's task photos" on storage.objects for insert to authenticated
  with check (bucket_id = 'task-photos' and public.can_upload_task_photo(name));
create policy "read task photos of days you can see" on storage.objects for select to authenticated
  using (bucket_id = 'task-photos' and public.can_read_task_photo(name));
-- Removing is for retakes and undos, which only ever touch your own.
create policy "remove your own task photos" on storage.objects for delete to authenticated
  using (bucket_id = 'task-photos' and public.in_own_folder(name));
