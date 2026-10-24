import { useRef } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Swipeable, { type SwipeableMethods } from 'react-native-gesture-handler/ReanimatedSwipeable';

import { colors, layout } from '@/constants/theme';
import { Text } from './Text';

export interface SwipeAction {
  label: string;
  /** `destructive` in the system red, `primary` in ink, `muted` in the grey —
   * the way Mail sets Delete, Flag and More side by side. */
  tone?: 'destructive' | 'primary' | 'muted';
  onPress: () => void;
}

export interface SwipeRowProps {
  /** Laid out from the row's edge inwards: the first is the one nearest the
   * finger's end of the swipe, the way iOS orders its own. */
  actions: readonly SwipeAction[];
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

/** Each action's width, the size iOS gives its own row actions. */
const ACTION_WIDTH = 80;

const TONES = {
  destructive: colors.destructive,
  primary: colors.ink,
  muted: colors.inkMuted,
} as const;

/**
 * A list row that slides left to show its actions behind it, as rows do in
 * Mail and Messages: a short swipe opens them, a tap on one runs it and
 * closes the row, and a tap anywhere else — or a swipe back — puts it away.
 * Every action is still on the row itself too; this is the quicker way to it.
 */
export function SwipeRow({ actions, children, style }: SwipeRowProps) {
  const swipeable = useRef<SwipeableMethods>(null);

  // Nothing to offer — a friend on a list that can't be hidden — no swipe.
  if (actions.length === 0) return <View style={style}>{children}</View>;

  return (
    <Swipeable
      ref={swipeable}
      friction={1}
      overshootRight={false}
      rightThreshold={ACTION_WIDTH / 2}
      containerStyle={style}
      childrenContainerStyle={styles.row}
      renderRightActions={() => (
        <View style={styles.actions}>
          {actions.map((action) => (
            <Pressable
              key={action.label}
              accessibilityRole="button"
              onPress={() => {
                swipeable.current?.close();
                action.onPress();
              }}
              style={({ pressed }) => [
                styles.action,
                { backgroundColor: TONES[action.tone ?? 'muted'] },
                pressed && styles.pressed,
              ]}
            >
              <Text
                variant="metaBold"
                color={action.tone === 'primary' ? colors.inkInverse : colors.onMedia}
                numberOfLines={1}
              >
                {action.label}
              </Text>
            </Pressable>
          ))}
        </View>
      )}
    >
      {children}
    </Swipeable>
  );
}

const styles = StyleSheet.create({
  // Opaque, so the actions stay hidden behind the row until it slides.
  row: {
    backgroundColor: colors.surface,
  },
  actions: {
    flexDirection: 'row',
  },
  action: {
    width: ACTION_WIDTH,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: layout.line,
  },
  pressed: {
    opacity: 0.8,
  },
});

export default SwipeRow;
