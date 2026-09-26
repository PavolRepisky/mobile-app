# Design rules

This app's visual language is **fixed**. Features, screens, copy and data change;
the look does not. Every rule below is a hard constraint, not a preference.

Deep reference: `docs/design-system.md`.
Visual source of truth: `reference/screens/**` — real screenshots. When a visual
question comes up, open the relevant screenshot rather than guessing.
Enforcement: `npm run check:design` (also run `npm run typecheck`).

---

## The laws

1. **No literal colours.** No hex, `rgb()` or `rgba()` anywhere in `app/` or
   `components/`. Import from `@/constants/theme`. Need a colour that isn't
   there? Add a *semantic* token to `theme.ts` with a comment saying what it is
   for — never inline it.
2. **No literal type.** No `fontFamily`, `fontSize`, `lineHeight` or
   `letterSpacing` in a StyleSheet. Type comes from the `type` scale only.
3. **All text goes through `@/components/Text`** with a `variant`. Never import
   `Text` from `react-native`. Headlines go through `@/components/Headline`.
4. **No magic numbers** for padding, margin, gap, radius or shadow. Use
   `spacing`, `screenPadding`, `radii`, `shadows`. Sizes tied to a specific
   drawing (a 46px check circle, a 120px avatar) are fine as named constants.
5. **Every screen wraps in `Screen` or `ScreenScroll`.** Never hand-roll a
   `SafeAreaView` + `ScrollView` + background colour. Screens under `(tabs)/`
   pass `tabBar` so content clears the floating bar.
6. **Check the inventory before writing a component.** The table below is the
   whole set. Extend an existing component with a prop before adding a new one.
7. **Icons are `Ionicons` from `@expo/vector-icons`.** No other icon set.
8. **Imports use the `@/` alias** — `@/components/Card`, not `../../components/Card`.

## Choosing tokens

**Colour** — five codes carry a page, defined once as `palette` in
`theme.ts` and reached through the semantic tokens that point at them:

| palette | code | token | for |
| --- | --- | --- | --- |
| `black` | `#141414` | `ink` | primary text, active icons, today |
| `white` | `#FFFFFF` | `surface` · `backgroundPlain` · `inkInverse` | page, cards, type on photos |
| `greyDark` | `#9C9C9C` | `inkMuted` | secondary text people still read: handles, captions, past dates |
| `greyLight` | `#D7D6D3` | `inkGhost` | not yet / not available: future dates, unfinished segments, disabled arrows |
| `greyFill` | `#F2F2F2` | `surfaceSunken` | fills: cards, calendar cells, tracks, a picker's band |

Beside them sits one accent, `gradients.accent` — peach `#F7C3A0` into rose
`#EFA3B7` into lavender `#D8C6EE`, stored in the order it is drawn. It is the
colour of progress: the profile's task ring and challenge bar.

My Profile uses these and nothing else. Reach for them first on any page; the
older in-between greys (`inkFaded`, `inkSoft`, `field`, `divider`) remain for
screens that already use them. Never use `palette` outside `theme.ts` — code
names the role (`inkMuted`), not the shade (`greyDark`).

**Background** — `Screen tone`:

Every screen in the app sits on the same white, `Screen`/`ScreenScroll`'s
default `plain` tone (`backgroundPlain` `#FFFFFF`) — the tab roots, a
challenge's feed, a friend's day, all of it — with one exception: Settings
sits on `alt` (`backgroundAlt` `#F8F6F5`), because its groups are white
cards and on a white page they'd dissolve. `app` (`background` `#F8F5F0`)
and `warm` (`backgroundWarm` `#FBF6F3`) remain available tones on the
component for a screen that deliberately wants to break from the white —
don't reach for any of them without a specific reason to split a screen off
from the rest.

**Shadow** — pick by what the thing sits on, not by how big it is:

