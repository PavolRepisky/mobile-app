import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, type as typeScale } from '@/constants/theme';
import { Text, type TextProps } from './Text';

export interface DateRangeProps {
  from: string;
  to: string;
  variant?: TextProps['variant'];
  color?: string;
  style?: StyleProp<ViewStyle>;
}

/**
 * "aug 18 → oct 31".
 *
 * The arrow is an icon rather than the `→` character: Quicksand has no glyph
 * for it, so a literal arrow renders as tofu.
 */
export function DateRange({
  from,
  to,
  variant = 'bodyStrong',
  color = colors.ink,
  style,
}: DateRangeProps) {
  const size = typeScale[variant].fontSize;

  return (
    <View style={[styles.row, style]}>
      <Text variant={variant} color={color}>
        {from}
      </Text>
      <Ionicons
        name="arrow-forward"
        size={size * 0.92}
        color={color}
        style={styles.arrow}
      />
      <Text variant={variant} color={color}>
        {to}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  arrow: {
    marginHorizontal: 6,
  },
});

export default DateRange;
