# Design system reference

The rules live in `CLAUDE.md`. This is the catalogue: what each piece is, what
it takes, and how the pieces compose into a screen. Tokens are defined in
`constants/theme.ts`, which carries the reasoning behind each value.

---

## 1. Tokens

### Colour

Semantic names only — nothing is called `pink` or `grey200`.

| group | tokens |
| --- | --- |
| Backgrounds | `background` `backgroundPlain` `backgroundAlt` `backgroundWarm` |
| Surfaces | `surface` (white) · `surfaceMuted` (inset panels) · `surfaceSunken` (empty photo slots) |
| Ink | `ink` · `inkSoft` · `inkMuted` · `inkSlate` (checklist labels) · `inkGhost` (the greyed half of a switch) · `inkInverse` |
| Lines | `field` · `divider` · `dividerStrong` |
| State | `destructive` · `disabled` · `disabledInk` |
| Pastels | `sage` `butter` `blush` `gold`, rotated by `stickyPalette` |
| Scrims | `scrim` · `scrimLight` |

`gradients.storyRing` is the one true linear gradient in the app.

### Type scale

Headline cuts — Playfair Display: `hero` 44 · `headline` 34 · `headlineSm` 27 ·
`title` 30.

Functional cuts — Quicksand: `sectionTitle` 23 · `cardTitle` 17 · `body` 16 ·
`bodyStrong` 16 · `bodySemi` 16 · `bodyBold` 16 · `button` 17 · `label` 14 ·
`caption` 13 · `micro` 11 · `tab` 12.

Tracking is baked into the scale: `bodyTracking` (-1) on every Quicksand
string, `displayTracking` (-0.5) on Playfair. A component building its own
Quicksand style pulls `bodyTracking` rather than repeating the number.

### Space, radius, elevation

`spacing` runs `xs` 4 · `sm` 8 · `md` 12 · `lg` 16 · `xl` 20 · `2xl` 24 ·
`3xl` 32 · `4xl` 40 · `5xl` 56 · `6xl` 72. The page gutter is `screenPadding`
(20); the gap under the status bar is `screenTopGap` (20).

`radii`: `sm` 10 · `md` 16 · `lg` 20 · `card`/`xl` 32 · `2xl` 44 · `pill` 999.

`shadows` are all low-opacity and large-blur — see the selection table in
`CLAUDE.md`. Anything punchier reads wrong against the warm background.

### Tab bar geometry

`tabBar` is `{ height: 68, bottomOffset: 12, horizontalInset: 20 }`.
`tabBarClearance` is what a scroll view adds to its bottom inset.
`tabBarBottom(insetBottom)` and `tabBarTop(insetBottom)` place things relative
to the floating bar — the bar floats *over* the home-indicator area rather than
above it.

### Liquid glass

`glass` describes the iOS 26 material as three stacked layers: a real backdrop
blur (`blur` 46, `tint` ultra-thin), a vertical body wash (`sheen`) brightest at
the lit top edge, and a specular `rim` that catches at top-left and
bottom-right. Every value is alpha-only on white — the material has no colour of
its own, which is what keeps it reading as glass over both dark and light
photos. `fallback` is the flat stand-in where the backdrop can't be sampled.
Use `GlassSurface` rather than assembling the layers by hand.

---

## 2. Components

### Layout

**`Screen` / `ScreenScroll`** — `tone` `'app'|'plain'|'alt'|'warm'` ·
`padded` (default true) · `tabBar` · `topGap` · `style`. `ScreenScroll` also
takes `bottomExtra` and any `ScrollViewProps`. Screens opening on a headline
take the default `topGap`; ones opening on a control row pass a smaller value
because the row reads as the header itself.

**`ProfileLayout`** — `identity` and optional `action` / `leading` nodes above
`children`, plus `tone` / `padded` / `tabBar` / `bottomExtra`. `action` floats
in the top-right corner; `leading` is the page's heading on that same line at
the left — the To-do home's date — but it sits *in* the scroll and travels with
it, so the title leaves the screen with the content it names while the button
stays reachable. Exports
`profileAvatarSize` (120), `profileActionTop` (56), `profileActionHeight` (52)
so callers can align against it.

