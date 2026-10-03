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
  /** The task's one-line note, read under its name. */
  note?: string;
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
  /** Where today stands, pinned to the picture's corner — "Day 5 · 3 left". */
  kicker?: string;
  onCapture: (taskId: string, photo: TaskPhoto) => void;
  onClose: () => void;
}

/** The card's own corner — the signature card cut, so it reads as one more
 * of the app's cards risen over the page. */
const CARD_RADIUS = radii.card;
/** The picture's corner, concentric with the card's around the gap between
 * them, so the two curves run parallel. */
const VIEWFINDER_RADIUS = radii.card - layout.stack;
/** Close and flip: a thumb's target, a step under the shutter. */
const CONTROL = 48;
const CONTROL_ICON = 22;
/** The flash in the picture's corner, the height of the pill opposite it. */
const TOP_CONTROL = 36;
const TOP_ICON = 18;
const KICKER_HEIGHT = 30;
const SHUTTER = 80;
const SHUTTER_FACE = 64;
const SHUTTER_RING = 4;
/** The dot under the task in focus — small enough to read as a mark, not a
 * button. */
const DOT = 5;
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
 * The camera, opened from a task: the page dims and a black card rises from
 * the bottom with the live picture square in it, where today stands and the
 * flash on its corners, the task it's for under it between its neighbours,
 * and close, shutter and flip along the bottom. The whole shot is kept; its
 * square in the post shows it cropped to fill, the way every photo in the
 * grid is. Closing it drops straight back to the page.
 */
