import { Ionicons } from '@expo/vector-icons';
import {
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { colors, radii, shadows, spacing } from '@/constants/theme';
import { GlassSurface } from './GlassSurface';
import { Text } from './Text';

export interface PillProps {
  label: string;
  /**
   * `floating` is the white overlay pill ("+10,000 joined", "Day 5"). `glass`
   * is the liquid-glass lens used for prep times, which needs something worth
   * refracting behind it — over a flat background it reads as a plain tint.
   */
  tone?: 'floating' | 'glass' | 'solid' | 'muted' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  color?: string;
  /**
   * Leading glyph. An icon rather than a character in the label because
   * Quicksand has no check-mark glyph.
   */
  icon?: keyof typeof Ionicons.glyphMap;
  /**
   * Sets the label in the heaviest cut Quicksand has. For the badges that have
   * to hold their own over a photograph rather than over the page.
   */
  bold?: boolean;
}

/**
 * The rounded label that shows up everywhere: joined-counts overlapping photo
 * strips, the Day N badge under the avatar, prep times on recipe cards, the
 * readout above the ruler sliders.
 */
export function Pill({
  label,
  tone = 'floating',
  size = 'md',
  onPress,
  style,
  color,
  icon,
  bold,
}: PillProps) {
  const content = (
    <>
      {icon ? (
        <Ionicons
          name={icon}
          size={size === 'sm' ? 13 : 16}
          color={color ?? (tone === 'solid' ? colors.inkInverse : colors.ink)}
          style={styles.icon}
        />
      ) : null}
      <Text
        variant={
          bold
            ? 'bodyBold'
            : size === 'sm'
              ? 'label'
              : size === 'lg'
                ? 'button'
                : 'bodyStrong'
        }
        color={color ?? (tone === 'solid' ? colors.inkInverse : colors.ink)}
      >
        {label}
      </Text>
    </>
  );

  const body =
    tone === 'glass' ? (
      <GlassSurface radius={radii.pill} style={[styles.glassOuter, style]}>
        <View style={[styles.base, SIZES[size]]}>{content}</View>
      </GlassSurface>
    ) : (
      <View
        style={[
          styles.base,
          SIZES[size],
          TONES[tone],
          tone === 'floating' && shadows.soft,
          style,
        ]}
      >
        {content}
      </View>
    );

  if (!onPress) return body;

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => (pressed ? styles.pressed : undefined)}
    >
      {body}
    </Pressable>
  );
}

/**
 * Outer height of each size. Exported because a caller that laps a pill over
 * something else — the joined badge straddling a photo strip — has to know how
 * tall it is to work out the overhang.
 */
export const pillHeights = { sm: 28, md: 38, lg: 48 } as const;

const SIZES = StyleSheet.create({
  sm: { paddingHorizontal: spacing.md, height: pillHeights.sm },
  md: { paddingHorizontal: spacing.lg, height: pillHeights.md },
  lg: { paddingHorizontal: spacing['2xl'], height: pillHeights.lg },
});

const TONES = StyleSheet.create({
  floating: { backgroundColor: colors.surface },
  /** Painted by GlassSurface, not by a fill. */
  glass: { backgroundColor: 'transparent' },
  solid: { backgroundColor: colors.ink },
  muted: { backgroundColor: colors.surfaceMuted },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.divider,
  },
});

const styles = StyleSheet.create({
  base: {
    borderRadius: radii.pill,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
  /** The lens shrink-wraps its label the way the solid tones do. */
  glassOuter: {
    alignSelf: 'flex-start',
  },
  icon: {
    marginRight: 5,
  },
  pressed: {
    opacity: 0.85,
  },
});

export default Pill;
