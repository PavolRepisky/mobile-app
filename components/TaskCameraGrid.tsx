import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Image } from 'expo-image';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';

import { PrimaryButton } from './Buttons';
import { CAN_BLUR } from './GlassSurface';
import { IconButton } from './IconButton';
import { MosaicArrangement } from './PhotoCollage';
import { Text } from './Text';
import {
  absoluteFill,
  colors,
  glass,
  radii,
  screenPadding,
  spacing,
  tabBar,
  tabBarBottom,
} from '@/constants/theme';
import { useApp, useDayProgress, type TaskPhoto } from '@/hooks/useAppState';

type DayRow = ReturnType<typeof useDayProgress>[number];

export interface TaskCameraGridProps {
  day: number;
  rows: readonly DayRow[];
  onCapture: (taskId: string, photo: TaskPhoto, day: number) => void;
  onUndo: (taskId: string, day: number) => void;
  /** Leaves the live camera for the calm, static view of today so far. */
  onClose: () => void;
  style?: StyleProp<ViewStyle>;
}

/** Matches the corner action buttons elsewhere — Discover's add challenge,
 * the create-challenge screen's back/save. */
const CONTROL_SIZE = 46;

const SHUTTER_SIZE = 64;
const RING_SIZE = 80;
const RING_STROKE = 4;
const RING_RADIUS = (RING_SIZE - RING_STROKE) / 2;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

/** Seam width between tiles, and how far the grid bleeds past its own clip
 * so that seam never reaches the grid's outer edge. */
const CELL_BORDER = StyleSheet.hairlineWidth;

function measurePage(
  node: View,
): Promise<{ x: number; y: number; width: number; height: number }> {
  return new Promise((resolve) => {
    node.measure((_x, _y, width, height, pageX, pageY) => {
      resolve({ x: pageX, y: pageY, width, height });
    });
  });
}

/**
 * The camera fills the whole screen, so what a small cell shows is only a
 * crop of that full feed — but `takePictureAsync` always captures the
 * camera's entire field of view, not the sliver of it a given cell happened
 * to be windowing. Left alone, the saved photo reads as zoomed *out* next to
 * what was actually framed on screen. This crops the shot back down to
 * exactly the cell's own on-screen rectangle, so the print matches the
 * preview the task was actually shot through.
 *
 * Two crops folded into one: first the centred slice of the capture that the
 * screen itself would be showing (the camera preview always covers its
 * container, so on any device whose sensor aspect ratio doesn't match the
 * screen's, the preview is already a crop of the raw capture) — then, inside
 * that slice, the cell's own share of the screen.
 */
async function cropToCell(
  shot: { uri: string; width: number; height: number },
  cellNode: View,
): Promise<string> {
  const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
  const cell = await measurePage(cellNode);

  const screenAspect = screenWidth / screenHeight;
  const imageAspect = shot.width / shot.height;

  const coverWidth = imageAspect > screenAspect ? shot.height * screenAspect : shot.width;
  const coverHeight = imageAspect > screenAspect ? shot.height : shot.width / screenAspect;
  const coverLeft = (shot.width - coverWidth) / 2;
  const coverTop = (shot.height - coverHeight) / 2;

  // `gridBleed` (below) deliberately sits the grid a hairline above and left
  // of the screen's own edge so the outer border it would otherwise draw on
  // the top/left cells gets clipped away. That leaves an edge cell's own
  // measured position a hair negative, which — on whichever axis the camera
  // image needs no letterboxing on, so `coverLeft`/`coverTop` land on exactly
  // 0 — rounds the crop's origin on that axis to -1: a rejected crop the
  // native side throws on, silently losing the shot for that cell only.
  // Clamping the whole rect back inside the source image is cheaper than
  // hunting the hairline itself, and correct for any future rounding slop.
  const originX = Math.min(
    Math.max(0, Math.round(coverLeft + (cell.x / screenWidth) * coverWidth)),
    shot.width - 1,
  );
  const originY = Math.min(
    Math.max(0, Math.round(coverTop + (cell.y / screenHeight) * coverHeight)),
    shot.height - 1,
  );
  const width = Math.min(
    Math.round((cell.width / screenWidth) * coverWidth),
    shot.width - originX,
  );
  const height = Math.min(
    Math.round((cell.height / screenHeight) * coverHeight),
    shot.height - originY,
  );

  const result = await manipulateAsync(
    shot.uri,
    [{ crop: { originX, originY, width, height } }],
    { compress: 0.8, format: SaveFormat.JPEG },
  );
  return result.uri;
}

