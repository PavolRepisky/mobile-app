import {
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { colors, radii, shadows, spacing, type AuraKey } from '@/constants/theme';
import { Aura } from './Aura';
import { Placeholder } from './Placeholder';
import { Text } from './Text';

/** Hollow circle that fills with a black dot when selected. */
export function Radio({ selected, size = 30 }: { selected: boolean; size?: number }) {
  return (
    <View
      style={[
        styles.radio,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          borderColor: selected ? colors.ink : colors.field,
          borderWidth: selected ? 2.5 : 1.5,
        },
      ]}
    >
      {selected ? (
        <View
          style={{
            width: size * 0.46,
            height: size * 0.46,
            borderRadius: size * 0.23,
            backgroundColor: colors.ink,
          }}
        />
      ) : null}
    </View>
  );
}

/** Plain radio + label row — the "How did you hear about Her 75?" list. */
export function RadioRow({
  label,
  selected,
  onPress,
  style,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.radioRow,
        pressed && styles.pressed,
        style,
      ]}
    >
      <Radio selected={selected} />
      <Text variant="body" style={styles.radioLabel}>
        {label}
      </Text>
    </Pressable>
  );
}

export interface ChoiceCardProps {
  label: string;
  selected: boolean;
  onPress: () => void;
  /** Photographic option — renders a placeholder tile. */
  seed?: string;
  /** Aura option — renders the radial-ish gradient from the reference. */
  aura?: AuraKey;
  style?: StyleProp<ViewStyle>;
}

/**
 * The 2x2 image-plus-radio grid used by three onboarding questions. The
 * selected card gains a black hairline outline; the radio sits below the image,
 * overlapping the tile's bottom-left in the reference.
 */
export function ChoiceCard({
  label,
  selected,
  onPress,
  seed,
  aura,
  style,
}: ChoiceCardProps) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [styles.choice, pressed && styles.pressed, style]}
    >
      <View
        style={[
          styles.choiceMedia,
          aura && styles.choiceMediaSquare,
          selected && styles.choiceMediaSelected,
        ]}
      >
        {aura ? (
          <Aura variant={aura} />
        ) : (
          <Placeholder seed={seed ?? label} radius={radii.lg} style={StyleSheet.absoluteFill} />
        )}
      </View>

      <View style={styles.choiceFooter}>
        <Radio selected={selected} size={28} />
        <Text variant="bodyStrong" style={styles.choiceLabel}>
          {label}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  radio: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  radioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  radioLabel: {
    marginLeft: spacing.lg,
    flex: 1,
  },
  choice: {
    flex: 1,
  },
  choiceMedia: {
    aspectRatio: 0.86,
    borderRadius: radii.lg,
    overflow: 'hidden',
    backgroundColor: colors.surfaceSunken,
    borderWidth: 1.5,
    borderColor: 'transparent',
    ...shadows.soft,
  },
  /** The aura tiles are square; photographic options stay portrait. */
  choiceMediaSquare: {
    aspectRatio: 1,
  },
  choiceMediaSelected: {
    borderColor: colors.ink,
  },
  choiceFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.md,
  },
  choiceLabel: {
    marginLeft: spacing.md,
    flex: 1,
  },
  pressed: {
    opacity: 0.85,
  },
});
