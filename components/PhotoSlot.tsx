import { Ionicons } from '@expo/vector-icons';
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

export interface PhotoSlotProps {
  /** A bundled photo. Takes precedence over `seed`, which stands in for one. */
  photo?: ImageSourcePropType | null;
  /** When set, the slot shows a "photo"; otherwise the empty camera tile. */
  seed?: string | null;
  width?: number;
  height?: number;
  radius?: number;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  /** Empty slots on the profile wall show a `+` rather than a camera. */
  emptyIcon?: 'camera' | 'add';
  /** Degrees off straight. A shade of tilt reads as a photo laid on the page
   * rather than a thumbnail placed in a grid. */
  tilt?: number;
  /**
   * `'card'` is the diffuse lift the wall tiles use; `'hard'` is the tight,
   * offset near-black drop the task rows use, so the photos read as prints
   * laid on the page rather than thumbnails set into it.
   */
  shadow?: boolean | 'card' | 'hard';
}

/**
 * The rounded thumbnail attached to every task row, and the "add" tiles on the
 * profile wall. Filled state is a placeholder photo; empty state is a sunken
 * grey tile with a glyph.
 */
export function PhotoSlot({
  photo,
  seed,
  width = 88,
  height = 118,
  radius = radii.lg,
  onPress,
  style,
  emptyIcon = 'camera',
  tilt,
  shadow = true,
}: PhotoSlotProps) {
  const box: ViewStyle = { width, height, borderRadius: radius };
  const filled = !!photo || !!seed;

  const inner = photo ? (
    <View style={[box, styles.clip]}>
      <Image
        source={photo}
        contentFit="cover"
        transition={200}
        style={StyleSheet.absoluteFill}
      />
    </View>
  ) : filled ? (
    <Placeholder seed={seed!} radius={radius} style={box} />
  ) : (
    <View style={[styles.empty, box]}>
      <Ionicons
        name={emptyIcon === 'camera' ? 'camera' : 'add'}
        size={emptyIcon === 'camera' ? 26 : 28}
        color={colors.field}
      />
    </View>
  );

  // The shadow needs a shape to cast from: on iOS a transparent wrapper
  // squares the shadow off at the bounds instead of following the corner.
  const wrapper = [
    shadow && [
      { borderRadius: radius, backgroundColor: colors.surface },
      shadow === 'hard' ? shadows.hard : shadows.card,
    ],
    tilt ? { transform: [{ rotate: `${tilt}deg` }] } : null,
    style,
  ];

  if (!onPress) return <View style={wrapper}>{inner}</View>;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={filled ? 'View photo' : 'Add photo'}
      onPress={onPress}
      style={({ pressed }) => [wrapper, pressed && styles.pressed]}
    >
      {inner}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  clip: {
    overflow: 'hidden',
  },
  empty: {
    backgroundColor: colors.surfaceSunken,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.85,
  },
});

export default PhotoSlot;
