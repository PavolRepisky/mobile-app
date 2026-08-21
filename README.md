# Her 75

An iOS + Android app built with Expo (SDK 57), React Native and TypeScript,
using Expo Router. It rebuilds the flows in `reference/` — a 75-day challenge
tracker with a social layer, a recipe library and an aesthetic profile wall.

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
| `background` | `#F8F5F0` | the warm off-white behind the logged-in app |
| `backgroundPlain` | `#FDFDFD` | near-white, a deliberate split from the app shell |
| `surface` | `#FFFFFF` | cards, tab bar, circular buttons |
| `ink` | `#141414` | text and the solid pill buttons |
| `divider` | `#E9E8E2` | hairlines, and the pill behind the active tab |
| `sage` / `butter` / `blush` / `gold` | `#D4E5C4` / `#F1DFA8` / `#EEC5BF` / `#F3D362` | the 75-day post-it grid |

Type is Playfair Display for headlines (900/700, with italic and bold accent
runs), **Quicksand** for everything functional, and Caveat for the hand-drawn
numerals on sticky notes. All three come from `@expo-google-fonts/*` and are
loaded in `app/_layout.tsx`.

**Weight mapping.** Quicksand is a rounded geometric sans, which keeps the soft
feel the reference gets from its rounded bold cut — across the whole ramp
rather than only the heavy end. It runs optically lighter than a grotesque at
the same nominal weight, so each role sits one step up the ramp to hold the
weights seen in `reference/screens/`:

| Token | Face | Used by |
|---|---|---|
| `body` | Quicksand Medium (500) | body copy, recipe steps |
| `bodyMedium` | Quicksand Medium (500) | emphasis, labels, tab bar |
| `bodySemi` | Quicksand SemiBold (600) | buttons, card titles |
| `bodyBold` | Quicksand Bold (700) | section titles, recipe category tabs |
| `bodyLight` | Quicksand Regular (400) | captions and muted secondary copy |

Plain copy sits on Medium rather than Regular: at Regular, Quicksand reads
markedly lighter than the reference screenshots. Regular is held back for the
muted secondary text that should recede — amounts, timestamps, `Day 75`.

> **Missing glyphs.** Quicksand has no `→` or `✓`. Anywhere those appeared in
> UI copy they are drawn as Ionicons instead: `components/DateRange.tsx` for
> the `from → to` ranges on sticker cards and the length picker, and `Pill`'s
> `icon` prop for the "Joined …" badge. **Do not put those characters into a
> string** — they will render as tofu.

> **Legacy files.** `assets/fonts/` still holds the Helvetica pack this
> replaced (a Personal-Use-Only demo release). Nothing loads it any more; it
> can be deleted.

### Headlines

Nearly every headline sets one or two words apart, so `Headline` takes markers
rather than composed children:

```tsx
<Headline size="hero">{'Choose\nyour *challenge*'}</Headline>        // italic accent
<Headline size="hero" weight={700} accent="bold">…</Headline>        // upright black accent
<Headline size="hero" weight={700}>{'Finding **your**\n*perfect* challenge'}</Headline>
```

`*word*` is italic, `**word**` is upright black. Both are needed because some
headlines use them together.

## Structure

```
app/                     routes (Expo Router)
  (tabs)/                Recipes · Friends · To do · Profile
  account/ challenge/ feed/ friend/ post/ recipe/   pushed + modal routes
components/              shared UI
constants/theme.ts       design tokens
data/                    mock challenges, recipes, friends, feed content
hooks/useAppState.tsx    all app state, in memory
lib/                     date/word formatting
```

The tab bar is a floating pill drawn over the content, built on the headless
`expo-router/ui` tabs so it can be positioned freely. Bar order follows the
reference (Recipes · Friends · To do · Profile) while **To do** is the app's
real home and the initial route.

## State

There is no backend. `hooks/useAppState.tsx` holds everything in React state
and is seeded so the app opens on **Day 5** of Her 75 with four days of
history — the state the reference screenshots were taken in. State resets on
reload.

## Placeholder imagery

The reference is full of lifestyle photography. `components/Placeholder.tsx`
draws warm neutral tiles locally, keyed off a seed string so a given "photo"
looks the same on every render. Nothing is fetched, so the app runs offline.

## Known gaps

These are deliberate stopping points, not bugs:

- **Task reordering** moves an item up one position when its handle is tapped;
  it is not a true drag gesture.
- **Photos** are simulated — tapping a task's photo slot attaches or clears a
  placeholder rather than opening the camera.
- **Save sticker** and **Send invites** are no-ops; no share sheet or file
  writing is wired up.
- A few secondary rows are inert: the profile's "Her 75 support" and
  "We're hiring" cards, and Settings → Duration / Privacy Policy / Terms.
