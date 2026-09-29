import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors } from '@/constants/theme';

export interface CheckCircleProps {
  size?: number;
  style?: StyleProp<ViewStyle>;
}

/**
 * A finished task's mark: an ink disc with a white tick. Only ever a report of
 * what is already done — nothing presses it — so it carries no empty state.
 */
export function CheckCircle({ size = 32, style }: CheckCircleProps) {
  return (
    <View style={[styles.circle, { width: size, height: size, borderRadius: size / 2 }, style]}>
      <Ionicons name="checkmark" size={size * 0.62} color={colors.inkInverse} />
    </View>
  );
}

export default CheckCircle;

const styles = StyleSheet.create({
  circle: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.ink,
  },
});
