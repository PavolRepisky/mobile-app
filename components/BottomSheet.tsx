import { BlurView } from 'expo-blur';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Keyboard,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { absoluteFill, colors, radii, screenPadding, shadows, spacing } from '@/constants/theme';

/** Share of the screen the tall sheet occupies. */
const TALL_RATIO = 0.78;

const DURATION = 280;

/** How far the grabber has to pull the sheet down before letting go closes
 * it, and how fast a flick has to be to close it from any distance. */
const DISMISS_DRAG = 100;
const DISMISS_VELOCITY = 0.8;

/** Blur strength of the backdrop once fully open. Also sets its dim: the tint
 * expo-blur lays over the blur scales with the intensity. */
const BACKDROP_BLUR = 42;

const easingFor = (visible: boolean) =>
  visible ? Easing.out(Easing.cubic) : Easing.in(Easing.cubic);

/**
 * How much of the screen the keyboard is covering, or 0.
 *
 * The sheet is padded by this rather than lifted by a `KeyboardAvoidingView`.
 * That component decides how far to move by measuring where the sheet is when
 * the keyboard event arrives — and on the first open the sheet is still part
 * way through its slide-in, so it measured a sheet that was mostly off-screen,
 * concluded the keyboard did not reach it and moved it not at all. That is why
 * the editor came up underneath the keys, and why dismissing them and tapping
 * the field again — with the sheet by then settled — worked.
 *
 * The `Will` events are used so the sheet is the right height as the keys
 * slide, not a beat after. Android stays at 0: `adjustResize` shrinks the
 * window under the sheet there, so padding it again would lift it twice.
 */
function useKeyboardInset() {
  const [inset, setInset] = useState(0);

  useEffect(() => {
    if (Platform.OS !== 'ios') return;

    const shown = Keyboard.addListener('keyboardWillShow', (e) =>
      setInset(e.endCoordinates.height),
    );
    const hidden = Keyboard.addListener('keyboardWillHide', () => setInset(0));
    return () => {
      shown.remove();
      hidden.remove();
    };
  }, []);

  return inset;
}

/**
 * Blurred, dimming backdrop that fades rather than slides.
 *
 * The fade runs through the blur's own `intensity` and not through an opacity
 * on a wrapping view: a parent with opacity below 1 isolates what it contains
 * from everything painted behind it, so the blur has nothing left to sample
 * (on web that is literally the CSS backdrop-root rule, and on iOS a
 * translucent superview degrades the effect the same way). Intensity carries
 * the tint with it, so one value fades both the blur and the dim.
 *
 * It animates in its own component because driving `intensity` means a
 * re-render per frame, and that would otherwise drag the whole sheet — every
 * row of its contents included — through 60 renders a second.
 */
function SheetBackdrop({
  visible,
  onDismiss,
}: {
  visible: boolean;
  onDismiss: () => void;
}) {
  const progress = useRef(new Animated.Value(visible ? 1 : 0)).current;
  const [intensity, setIntensity] = useState(visible ? BACKDROP_BLUR : 0);

  useEffect(() => {
    const id = progress.addListener(({ value }) =>
      setIntensity(Math.round(value * BACKDROP_BLUR)),
    );
    return () => progress.removeListener(id);
  }, [progress]);

  useEffect(() => {
    // Not native-driven: `intensity` is a prop, not a transform.
    const animation = Animated.timing(progress, {
      toValue: visible ? 1 : 0,
      duration: DURATION,
      easing: easingFor(visible),
      useNativeDriver: false,
    });

    animation.start();
    return () => animation.stop();
  }, [visible, progress]);

  return (
    <BlurView
      tint="dark"
      intensity={intensity}
      // Android has no backdrop blur of its own; this is the same opt-in the
      // glass surfaces use.
      experimentalBlurMethod={
        Platform.OS === 'android' ? 'dimezisBlurView' : undefined
      }
      style={absoluteFill}
    >
      <Pressable
        accessibilityLabel="Dismiss"
        style={absoluteFill}
        onPress={onDismiss}
      />
    </BlurView>
  );
}

export interface BottomSheetProps {
  visible: boolean;
  onDismiss: () => void;
  /**
   * Fired once the sheet has finished animating away, for callers that open
   * something of their own next: pushing a page or presenting a second modal
   * while this one is still on screen is what strands it on iOS.
   */
  onDismissed?: () => void;
  children: React.ReactNode;
  /** Shows the small grabber at the top edge. */
  handle?: boolean;
  /** Sheet fills most of the screen and scrolls its contents. */
  tall?: boolean;
  padded?: boolean;
  /**
   * Room left past the keyboard/safe-area inset at the sheet's bottom edge,
   * `tall` sheets excepted (they pad their own scroll content instead).
   * Defaults to a roomy gap sized for a button or a field with air around
   * it; a composer that should hug the edge instead — a comment field
   * sitting right above the keyboard — passes a tighter one.
   */
  bottomGap?: number;
  style?: StyleProp<ViewStyle>;
}

/**
 * Sheet anchored to the bottom edge, dimming and dismissing on backdrop tap.
 * Used for the inline task editor.
 *
 * The two layers are animated separately rather than left to the Modal's own
 * `slide`, which drags the backdrop up with the sheet: the sheet travels up
 * from the bottom edge while the blurred backdrop only fades in behind it, so
 * the screen appears to recede rather than being pushed off-screen.
 */
