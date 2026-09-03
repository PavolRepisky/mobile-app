import {
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { colors, fonts, spacing } from '@/constants/theme';
import { Avatar, type AvatarSource } from './Avatar';
import { Text } from './Text';

export interface BigSegmentOption<T extends string> {
  key: T;
  label: string;
  /** Avatar cluster above the label. One source renders a single circle. */
  avatars: readonly AvatarSource[];
}

export interface BigSegmentHeaderProps<T extends string> {
  options: readonly [BigSegmentOption<T>, BigSegmentOption<T>];
  value: T;
  onChange: (key: T) => void;
  style?: StyleProp<ViewStyle>;
}

/**
 * The Discover / Friends switch: two oversized labels with an overlapping
 * avatar cluster above each. The inactive side greys out rather than
 * disappearing.
 */
export function BigSegmentHeader<T extends string>({
  options,
  value,
  onChange,
  style,
}: BigSegmentHeaderProps<T>) {
  return (
    <View style={[styles.row, style]}>
      {options.map((option) => {
        const active = option.key === value;
        return (
          <Pressable
            key={option.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            onPress={() => onChange(option.key)}
            style={styles.item}
          >
            <View style={styles.cluster}>
              {option.avatars.map((avatar, i) => (
                <Avatar
                  key={i}
                  source={avatar}
                  size={34}
                  // The cluster keeps its full opacity on the inactive side:
                  // fading it lets each circle show through the one it laps.
                  style={i > 0 && styles.clusterOverlap}
                />
              ))}
            </View>

            <Text
              style={[
                styles.label,
                { color: active ? colors.ink : colors.inkGhost },
              ]}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
  },
  item: {
    alignItems: 'center',
  },
  cluster: {
    flexDirection: 'row',
    marginBottom: spacing.xs,
  },
  clusterOverlap: {
    marginLeft: -18,
  },
  label: {
    fontFamily: fonts.bodyBold,
    fontSize: 30,
    lineHeight: 36,
    // Tighter than the standard Quicksand tracking: at this size the default
    // fit opens the word up more than the reference does. The gutter is what
    // the tightening costs: negative tracking pulls the measured width in past
    // the last glyph, which clips it.
    letterSpacing: -1.9,
    paddingHorizontal: spacing.xs,
  },
});

export default BigSegmentHeader;
