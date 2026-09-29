import { Ionicons } from '@expo/vector-icons';
import {
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { colors, radii, shadows, spacing } from '@/constants/theme';
import { Text, type TextProps } from './Text';

export interface PillProps {
  label: string;
  /**
   * `floating` is the white overlay pill ("+10,000 joined", "Day 5").
   * `outline` is an ink ring on the page's white: an action repeated down a
   * list, like Invite, where a row of solid pills would stack into a wall
   * of black.
   */
  tone?: 'floating' | 'solid' | 'muted' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  /**
   * Leading glyph. An icon rather than a character in the label because
   * Quicksand has no check-mark glyph.
   */
  icon?: keyof typeof Ionicons.glyphMap;
  /**
   * Glyph after the label — a chevron on a pill that opens somewhere. Held
   * to the muted grey whatever the tone, so it reads as a hint about the tap
   * rather than a second word competing with the label.
   */
  trailingIcon?: keyof typeof Ionicons.glyphMap;
  /**
   * Sets the label in the heaviest cut Quicksand has. For the badges that have
   * to hold their own over a photograph rather than over the page.
   */
  bold?: boolean;
  /**
   * The label's type, when the pill's size and tone don't pick the right one
   * on their own — the Challenges cards' photo badges set theirs a size up
   * from the small bold default, to read at a glance over the photo.
   */
  labelVariant?: TextProps['variant'];
}

/**
 * The rounded label that shows up everywhere: joined-counts overlapping photo
 * strips, the Day N badge under the avatar, the readout above the ruler
 * sliders.
 */
export function Pill({
  label,
  tone = 'floating',
  size = 'md',
  onPress,
  style,
  icon,
  trailingIcon,
  bold,
  labelVariant,
}: PillProps) {
  const content = (
    <>
      {icon ? (
        <Ionicons
          name={icon}
          size={size === 'sm' ? 13 : 16}
          color={tone === 'solid' ? colors.inkInverse : colors.ink}
          style={styles.icon}
        />
      ) : null}
      <Text
        variant={
          labelVariant ??
          (bold
            ? size === 'sm'
              ? // `solid` and `floating` size=sm bold pills are, today, the
                // my-challenge card's two photo badges — they earn the
                // heaviest small cut Quicksand has, the same one the profile
                // grid's own photo-badge counts use, so the pair reads as
                // one weight rather than two.
                tone === 'solid' || tone === 'floating'
                ? 'microBold'
                : 'labelBold'
              : 'bodyBold'
            : size === 'sm'
              ? 'label'
              : size === 'lg'
                ? 'button'
                : 'bodyStrong')
        }
        color={tone === 'solid' ? colors.inkInverse : colors.ink}
      >
        {label}
      </Text>
      {trailingIcon ? (
        <Ionicons
          name={trailingIcon}
          size={size === 'sm' ? 12 : 14}
          color={colors.inkMuted}
          style={styles.trailingIcon}
        />
      ) : null}
    </>
  );

  const body = (
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

/** The `outline` ring: heavier than a hairline so it reads as a button, not
 * a box drawn round a word. */
const OUTLINE_RULE = 1.5;

const SIZES = StyleSheet.create({
  sm: { paddingHorizontal: spacing.md, height: pillHeights.sm },
  md: { paddingHorizontal: spacing.lg, height: pillHeights.md },
  lg: { paddingHorizontal: spacing['2xl'], height: pillHeights.lg },
});

const TONES = StyleSheet.create({
  floating: { backgroundColor: colors.surface },
  solid: { backgroundColor: colors.ink },
  muted: { backgroundColor: colors.surfaceMuted },
  outline: {
    backgroundColor: colors.surface,
    borderWidth: OUTLINE_RULE,
    borderColor: colors.ink,
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
  icon: {
    marginRight: 5,
  },
  trailingIcon: {
    marginLeft: spacing.xs,
  },
  pressed: {
    opacity: 0.85,
  },
});

export default Pill;
