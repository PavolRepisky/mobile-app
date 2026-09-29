import { Image } from 'expo-image';
import {
  Pressable,
  StyleSheet,
  View,
  type ImageSourcePropType,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { colors, radii, shadows } from '@/constants/theme';
import { Placeholder } from './Placeholder';

/**
 * What a tile can hold: a bundled photo, or a seed standing in for one until
 * there is a real photo.
 */
export type PhotoSource = ImageSourcePropType | string;

export interface PhotoStripProps {
  /** The prints — four across. */
  photos: readonly PhotoSource[];
  height?: number;
  /** Makes each print its own control, fired with the tapped photo's index. */
  onPressPhoto?: (index: number) => void;
  style?: StyleProp<ViewStyle>;
}

/**
 * Where each print lands, copied off the canvas the preview was drawn in (a
 * 390pt screen, prints 118 × 160). `left` and `width` are shares of the
 * strip's width, measured from the page gutter, so the first print hangs a
 * little past it and the last runs a little past the other; `top` is how far
 * the print drops from the strip's top edge, and the strip is that much
 * taller than a print. Deliberately uneven — the point is a handful of photos
 * put down by hand.
 */
const SCATTER = [
  { left: -1.7, top: 0, tilt: -7 },
  { left: 22.3, top: 8, tilt: 3 },
  { left: 45.1, top: 0, tilt: -3 },
  { left: 68, top: 10, tilt: 6 },
];
const SCATTER_WIDTH = 33.7;
const SCATTER_DROP = 10;

/** Width of a print's white border — its paper edge, sampled off the canvas
 * the preview was drawn in. The frame is what sets each print apart from the
 * one it laps over. */
const FRAME_WIDTH = 3;

const RADIUS = radii.md;

/**
 * A challenge's photos dropped as loose prints across the top of its page,
 * each at its own height and angle, lapping over its neighbours.
 */
export function PhotoStrip({ photos, height = 160, onPressPhoto, style }: PhotoStripProps) {
  return (
    <View style={[{ height }, style]}>
      {photos.map((photo, i) => (
        <Print
          key={i}
          photo={photo}
          index={i}
          stripHeight={height}
          onPress={onPressPhoto && (() => onPressPhoto(i))}
        />
      ))}
    </View>
  );
}

/**
 * One print, set down at its own place, height and angle from `SCATTER`. The
 * shadow lives on the outer view: a rounded clip on the same view would cut
 * it off, so the photo inside carries the corners.
 */
function Print({
  photo,
  index,
  stripHeight,
  onPress,
}: {
  photo: PhotoSource;
  index: number;
  stripHeight: number;
  onPress?: () => void;
}) {
  const spot = SCATTER[index % SCATTER.length];
  const printStyle: StyleProp<ViewStyle> = [
    styles.print,
    {
      left: `${spot.left}%`,
      top: spot.top,
      width: `${SCATTER_WIDTH}%`,
      height: stripHeight - SCATTER_DROP,
      transform: [{ rotate: `${spot.tilt}deg` }],
    },
  ];
  // The photo sits inside the frame, so its corners follow the frame's inner
  // edge rather than the outer one.
  const photoRadius = RADIUS - FRAME_WIDTH;

  const content =
    typeof photo === 'string' ? (
      <Placeholder seed={photo} radius={photoRadius} style={StyleSheet.absoluteFill} />
    ) : (
      <Image
        source={photo}
        contentFit="cover"
        transition={200}
        style={[StyleSheet.absoluteFill, { borderRadius: photoRadius }]}
      />
    );

  if (!onPress) return <View style={printStyle}>{content}</View>;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Open photo"
      onPress={onPress}
      style={printStyle}
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  print: {
    position: 'absolute',
    borderRadius: RADIUS,
    borderWidth: FRAME_WIDTH,
    borderColor: colors.surface,
    backgroundColor: colors.surface,
    ...shadows.hard,
  },
});

export default PhotoStrip;
