# To-do tab: live camera grid

## Motivation

The to-do tab already renders the day's tasks as a mosaic grid
(`PhotoCollage layout="mosaic" showLabels`), but capturing a task's
proof photo means leaving that grid for a separate full-screen route
(`/photo/camera`) and coming back. The user wants an Instagram-style
"create a post" grid-layout experience instead: the camera is live and
visible immediately, the grid of tasks sits over it as blurred cells
carrying their task's label, tapping a cell un-blurs it and makes it
the shooting target, and a completed cell shows its photo with a
tap-to-delete affordance — all without leaving the tab.

## Scope

In scope: the to-do tab's default (tasks-remaining) view. Out of
scope: `/photo/camera` (still used for avatar capture, unchanged), the
all-tasks-done view (kept as today's static mosaic), the
Restart/Change Challenge dialog (unchanged).

## Architecture

`app/(tabs)/todo.tsx` keeps its existing data (`useApp`,
`useDayProgress`) and its `PopoverMenu` / restart `AlertDialog`. Its
body now branches on whether any task is undone:

- **`done < rows.length`** → renders the new
  `components/TaskCameraGrid.tsx`, a self-contained full-bleed live
  camera + grid overlay. It owns camera permission, the live preview,
  capture, flash, front/back facing, and all per-cell interaction.
- **`done === rows.length`** → renders today's
  `PhotoCollage layout="mosaic" showLabels` exactly as it does now, no
  camera mounted.

Undoing the *last* done task (via the trash affordance, described
below) flips `done < rows.length` back to true, so the screen falls
back into the live-camera state and that task's cell is immediately
blurred and tappable again. There is no separate "retake" dialog —
this transition is the only way back into shooting mode.

`app/photo/camera.tsx` is not touched. It remains the avatar-photo
route (`target=avatar`) and is no longer reachable from the to-do tab.

### Why bypass `Screen`/`ScreenScroll`

Design law 5 requires every screen to wrap in `Screen` or
`ScreenScroll`. `TaskCameraGrid` is a full-bleed live-camera surface,
the same category of screen as `/photo/camera` — and that route
already establishes the precedent for this exact case: it hand-rolls a
root `View` on `colors.mediaBackdrop` and applies safe-area insets only
to its floating controls, rather than going through `Screen`'s padded,
toned page model (which assumes an opaque background and forced top
padding neither of which suit an edge-to-edge viewfinder). This design
follows that same, already-established pattern rather than introducing
a second one. `colors.mediaBackdrop`'s own doc comment already names
"the camera" as one of the surfaces it exists for.

## Shared grid-layout math

`components/PhotoCollage.tsx`'s `MosaicLayout` — the recursive split
of 1 / 2 / 4 / 5-and-up cells into flexbox rows and columns — is
refactored to accept a `renderCell: (cell: CollageCell, index: number) => ReactNode`
render prop instead of hardcoding `MosaicTile`. `PhotoCollage` itself
passes a `renderCell` that returns the existing `MosaicTile` (no
behavior change for any existing caller — feed, wall, profile,
calendar). `TaskCameraGrid` calls the same exported split arrangement
with its own `renderCell` that returns one of the three cell states
below.

Because the split is pure flexbox (no absolute pixel/rect math), a
full-screen `CameraView` sits as a background layer and the grid
overlay is stacked directly on top of it at the same size — each
overlay cell's `BlurView` (via `GlassSurface`, see below) naturally
blurs only the camera region behind its own bounds. No cell-rect
calculation is needed anywhere.

## `TaskCameraGrid`

```
interface TaskCameraGridProps {
  day: number;
  rows: ReturnType<typeof useDayProgress>; // { task, done, time?, photoSeed?, photo? }[]
  onCapture: (taskId: string, photo: TaskPhoto, day: number) => void; // completeTaskWithPhoto
  onUndo: (taskId: string, day: number) => void; // undoTask
  style?: StyleProp<ViewStyle>;
}
```

Internal state:

- `activeTaskId: string | null` — which undone cell is currently
  unblurred/live. Starts `null` (no cell active until tapped, per
  design decision).
- `trashForTaskId: string | null` — which done cell currently shows
  its trash-over-black overlay.
- `facing: 'front' | 'back'`, `flash: 'off' | 'on'`, `busy: boolean`
  (capture in flight) — same shapes `/photo/camera.tsx` already uses.
- `useCameraPermissions()` from `expo-camera`, same as
  `/photo/camera.tsx`.

### Render tree (back to front)

1. `CameraView` (`expo-camera`), `facing`, `flash`,
   `style={StyleSheet.absoluteFill}`, filling the grid area.
2. The mosaic split (via the shared render-prop arrangement), same
   size, absolutely positioned over the camera. Each leaf renders one
   of:
   - **Undone, inactive** (`task.id !== activeTaskId`): a
     `GlassSurface radius={0} style={{flex: 1}}` (the app's existing
     "blur over a photo" material — same one `Pill tone="glass"` and
     other glass surfaces use) with the task's label centered in it
     (`labelBold`, `inkInverse`, matching `MosaicTile`'s existing
     label treatment). Tapping it sets `activeTaskId` to this task
     (replacing whatever was active before).
   - **Undone, active** (`task.id === activeTaskId`): no blur — the
     live camera shows through unobstructed. A small glass label pill
     (not full-cell) sits in a corner so the active task is still
     legible while framing. Tapping it again clears `activeTaskId`
     (returns to fully blurred).
   - **Done**: the captured photo (`Image`, same `contentFit="cover"`
     treatment `MosaicTile` uses today) plus the existing time badge.
     Tapping it sets `trashForTaskId` to this task, which overlays a
     black scrim (`colors.scrim`) with a centered trash `Ionicons`
     glyph. Tapping the trash calls `onUndo(taskId, day)` and clears
     `trashForTaskId`; tapping anywhere else on the cell (not the
     trash icon) just clears `trashForTaskId` without undoing.
3. A `GlassSurface` header bar pinned at `insets.top + spacing.md`,
   left-aligned, holding the same content `todo.tsx`'s current
   `leading` prop builds today — "Day N of totalDays" headline
   (pressable → `/story`), the "`N done today` · dots" progress line —
   plus the pencil `IconButton` opening `PopoverMenu`, unchanged in
   behavior.
4. A `RoundControl` (dark translucent disc, same as `/photo/camera`'s)
   for flash, top-right, mirroring the header bar's vertical position.
5. Bottom control row, pinned above `tabBarClearance + spacing.md`
   (there is a floating tab bar under this screen, unlike the pushed
   `/photo/camera` route, so this can't reuse that route's
   `insets.bottom + spacing['3xl']` offset):
   - Shutter button, centered: same disc styling as
     `/photo/camera.tsx`'s `shutter` style (`colors.surface` fill,
     `onMediaBorder` ring), wrapped in an SVG progress ring
     (`react-native-svg`, already a dependency — `Circle` with
     `strokeDasharray`/`strokeDashoffset`) showing `done / rows.length`.
     Disabled (dimmed, non-interactive) when `activeTaskId` is `null`.
     On press: `takePictureAsync`, then
     `onCapture(activeTaskId, {uri}, day)`, then clear `activeTaskId`
     back to `null` (manual advance — the user taps the next cell
     themselves, per design decision).
   - Flip-camera `RoundControl`, beside the shutter, toggling
     `facing`.

### Permission handling

Same gate `/photo/camera.tsx` already renders when
`!permission?.granted` — "Camera access" copy, `PrimaryButton`
("Allow camera" / "Close" depending on `canAskAgain`), "Not now"
fallback — reused as-is inside `TaskCameraGrid` rather than
duplicated as new copy. If permission is denied, no grid or camera
renders; the gate fills the space instead.

## Data flow

No changes to `hooks/useAppState.tsx`. `TaskCameraGrid` is handed
`completeTaskWithPhoto` and `undoTask` (already on `useApp()`) by
`todo.tsx`, exactly as `pressSlot`/`shoot` do today — it just calls
them directly instead of navigating to a route that calls them.

## Removed from `todo.tsx`

- `shoot()` (router.push to `/photo/camera`) — replaced by
  `TaskCameraGrid`'s internal capture.
- `doneFor` state and the "Task Done" `AlertDialog`
  (Retake Photo / Undo Task / Cancel) — replaced by the done-cell
  trash interaction described above. The Restart Challenge
  `AlertDialog` and `PopoverMenu` are untouched.
- The `gridBox`/`gridRatio` measuring dance — the camera grid fills
  its container edge-to-edge (`StyleSheet.absoluteFill`-based), it
  doesn't need a computed aspect ratio the way the padded, centered
  mosaic block did.

## Testing

- Unit/logic: `MosaicLayout`'s render-prop refactor should produce
  identical output for `PhotoCollage`'s existing callers (feed, wall,
  profile, calendar, the all-done to-do mosaic) — verify with existing
  snapshot/visual coverage if any, otherwise manual comparison against
  `reference/screens/**`.
