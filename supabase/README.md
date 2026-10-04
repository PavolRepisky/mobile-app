# Backend

Supabase: Postgres with row-level security, Storage for photos, one Edge
Function, and a pg_cron job. The app talks to it through `lib/supabase.ts`
and `lib/backend/*`. There's no separate server.

## Layout

| path | what |
| --- | --- |
| `migrations/…01_profiles.sql` | accounts, made on sign-up; time zone per account |
| `migrations/…02_challenges.sql` | challenges, tasks, rounds (a shared Day 1), memberships; create / edit / join / leave |
| `migrations/…03_progress.sql` | task completions (today only), captions, lives and missed days, standings |
| `migrations/…04_social.sql` | the Community lock, friends, comments, reactions, views, notifications, the Community feed |
| `migrations/…05_storage.sql` | buckets and who may upload or read which photo |
| `migrations/…06_settle_job.sql` | every 15 min: runs that ran out of lives → lost, runs past their last day → finished |
| `functions/delete-account` | Settings' Delete account — photos first, then the user |
| `seed.sql` | **local only**: the presets plus the app's demo cast |
| `tests/database/rules.test.sql` | the rules, checked as the people they apply to |
| `tests/api-smoke.mjs` | the same through the real API, storage included |

## The rules it holds

- A task is done only by photographing it, only **today** in the member's own
  time zone, and only into today's folder.
- Joining closes once Day 1 has passed. One challenge at a time.
- Custom challenges: only their creator edits (before Day 1) or deletes them.
- Profiles, memberships, completions and past days are public to anyone
  signed in. **Someone's today** is only visible once you've photographed a
  task of your own today: the Community lock. Storage won't sign a link to a
  locked photo.
- Missed day = a day behind you without every task. More misses than the
  challenge's lives → lost.

## Working on it

Needs Docker Desktop running and Node ≥ 20.19 (`nvm use 25.2.1`).

```sh
npm run db:start     # first run downloads the images; prints the URL and keys
npm run db:reset     # re-apply every migration + seed.sql
npm run db:test      # database tests
npx supabase functions serve   # in another terminal, then:
npm run db:smoke     # end-to-end through the API
npm run db:types     # after a schema change → lib/database.types.ts
```

Studio (table browser) runs at http://127.0.0.1:54323. Demo sign-ins:
`julia@her75.test` (and lily, zoe, mia, sofia, elena, nora, camila) with
password `her75-demo`.

A schema change is a **new** migration (`npx supabase migration new <name>`),
never an edit to one already pushed to a hosted project.

## Hosted project

```sh
npx supabase login
npx supabase link --project-ref <ref>
npx supabase db push                       # migrations, not the seed
npx supabase functions deploy delete-account
```

Then in the dashboard: Authentication → Providers → enable Apple and Google
and turn email sign-up off. Under URL Configuration, add `her75://**` and
`exp://**` to the redirect URLs.
