-- The preset challenges the app ships with — the nine in
-- `data/challenges.ts` — and their scheduled rounds. Content rather than
-- schema, but every environment needs it, production included, so it lives
-- in a migration rather than the local-only seed. Nobody is set as their
-- creator here; the demo seed names the app's cast. New rounds of a preset
-- go in through later migrations or the dashboard.

insert into public.challenges (slug, creator_id, name, stamp, description, category, default_days, lives) values
  ('her75', null, 'Get Fit for Summer', 'Her 75 Challenge',
   'A friendlier 75-day reset: clean eating, daily movement, and no alcohol — built for getting summer-ready without burning out.',
   'Fitness', 75, 3),
  ('hard', null, 'No Excuses Challenge', '75 Hard',
   '75 days, zero cheat days. Two workouts, a strict diet, and a daily progress photo — the original mental-toughness challenge.',
   'Health', 75, 3),
  ('medium', null, 'Balanced Reset', '75 Medium',
   '75 days of steady, sustainable habits: one flexible meal a week, daily movement, and a nightly read.',
   'Mindset', 75, 3),
  ('soft', null, 'Fresh Start', '75 Soft',
   'A gentler 75 days: clean eating with a little room to breathe, daily walks, and time to unwind with a podcast.',
   'Lifestyle', 75, 3),
  ('steps', null, '10k Steps a Day', '10k Steps',
   'Thirty days of getting your steps in — one walk a day, any route, any pace, as long as it adds up to ten thousand.',
   'Fitness', 30, 3),
  ('pages', null, 'Morning Pages', 'Morning Pages',
   'Three weeks of starting slow: three handwritten pages before anything else, then a few pages of a book.',
   'Mindset', 21, 3),
  ('rainbow', null, 'Eat the Rainbow', 'Eat the Rainbow',
   'A month of colourful plates: fruit or veg at every meal, a proper breakfast, and enough water to go with it.',
   'Health', 30, 3),
  ('study', null, 'Study Streak', 'Study Streak',
   'Thirty days of showing up to your desk: two focused hours, your notes reviewed, and a chapter read.',
   'Study', 30, 3),
  ('summer-glow', null, 'Summer Glow', 'Summer Glow',
   'A 30-day August reset: water before anything else, a walk in the evening light, and a proper wind-down before bed.',
   'Health', 30, 2);

insert into public.challenge_tasks (challenge_id, key, position, label, note)
select c.id, t.key, t.position, t.label, t.note
from (values
  ('her75', 'h1', 0, 'Eat clean', 'Whole foods, nothing fried or processed.'),
  ('her75', 'h2', 1, 'Drink only water', 'No soda, juice or alcohol — tea and coffee are fine.'),
  ('her75', 'h3', 2, 'Walk 10k steps', 'Photo your step count before bed.'),
  ('her75', 'h4', 3, 'Work out 45 min', 'Gym, class, run or ride — any sweat counts.'),
  ('her75', 'h5', 4, 'Read 10 pages', 'A real book, not a screen.'),
  ('hard', 'd1', 0, 'Strict diet', 'Pick one and stick to it. No cheat meals.'),
  ('hard', 'd2', 1, 'Drink water', 'A full gallon, spread across the day.'),
  ('hard', 'd3', 2, 'Two workouts, one outside', '45 minutes each, whatever the weather.'),
  ('hard', 'd4', 3, 'Read 10 pages', 'Non-fiction, a real book.'),
  ('hard', 'd5', 4, 'Progress photo', 'Same spot, same light, every day.'),
  ('medium', 'm1', 0, 'Eat well', 'No junk food. One flexible meal a week.'),
  ('medium', 'm2', 1, 'Drink 3L water', 'Photo your bottle any time of day.'),
  ('medium', 'm3', 2, 'Work out 45 min', 'Any movement counts — a walk, a class, a run.'),
  ('medium', 'm4', 3, 'Read 10 pages', 'A real book, not a screen.'),
  ('medium', 'm5', 4, 'Progress photo', 'Same spot, same light, every day.'),
  ('soft', 's1', 0, 'Eat mostly clean', 'Good food most of the time, a treat now and then.'),
  ('soft', 's2', 1, 'Drink water', 'Photo your bottle any time of day.'),
  ('soft', 's3', 2, 'Walk 10k steps', 'Photo your step count before bed.'),
  ('soft', 's4', 3, 'Listen to a podcast', 'Something that teaches you a thing or two.'),
  ('steps', 'w1', 0, 'Walk 10k steps', 'Photo your step count before bed.'),
  ('pages', 'p1', 0, 'Write three pages', 'By hand, first thing, whatever comes out.'),
  ('pages', 'p2', 1, 'Read 10 pages', 'A real book, not a screen.'),
  ('rainbow', 'e1', 0, 'Fruit or veg at every meal', 'The more colours on the plate, the better.'),
  ('rainbow', 'e2', 1, 'Eat a proper breakfast', 'Sat down, not grabbed on the way out.'),
  ('rainbow', 'e3', 2, 'Drink 2L water', 'Photo your bottle any time of day.'),
  ('study', 't1', 0, 'Two focus hours', 'Phone away, one subject at a time.'),
  ('study', 't2', 1, 'Review your notes', 'Go back over what you covered today.'),
  ('study', 't3', 2, 'Read a chapter', 'From a course book or anything you are studying.'),
  ('summer-glow', 'g1', 0, 'Drink 2L water', 'Photo your bottle any time of day.'),
  ('summer-glow', 'g2', 1, 'Evening walk', 'Out after dinner, at least 20 minutes.'),
  ('summer-glow', 'g3', 2, 'Stretch before bed', 'Ten minutes on the floor, phone out of reach.')
) as t(slug, key, position, label, note)
join public.challenges c on c.slug = t.slug;

-- Their rounds, on the dates `DISCOVER` lists — the one Get Fit for Summer
-- ran in June among them, finished.
insert into public.rounds (challenge_id, start_date, days)
select c.id, r.start_date, c.default_days
from (values
  ('her75', date '2026-06-01'),
  ('hard', date '2026-09-03'),
  ('medium', date '2026-10-01'),
  ('soft', date '2026-10-12'),
  ('steps', date '2026-10-17'),
  ('pages', date '2026-10-19'),
  ('rainbow', date '2026-10-22'),
  ('study', date '2026-11-02'),
  ('summer-glow', date '2026-08-01')
) as r(slug, start_date)
join public.challenges c on c.slug = r.slug;
