import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
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

import { absoluteFill, colors, gradients, layout, radii, spacing } from '@/constants/theme';
import type { TaskPhoto } from '@/hooks/useAppState';
import { PrimaryButton } from './Buttons';
import { LIQUID_GLASS, LiquidGlass } from './GlassSurface';
import { IconButton } from './IconButton';
import { NATIVE_HEADER } from './Screen';
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
  onCapture: (taskId: string, photo: TaskPhoto) => void;
  onClose: () => void;
}

/** The card's corner — big and round like ChatGPT's camera, running near
 * the phone's own screen corner it sits in. */
const CARD_RADIUS = 40;
/** The picture's shape: the sensor's own 3:4, so the preview shows the whole
 * frame the shot will hold. */
const PICTURE_ASPECT = 3 / 4;
/** Close and flip: glass circles a thumb's size, a step under the shutter. */
const CONTROL = 40;
const CONTROL_ICON = 18;
const SHUTTER = 64;
const SHUTTER_FACE = 50;
const SHUTTER_RING = 3;
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
 * The camera, opened from a task, the way ChatGPT's is: the live picture
 * itself rises as a rounded card near the foot of the screen, and everything
 * sits on it — at its head, over a soft shade, the task it's for between its
 * neighbours; at its foot close, the shutter, and a corner button that opens
 * the flash and the lens switch above it.
 * The task's note stays on the Tasks page, so the picture keeps clear. The
 * whole shot is kept; its square in the post shows it cropped to fill, the
 * way every photo in the grid is. Closing it drops straight back to the page.
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
  const { height: screenHeight } = useWindowDimensions();
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<'front' | 'back'>('back');
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState(false);
  /** The flash and lens switch stood up over the corner button. */
  const [more, setMore] = useState(false);
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
    setMore(false);
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
  // Moving to another task ticks under the finger on the iPhone, the way the
  // Camera app's modes do as they cross — swipe or tap alike.
  const lastTask = useRef(taskId);
  useEffect(() => {
    if (NATIVE_HEADER && visible && lastTask.current && taskId && lastTask.current !== taskId) {
      Haptics.selectionAsync().catch(() => {});
    }
    lastTask.current = taskId;
  }, [taskId, visible]);

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
            // Low on the screen, the same small gap below as either side.
            { bottom: layout.stack },
            { transform: [{ translateY }] },
          ]}
        >
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

              {/* The zoom shows only while there is some, and a tap takes it
                  back to 1× — the pinch is the way in. On the iPhone's glass
                  it stays mounted and condenses out of the picture as the
                  pinch starts, dissolving again at 1×. */}
              {LIQUID_GLASS ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Zoomed ${formatZoom(zoom)}×, tap to zoom back out`}
                  disabled={!zoomed}
                  pointerEvents={zoomed ? 'auto' : 'none'}
                  onPress={() => setZoom(1)}
                  style={styles.zoomSpot}
                >
                  <LiquidGlass interactive visible={zoomed} colorScheme="dark" style={styles.zoomGlass}>
                    <Text variant="badge" color={colors.onMedia}>
                      {`${formatZoom(zoom)}×`}
                    </Text>
                  </LiquidGlass>
                </Pressable>
              ) : zoomed ? (
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
              <Text variant="sectionHeading" color={colors.onMedia} center>
                Camera access
              </Text>
              <Text variant="copy" color={colors.onMediaSoft} center>
                SelfEra needs the camera to photograph today’s tasks.
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

          {/* The head of the picture: a shade falling from its top edge so
              white type holds on any shot, and the task the shot is for
              between its neighbours the way a camera app lays out its
              modes — a tap on one, or a swipe across the picture, moves to
              it. */}
          {task ? (
            <View style={styles.head} pointerEvents="box-none">
              <LinearGradient
                colors={gradients.coverShade}
                start={{ x: 0, y: 1 }}
                end={{ x: 0, y: 0 }}
                style={absoluteFill}
                pointerEvents="none"
              />
              <View style={styles.pickerRow} pointerEvents="box-none">
                <View style={[styles.side, styles.sideStart]}>
                  {previous ? (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Previous task: ${previous.label}`}
                      hitSlop={spacing.sm}
                      onPress={() => stepTask.current(-1)}
                      style={({ pressed }) => pressed && styles.sidePressed}
                    >
                      <Text variant="meta" color={colors.onMediaSoft} numberOfLines={1}>
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
                  <Text variant="copyBold" color={colors.onMedia} numberOfLines={1}>
                    {task.label}
                  </Text>
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
                      <Text variant="meta" color={colors.onMediaSoft} numberOfLines={1}>
                        {next.label}
                      </Text>
                    </Pressable>
                  ) : null}
                </View>
              </View>
            </View>
          ) : null}

          {/* The foot: a shade rising under the controls, then close, the
              shutter and, in the corner, the button that opens the rest. */}
          <View style={styles.foot} pointerEvents="box-none">
            <LinearGradient colors={gradients.coverShade} style={absoluteFill} pointerEvents="none" />
            <View style={styles.controls} pointerEvents="box-none">
              <IconButton
                name="close"
                size={CONTROL}
                iconSize={CONTROL_ICON}
                background={colors.onMediaFill}
                color={colors.onMedia}
                shadow={false}
                onPress={onClose}
                accessibilityLabel="Close camera"
                overMedia
                glassScheme="dark"
              />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={task ? `Take the photo for ${task.label}` : 'Take photo'}
                disabled={!permission?.granted}
                onPress={capture}
                style={({ pressed }) => [
                  styles.shutter,
                  NATIVE_HEADER && styles.shutterRingWhite,
                  !permission?.granted && styles.shutterOff,
                  pressed && styles.shutterPressed,
                ]}
              >
                <View style={[styles.shutterFace, NATIVE_HEADER && styles.shutterFaceWhite]}>
                  {busy ? <ActivityIndicator color={NATIVE_HEADER ? undefined : colors.ink} /> : null}
                </View>
              </Pressable>
              {/* The way ChatGPT's camera keeps its extras: one button in the
                  corner, white while it's open, standing the flash and the
                  lens switch up above it. */}
              <IconButton
                name="ellipsis-horizontal"
                size={CONTROL}
                iconSize={CONTROL_ICON}
                background={more ? colors.onMedia : colors.onMediaFill}
                color={more && !LIQUID_GLASS ? colors.mediaBackdrop : colors.onMedia}
                shadow={false}
                onPress={() => setMore((open) => !open)}
                accessibilityLabel={more ? 'Hide camera options' : 'Show camera options'}
                overMedia
                glassScheme="dark"
                glassTint={more ? colors.systemAccent : undefined}
              />
            </View>
          </View>

          {more && permission?.granted ? (
            <View style={styles.moreMenu} pointerEvents="box-none">
              {/* Flash turns white while it's on — on the iPhone's glass, its
                  glass takes the system blue instead, as a lit control does. */}
              <IconButton
                name={flash ? 'flash' : 'flash-outline'}
                size={CONTROL}
                iconSize={CONTROL_ICON}
                background={flash ? colors.onMedia : colors.onMediaFill}
                color={flash && !LIQUID_GLASS ? colors.mediaBackdrop : colors.onMedia}
                shadow={false}
                onPress={() => setFlash((on) => !on)}
                accessibilityLabel={flash ? 'Flash on, tap to turn off' : 'Flash off, tap to turn on'}
                overMedia
                glassScheme="dark"
                glassTint={flash ? colors.systemAccent : undefined}
              />
              <IconButton
                name="camera-reverse-outline"
                size={CONTROL}
                iconSize={CONTROL_ICON}
                background={colors.onMediaFill}
                color={colors.onMedia}
                shadow={false}
                onPress={() => {
                  // The other lens has its own range, so the zoom starts over.
                  setZoom(1);
                  setFacing((f) => (f === 'back' ? 'front' : 'back'));
                }}
                accessibilityLabel="Flip camera"
                overMedia
                glassScheme="dark"
              />
            </View>
          ) : null}
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
  // Only a light dim behind, as ChatGPT's camera leaves the page in view;
  // a tap on it still closes the camera.
  dim: {
    ...absoluteFill,
    backgroundColor: colors.scrimLight,
  },
  // The live picture as a card of its own, a hair in from the screen's sides
  // and rounded all round, the camera filling it edge to edge.
  card: {
    position: 'absolute',
    left: layout.stack,
    right: layout.stack,
    aspectRatio: PICTURE_ASPECT,
    borderRadius: CARD_RADIUS,
    overflow: 'hidden',
    backgroundColor: colors.mediaBackdrop,
  },
  head: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingTop: layout.block,
    paddingHorizontal: layout.block,
    paddingBottom: layout.section * 2,
  },
  foot: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingTop: layout.section * 2,
    paddingBottom: layout.block,
  },
  // Stood up over the corner button, on the same right edge as it.
  moreMenu: {
    position: 'absolute',
    right: layout.block,
    bottom: layout.block + SHUTTER + layout.stack,
    gap: layout.stack,
  },
  zoom: {
    position: 'absolute',
    alignSelf: 'center',
    bottom: layout.block + SHUTTER + layout.stack,
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
  // The glass zoom: the same spot and size as the drawn one, the place on
  // the pressable and the shape on the glass inside it.
  zoomSpot: {
    position: 'absolute',
    alignSelf: 'center',
    bottom: layout.block + SHUTTER + layout.stack,
  },
  zoomGlass: {
    width: ZOOM_PILL,
    height: ZOOM_PILL,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
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
  controls: {
    marginTop: layout.block,
    paddingHorizontal: layout.block,
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
  // The iPhone's shutter: white whatever the phone's appearance, in a white
  // ring, as the Camera app's is — `surface` turned grey in dark mode.
  shutterRingWhite: {
    borderColor: colors.onMedia,
  },
  shutterFaceWhite: {
    backgroundColor: colors.onMedia,
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