- Manual, in the running app (per `CLAUDE.md`'s UI-change rule):
  - Land on the to-do tab with tasks remaining → camera live, all
    cells blurred with labels, no cell active, shutter dimmed.
  - Tap a blurred cell → it un-blurs to live camera; tap a different
    blurred cell → the first re-blurs, the new one un-blurs.
  - Tap the active cell again → it re-blurs, shutter dims again.
  - Shoot with a cell active → cell shows the captured photo, task
    marked done, progress ring advances, shutter dims (no cell active).
  - Tap a done cell → trash-over-black overlay appears; tap elsewhere
    on it → dismisses without changing state; tap trash → task
    reverts to undone/blurred, progress ring retreats.
  - Undo the last done task while all others are already done → screen
    falls back from the all-done mosaic into the live camera grid,
    with that one cell blurred and ready.
  - Flip camera, toggle flash — confirm both affect the live preview
    and persist across cell activation/deactivation.
  - Deny camera permission → gate renders, matches `/photo/camera`'s
    existing gate copy/behavior.
  - Confirm `run` skill / dev server check on a variable task count
    (4 tasks, 5 tasks, and a custom challenge with a different count)
    to confirm the shared split-grid math still lays out correctly for
    both `PhotoCollage`'s read-only mosaic and `TaskCameraGrid`.
