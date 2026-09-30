import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  Linking,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import {
  Directions,
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { absoluteFill, colors, layout, radii, spacing } from '@/constants/theme';
import type { TaskPhoto } from '@/hooks/useAppState';
import { PrimaryButton } from './Buttons';
import { IconButton } from './IconButton';
import { Text } from './Text';

export interface CameraSheetTask {
  id: string;
  label: string;
}

export interface CameraSheetProps {
  visible: boolean;
  /** The tasks still open today, in order. */
  tasks: readonly CameraSheetTask[];
  /** The task the next shot is for. */
  taskId: string | null;
  /**
   * Lets a swipe across the preview step through the open tasks — left to
   * the next, right back to the previous — so another can be picked without
   * closing the camera. Either way the card names one task at a time.
   */
  swipeTasks?: boolean;
  onChangeTask?: (taskId: string) => void;
  onCapture: (taskId: string, photo: TaskPhoto) => void;
  onClose: () => void;
}

/** The card's own corner — the phone's, so the card reads as a second screen
 * rising inside the first. */
const CARD_RADIUS = 44;
/** How far down the screen the card starts: the top of today's post stays in
 * view above it, so it's clear what the photo is going into. */
const CARD_TOP = 0.37;
const CONTROL = 56;
const SHUTTER = 80;
const SHUTTER_FACE = 64;
const SHUTTER_RING = 4;
const CHIP_HEIGHT = 34;
/** The arrows either side of the task: discs the chip's own height, so the
 * three read as one control rather than a label with buttons stuck on. */
const ARROW_ICON = 18;
/** The carousel's dots — small enough to read as a count, not as buttons. */
const DOT = 6;
const RISE_MS = 280;
/** The furthest the pinch goes, as the pill reads it. Past this the picture
 * is only a blown-up crop, the point where the phone's own camera stops too. */
const MAX_ZOOM = 10;
/** A pinch that drifts back to within this of 1× settles on it, instead of
 * the pill hanging at "1.0×" a hair past it. */
const ZOOM_SNAP = 1.05;
/**
 * expo-camera takes zoom as a 0–1 share of the lens's maximum and never says
 * what that maximum is, so the pill's number rests on a typical one. iOS
 * climbs to it on a curve (factor = max ^ zoom) from the main lens's 1×;
 * Android runs a straight line (factor = zoom × max) and holds at 1× below
 * it. Assumed, not measured: if the pill drifts from the phone's own camera
 * at the same framing, these two are the numbers to adjust.
 */
const IOS_LENS_MAX = 16;
const ANDROID_LENS_MAX = 8;
const ZOOM_PILL = 40;

/** The pill's zoom factor, as the 0–1 share expo-camera wants. */
function toCameraZoom(factor: number): number {
  const share =
    Platform.OS === 'ios' ? Math.log(factor) / Math.log(IOS_LENS_MAX) : factor / ANDROID_LENS_MAX;
  return Math.min(Math.max(share, 0), 1);
}

/** "1", "2.3", "10" — the phone's way of writing a zoom level. */
function formatZoom(factor: number): string {
  const rounded = Math.round(factor * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

/**
 * The camera, opened from a square of today's post: the page dims and a card
 * rises over its lower part with the live camera in it and the task it's for
 * across the top. The whole shot is kept; its square in the post shows it
 * cropped to fill, the way every photo in the grid is. Closing it drops
 * straight back to the page.
 */
export function CameraSheet({
  visible,
  tasks,
  taskId,
  swipeTasks,
  onChangeTask,
  onCapture,
  onClose,
}: CameraSheetProps) {
  const insets = useSafeAreaInsets();
  const { height: screenHeight } = useWindowDimensions();
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<'front' | 'back'>('back');
  const [busy, setBusy] = useState(false);
  /** The zoom as the pill reads it: 1 is the main lens, 2 is twice as close. */
  const [zoom, setZoom] = useState(1);
  const pinchFrom = useRef(1);
  // Read at the start of a pinch through a ref, so the gesture is built once
  // and a pinch isn't torn down and rebuilt on every step of its own zoom.
  const zoomNow = useRef(1);
  zoomNow.current = zoom;
  const camera = useRef<CameraView>(null);
  const rise = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) return;
    // Every opening starts back at 1×, like the phone's own camera does.
    setZoom(1);
    rise.setValue(0);
    Animated.timing(rise, {
      toValue: 1,
      duration: RISE_MS,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [visible, rise]);

  // Pinch in and out anywhere on the preview. The zoom scales with the pinch,
  // as the phone's camera does: fingers twice as far apart, twice as close.
  const pinch = useMemo(
    () =>
      Gesture.Pinch()
        .runOnJS(true)
        .onStart(() => {
          pinchFrom.current = zoomNow.current;
        })
        .onUpdate((e) => {
          const next = pinchFrom.current * e.scale;
          setZoom(next < ZOOM_SNAP ? 1 : Math.min(next, MAX_ZOOM));
        }),
    [],
  );

  // One task along the list, wrapping past either end so every open task is
  // reachable by swiping one way. Read through a ref, so the swipes are built
  // once rather than on every task they step to.
  const stepTask = useRef((_by: number) => {});
  stepTask.current = (by: number) => {
    if (!swipeTasks || tasks.length < 2) return;
    const at = tasks.findIndex((t) => t.id === taskId);
    onChangeTask?.(tasks[(at + by + tasks.length) % tasks.length].id);
  };

  // A quick flick sideways switches task, the way a carousel pages: drag the
  // next one in from the right by flicking left. The pinch keeps the zoom;
  // they race, so a two-finger pinch never reads as a swipe.
  const gestures = useMemo(
    () =>
      Gesture.Race(
        pinch,
        Gesture.Fling()
          .runOnJS(true)
          .direction(Directions.LEFT)
          .onEnd(() => stepTask.current(1)),
        Gesture.Fling()
          .runOnJS(true)
          .direction(Directions.RIGHT)
          .onEnd(() => stepTask.current(-1)),
      ),
    [pinch],
  );

  const zoomed = zoom > 1;
  const canSwitch = !!swipeTasks && tasks.length > 1;

  const task = tasks.find((t) => t.id === taskId) ?? null;

  const capture = async () => {
    if (busy || !task) return;
    setBusy(true);
    try {
      const shot = await camera.current?.takePictureAsync({ quality: 0.8 });
      if (shot?.uri) onCapture(task.id, { uri: shot.uri });
    } catch {
      /* Nothing usable came back; the camera stays up to try again. */
    }
    setBusy(false);
  };

  const translateY = rise.interpolate({ inputRange: [0, 1], outputRange: [screenHeight, 0] });

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      {/* A modal is a window of its own on Android, outside the app's root
          handler view, so the pinch needs one here to be seen. */}
      <GestureHandlerRootView style={styles.root}>
        <Pressable accessibilityLabel="Close camera" style={styles.dim} onPress={onClose} />
        <Animated.View
          style={[
            styles.card,
            { top: screenHeight * CARD_TOP, bottom: Math.max(insets.bottom / 2, spacing.sm) },
            { transform: [{ translateY }] },
          ]}
        >
          {permission?.granted ? (
            <>
              <GestureDetector gesture={gestures}>
                <View style={absoluteFill} collapsable={false}>
                  <CameraView ref={camera} facing={facing} zoom={toCameraZoom(zoom)} style={absoluteFill} />
                </View>
              </GestureDetector>

              <View style={styles.top} pointerEvents="box-none">
                {/* One task at a time, whichever the next shot is for. With
                    others open, arrows either side say which way the rest
                    lie — and take a tap as well as the swipe they point
                    along — while the dots under it count the open tasks and
                    mark this one, the way a photo carousel shows there is
                    more. A screen reader steps through them the same way. */}
                {task ? (
                  <View style={styles.taskRow} pointerEvents="box-none">
                    {canSwitch ? (
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel="Previous task"
                        hitSlop={spacing.sm}
                        onPress={() => stepTask.current(-1)}
                        style={({ pressed }) => [styles.arrow, pressed && styles.arrowPressed]}
                      >
                        <Ionicons name="chevron-back" size={ARROW_ICON} color={colors.inkInverse} />
                      </Pressable>
                    ) : null}
                    <View
                      accessibilityRole={canSwitch ? 'adjustable' : undefined}
                      accessibilityLabel={`Task: ${task.label}`}
                      accessibilityActions={
                        canSwitch ? [{ name: 'increment' }, { name: 'decrement' }] : undefined
                      }
                      onAccessibilityAction={(e) =>
                        stepTask.current(e.nativeEvent.actionName === 'increment' ? 1 : -1)
                      }
                      style={[styles.chip, styles.chipAlone]}
                    >
                      <Text variant="metaBold" color={colors.inkInverse} numberOfLines={1}>
                        {task.label}
                      </Text>
                    </View>
                    {canSwitch ? (
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel="Next task"
                        hitSlop={spacing.sm}
                        onPress={() => stepTask.current(1)}
                        style={({ pressed }) => [styles.arrow, pressed && styles.arrowPressed]}
                      >
                        <Ionicons name="chevron-forward" size={ARROW_ICON} color={colors.inkInverse} />
                      </Pressable>
                    ) : null}
                  </View>
                ) : null}
                {canSwitch ? (
                  <View
                    style={styles.dots}
                    pointerEvents="none"
                    accessibilityElementsHidden
                    importantForAccessibility="no-hide-descendants"
                  >
                    {tasks.map((t) => (
                      <View key={t.id} style={[styles.dot, t.id === taskId && styles.dotOn]} />
                    ))}
                  </View>
                ) : null}
              </View>

              {/* The zoom's one control besides the pinch, where the phone's
                  camera keeps it: just above the shutter. It reads the zoom
                  as it moves — "2.3×" — and once zoomed turns white, and a
                  tap takes it back to 1×. */}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={zoomed ? `Zoomed ${formatZoom(zoom)}×, tap to zoom back out` : 'Not zoomed'}
                disabled={!zoomed}
                onPress={() => setZoom(1)}
                style={({ pressed }) => [
                  styles.zoom,
                  zoomed && styles.zoomOn,
                  pressed && styles.zoomPressed,
                ]}
              >
                <Text variant="badge" color={zoomed ? colors.ink : colors.inkInverse}>
                  {`${formatZoom(zoom)}×`}
                </Text>
              </Pressable>

              <View style={styles.controls}>
                <IconButton
                  name="chevron-back"
                  size={CONTROL}
                  iconSize={24}
                  background={colors.scrim}
                  color={colors.inkInverse}
                  shadow={false}
                  onPress={onClose}
                  accessibilityLabel="Close camera"
                />
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={task ? `Take the photo for ${task.label}` : 'Take photo'}
                  onPress={capture}
                  style={({ pressed }) => [styles.shutter, pressed && styles.shutterPressed]}
                >
                  <View style={styles.shutterFace}>
                    {busy ? <ActivityIndicator color={colors.ink} /> : null}
                  </View>
                </Pressable>
                <IconButton
                  name="camera-reverse-outline"
                  size={CONTROL}
                  iconSize={24}
                  background={colors.scrim}
                  color={colors.inkInverse}
                  shadow={false}
                  onPress={() => {
                    // The other lens has its own range, so the zoom starts over.
                    setZoom(1);
                    setFacing((f) => (f === 'back' ? 'front' : 'back'));
                  }}
                  accessibilityLabel="Flip camera"
                />
              </View>
            </>
          ) : (
            <View style={styles.gate}>
              <Text variant="sectionHeading" color={colors.inkInverse} center>
                Camera access
              </Text>
              <Text variant="copy" color={colors.onMediaSoft} center>
                Her 75 needs the camera to photograph today’s tasks.
              </Text>
              <PrimaryButton
                label={permission?.canAskAgain === false ? 'Open Settings' : 'Allow camera'}
                onPress={
                  permission?.canAskAgain === false
                    ? () => Linking.openSettings().catch(() => {})
                    : () => requestPermission()
                }
                inverse
                style={styles.gateAction}
              />
            </View>
          )}
        </Animated.View>
      </GestureHandlerRootView>
    </Modal>
  );
}

export default CameraSheet;

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  dim: {
    ...absoluteFill,
    backgroundColor: colors.scrim,
  },
  card: {
    position: 'absolute',
    left: spacing.sm,
    right: spacing.sm,
    borderRadius: CARD_RADIUS,
    overflow: 'hidden',
    backgroundColor: colors.mediaBackdrop,
  },
  top: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: layout.card,
  },
  chip: {
    height: CHIP_HEIGHT,
    paddingHorizontal: layout.inline,
    borderRadius: radii.pill,
    backgroundColor: colors.scrim,
    justifyContent: 'center',
  },
  chipAlone: {
    alignSelf: 'center',
    // Gives way before the arrows do, so a long task name is cut short
    // rather than pushing them off the card.
    flexShrink: 1,
  },
  taskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: layout.stack,
    paddingHorizontal: layout.gutter,
  },
  arrow: {
    width: CHIP_HEIGHT,
    height: CHIP_HEIGHT,
    borderRadius: radii.pill,
    backgroundColor: colors.scrim,
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrowPressed: {
    opacity: 0.6,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: layout.line + layout.line / 2,
    marginTop: layout.stack,
  },
  // The others as faint white on the preview, this one solid — the same
  // pair of whites the rest of the card's type on the photo wears.
  dot: {
    width: DOT,
    height: DOT,
    borderRadius: radii.pill,
    backgroundColor: colors.onMediaTrack,
  },
  dotOn: {
    backgroundColor: colors.inkInverse,
  },
  // Sits one shutter-height plus a row's gap above the card's bottom, so it
  // clears the shutter's ring the way the camera app's own zoom pill does.
  zoom: {
    position: 'absolute',
    alignSelf: 'center',
    bottom: layout.section + SHUTTER + layout.block,
    width: ZOOM_PILL,
    height: ZOOM_PILL,
    borderRadius: radii.pill,
    backgroundColor: colors.scrim,
    alignItems: 'center',
    justifyContent: 'center',
  },
  zoomOn: {
    backgroundColor: colors.surface,
  },
  zoomPressed: {
    opacity: 0.7,
  },
  controls: {
    position: 'absolute',
    left: layout.section,
    right: layout.section,
    bottom: layout.section,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  shutter: {
    width: SHUTTER,
    height: SHUTTER,
    borderRadius: radii.pill,
    borderWidth: SHUTTER_RING,
    borderColor: colors.onMediaBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterFace: {
    width: SHUTTER_FACE,
    height: SHUTTER_FACE,
    borderRadius: radii.pill,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterPressed: {
    transform: [{ scale: 0.94 }],
  },
  gate: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: layout.stack,
    paddingHorizontal: layout.section,
  },
  gateAction: {
    marginTop: layout.block,
  },
});
