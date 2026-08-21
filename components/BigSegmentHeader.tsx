import {
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { colors, fonts, spacing } from '@/constants/theme';
import { AvatarPlaceholder } from './Placeholder';
import { Text } from './Text';

export interface BigSegmentOption<T extends string> {
  key: T;
  label: string;
  /** Avatar cluster above the label. One seed renders a single circle. */
  seeds: readonly string[];
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
              {option.seeds.map((seed, i) => (
                <AvatarPlaceholder
                  key={seed}
                  seed={seed}
                  size={34}
                  style={[
                    i > 0 && styles.clusterOverlap,
                    !active && styles.faded,
                  ]}
                />
              ))}
            </View>

            <Text
              style={[
                styles.label,
                { color: active ? colors.ink : colors.divider },
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
  faded: {
    opacity: 0.45,
  },
  label: {
    fontFamily: fonts.bodyBold,
    fontSize: 30,
    lineHeight: 36,
  },
});

export default BigSegmentHeader;
