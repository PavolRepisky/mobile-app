import { BlurView } from 'expo-blur';
import { Image } from 'expo-image';
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';

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
          // Remounted per opening index: a plain `contentOffset` only ever
          // takes on the first mount, and a reopen on a different photo would
          // otherwise land back wherever the scroller was last left.
          <ScrollView
            key={index}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            contentOffset={{ x: index * width, y: 0 }}
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
        )}
      </View>
    </Modal>
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
    borderRadius: radii.card,
    backgroundColor: colors.surfaceMuted,
    ...shadows.floating,
  },
});

export default PhotoViewer;
