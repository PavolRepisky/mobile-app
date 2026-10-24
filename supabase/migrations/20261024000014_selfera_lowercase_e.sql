-- The name is written "Selfera" now, with one capital, and the old working
-- name is gone from the database too: the bundled preset's slug becomes
-- "selfera" (the app looks presets up by it; members point at the id, so
-- nobody's run moves) and a new account whose name gives no handle falls
-- back to "selfera_1234". The earlier migrations were edited to match, so on
-- a fresh database this one finds nothing left to rename.

update public.challenges set slug = 'selfera'
  where slug = 'her' || '75' and creator_id is null;

update public.challenges set stamp = 'Selfera'
  where slug = 'selfera' and creator_id is null;

create or replace function public.handle_new_user() returns trigger
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
    base := 'selfera';
  end if;

  loop
    candidate := base || '_' || lpad(floor(random() * 10000)::int::text, 4, '0');
    exit when not exists (select 1 from public.profiles where handle = candidate);
  end loop;

  insert into public.profiles (id, handle, name) values (new.id, candidate, left(display, 50));
  return new;
end $$;
