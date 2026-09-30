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
   `Text` from `react-native` — headlines too, on the `headline`,
   `headlineSm` and `title` variants.
4. **No magic numbers** for padding, margin, gap, radius or shadow. Use
   `layout` (spacing by role) first, then `spacing`, `radii`, `shadows`; a
   bare `spacing` step is for an optical nudge. Sizes tied to a specific
   drawing (a 46px check circle, a 120px avatar) are fine as named constants.
5. **Every screen wraps in `Screen` or `ScreenScroll`.** Never hand-roll a
   `SafeAreaView` + `ScrollView` + background colour. Screens under `(tabs)/`
   pass `tabBar` so content clears the floating bar.
6. **Check the inventory before writing a component.** The table below is the
   whole set. Extend an existing component with a prop before adding a new one.
7. **Icons are `Ionicons` from `@expo/vector-icons`.** No other icon set.
8. **Imports use the `@/` alias** — `@/components/Card`, not `../../components/Card`.

## Choosing tokens

**Colour** — five codes carry a page, plus one red for danger, defined once as `palette` in
`theme.ts` and reached through the semantic tokens that point at them:

| palette | code | token | for |
| --- | --- | --- | --- |
| `black` | `#141414` | `ink` | primary text, active icons, today |
| `white` | `#FFFFFF` | `surface` · `backgroundPlain` · `inkInverse` | page, cards, type on photos |
| `greyDark` | `#9C9C9C` | `inkMuted` | secondary text people still read: handles, captions, past dates |
| `greyLight` | `#D7D6D3` | `inkGhost` | not yet / not available: future dates, unfinished segments, disabled arrows |
| `greyFill` | `#F2F2F2` | `surfaceSunken` · `backgroundAlt` | fills: cards, calendar cells, tracks, a picker's band, the Settings page |
| `red` | `#E63950` | `destructive` | the action that can't be taken back — nothing else |

Beside them sits one accent, `gradients.accent` — peach `#F7C3A0` into rose
`#EFA3B7` into lavender `#D8C6EE`, stored in the order it is drawn. It is the
colour of progress: the profile's task ring and challenge bar.

My Profile and Settings use these and nothing else; so do the shared
dialog, photo viewer and bottom sheets. Reach for them first on any page; the
older in-between greys (`inkSoft`, `field`, `divider`) remain for
screens that already use them. Never use `palette` outside `theme.ts` — code
names the role (`inkMuted`), not the shade (`greyDark`).

**Background** — `Screen tone`:

