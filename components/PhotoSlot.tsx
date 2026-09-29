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

import { colors, radii, spacing } from '@/constants/theme';
import { Text } from './Text';

/**
 * The dashed rule around an empty slot: its weight, and how far outside the
 * tile it sits. Laid around the tile rather than bordered onto it, because a
 * border is drawn inside the box — it cuts its own weight out of the fill, so
 * the dashes read as a groove in the tile rather than a line drawn about it,
 * and a photo dropped in afterwards comes out that much smaller than the gap
 * it was standing in.
 */
const RULE = 1.75;

export interface PhotoSlotProps {
  /** The photo; left empty, the slot is a `+` asking for one. */
  photo?: ImageSourcePropType | null;
  width?: number;
  height?: number;
  radius?: number;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  /**
   * Turns the empty tile from a flat grey block into an invitation: a dashed
   * field outline with this caption under the glyph.
   */
  emptyLabel?: string;
  /** Degrees off straight. A shade of tilt reads as a photo laid on the page
   * rather than a thumbnail placed in a grid. */
  tilt?: number;
  /** Overrides the read-out label. */
  accessibilityLabel?: string;
}

/**
 * A photo, or the rounded tile waiting for one — the new-challenge screen's
 * cover prints and the slot that adds another.
 */
export function PhotoSlot({
  photo,
  width = 88,
  height = 118,
  radius = radii.lg,
  onPress,
  style,
  emptyLabel,
  tilt,
  accessibilityLabel,
}: PhotoSlotProps) {
  const box: ViewStyle = { width, height, borderRadius: radius };

  const inner = photo ? (
    <View style={[box, styles.clip]}>
      <Image source={photo} contentFit="cover" transition={200} style={StyleSheet.absoluteFill} />
    </View>
  ) : (
    <View style={[styles.empty, box, emptyLabel ? styles.emptyPadded : null]}>
      {emptyLabel ? (
        <View pointerEvents="none" style={[styles.rule, { borderRadius: radius + RULE }]} />
      ) : null}
      <Ionicons name="add" size={28} color={emptyLabel ? colors.inkMuted : colors.field} />
      {emptyLabel ? (
        <Text variant="micro" color={colors.inkMuted} center style={styles.emptyLabel}>
          {emptyLabel}
        </Text>
      ) : null}
    </View>
  );

  const wrapper = [tilt ? { transform: [{ rotate: `${tilt}deg` }] } : null, style];

  if (!onPress) return <View style={wrapper}>{inner}</View>;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? (photo ? 'View photo' : 'Add photo')}
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
  /**
   * The dash is what separates "nothing here yet" from "nothing goes here": a
   * solid tile of the same grey reads as a disabled thumbnail. Broken rather
   * than dotted so each stroke is long enough to read as a rule at a glance —
   * the segments are cut in proportion to the weight, so the extra
   * quarter-point over a hairline buys the longer stroke as well as the firmer
   * line. Any more and the gaps start shouting over the photographs.
   */
  rule: {
    position: 'absolute',
    top: -RULE,
    left: -RULE,
    right: -RULE,
    bottom: -RULE,
    borderWidth: RULE,
    borderStyle: 'dashed',
    borderColor: colors.field,
  },
  /** Air around the glyph, or the rule crops the caption. */
  emptyPadded: {
    paddingHorizontal: spacing.sm,
  },
  emptyLabel: {
    marginTop: spacing.xs,
  },
  pressed: {
    opacity: 0.85,
  },
});

export default PhotoSlot;