/**
 * The to-do tab's live grid: the camera is on from the moment the tab opens,
 * every still-open task sits over it as a frosted, labelled tile, and tapping
 * one clears the frost so the shutter can shoot it. A photographed tile shows
 * the print; tapping it a second time offers a trash icon over a black wash
 * rather than a confirm dialog. There is only ever one way back into shooting
 * mode — undo a task and its tile frosts over again — so retaking is undo,
 * then tap.
 *
 * Full-bleed and deliberately bare, the way `/photo/camera` already is: no
 * day heading, no progress dots, no tab bar while it's up — the tab bar
 * switches back the moment this unmounts, which is what the close button
 * actually does: it doesn't push or pop a route, it tells the parent to swap
 * this out for the calm, static view of today so far.
 *
 * Only ever mounted while the parent wants the camera live. The all-done day
 * falls back to the calm mosaic on its own; closing does the same thing by
 * hand for a day that isn't finished yet.
 */
export function TaskCameraGrid({
  day,
  rows,
  onCapture,
  onUndo,
  onClose,
  style,
}: TaskCameraGridProps) {
  const insets = useSafeAreaInsets();
  const { setTabBarHidden } = useApp();
  const camera = useRef<CameraView>(null);
  // Keyed by task id so `capture` can measure whichever cell is active
  // without every `Cell` needing to know its own key.
  const cellNodes = useRef<Record<string, View | null>>({});
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<'front' | 'back'>('back');
  const [flash, setFlash] = useState<'off' | 'on'>('off');
  const [busy, setBusy] = useState(false);
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [trashForTaskId, setTrashForTaskId] = useState<string | null>(null);

  useEffect(() => {
    setTabBarHidden(true);
    return () => setTabBarHidden(false);
  }, [setTabBarHidden]);

  const done = rows.filter((row) => row.done).length;

  const capture = async () => {
    // The shutter stays pressable while the file is being written, and a
    // second shot mid-write loses the first.
    if (busy || !activeTaskId) return;
    setBusy(true);
    try {
      const shot = await camera.current?.takePictureAsync({ quality: 0.8 });
      const cellNode = cellNodes.current[activeTaskId];
      if (shot?.uri) {
        // Falls back to the raw, uncropped shot if the cell somehow wasn't
        // measurable — better a wrongly-framed photo than none at all.
        const uri = cellNode ? await cropToCell(shot, cellNode) : shot.uri;
        onCapture(activeTaskId, { uri }, day);
        setActiveTaskId(null);
      }
    } catch {
      /* Nothing usable came back; leave the viewfinder up to try again. */
    }
    setBusy(false);
  };

  if (!permission?.granted) {
    return (
      <View
        style={[
          styles.root,
          styles.gate,
          { paddingTop: insets.top + spacing['5xl'] },
          style,
        ]}
      >
        <Text variant="sectionTitle" center>
          Camera access
        </Text>
        <Text variant="body" color={colors.inkSoft} center style={styles.gateBlurb}>
          Her 75 needs the camera to photograph today&apos;s tasks.
        </Text>
        <PrimaryButton
          label={permission?.canAskAgain === false ? 'Open Settings' : 'Allow camera'}
          onPress={
            permission?.canAskAgain === false
              ? () => Linking.openSettings().catch(() => {})
              : () => requestPermission()
          }
          style={styles.gateAction}
        />
      </View>
    );
  }

  const cells = rows.map((row) => ({ ...row, key: row.task.id }));

  return (
    <View style={[styles.root, style]}>
      <CameraView ref={camera} facing={facing} flash={flash} style={absoluteFill} />

      {/* Clips the outer edge of the grid's own bleed below, so only the
          seams between tiles carry a border — not the grid's outer frame. */}
      <View style={[absoluteFill, styles.gridClip]}>
        <View style={styles.gridBleed}>
          <MosaicArrangement
            cells={cells}
            // No real gap: a real gap here would show a sliver of the live
            // camera between tiles. Each tile draws its own border instead,
            // so the seam is a line, not a hole. This has to be a per-cell
            // border rather than a colour painted on the shared row/column
            // wrapper — that wrapper sits directly behind every cell,
            // including the active one, which deliberately renders nothing
            // so the live feed shows through; paint the wrapper and that
            // paint is exactly what shows instead of the camera.
            seam={0}
            renderCell={(cell) => (
              <Cell
                key={cell.key}
                row={cell}
                active={cell.task.id === activeTaskId}
                showTrash={cell.task.id === trashForTaskId}
                onActivate={() => setActiveTaskId(cell.task.id)}
                onDeactivate={() => setActiveTaskId(null)}
                onShowTrash={() => setTrashForTaskId(cell.task.id)}
                onHideTrash={() => setTrashForTaskId(null)}
                onUndo={() => {
                  onUndo(cell.task.id, day);
                  setTrashForTaskId(null);
                }}
                cellRef={(node) => {
                  cellNodes.current[cell.task.id] = node;
                }}
              />
            )}
          />
        </View>
      </View>

      {/* `box-none`: the row's own box spans edge to edge for the
          space-between layout, and without this a tap in the gaps between
          the three buttons — over the grid's top cell — was swallowed by
          this plain View instead of reaching the cell underneath it. */}
      <View
        style={[styles.topRow, { top: insets.top + spacing.md }]}
        pointerEvents="box-none"
      >
        <IconButton
          name="close"
          background={colors.scrim}
          color={colors.inkInverse}
          size={CONTROL_SIZE}
          iconSize={20}
          shadow={false}
          onPress={onClose}
          accessibilityLabel="Close camera"
        />
        <IconButton
          name={flash === 'on' ? 'flash' : 'flash-off'}
          background={colors.scrim}
          color={colors.inkInverse}
          size={CONTROL_SIZE}
          iconSize={20}
          shadow={false}
          onPress={() => setFlash((f) => (f === 'on' ? 'off' : 'on'))}
          accessibilityLabel={flash === 'on' ? 'Turn flash off' : 'Turn flash on'}
        />
        <IconButton
          name="camera-reverse"
          background={colors.scrim}
          color={colors.inkInverse}
          size={CONTROL_SIZE}
          iconSize={20}
          shadow={false}
          onPress={() => setFacing((f) => (f === 'back' ? 'front' : 'back'))}
          accessibilityLabel="Switch camera"
        />
      </View>

      {/* A little above the same height the floating tab bar sits at
          underneath, so there's air below it rather than crowding the edge —
          clear, too, of the bottom row's own task label, which the ring used
          to sit right on top of. A label can run to its full two lines
          (`labelBold` at 18pt each) inside a badge sitting `spacing.sm` off
          the cell's own bottom edge — call it ~48px of badge above the true
          screen bottom in the worst case — so the ring wants comfortably more
          lift than the single-line case its old offset was tuned for.
          `box-none` so the row's own box, wider than the shutter it centres,
          doesn't swallow taps meant for the cells on either side of it. */}
      <View
        style={[
          styles.bottomRow,
          {
            bottom:
              tabBarBottom(insets.bottom) + tabBar.height / 2 - RING_SIZE / 2 + spacing['4xl'],
          },
        ]}
        pointerEvents="box-none"
      >
        <View style={styles.shutterWrap}>
          <Svg width={RING_SIZE} height={RING_SIZE} style={styles.ringSvg}>
            <Circle
              cx={RING_SIZE / 2}
              cy={RING_SIZE / 2}
              r={RING_RADIUS}
              stroke={colors.onMediaTrack}
              strokeWidth={RING_STROKE}
              fill="none"
            />
            <Circle
              cx={RING_SIZE / 2}
              cy={RING_SIZE / 2}
              r={RING_RADIUS}
              stroke={colors.onMediaSoft}
              strokeWidth={RING_STROKE}
              strokeLinecap="round"
              fill="none"
              strokeDasharray={`${RING_CIRCUMFERENCE} ${RING_CIRCUMFERENCE}`}
              strokeDashoffset={
                rows.length > 0
                  ? RING_CIRCUMFERENCE * (1 - done / rows.length)
                  : RING_CIRCUMFERENCE
              }
              // Starts the fill at 12 o'clock instead of 3 o'clock.
              transform={`rotate(-90 ${RING_SIZE / 2} ${RING_SIZE / 2})`}
            />
          </Svg>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Take photo"
            disabled={!activeTaskId}
            onPress={capture}
            style={({ pressed }) => [
              styles.shutter,
              !activeTaskId && styles.shutterDisabled,
              pressed && styles.shutterPressed,
            ]}
          >
            {busy ? <ActivityIndicator color={colors.ink} /> : null}
          </Pressable>
        </View>
      </View>
    </View>
  );
}

