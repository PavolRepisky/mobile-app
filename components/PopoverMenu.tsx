import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';

import { absoluteFill, colors, radii, shadows, spacing } from '@/constants/theme';
import { GlassSurface } from './GlassSurface';
import { Text } from './Text';

export interface PopoverItem {
  label: string;
  onPress: () => void;
  destructive?: boolean;
}

export interface PopoverMenuProps {
  visible: boolean;
  onDismiss: () => void;
  items: readonly PopoverItem[];
  /** Distance from the top of the screen — anchors under the trigger. */
  top: number;
  /** Distance from the right edge. Ignored when `left` is given. */
  right?: number;
  /**
   * Distance from the left edge, for a menu that drops from something out in
   * the page rather than from a corner button. The menu unfolds from whichever
   * edge it is pinned to.
   */
  left?: number;
}

/**
 * The frosted rounded menu that drops from the pencil button on the To-do home
 * (Edit / Restart / Change Challenge).
 *
 * It grows out of the corner it is anchored to rather than fading in on the
 * spot, which is how iOS opens its own context menus: a short spring on scale
 * with the origin pinned to the trigger, so the menu reads as unfolding from
 * the pencil instead of appearing over it. Dismissal is a quicker collapse —
 * closing should not cost the user the same wait as opening.
 */
export function PopoverMenu({
  visible,
  onDismiss,
  items,
  top,
  right = 20,
  left,
}: PopoverMenuProps) {
  const anchored = left === undefined ? { right } : { left };
  const open = useRef(new Animated.Value(0)).current;
  // The modal has to outlive `visible` by the length of the collapse,
  // otherwise the menu is unmounted before it has played.
  const [mounted, setMounted] = useState(visible);

  /**
   * What the chosen item wants to do, held until this menu has actually gone.
   * Every item opens something of its own — a pushed page, a confirmation
   * dialog — and starting that while the menu's modal is still on screen is
   * what strands it on iOS: the new modal is presented by a view controller
   * that is itself about to be torn down, and what it leaves behind is an
   * invisible window that goes on swallowing every touch on the page.
   */
  const pending = useRef<(() => void) | null>(null);
  const runPending = () => {
    const next = pending.current;
    pending.current = null;
    next?.();
  };

  useEffect(() => {
    if (visible) {
      setMounted(true);
      Animated.spring(open, {
        toValue: 1,
        useNativeDriver: true,
        friction: 9,
        tension: 130,
      }).start();
      return;
    }
    Animated.timing(open, {
      toValue: 0,
      duration: 140,
      easing: Easing.in(Easing.quad),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) setMounted(false);
    });
  }, [visible, open]);

  return (
    <Modal
      visible={mounted}
      transparent
      animationType="none"
      onRequestClose={onDismiss}
      onDismiss={runPending}
      statusBarTranslucent
    >
      <Pressable style={StyleSheet.absoluteFill} onPress={onDismiss}>
        <Animated.View style={[styles.backdrop, { opacity: open }]} />
        <Animated.View
          style={[
            styles.menu,
            {
              top,
              ...anchored,
              transformOrigin: left === undefined ? 'top right' : 'top left',
              opacity: open.interpolate({
                inputRange: [0, 0.45, 1],
                outputRange: [0, 1, 1],
                extrapolate: 'clamp',
              }),
              transform: [
                {
                  scale: open.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.86, 1],
                    extrapolateLeft: 'clamp',
                  }),
                },
              ],
            },
          ]}
        >
          <GlassSurface radius={radii.xl} shadow={false}>
            <View style={styles.items}>
              {items.map((item) => (
                <Pressable
                  key={item.label}
                  accessibilityRole="menuitem"
                  onPress={() => {
                    pending.current = item.onPress;
                    onDismiss();
                    // A Modal reports its dismissal on iOS only; everywhere
                    // else there is nothing to wait for, so it runs on the
                    // spot.
                    if (Platform.OS !== 'ios') runPending();
                  }}
                  style={({ pressed }) => [
                    styles.item,
                    pressed && styles.pressed,
                  ]}
                >
                  <Text
                    variant="cardTitle"
                    color={item.destructive ? colors.destructive : colors.ink}
                  >
                    {item.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </GlassSurface>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...absoluteFill,
    backgroundColor: colors.frostBackdrop,
  },
  // Left unfilled, and padded on the inside instead: a background here would
  // sit behind the lens, and the blur would sample it rather than the screen
  // the menu is covering. The drop stays out here too — on iOS a view cannot
  // both clip its children and cast one.
  menu: {
    position: 'absolute',
    minWidth: 240,
    borderRadius: radii.xl,
    // The origin is set per instance, so the menu grows out of the control it
    // is anchored to rather than swelling from its own middle.
    ...shadows.floating,
  },
  items: {
    paddingVertical: spacing.sm,
  },
  item: {
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing['2xl'],
    alignItems: 'flex-start',
  },
  pressed: {
    opacity: 0.6,
  },
});

export default PopoverMenu;
