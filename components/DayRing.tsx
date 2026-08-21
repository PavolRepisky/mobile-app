import { LinearGradient } from 'expo-linear-gradient';
import {
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { colors, gradients, radii, shadows } from '@/constants/theme';
import { AvatarPlaceholder } from './Placeholder';
import { Text } from './Text';

export interface DayRingProps {
  day: number;
  /** Seed for the avatar image; null renders the grey silhouette. */
  avatarSeed?: string | null;
  size?: number;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

/**
 * Avatar wrapped in the story gradient ring, with the white "Day N" pill
 * overlapping its bottom edge. Tapping opens the day's story.
 */
export function DayRing({
  day,
  avatarSeed,
  size = 172,
  onPress,
  style,
}: DayRingProps) {
  const ringWidth = 3.5;
  const gap = 3;
  const inner = size - (ringWidth + gap) * 2;

  return (
    <View style={[styles.wrap, style]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Day ${day} story`}
        onPress={onPress}
        style={({ pressed }) => (pressed ? styles.pressed : undefined)}
      >
        <LinearGradient
          colors={gradients.storyRing}
          start={{ x: 0.1, y: 0 }}
          end={{ x: 0.9, y: 1 }}
          style={[
            styles.ring,
            { width: size, height: size, borderRadius: size / 2 },
          ]}
        >
          <View
            style={[
              styles.ringInset,
              {
                width: size - ringWidth * 2,
                height: size - ringWidth * 2,
                borderRadius: (size - ringWidth * 2) / 2,
              },
            ]}
          >
            <AvatarPlaceholder seed={avatarSeed} size={inner} />
          </View>
        </LinearGradient>
      </Pressable>

      <View style={[styles.dayPill, shadows.soft]}>
        <Text variant="button">Day {day}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
  },
  ring: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringInset: {
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayPill: {
    marginTop: -20,
    paddingHorizontal: 22,
    height: 44,
    borderRadius: radii.pill,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.9,
  },
});

export default DayRing;
