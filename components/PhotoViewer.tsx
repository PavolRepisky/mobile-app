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
import { Placeholder } from './Placeholder';
import type { PhotoSource } from './PhotoStrip';

export interface PhotoViewerProps {
  /** The strip the tapped photo came from. */
  photos: readonly PhotoSource[];
  /** Which one was tapped, or `null` when the viewer is closed. */
  index: number | null;
  onDismiss: () => void;
}

/**
 * A strip's photos, blown up one at a time over a dark blurred backdrop — the
 * same tint `BottomSheet`'s own backdrop uses — and swiped through exactly
 * like a strip of prints fanned out and flicked between. A tap on the photo
 * itself dismisses; the swipe is the only other gesture, so the two never
 * fight for the same touch.
 */
export function PhotoViewer({ photos, index, onDismiss }: PhotoViewerProps) {
  const { width, height } = useWindowDimensions();

  return (
    <Modal
      visible={index !== null}
      transparent
      animationType="fade"
      onRequestClose={onDismiss}
      statusBarTranslucent
    >
      <View style={styles.root}>
        <BlurView
          tint="dark"
          intensity={60}
          experimentalBlurMethod={Platform.OS === 'android' ? 'dimezisBlurView' : undefined}
          style={absoluteFill}
        />

        {index === null ? null : (
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
          />
        )}
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
}: {
  photos: readonly PhotoSource[];
  initialIndex: number;
  width: number;
  height: number;
  onDismiss: () => void;
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
          style={[styles.dots, { bottom: insets.bottom + spacing.xl }]}
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
