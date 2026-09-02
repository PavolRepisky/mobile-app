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

**Background** — `Screen tone`:

| tone | token | used for |
| --- | --- | --- |
| `app` *(default)* | `background` `#F8F5F0` | the warm shell: to-do, friends, recipes, profile |
| `plain` | `backgroundPlain` `#FFFFFF` | own profile, a friend's profile, a recipe, a wall day |
| `alt` | `backgroundAlt` `#F8F6F5` | the settings stack |
| `warm` | `backgroundWarm` `#FBF6F3` | profile-views |

**Shadow** — pick by what the thing sits on, not by how big it is:

| shadow | for |
| --- | --- |
| `card` | cards resting on the page |
| `soft` | icon buttons, floating pills, photo tiles |
| `hard` | things lifted *off* the page: avatar, "Day N" badge, task photos, wall tiles |
| `floating` | sheets and bars floating over content |
| `lifted` | surfaces sitting on top of a screen: tilted friend card, invite panel |
| `deep` | the two badges crowning the challenge feed — heaviest in the set |
| `glass` | liquid-glass surfaces sitting on a photo |
| `sticky` | sticky notes only (tight and directional) |

**Radius**: `pill` (999) for anything fully rounded — buttons, chips, tab bar ·
`card`/`xl` (32) is the signature card corner · `'2xl'` (44) is the friend card
only · `lg` 20 · `md` 16 · `sm` 10.

**Typeface** — three faces, no exceptions:
- **Playfair Display** — headlines only (`hero`, `headline`, `headlineSm`, `title`).
- **Quicksand** — everything functional: body, buttons, labels, tabs, captions.
- **Caveat** — handwritten numerals on sticky notes. Nothing else.

Quicksand runs optically light, so each role is mapped one step up the weight
ramp; plain copy sits on Medium, not Regular. Don't "correct" this.

## Component inventory

**Layout** · `Screen` / `ScreenScroll` page shell · `ProfileLayout` avatar +
action + body · `ScreenHeader` back/close + title · `Card` white or muted
surface · `MasonryGrid` balanced columns · `EmptyState` icon + title + hint.

**Type** · `Text` (variant) · `Headline` (Playfair, `**bold**` and `*italic*`
runs step the weight up).

**Controls** · `PrimaryButton` / `SecondaryButton` / `TextLink` ·
`IconButton` circular · `Pill` (`floating`|`glass`|`solid`|`muted`|`outline` ×
`sm`|`md`|`lg`) · `SegmentedTabs` (`underline`|`pill`) · `BigSegmentHeader` the
two-up avatar switch · `RulerSlider` / `DayScrubber` tick pickers.

**Overlays** · `BottomSheet` · `AlertDialog` · `PopoverMenu` ·
`ChallengeLengthSheet` · `PhotoLibrarySheet`.

**Content** · `TaskRow` + `CheckCircle` · `DayRing` avatar + story ring + day
pill, and `DayPill` on its own · `StickyNote` · `CalendarMonth` month grid ·
`DayCard` / `DayCardStory` the shareable day · `PhotoSlot` ·
`PhotoCollage` scattered prints · `PhotoStrip` ·
`WallSection` · `FriendCard` · `RecipeCard` · `ReviewCard` · `ChallengeDetail`
· `ChallengePicker` · `Avatar` · `DateRange` · `GlassSurface` ·
`Placeholder` / `AvatarPlaceholder` / `AvatarSilhouette` · `FloatingTabBar`.

## Conventions

- **The day card is the app's face.** `DayCard` is what leaves the app and
  lands on somebody else's feed, so its composition is a fixed part of the
  visual language, not a screen to redecorate. Change what a day *contains*
  freely; leave the Playfair-over-prints pairing, the warm page and the stamp
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
