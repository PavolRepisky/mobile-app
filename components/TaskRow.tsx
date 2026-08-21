import { Ionicons } from '@expo/vector-icons';
import {
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { colors, spacing } from '@/constants/theme';
import { PhotoSlot } from './PhotoSlot';
import { Text } from './Text';

export interface CheckCircleProps {
  checked: boolean;
  size?: number;
  onPress?: () => void;
}

/** Big filled circle with a white tick, or a hollow outline when undone. */
export function CheckCircle({ checked, size = 46, onPress }: CheckCircleProps) {
  const body = (
    <View
      style={[
        styles.check,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: checked ? colors.ink : 'transparent',
          borderWidth: checked ? 0 : 1.5,
          borderColor: colors.field,
        },
      ]}
    >
      {checked ? (
        <Ionicons name="checkmark" size={size * 0.5} color={colors.inkInverse} />
      ) : null}
    </View>
  );

  if (!onPress) return body;

  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      onPress={onPress}
      hitSlop={8}
      style={({ pressed }) => (pressed ? styles.pressed : undefined)}
    >
      {body}
    </Pressable>
  );
}

export interface TaskRowProps {
  label: string;
  done: boolean;
  /** Completion time, e.g. "7:19am". Only shown once done. */
  time?: string | null;
  /** Seed for the proof photo; null shows the empty camera tile. */
  photoSeed?: string | null;
  onToggle?: () => void;
  onPressPhoto?: () => void;
  /** Last row in a card omits its divider. */
  divider?: boolean;
  style?: StyleProp<ViewStyle>;
}

/**
 * Photo slot + label + completion time + check circle. Completed tasks get a
 * strikethrough on the label, which is the app's main "done" signal.
 */
export function TaskRow({
  label,
  done,
  time,
  photoSeed,
  onToggle,
  onPressPhoto,
  divider = true,
  style,
}: TaskRowProps) {
  return (
    <View style={[styles.row, divider && styles.divider, style]}>
      <PhotoSlot seed={photoSeed} onPress={onPressPhoto} />

      <View style={styles.body}>
        <Text
          variant="bodyBold"
          style={[styles.label, done && styles.struck]}
        >
          {label}
        </Text>
        {done && time ? (
          <Text variant="body" color={colors.inkMuted} style={styles.time}>
            {time}
          </Text>
        ) : null}
      </View>

      <CheckCircle checked={done} onPress={onToggle} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
  },
  divider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.dividerStrong,
  },
  body: {
    flex: 1,
    marginHorizontal: spacing.md,
  },
  /** Slightly tighter than default body copy so labels hold two lines. */
  label: {
    fontSize: 15,
    lineHeight: 20,
  },
  struck: {
    textDecorationLine: 'line-through',
  },
  time: {
    marginTop: 4,
  },
  check: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.75,
  },
});

export default TaskRow;
