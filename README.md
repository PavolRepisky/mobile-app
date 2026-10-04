# Her 75

An iOS + Android app built with Expo (SDK 57), React Native and TypeScript,
using Expo Router. It rebuilds the flows in `reference/` — a 75-day challenge
tracker with a social layer.

## Running

```bash
npm install
npx expo start          # then press i / a, or scan with Expo Go
npx expo start --web    # renders in a browser, useful for quick layout checks
npm run typecheck       # tsc --noEmit
```

## Design system

Every colour, radius, shadow, font and spacing step lives in
[`constants/theme.ts`](constants/theme.ts). Components and screens never
hardcode a hex value. The palette was sampled directly out of the reference
screenshots rather than estimated:

| Token | Value | Where it came from |
|---|---|---|
| `backgroundPlain` | `#FFFFFF` | the page every screen sits on |
| `backgroundAlt` | `#F2F2F2` | the Settings page, so its white groups read as cards |
| `surface` | `#FFFFFF` | cards, tab bar, circular buttons |
| `ink` | `#141414` | text and the solid pill buttons |
| `divider` | `#E9E8E2` | hairlines, and the pill behind the active tab |

Type is **Quicksand** for everything, headlines included (Bold at the
`headline`/`headlineSm`/`title` sizes), and Fraunces Black for the day stamped
across a post's photos. Both come from `@expo-google-fonts/*` and are loaded in `app/_layout.tsx`.

**Weight mapping.** Quicksand is a rounded geometric sans, which keeps the soft
feel the reference gets from its rounded bold cut — across the whole ramp
rather than only the heavy end. It runs optically lighter than a grotesque at
the same nominal weight, so each role sits one step up the ramp to hold the
weights seen in `reference/screens/`:

| Token | Face | Used by |
|---|---|---|
| `body` | Quicksand Medium (500) | body copy, captions |
| `bodyMedium` | Quicksand Medium (500) | emphasis, labels, tab bar |
| `bodySemi` | Quicksand SemiBold (600) | buttons, card titles |
| `bodyBold` | Quicksand Bold (700) | section titles, underlined tab rows |

Plain copy sits on Medium rather than Regular: at Regular, Quicksand reads
markedly lighter than the reference screenshots, so Regular isn't loaded.

> **Missing glyphs.** Quicksand has no `→` or `✓`. Anywhere those appeared in
> UI copy they are drawn as Ionicons instead: `components/DateRange.tsx` for
> the `from → to` ranges, and `Pill`'s
> `icon` prop for the "Joined …" badge. **Do not put those characters into a
> string** — they will render as tofu.

## Structure

```
app/                     routes (Expo Router)
  (tabs)/                Challenges · Community · Tasks · Profile
  account/ challenge/ day/ feed/ friend/   pushed + modal routes
components/              shared UI
constants/theme.ts       design tokens
data/                    mock challenges, friends, feed content
hooks/useAppState.tsx    all app state, in memory
lib/                     date formatting, rounds, comment threads
```

The tab bar is a floating pill drawn over the content, built on the headless
`expo-router/ui` tabs so it can be positioned freely. Bar order is
Challenges · Community · Tasks · Profile while **Tasks** is the app's real
home and the initial route. The month calendar lives inside Profile.

## State

The backend is Supabase — schema, rules and how to run it locally are in
`supabase/README.md`; the app reaches it through `lib/supabase.ts` and
`lib/backend/*`. Sign-in is email and password (`app/sign-in.tsx`).

- `hooks/useAppState.tsx` — the provider. Signed in, it loads the account's
  profile, its challenge and every day of it from the server; joining, task
  photos, undo, reminders and leaving are saved there. Its actions are the
  app's whole write surface.
- `data/challenges.ts`, `data/content.ts` — the listed challenges and every
  other person: friends, members, feed posts, standings. Community, friends,
  comments and challenges you build still run on this demo data in memory,
  until they move to the backend too.
- `useChallengeCards` and `useChallengeListing` shape challenges for the
  screens.

## Placeholder imagery

The reference is full of lifestyle photography. Bundled photos under `assets/`
stand in for people's shots; where none fits, `components/Placeholder.tsx`
draws warm neutral tiles keyed off a seed string, so a given "photo" looks the
same on every render. Nothing is fetched, so the app runs offline.

## Known gaps

These are deliberate stopping points, not bugs:

- **Reminders** are stored per task (set while joining, changed in Settings)
  but no notification is scheduled yet.
- **End challenge** in Settings asks to confirm, then does nothing — there is
  no state yet for having no challenge.
- **Log out** and **Delete account** reset the demo account rather than
  touching any server.
- **Invites** on a new challenge's finished page only mark the friend as
  invited; Share opens the system share sheet.
- **Privacy Policy** and **Terms of Service** rows in Settings are inert.
