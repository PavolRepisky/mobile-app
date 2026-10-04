-- Trophies are gone from the app: nothing showed them, only a count passed
-- around unread. A finished run is still a membership with status
-- 'finished' — what a round's results count — just no longer a trophy.

drop view if exists public.trophies;
