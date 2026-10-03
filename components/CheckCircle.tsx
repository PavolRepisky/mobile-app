import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors } from '@/constants/theme';

/** The open ring's line — heavy enough to read as a box to tick on the white
 * page, in the not-yet grey so it stays quieter than the ink tick. */
const RING = 2;

export interface CheckCircleProps {
  size?: number;
  /** A task still to do: the ring the tick will fill, like a to-do list's
   * empty box. */
  empty?: boolean;
  style?: StyleProp<ViewStyle>;
}

/**
 * A task's mark: an ink disc with a white tick once it's done, or an empty
 * ring while it's still open. Only ever a report of where the task stands —
 * nothing presses it.
 */
export function CheckCircle({ size = 32, empty, style }: CheckCircleProps) {
  return (
    <View
      style={[
        styles.circle,
        empty && styles.empty,
        { width: size, height: size, borderRadius: size / 2 },
        style,
      ]}
    >
      {empty ? null : <Ionicons name="checkmark" size={size * 0.62} color={colors.inkInverse} />}
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
  empty: {
    backgroundColor: 'transparent',
    borderWidth: RING,
    borderColor: colors.inkGhost,
  },
});
