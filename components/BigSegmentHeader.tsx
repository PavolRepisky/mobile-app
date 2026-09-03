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
  /**
   * Two options draw the switch; one draws a page title. Discover and Friends
   * were a single screen before they were tabs of their own, and the title
   * form is what is left of that header once the bar does the switching.
   */
  options:
    | readonly [BigSegmentOption<T>]
    | readonly [BigSegmentOption<T>, BigSegmentOption<T>];
  /** Which side is lit. A lone option is its own page, so it needs neither. */
  value?: T;
  onChange?: (key: T) => void;
  style?: StyleProp<ViewStyle>;
}

/**
 * Oversized label with an overlapping avatar cluster above it. As a pair it is
 * the Discover / Friends switch and the inactive side greys out rather than
 * disappearing; alone it is a page's title, always lit and inert.
 */
export function BigSegmentHeader<T extends string>({
  options,
  value,
  onChange,
  style,
}: BigSegmentHeaderProps<T>) {
  const title = options.length === 1;

  return (
    <View style={[styles.row, style]}>
      {options.map((option) => {
        const active = title || option.key === value;
        const content = (
          <>
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
          </>
        );

        // A title is not a control: pressing it would go nowhere, and leaving
        // it a tab would have a screen reader announce a one-tab tab list.
        return title ? (
          <View key={option.key} accessibilityRole="header" style={styles.item}>
            {content}
          </View>
        ) : (
          <Pressable
            key={option.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            onPress={() => onChange?.(option.key)}
            style={styles.item}
          >
            {content}
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
