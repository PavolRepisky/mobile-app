-- Accounts. A profile is created for every sign-up by the trigger at the
-- bottom, so the app never has to insert one itself — it only ever edits its
-- own. Profiles are public to anyone signed in: the app shows anyone's page.

create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  -- Stored without the leading "@", which is only how the app prints it.
  -- Lowercase only, so "Julia_575" and "julia_575" can't both exist.
  handle text not null unique check (handle ~ '^[a-z0-9_.]{3,30}$'),
  name text not null default '' check (char_length(name) <= 50),
  bio text check (char_length(bio) <= 150),
  -- Path in the public `avatars` bucket.
  avatar_path text,
  -- The IANA zone the phone reports. A challenge day runs midnight to
  -- midnight where its member lives, so every "which day is it" question the
  -- server answers is asked in this zone.
  timezone text not null default 'UTC',
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles are public"
  on public.profiles for select to authenticated
  using (true);

create policy "edit your own profile"
  on public.profiles for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- Only these columns are the account's to change; the id and creation stamp
-- are not, whatever the row policy says.
revoke insert, update, delete on public.profiles from anon, authenticated;
grant update (handle, name, bio, avatar_path, timezone) on public.profiles to authenticated;

-- A zone Postgres doesn't know would make every day calculation for this
-- account throw, so it's refused at the door instead. A trigger rather than a
-- CHECK because the list of zones isn't immutable.
create function public.check_timezone() returns trigger
language plpgsql set search_path = '' as $$
begin
  if not exists (select 1 from pg_catalog.pg_timezone_names where name = new.timezone) then
    raise exception 'unknown timezone: %', new.timezone using errcode = '22023';
  end if;
  return new;
end $$;

create trigger profiles_check_timezone
  before insert or update of timezone on public.profiles
  for each row execute function public.check_timezone();

-- Today's date where this account lives.
create function public.local_today(uid uuid) returns date
language sql stable security definer set search_path = '' as $$
  select (now() at time zone coalesce(
    (select p.timezone from public.profiles p where p.id = uid), 'UTC'))::date
$$;

-- Every new auth user gets a profile. Apple and Google hand over a full name
-- (Apple only on the very first sign-in, so it's caught here or never); the
-- handle starts from the first name plus four digits and can be changed in
-- Settings.
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  display text := btrim(coalesce(
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'name',
    ''));
  base text;
  candidate text;
begin
  base := lower(regexp_replace(
    coalesce(nullif(split_part(display, ' ', 1), ''), split_part(coalesce(new.email, ''), '@', 1)),
    '[^a-zA-Z0-9_]', '', 'g'));
  base := left(base, 20);
  if char_length(base) < 3 then
    base := 'her75';
  end if;

  loop
    candidate := base || '_' || lpad(floor(random() * 10000)::int::text, 4, '0');
    exit when not exists (select 1 from public.profiles where handle = candidate);
  end loop;

  insert into public.profiles (id, handle, name) values (new.id, candidate, left(display, 50));
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
