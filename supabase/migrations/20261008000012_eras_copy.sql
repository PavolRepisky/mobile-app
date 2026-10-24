-- The app is Selfera now, and what it used to call a challenge it calls an
-- era. Two presets carried the old words in text people read on their cards;
-- the rest of their copy never named either. The tables, slugs and functions
-- keep "challenge" — nobody sees those, and renaming them would break every
-- link and install already out there.

update public.challenges set stamp = 'Selfera'
  where slug = 'selfera' and creator_id is null;

update public.challenges set
  name = 'No Excuses Era',
  description = '75 days, zero cheat days. Two workouts, a strict diet, and a daily progress photo — the original test of mental toughness.'
  where slug = 'hard' and creator_id is null;