/** One tile: a frosted invitation, the live preview, or a photographed print. */
function Cell({
  row,
  active,
  showTrash,
  onActivate,
  onDeactivate,
  onShowTrash,
  onHideTrash,
  onUndo,
  cellRef,
}: {
  row: DayRow;
  active: boolean;
  showTrash: boolean;
  onActivate: () => void;
  onDeactivate: () => void;
  onShowTrash: () => void;
  onHideTrash: () => void;
  onUndo: () => void;
  /** So `capture` can measure this cell's on-screen rect when it's active —
   * the camera fills the whole screen, so cropping the shot to this cell's
   * own rectangle is what makes the print match what was actually framed. */
  cellRef: (node: View | null) => void;
}) {
  if (row.done) {
    return (
      <Pressable
        ref={cellRef}
        accessibilityRole="button"
        accessibilityLabel={
          showTrash
            ? `Remove photo for ${row.task.label}`
            : `${row.task.label}, done${row.time ? `, photographed ${row.time}` : ''}`
        }
        onPress={showTrash ? onHideTrash : onShowTrash}
        style={styles.cell}
      >
        {row.photo ? (
          <Image source={row.photo} style={absoluteFill} contentFit="cover" />
        ) : null}
        <TaskLabel label={row.task.label} />
        {row.time ? (
          <View style={styles.timeBadge} pointerEvents="none">
            <Text variant="micro" color={colors.inkInverse}>
              {row.time}
            </Text>
          </View>
        ) : null}
        {showTrash ? (
          <View style={styles.trashOverlay} pointerEvents="box-none">
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Remove photo for ${row.task.label}`}
              onPress={onUndo}
              hitSlop={12}
            >
              <Ionicons name="trash" size={26} color={colors.inkInverse} />
            </Pressable>
          </View>
        ) : null}
      </Pressable>
    );
  }

  // Still open: either frosted over (tap to shoot) or live (tap to cancel).
  // Either way `TaskLabel` carries the name — only the blur over the feed
  // differs.
  return (
    <Pressable
      ref={cellRef}
      accessibilityRole="button"
      accessibilityLabel={
        active
          ? `${row.task.label}, ready to shoot. Tap to cancel.`
          : `${row.task.label}, tap to shoot`
      }
      onPress={active ? onDeactivate : onActivate}
      style={styles.cell}
    >
      {active ? null : CAN_BLUR ? (
        <BlurView
          intensity={glass.blur}
          tint="dark"
          experimentalBlurMethod={Platform.OS === 'android' ? 'dimezisBlurView' : undefined}
          style={absoluteFill}
        />
      ) : (
        <View style={[absoluteFill, styles.frostFallback]} />
      )}
      <TaskLabel label={row.task.label} />
    </Pressable>
  );
}

/** The task's name, bottom-centred and wrapping rather than overflowing a
 * narrow cell — every tile carries one, photographed or not. */
function TaskLabel({ label }: { label: string }) {
  return (
    <View style={styles.taskBadgeWrap} pointerEvents="none">
      <View style={styles.taskBadge}>
        <Text variant="labelBold" color={colors.inkInverse} center numberOfLines={2}>
          {label}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.mediaBackdrop,
  },
  gridClip: {
    overflow: 'hidden',
  },
  // Bled a border's width past the clip on every side, so the border every
  // edge tile draws for the *outer* frame lands outside `gridClip` and gets
  // cropped away — only the seams between tiles are left standing.
  gridBleed: {
    position: 'absolute',
    top: -CELL_BORDER,
    left: -CELL_BORDER,
    right: -CELL_BORDER,
    bottom: -CELL_BORDER,
  },
  cell: {
    flex: 1,
    overflow: 'hidden',
    // The grid's only seam: no real gap between tiles (a gap would show the
    // live camera through it), a border instead. Opaque, not the app's usual
    // translucent `onMediaBorder`: the seam has nothing already drawn under
    // it but raw, unblurred camera, so anything less than fully opaque let a
    // sliver of that tint straight through.
    borderWidth: CELL_BORDER,
    borderColor: colors.inkSoft,
  },
  // Android below API 31 (see `CAN_BLUR`): a flat wash stands in for the
  // blur, the same fallback `GlassSurface` uses when it can't blur either.
  frostFallback: {
    backgroundColor: glass.fallback,
  },
  // Spans the cell's width (minus a small margin) so the pill inside can be
  // centered rather than pinned to one edge, and so its `maxWidth` has
  // something to be a percentage of.
  taskBadgeWrap: {
    position: 'absolute',
    bottom: spacing.sm,
    left: spacing.xs,
    right: spacing.xs,
    alignItems: 'center',
  },
  taskBadge: {
    maxWidth: '100%',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs / 2,
    borderRadius: radii.pill,
    backgroundColor: colors.scrimPhoto,
  },
  timeBadge: {
    position: 'absolute',
    top: spacing.xs,
    right: spacing.xs,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xs / 2,
    borderRadius: radii.pill,
    backgroundColor: colors.scrimPhoto,
  },
  trashOverlay: {
    ...absoluteFill,
    backgroundColor: colors.scrim,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topRow: {
    position: 'absolute',
    left: screenPadding,
    right: screenPadding,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  bottomRow: {
    position: 'absolute',
    left: screenPadding,
    right: screenPadding,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // No backing of its own — the shutter and ring float directly over the
  // live feed, the same way `/photo/camera`'s own shutter always has. Any
  // backing sized to mask the shutter's square touch target painted a
  // rectangle or a ring of its own around the button, which read worse than
  // the sliver it was meant to hide.
  shutterWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringSvg: {
    position: 'absolute',
  },
  shutter: {
    width: SHUTTER_SIZE,
    height: SHUTTER_SIZE,
    borderRadius: radii.pill,
    backgroundColor: colors.surface,
    borderWidth: 4,
    borderColor: colors.onMediaBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterDisabled: {
    opacity: 0.5,
  },
  shutterPressed: {
    transform: [{ scale: 0.94 }],
    opacity: 0.9,
  },
  gate: {
    paddingHorizontal: screenPadding,
    // Overrides `root`'s camera-black: this is a plain permission ask, not a
    // media surface, and wants the page's own light background under it.
    backgroundColor: colors.background,
  },
  gateBlurb: {
    marginTop: spacing.sm,
  },
  gateAction: {
    marginTop: spacing['3xl'],
  },
});

export default TaskCameraGrid;