| shadow | for |
| --- | --- |
| `card` | cards resting on the page |
| `soft` | icon buttons, floating pills, photo tiles |
| `hard` | things lifted *off* the page: avatar, "Day N" badge, task photos |
| `floating` | sheets and bars floating over content |
| `lifted` | surfaces sitting on top of a screen: tilted friend card, invite panel |
| `deep` | the two badges crowning the challenge feed — heaviest in the set |
| `glass` | liquid-glass surfaces sitting on a photo |
| `sticky` | sticky notes only (tight and directional) |

**Radius**: `pill` (999) for anything fully rounded — buttons, chips, tab bar ·
`card`/`xl` (32) is the signature card corner · `'2xl'` (44) is the friend card
only · `lg` 20 · `md` 16 · `sm` 10.

**Typeface** — three faces, no exceptions:
- **Quicksand** — everything, headlines included: body, buttons, labels, tabs,
  captions, and the `hero`/`headline`/`headlineSm`/`title` scale (Bold). The
  app has no separate display face — Playfair was removed on purpose; don't
  add a serif back for headlines.
- **Caveat** — the app's handwriting: numerals on sticky notes, and the
  caption in the chin of a `Polaroid`. Nothing else. A print is captioned by
  hand or not at all; setting those in Quicksand turns a pile of photographs
  back into a gallery with labels under it.
- **Fraunces Black** — the `poster` variant: the "Day N" stamped across a
  Community post's photo grid. Nothing else.

Quicksand runs optically light, so each role is mapped one step up the weight
ramp; plain copy sits on Medium, not Regular. Don't "correct" this.

## Component inventory

**Layout** · `Screen` / `ScreenScroll` page shell · `ProfileLayout` avatar +
action + body · `ScreenHeader` back/close + title · `Card` white or muted
surface · `EmptyState` icon + title + hint.

**Type** · `Text` (variant) · `Headline` (headline-scale Quicksand; `**bold**`
and `*accent*` runs step the weight up from a lighter base).

**Controls** · `PrimaryButton` / `SecondaryButton` / `TextLink` ·
`IconButton` circular · `Pill` (`floating`|`glass`|`solid`|`muted`|`outline` ×
`sm`|`md`|`lg`) · `SegmentedTabs` (`underline`|`pill`) · `BigSegmentHeader` the
two-up avatar switch · `RulerSlider` / `DayScrubber` tick pickers · `WheelPicker`
the iOS date-wheel drum.

**Overlays** · `BottomSheet` · `AlertDialog` · `PopoverMenu` ·
`ChallengeLengthSheet` · `PhotoLibrarySheet`.

**Content** · `TaskRow` + `CheckCircle` · `DayRing` avatar + story ring + day
pill, and `DayPill` on its own · `StickyNote` · `CalendarMonth` month grid ·
`WeekTracker` task × weekday habit grid ·
`DayCard` / `DayCardStory` the shareable day · `PhotoSlot` ·
`Polaroid` one instant print · `PhotoCollage` a pile of them ·
`StickerText` die-cut display word · `PhotoStrip` ·
`FriendCard` · `ReviewCard` · `ChallengeDetail`
· `Avatar` · `DateRange` · `GlassSurface` ·
`Placeholder` / `AvatarPlaceholder` / `AvatarSilhouette` · `FloatingTabBar`.

## Conventions

- **The day card is the app's face.** `DayCard` is what leaves the app and
  lands on somebody else's feed, so its composition is a fixed part of the
  visual language, not a screen to redecorate. Change what a day *contains*
  freely; leave the headline-over-prints pairing, the warm page and the stamp
  footer alone.
- **Comments explain *why*, in prose.** The existing files justify their values
  ("sampled off the reference", "anything heavier reads as a drawn outline").
  Match that. Don't add comments that restate the code.
- Components take a `style?: StyleProp<ViewStyle>` escape hatch, export a named
  function *and* a default, and keep their `StyleSheet.create` at the bottom.
- Pressed states dim via a `pressed` style, not an opacity wrapper.
- Haptics: `Haptics.selectionAsync().catch(() => {})` on tick-crossing
  scrubbers only. Don't spray haptics onto ordinary taps.
- New route files go under `app/`, expo-router file conventions, `typedRoutes`
  is on.
