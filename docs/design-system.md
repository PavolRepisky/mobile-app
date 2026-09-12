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
`muted` · `tilt`.

**`CalendarMonth`** — `month` (any date inside it) · `days`, a map from day of
the month to `shots` (up to four `photo`/`seed` pairs) · `past` · `today` ·
`label` · `onPress`. One month as a seven-column grid, Monday first, with the
day's photographs tiled behind its numeral — one fills the cell, two split it
across, three put one over a pair, four take a corner each. A single cover
would say a day was one picture; the mosaic says how full it was. The heading is `sectionTitle`, not a Playfair headline: it labels a
grid of dates rather than opening a page. Photographs lead, so a bare numeral
stays quiet — `inkMuted` for a day already gone, `inkGhost` for one still to
come. Today takes the ink disc a calendar always puts on it, or an ink ring when
it already has a photo under it.

**`PhotoSlot`** — `photo` or `seed` · `width` (points, or a share of the
parent) / `height`/`radius` · `emptyIcon` `'camera'|'add'|'none'` ·
`emptyLabel` ·
`emptyOutline` (the dashed field on its own, defaults to whether there is a
label) · `emptyTone` `'sunken'|'warm'` · `done` · `tilt` ·
`shadow` `boolean|'card'|'hard'` · `accessibilityLabel`. `emptyTone="warm"` is
for blocks where an empty tile is a gap in a record rather than a well to
press: the shell's muted tone inside a hairline instead of the cool grey.
**`StickerText`** — `children` · `tilt` · `size`. A word die-cut as a sticker:
black display type on a white plaque, applied off straight, with the prints'
own drop shadow under it. It was first drawn as a true outline — the word laid
down many times in white around a circle, black on top — which does not survive
being asked for a thick one: every copy is the whole glyph, so the union closes
the letters' counters, bridges the gaps between them, and scallops where two
neighbouring copies meet. The plaque gets the same idea with one shape and one
edge, and thicker is simply more paper rather than more artefact.

**`DayCard`** — `day` · `date` · `cells` · `challengeName` · `handle` ·
`background`. The day composed as one 4:5 page to be posted: a Playfair `*day* five` over the
scattered prints on the warm paper, closed off with a drawn rule and the
uppercase `stamp` line. It is the app's face on other people's feeds, so the
stack — a `StickerText` day over hand-laid prints over the challenge's own
photograph, everything under it held back by a scrim so white type reads — is
the part that must not drift. `DayCardStory` is the same card centred on a 9:16 ink ground.
`captureRef` is pointed straight at either through a forwarded `ref`; the
capture and share themselves live in `lib/shareDayCard.ts`, apart from the
views so a device problem has one file to look at.

**`Polaroid`** — `width` · `photo`/`seed` · `caption` · `tilt` · `onPress`. One
instant print: a square picture in a white frame with a deep chin under it,
captioned by hand. The chin is the whole thing — a photograph in an even border
is a framed picture, while one with four times as much paper below it as above
is a Polaroid, and the eye reads that shape before it reads the picture. It is
also where the caption goes, which is what turns proof shots into somebody's
account of their day. Everything is a share of `width`, so the same print is a
thumbnail on the To-do page and a full-bleed print on an export.

**`PhotoCollage`** — `cells` (`key` · `photo`/`seed` · `caption` · `done` ·
`label` · `onPress`) · `columns` · `layout` `'collage'|'grid'|'dice'` ·
`maxHeight`. The default `collage` is a pile of `Polaroid`s: prints off
straight, lapping over each other, laid out against `PILES` — placements
written by hand per count, in shares of the pile's own width. Dealt by rule a
pile comes out evenly spaced and reads as a grid that slipped; placed, it reads
as a handful of prints somebody put down. Every preset keeps one rule: a print
may lap over another's picture, never over its chin, since prints are drawn in
order and a caption buried under the next photograph reads as a rendering fault
rather than as a pile.

Because the pile is described in shares of its width it has one shape and one
aspect, given by `collageRatio(count)`. `maxHeight` is a ceiling: where the room
is shorter than that shape wants — the day card, whose height is fixed by its
4:5 — the whole pile is drawn *narrower* and centred rather than squashed. The
width it measures against comes off a bare inner view, not the styled box: a
caller's `style` may carry padding, and `onLayout` reports the box including it.

`layout="grid"` is the plain alternative — equal tiles, no tilt, task order —
and `layout="dice"` lays five out the way the five is pipped on a die: four
square tiles with the fifth over the middle on a white mat (any other number
falls back to the grid). Both draw no done ticks and no dashed "add" tiles, and
their empty tiles drop the shadow for the warm tone: they are a record of the
day, the camera is opened from the task rows, and a gap has nothing to lift off
the page.

The To-do home and the day card both take the pile, and both pass it only what
has actually been photographed. That is deliberate: the page you live in and
the page you would post should not be two different pictures of the same day.
It costs the block early in a day — it starts empty and grows a print at a
time — but the progress line under the heading already says how much of the day
is left, and a pile cannot carry gaps the way an even grid could. Captions come
from `shortLabel`, which strips the parentheticals and emoji a checklist label
carries for the list rather than for a caption, then cuts to three words:
counting characters instead leaves "one 45-minute", which is a caption of
nothing.

**`PhotoStrip`** — `photos` · `height` · `badge` (white pill overlapping the top
edge) · `radius`.

**`WallSection`** — `title` · `items` (`WallTile`) · `editable` · `onPressItem`
· `onRename` · `onAddPhoto`.

**`FriendCard`**, **`RecipeCard`**, **`ReviewCard`** take their domain object
plus `onPress`. **`ChallengeDetail`** is the full editor: task list with
drag-reorder (`onReorder`), rename, delete, and `onDraggingChange` so the host
screen can lock its scroll.

**`Avatar`** (`source` · `size`) · **`DateRange`** (`from` · `to` · `variant`) ·
**`GlassSurface`** (`radius` · `shadow`) · **`Placeholder`** /
`AvatarPlaceholder` / `AvatarSilhouette` — deterministic gradient stand-ins
seeded by a string, and the only place literal hex is allowed.

**`FloatingTabBar`** + `TabBarButton` — icons
`'recipes'|'friends'|'todo'|'calendar'|'profile'` (outline until focused), a
glass lens behind the bar and a light pill behind the active tab. `filled`
turns a tab into a solid ink disc with no label — the centre tab only.

**`TrophyCard`** — `trophy` · `challenge` · `width`. One finished challenge,
flat on the page: a big gold trophy glyph, the `Headline` name under it, then
a `DateRange`. No card surface, no photos. `app/trophies.tsx` decks every
trophy into a horizontal, peeking, snap-scrolled row of these — one to swipe
through at a time, reached from the Trophies column in `ProfileStats`.

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