export function CameraSheet({
  visible,
  tasks,
  taskId,
  swipeTasks,
  onChangeTask,
  kicker,
  onCapture,
  onClose,
}: CameraSheetProps) {
  const insets = useSafeAreaInsets();
  const { height: screenHeight } = useWindowDimensions();
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<'front' | 'back'>('back');
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState(false);
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

  const at = tasks.findIndex((t) => t.id === taskId);
  const task = at >= 0 ? tasks[at] : null;
  // The neighbours either side of the task, wrapping like the swipe does.
  // With only two open, the other one is both, so it's shown once, ahead.
  const previous = canSwitch && tasks.length > 2 ? tasks[(at - 1 + tasks.length) % tasks.length] : null;
  const next = canSwitch ? tasks[(at + 1) % tasks.length] : null;

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
            { bottom: Math.max(insets.bottom / 2, spacing.sm) },
            { transform: [{ translateY }] },
          ]}
        >
          {/* The shot itself, square like its place in the post, so what the
              viewfinder frames is what the post will show. */}
          <View style={styles.viewfinder}>
            {permission?.granted ? (
              <>
                <GestureDetector gesture={gestures}>
                  <View style={absoluteFill} collapsable={false}>
                    <CameraView
                      ref={camera}
                      facing={facing}
                      flash={flash ? 'on' : 'off'}
                      zoom={toCameraZoom(zoom)}
                      style={absoluteFill}
                    />
                  </View>
                </GestureDetector>

                <View style={styles.top} pointerEvents="box-none">
                  {kicker ? (
                    <View style={styles.kicker} pointerEvents="none">
                      <Text variant="badge" color={colors.inkInverse}>
                        {kicker}
                      </Text>
                    </View>
                  ) : (
                    <View />
                  )}
                  {/* Flash turns white while it's on, the way the zoom pill
                      does once zoomed. */}
                  <IconButton
                    name={flash ? 'flash' : 'flash-outline'}
                    size={TOP_CONTROL}
                    iconSize={TOP_ICON}
                    background={flash ? colors.surface : colors.scrim}
                    color={flash ? colors.ink : colors.inkInverse}
                    shadow={false}
                    onPress={() => setFlash((on) => !on)}
                    accessibilityLabel={flash ? 'Flash on, tap to turn off' : 'Flash off, tap to turn on'}
                  />
                </View>

                {/* The zoom shows only while there is some, and a tap takes it
                    back to 1× — the pinch is the way in. */}
                {zoomed ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Zoomed ${formatZoom(zoom)}×, tap to zoom back out`}
                    onPress={() => setZoom(1)}
                    style={({ pressed }) => [styles.zoom, pressed && styles.zoomPressed]}
                  >
                    <Text variant="badge" color={colors.ink}>
                      {`${formatZoom(zoom)}×`}
                    </Text>
                  </Pressable>
                ) : null}
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
          </View>

          {/* The task the shot is for, centred and white, with its neighbours
              either side in grey the way a camera app lays out its modes: a
              tap on one, or a swipe across the picture, moves to it. The dot
              under the middle marks the one in focus. */}
          {task ? (
            <View style={styles.picker}>
              <View style={styles.pickerRow}>
                <View style={[styles.side, styles.sideStart]}>
                  {previous ? (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Previous task: ${previous.label}`}
                      hitSlop={spacing.sm}
                      onPress={() => stepTask.current(-1)}
                      style={({ pressed }) => pressed && styles.sidePressed}
                    >
                      <Text variant="copy" color={colors.inkMuted} numberOfLines={1}>
                        {previous.label}
                      </Text>
                    </Pressable>
                  ) : null}
                </View>
                <View
                  accessibilityRole={canSwitch ? 'adjustable' : undefined}
                  accessibilityLabel={`Task: ${task.label}`}
                  accessibilityActions={
                    canSwitch ? [{ name: 'increment' }, { name: 'decrement' }] : undefined
                  }
                  onAccessibilityAction={(e) =>
                    stepTask.current(e.nativeEvent.actionName === 'increment' ? 1 : -1)
                  }
                  style={styles.current}
                >
                  <Text variant="itemTitle" color={colors.inkInverse} numberOfLines={1}>
                    {task.label}
                  </Text>
                  {canSwitch ? <View style={styles.dot} /> : null}
                </View>
                <View style={[styles.side, styles.sideEnd]}>
                  {next ? (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Next task: ${next.label}`}
                      hitSlop={spacing.sm}
                      onPress={() => stepTask.current(1)}
                      style={({ pressed }) => pressed && styles.sidePressed}
                    >
                      <Text variant="copy" color={colors.inkMuted} numberOfLines={1}>
                        {next.label}
                      </Text>
                    </Pressable>
                  ) : null}
                </View>
              </View>
              {task.note ? (
                <Text variant="meta" color={colors.onMediaSoft} center numberOfLines={2} style={styles.note}>
                  {task.note}
                </Text>
              ) : null}
            </View>
          ) : null}

          <View style={styles.controls}>
            <IconButton
              name="close"
              size={CONTROL}
              iconSize={CONTROL_ICON}
              background={colors.onInkFill}
              color={colors.inkInverse}
              shadow={false}
              onPress={onClose}
              accessibilityLabel="Close camera"
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={task ? `Take the photo for ${task.label}` : 'Take photo'}
              disabled={!permission?.granted}
              onPress={capture}
              style={({ pressed }) => [
                styles.shutter,
                !permission?.granted && styles.shutterOff,
                pressed && styles.shutterPressed,
              ]}
            >
              <View style={styles.shutterFace}>
                {busy ? <ActivityIndicator color={colors.ink} /> : null}
              </View>
            </Pressable>
            <IconButton
              name="camera-reverse-outline"
              size={CONTROL}
              iconSize={CONTROL_ICON}
              background={colors.onInkFill}
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
  // Sized by what's in it and set on the bottom of the screen, so the page
  // the shot is going into stays in view above it.
  card: {
    position: 'absolute',
    left: spacing.sm,
    right: spacing.sm,
    padding: layout.stack,
    borderRadius: CARD_RADIUS,
    backgroundColor: colors.mediaBackdrop,
  },
  viewfinder: {
    aspectRatio: 1,
    borderRadius: VIEWFINDER_RADIUS,
    overflow: 'hidden',
    backgroundColor: colors.mediaBackdrop,
  },
  top: {
    position: 'absolute',
    top: layout.inline,
    left: layout.inline,
    right: layout.inline,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  kicker: {
    height: KICKER_HEIGHT,
    paddingHorizontal: layout.inline,
    borderRadius: radii.pill,
    backgroundColor: colors.scrim,
    justifyContent: 'center',
  },
  zoom: {
    position: 'absolute',
    alignSelf: 'center',
    bottom: layout.inline,
    width: ZOOM_PILL,
    height: ZOOM_PILL,
    borderRadius: radii.pill,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  zoomPressed: {
    opacity: 0.7,
  },
  picker: {
    marginTop: layout.block,
    paddingHorizontal: layout.stack,
  },
  pickerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: layout.inline,
  },
  // The neighbours share what the task in the middle leaves, and give way
  // first, so a long name in focus is never the one cut short.
  side: {
    flex: 1,
    minWidth: 0,
    paddingTop: layout.line / 2,
  },
  sideStart: {
    alignItems: 'flex-start',
  },
  sideEnd: {
    alignItems: 'flex-end',
  },
  sidePressed: {
    opacity: 0.6,
  },
  current: {
    alignItems: 'center',
    gap: layout.line,
    maxWidth: '60%',
  },
  dot: {
    width: DOT,
    height: DOT,
    borderRadius: radii.pill,
    backgroundColor: colors.inkInverse,
  },
  note: {
    marginTop: layout.stack,
    paddingHorizontal: layout.card,
  },
  controls: {
    marginTop: layout.section,
    marginBottom: layout.block,
    paddingHorizontal: layout.section,
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
  shutterOff: {
    opacity: 0.4,
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