export function BottomSheet({
  visible,
  onDismiss,
  onDismissed,
  children,
  handle = true,
  tall,
  padded = true,
  bottomGap,
  style,
}: BottomSheetProps) {
  const insets = useSafeAreaInsets();
  const { height: screenHeight } = useWindowDimensions();
  const keyboardInset = useKeyboardInset();
  // Held for the length of the exit. The field is dismissed as the sheet
  // starts sliding away, so the live inset drops to zero straight away — and
  // letting the padding go with it would snatch the sheet's contents down by
  // a keyboard's height on the way out.
  const heldInset = useRef(keyboardInset);
  if (visible) heldInset.current = keyboardInset;
  const bottomInset = visible ? keyboardInset : heldInset.current;

  // Kept mounted for the length of the exit animation, so the sheet slides
  // back down instead of vanishing the moment `visible` flips.
  const [mounted, setMounted] = useState(visible);
  const progress = useRef(new Animated.Value(visible ? 1 : 0)).current;

  useEffect(() => {
    if (visible) setMounted(true);

    const animation = Animated.timing(progress, {
      toValue: visible ? 1 : 0,
      duration: DURATION,
      easing: easingFor(visible),
      useNativeDriver: true,
    });

    animation.start(({ finished }) => {
      if (finished && !visible) setMounted(false);
    });

    return () => animation.stop();
  }, [visible, progress]);

  // How far the grabber has pulled the sheet down, on top of where the
  // open/close animation has it. Zeroed on every open, so a sheet dragged
  // away last time comes back up to its full height.
  const drag = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (visible) drag.setValue(0);
  }, [visible, drag]);

  // The grabber is a handle in the literal sense: the sheet follows the
  // finger down (never up past where it rests), and letting go far enough
  // down — or flicking — dismisses it; anything less springs it back. The
  // close animation then runs on from wherever the drag left it.
  const onDismissRef = useRef(onDismiss);
  onDismissRef.current = onDismiss;
  const grab = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > Math.abs(g.dx),
      onPanResponderMove: (_, g) => drag.setValue(Math.max(0, g.dy)),
      onPanResponderRelease: (_, g) => {
        if (g.dy > DISMISS_DRAG || g.vy > DISMISS_VELOCITY) {
          onDismissRef.current();
        } else {
          Animated.spring(drag, { toValue: 0, useNativeDriver: true }).start();
        }
      },
      onPanResponderTerminate: () =>
        Animated.spring(drag, { toValue: 0, useNativeDriver: true }).start(),
    }),
  ).current;

  const translateY = useMemo(
    () =>
      Animated.add(
        progress.interpolate({
          inputRange: [0, 1],
          // Full screen height covers the sheet whatever it measures out at.
          outputRange: [screenHeight, 0],
        }),
        drag,
      ),
    [progress, drag, screenHeight],
  );

  const body = tall ? (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: insets.bottom + spacing.xl }}
    >
      {children}
    </ScrollView>
  ) : (
    children
  );

  return (
    <Modal
      visible={mounted}
      transparent
      animationType="none"
      onRequestClose={onDismiss}
      onDismiss={onDismissed}
      statusBarTranslucent
    >
      <View style={styles.root}>
        <SheetBackdrop visible={visible} onDismiss={onDismiss} />

        <Animated.View
          style={[
            styles.sheet,
            tall && {
              height: Math.round(screenHeight * TALL_RATIO),
              // Its own inset, not the safe-area one: the sheet stops well
              // short of the status bar, so `insets.top` here only opened a
              // hole above the content.
              paddingTop: spacing['2xl'],
            },
            padded && styles.padded,
            // The tall sheet pads its scroll content instead, so the list
            // can run under the home indicator while scrolling.
            tall
              ? null
              : {
                // With the keyboard up the sheet keeps its bottom edge on
                // the screen's and runs on underneath the keys, so what
                // shows through their rounded corners is the sheet rather
                // than the blurred page behind it. The safe-area inset
                // goes at the same time: the home indicator is behind the
                // keyboard, so clearing it would only reopen the gap.
                paddingBottom: bottomInset
                  ? bottomInset + (bottomGap ?? spacing.lg)
                  : insets.bottom + (bottomGap ?? spacing.xl),
              },
            style,
            { transform: [{ translateY }] },
          ]}
        >
          {handle ? (
            // A full-width strip around the grabber, so it's caught without
            // having to land on the thin line itself. Left out of the
            // accessibility tree: a screen reader can't drag, and the
            // backdrop's own "Dismiss" already closes the sheet.
            <View
              {...grab.panHandlers}
              hitSlop={{ top: spacing.md }}
              importantForAccessibility="no-hide-descendants"
              accessibilityElementsHidden
              style={styles.handleZone}
            >
              <View style={styles.handle} />
            </View>
          ) : null}
          {body}
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    paddingTop: spacing.md,
    ...shadows.floating,
  },
  padded: {
    paddingHorizontal: screenPadding,
  },
  // The grabber's own gap below it lives on the zone, so the space between
  // the line and the sheet's content is part of what can be grabbed.
  handleZone: {
    alignSelf: 'stretch',
    alignItems: 'center',
    paddingBottom: spacing.lg,
  },
  handle: {
    width: 42,
    height: 5,
    borderRadius: radii.pill,
    // The palette's fill grey — every sheet's grabber, on every screen.
    backgroundColor: colors.surfaceSunken,
  },
});

export default BottomSheet;
