import { Ionicons } from '@expo/vector-icons';
import {
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { colors, radii, shadows } from '@/constants/theme';
import { Placeholder } from './Placeholder';

export interface PhotoSlotProps {
  /** When set, the slot shows a "photo"; otherwise the empty camera tile. */
  seed?: string | null;
  width?: number;
  height?: number;
  radius?: number;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  /** Empty slots on the profile wall show a `+` rather than a camera. */
  emptyIcon?: 'camera' | 'add';
  shadow?: boolean;
}

/**
 * The rounded thumbnail attached to every task row, and the "add" tiles on the
 * profile wall. Filled state is a placeholder photo; empty state is a sunken
 * grey tile with a glyph.
 */
export function PhotoSlot({
  seed,
  width = 88,
  height = 118,
  radius = radii.lg,
  onPress,
  style,
  emptyIcon = 'camera',
  shadow = true,
}: PhotoSlotProps) {
  const box: ViewStyle = { width, height, borderRadius: radius };
  const filled = !!seed;

  const inner = filled ? (
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

  const wrapper = [shadow && shadows.soft, style];

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
