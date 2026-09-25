import type { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { Image } from 'expo-image';
import { useState } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { absoluteFill, colors, radii, shadows, spacing } from '@/constants/theme';
import { IconButton } from './IconButton';
import { Placeholder } from './Placeholder';
import type { PhotoSource } from './PhotoStrip';

export interface PhotoViewerAction {
  key: string;
  /** Read out by screen readers — the button itself is just its glyph. */
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  /** Tints the glyph red — for the action that throws something away. */
  destructive?: boolean;
}

/** The action buttons' own diameter — the app's standard glass circle. */
const ACTION_SIZE = 52;

export interface PhotoViewerProps {
  /** The strip the tapped photo came from. */
  photos: readonly PhotoSource[];
  /** Which one was tapped, or `null` when the viewer is closed. */
  index: number | null;
  onDismiss: () => void;
  /**
   * Fired once the viewer has finished fading away, for callers that open
   * something of their own next — presenting on top of a modal that is still
   * dismissing loses the new screen on iOS. iOS only, which is also the only
   * platform that presents anything to lose.
   */
  onDismissed?: () => void;
  /**
   * Buttons in a row along the bottom — what you can do with the photo
   * that's up, e.g. your own avatar's Edit and Remove. A viewer of someone
   * else's photos has none.
   */
  actions?: readonly PhotoViewerAction[];
  /**
   * Something that isn't a photo, blown up in the photo's place — your friend
   * code, say. Shown instead of `photos` when set, centred in the very frame a
   * photo gets, on white, with the same backdrop and tap-to-dismiss.
   */
  children?: React.ReactNode;
}

/**
 * A strip's photos, blown up one at a time over a dark blurred backdrop — the
 * same tint `BottomSheet`'s own backdrop uses — and swiped through exactly
 * like a strip of prints fanned out and flicked between. A tap on the photo
 * itself dismisses; the swipe is the only other gesture, so the two never
 * fight for the same touch.
 */
export function PhotoViewer({
  photos,
  index,
  onDismiss,
  onDismissed,
  actions,
  children,
}: PhotoViewerProps) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={index !== null}
      transparent
      animationType="fade"
      onRequestClose={onDismiss}
      onDismiss={onDismissed}
      statusBarTranslucent
    >
      <View style={styles.root}>
        <BlurView
          tint="dark"
          intensity={60}
          experimentalBlurMethod={Platform.OS === 'android' ? 'dimezisBlurView' : undefined}
          style={absoluteFill}
        />

        {index === null ? null : children ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Dismiss"
            onPress={onDismiss}
            style={styles.custom}
          >
            <View style={[styles.frame, styles.customFrame]}>{children}</View>
          </Pressable>
        ) : (
          // Remounted per opening index, so the page-tracking state below
          // starts fresh on every open rather than carrying over from
          // wherever a previous viewing left it.
          <PhotoViewerPager
            key={index}
            photos={photos}
            initialIndex={index}
            width={width}
            height={height}
            onDismiss={onDismiss}
            dotsLift={actions?.length ? ACTION_SIZE + spacing.md : 0}
          />
        )}

        {/* The app's own glass circles — the same buttons that float over a
            page everywhere else — clear of the home indicator. */}
        {index !== null && actions?.length ? (
          <View style={[styles.actions, { bottom: insets.bottom + spacing.xl }]}>
            {actions.map((action) => (
              <IconButton
                key={action.key}
                name={action.icon}
                size={ACTION_SIZE}
                color={action.destructive ? colors.destructive : colors.ink}
                accessibilityLabel={action.label}
                onPress={action.onPress}
              />
            ))}
          </View>
        ) : null}
      </View>
    </Modal>
  );
}

/**
 * The swiping strip itself, plus the dots tracking which print is up —
 * same read as the review pager's own dot row, in the light-on-dark pairing
 * everything else over a photo backdrop uses instead of that pager's page
 * tones.
 */
function PhotoViewerPager({
  photos,
  initialIndex,
  width,
  height,
  onDismiss,
  dotsLift,
}: {
  photos: readonly PhotoSource[];
  initialIndex: number;
  width: number;
  height: number;
  onDismiss: () => void;
  /** Extra room under the dots when an action row sits beneath them. */
  dotsLift: number;
}) {
  const insets = useSafeAreaInsets();
  const [page, setPage] = useState(initialIndex);

  return (
    <>
      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        contentOffset={{ x: initialIndex * width, y: 0 }}
        // Reads off every scroll frame rather than momentum's end, the same
        // reason the review pager does: a released drag that doesn't carry
        // enough velocity to page never raises a momentum event at all.
        onScroll={(e) => {
          const i = Math.round(e.nativeEvent.contentOffset.x / width);
          setPage(Math.min(photos.length - 1, Math.max(0, i)));
        }}
        scrollEventThrottle={32}
        style={styles.scroll}
      >
        {photos.map((photo, i) => (
          <Pressable
            key={i}
            accessibilityRole="button"
            accessibilityLabel="Dismiss"
            onPress={onDismiss}
            // `height` explicitly: a horizontal ScrollView's content
            // container doesn't stretch its children's cross axis on web,
            // so without it the page collapses to its own padding and the
            // `70%` frame inside has nothing to size itself against.
            style={[styles.page, { width, height }]}
          >
            {typeof photo === 'string' ? (
              <Placeholder seed={photo} radius={radii.card} style={styles.frame} />
            ) : (
              <Image source={photo} contentFit="cover" style={styles.frame} />
            )}
          </Pressable>
        ))}
      </ScrollView>

      {photos.length > 1 && (
        <View
          pointerEvents="none"
          style={[styles.dots, { bottom: insets.bottom + spacing.xl + dotsLift }]}
        >
          {photos.map((_, i) => (
            <View key={i} style={[styles.dot, i === page && styles.dotActive]} />
          ))}
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  custom: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing['2xl'],
  },
  actions: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.xl,
  },
  customFrame: {
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  page: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing['2xl'],
  },
  frame: {
    width: '100%',
    height: '70%',
    borderRadius: radii.md,
    backgroundColor: colors.surfaceMuted,
    ...shadows.floating,
  },
  dots: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  // Light-on-dark pairing rather than the review pager's own tones: this
  // sits over a blurred photo backdrop, not the page.
  dot: {
    width: 6,
    height: 6,
    borderRadius: radii.pill,
    backgroundColor: colors.onMediaTrack,
  },
  dotActive: {
    backgroundColor: colors.inkInverse,
  },
});

export default PhotoViewer;