Every screen in the app sits on the same white, `Screen`/`ScreenScroll`'s
default `plain` tone (`backgroundPlain` `#FFFFFF`) — the tab roots, a
challenge's feed, a friend's day, all of it — with one exception: Settings
sits on `alt` (`backgroundAlt`, the palette's `#F2F2F2`), because its groups are white
cards and on a white page they'd dissolve. Those are the only two tones.

**Shadow** — pick by what the thing sits on, not by how big it is:

| shadow | for |
| --- | --- |
| `card` | cards resting on the page |
| `soft` | icon buttons, floating pills, photo tiles |
| `hard` | things lifted *off* the page: avatar, "Day N" badge, task photos |
| `floating` | sheets and bars floating over content |
| `glass` | liquid-glass surfaces sitting on a photo |
| `header` | round buttons in a screen's fixed header bar (pulled in close) |

**Radius**: `pill` (999) for anything fully rounded — buttons, chips, tab bar ·
`card`/`xl` (32) is the signature card corner · `lg` 20 · `md` 16 · `sm` 10.

**Type hierarchy** — eight levels, defined once as `hierarchy` in `theme.ts`
and used as `Text` variants by name. My Profile and Settings use these and
nothing else; build other screens from them too:

| variant | size / weight | for |
| --- | --- | --- |
| `pageTitle` | 23 Bold | the screen's title, the profile's name |
| `sectionHeading` | 21 Bold | "Days", sheet and dialog titles, picker values |
| `itemTitle` | 18 Bold | one thing's name: the challenge card, the month on show |
| `copy` | 16 SemiBold | reading text and rows: a bio, a settings row (label and value) and its group title, a switch's labels, a dialog's message and field |
| `copyBold` | 16 Bold | the word leading reading text: a caption's author handle |
| `meta` | 14 SemiBold | detail beside something bigger |
| `metaBold` | 14 Bold | detail carrying a number: "Day 5 / 75", a calendar date |
| `badge` | 12 Bold | counts on pills and tiles, weekday letters, calendar marks |

A post's caption itself is running prose at `copy`'s size in Medium (`body`),
so the bold handle leading it stands clear.

The older names that meant one of these point at it (`sectionTitle` →
`pageTitle`, `cardTitleBold` → `itemTitle`, `bodyBold` → `copyBold`,
`labelBold` → `meta`,
`microBold` → `badge`). Prefer the level names in new code.

**Spacing** — by role, defined once as `layout` in `theme.ts` on top of the
`spacing` ruler. My Profile and Settings use these for every gap, margin and
padding:

| role | size | for |
| --- | --- | --- |
| `gutter` | 20 | the page's side margin |
| `title` | 20 | under the page's title row |
| `section` | 24 | between big blocks: a card, "Days", a settings group |
| `block` | 16 | between elements inside a block: avatar to name, a sheet's parts |
| `heading` | 12 | from a heading to what it heads |
| `stack` | 8 | between things stacked inside a card |
| `line` | 4 | between two lines of text that belong together |
| `inline` | 12 | between things side by side on a row |
| `card` | 20 | inside a card or list row, every side |
| `pill` | 8 | either side of a pill's label |
| `grid` | 4 | between tiles in a grid |

**Typeface** — two faces, no exceptions:
- **Quicksand** — everything, headlines included: body, buttons, labels, tabs,
  captions, and the `headline`/`headlineSm`/`title` scale (Bold). The app has
  no separate display face — Playfair was removed on purpose; don't add a
  serif back for headlines.
- **Fraunces Black** — the `poster` variant: the "Day N" stamped across a
  Community post's photo grid. Nothing else.

Quicksand runs optically light, so each role is mapped one step up the weight
ramp; plain copy sits on Medium, and Regular isn't loaded at all. Don't
"correct" this.

## Component inventory

**Layout** · `Screen` / `ScreenScroll` page shell · `ProfileView` a whole
profile page — yours and anyone else's · `ScreenHeader` back + title +
actions · `Card` white surface · `EmptyState` icon + title + hint.

**Type** · `Text` (variant).

**Controls** · `PrimaryButton` · `IconButton` circular · `Pill`
(`floating`|`solid`|`muted`|`outline` × `sm`|`md`|`lg`) · `SegmentedTabs` the pill
switch · `StepBar` a flow's segmented progress · `SignaturePad`
a finger-drawn signature · `RulerSlider` tick picker · `WheelPicker` the iOS date-wheel drum ·
`SearchBar`.

**Overlays** · `BottomSheet` · `AlertDialog` · `PopoverMenu` ·
`ChallengeLengthSheet` · `PhotoLibrarySheet`.

**Content** · `CheckCircle` a done task's tick · `TaskRing` a face in the split
task ring with its "3/5" badge · `CalendarMonth` month grid · `WeekTracker`
task × weekday habit grid · `PhotoCollage` the day's photo mosaic ·
`TaskCameraGrid` the live camera over that mosaic · `PhotoSlot` · `PhotoStrip`
a challenge's scattered prints · `PhotoViewer` · `CommentsSheet` ·
`FriendCard` · `LockedOverlay` · `ChallengeRow` a
challenge in a list, photo first, its start date at the end while it can be joined
· `Avatar` · `DateRange` · `GlassSurface` ·
`Placeholder` / `AvatarPlaceholder` / `AvatarSilhouette` · `FloatingTabBar`.

## Conventions

- **Comments explain *why*, in prose.** The existing files justify their values
  ("sampled off the reference", "anything heavier reads as a drawn outline").
  Match that. Don't add comments that restate the code.
- Components take a `style?: StyleProp<ViewStyle>` escape hatch, export a named
  function *and* a default, and keep their `StyleSheet.create` at the bottom.
- Pressed states dim via a `pressed` style, not an opacity wrapper.
- Haptics: `Haptics.selectionAsync().catch(() => {})` on tick-crossing
  pickers only. Don't spray haptics onto ordinary taps.
- New route files go under `app/`, expo-router file conventions, `typedRoutes`
  is on.