**`ScreenHeader`** — `title` (Playfair) or `plainTitle` (Quicksand, with
`plainTitleVariant`/`plainTitleStyle`), `subtitle`, `onBack`/`showBack`,
`onClose`, and a `right` node.

**`Card`** — `padded` · `flat` (drops the shadow, for cards on an inset panel) ·
`muted` (uses `surfaceMuted`) · `onPress`.

**`MasonryGrid<T>`** — `items` · `renderItem` · `keyExtractor` · `weight` (relative
height, used to balance columns) · `columns`.

**`EmptyState`** — `icon` · `title` · `hint`.

### Type

**`Text`** — `variant` (any key of the type scale) · `color` · `center`.
**`Headline`** — `size` `'hero'|'headline'|'headlineSm'|'title'` · `weight`
500/700/900 · `accent` `'italic'|'bold'` · `accentWeight` · `align` ·
`numberOfLines`. Markdown-ish runs inside the string: `**bold**` and `*italic*`
segments step up to the accent weight.

### Controls

**`PrimaryButton` / `SecondaryButton`** — `label` · `onPress` · `disabled` ·
`loading` · `icon` (Ionicon) · `iconSize` · `fullWidth` (default true; pass
false for side-by-side pairs) · `labelStyle`. **`TextLink`** takes
`label`/`onPress`/`color`.

**`IconButton`** — `name` · `size` · `iconSize` · `color` · `background` ·
`shadow` · `accessibilityLabel`.

**`Pill`** — `label` · `tone` `'floating'|'glass'|'solid'|'muted'|'outline'` ·
`size` `'sm'|'md'|'lg'` (heights 28/38/48, exported as `pillHeights`) · `icon` ·
`bold` · `color`.

**`SegmentedTabs<T>`** — `options` (`{key,label,icon?}`) · `value` · `onChange` ·
`variant` `'underline'|'pill'` · `size` `'md'|'lg'` · `align`
`'center'|'left'|'justify'` · `scrollable` · `dense`.

**`BigSegmentHeader<T>`** — exactly two options, each with an avatar cluster
above an oversized label; the unselected side drops to `inkGhost`.

**`RulerSlider`** — `length` · `index` · `onChange` · `readout` · `caption`.
**`DayScrubber`** — `day` · `totalDays` · `onChange`, firing as strokes cross
the centre line rather than on release. Both tick a selection haptic.

### Overlays

**`BottomSheet`** — `visible` · `onDismiss` · `onDismissed` (fires once the
sheet is gone, for callers that navigate on) · `handle` · `tall` · `padded`.

**`AlertDialog`** — `title` · `message` · `actions` (`{label, onPress,
destructive?}`) · optional `input` · `onDismiss` / `onDismissed`. Two actions
sit side by side; three or more stack.

**`PopoverMenu`** — `items` (`{label, onPress, destructive?}`) anchored by
`top` plus `right` or `left`.

**`PhotoLibrarySheet`** — picks for a task (`taskId` + `day`) or for anything
else (`visible` + `onPick`). **`ChallengeLengthSheet`** wraps `RulerSlider`.

### Content

**`TaskRow`** — `label` · `done` · `time` · `onPressPhoto` · `divider`. The row
is a check circle, a label and a completion stamp; the proof photo is not on it
— that lives in the day's `PhotoCollage`. **`CheckCircle`** is exported
separately (default size 36) and takes `emptyIcon`, the glyph shown while the
circle is still hollow. Pass it only where the circle is pressable: on a
friend's list a camera would be inviting you to photograph their day.

**`DayRing`** — `day` · `state` `'full'|'partial'|'none'` · `avatar`/`avatarSeed`
· `size` · `onPress` · `onDoublePressDay` (the way back to today from a
scrubbed day). `ringInnerSize(size)` gives the inner diameter.
**`DayPill`** is the "Day N" chip on its own — `day` · `onPress` ·
`onDoublePress` · `onLongPress`. The lens has to lap over something to refract
it, so give it a negative margin onto whatever sits behind. `onDoublePress` is
ignored once `onPress` is set: a tap action and a double tap cannot share a
pill without holding every tap back to see whether a second one follows, so a
screen wanting both puts the second on `onLongPress` — which is what the To-do
home does (tap opens the story, hold goes back to today).

**`StickyNote`** — `value` · `size` · `colorIndex` (into `stickyPalette`) ·
`muted` · `tilt`. **`StickerCard`** — `day` · `from`/`to` · `tasks` · `mode`
`'numbered'|'checked'` · `challengeName` · `width` · `tilt`.

**`PhotoSlot`** — `photo` or `seed` · `width` (points, or a share of the
parent) / `height`/`radius` · `emptyIcon` `'camera'|'add'|'none'` ·
`emptyLabel` ·
`emptyOutline` (the dashed field on its own, defaults to whether there is a
label) · `done` · `tilt` · `shadow` `boolean|'card'|'hard'` ·
`accessibilityLabel`.
**`PhotoCollage`** — `cells` (`key` · `photo`/`seed` · `done` · `label` ·
`onPress`) · `columns` · `layout` `'collage'|'grid'|'dice'`. The day's proof
photos as a page of prints rather than a grid: sizes, tilts and sideways nudges
are all derived from the cell key, so an arrangement is stable for the life of
a task. `layout="grid"` is the plain alternative — equal tiles, no tilt, task
order — and `layout="dice"` is the five-task arrangement the To-do home
currently uses: four square tiles with the fifth laid over the middle on a
white mat, the way the five is pipped on a die (any other number of tasks falls
back to the grid). The grid and dice layouts draw no done ticks and no dashed
"add" tiles: they are a record of the day, and the camera is opened from the
task rows instead. In the collage, tasks with nothing photographed yet hold
their place as dashed slots.
**`PhotoStrip`** — `photos` · `height` · `badge` (white pill overlapping the top
edge) · `radius`.

**`WallSection`** — `title` · `items` (`WallTile`) · `editable` · `onPressItem`
· `onRename` · `onAddPhoto`.

**`FriendCard`**, **`RecipeCard`**, **`ReviewCard`** take their domain object
plus `onPress`. **`ChallengeDetail`** is the full editor: task list with
drag-reorder (`onReorder`), rename, delete, and `onDraggingChange` so the host
screen can lock its scroll. **`ChallengePicker`** has `popular`/`custom` tabs.

**`Avatar`** (`source` · `size`) · **`DateRange`** (`from` · `to` · `variant`) ·
**`GlassSurface`** (`radius` · `shadow`) · **`Placeholder`** /
`AvatarPlaceholder` / `AvatarSilhouette` — deterministic gradient stand-ins
seeded by a string, and the only place literal hex is allowed.

**`FloatingTabBar`** + `TabBarButton` — icons
`'recipes'|'friends'|'todo'|'calendar'|'profile'` (outline until focused), a
glass lens behind the bar and a light pill behind the active tab. `filled`
turns a tab into a solid ink disc with no label — the centre tab only.

---

## 3. Composition recipes

**A tab screen.** `ScreenScroll tabBar` at the root. If the screen opens on a
control row rather than a headline, pass `topGap={spacing.sm}`. A floating
action wants an explicit `<View style={{flex:1}}>` wrapper around the
`ScreenScroll` so its absolute offsets resolve against the screen rather than
the taller scroll content, and it positions with `tabBarTop(insets.bottom)`.

**A detail screen.** `ScreenScroll tone="plain"` with a `ScreenHeader showBack`
first. Pushed with `router.push({ pathname: '/thing/[id]', params: { id } })`.

**A sheet.** Hold `visible` in the host screen. Use `onDismiss` to close and
`onDismissed` to navigate afterwards — navigating from `onDismiss` fights the
dismiss animation.

**Lists.** Always give the empty case an `EmptyState`; every list in the app
has one.

---

## 4. State and data

`hooks/useAppState.tsx` exposes `useApp()`, wrapped by `AppProvider` in
`app/_layout.tsx`. Static content lives in `data/` (`challenges.ts`,
`content.ts`, `recipes.ts`); formatting helpers in `lib/format.ts`.

Fonts are loaded once in `app/_layout.tsx` and the splash is held until they
resolve — headlines are the whole design, so a fallback-face flash is not
acceptable. A new weight must be added to that `useFonts` call *and* to `fonts`
in `theme.ts`.
