import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import {
  ActionSheetIOS,
  Appearance,
  Animated,
  Easing,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';

import { absoluteFill, colors, colorsFor, layout, radii, shadows, spacing } from '@/constants/theme';
import { NATIVE_HEADER } from './Screen';
import { Text } from './Text';

export interface PopoverItem {
  label: string;
  onPress: () => void;
  destructive?: boolean;
  /** The option already in force: ticked, on the fill band. */
  checked?: boolean;
  /** An option that means "none" — Never beside the times — in the muted
   * grey. */
  muted?: boolean;
}

export interface PopoverMenuProps {
  visible: boolean;
  onDismiss: () => void;
  items: readonly PopoverItem[];
  /** Distance from the top of the screen — anchors under the trigger. */
  top: number;
}

/**
 * The white rounded menu that drops from a corner button — the ⋯ on a
 * challenge you built (Edit / Delete).
 *
 * It grows out of the corner it is anchored to rather than fading in on the
 * spot, which is how iOS opens its own context menus: a short spring on scale
 * with the origin pinned to the trigger, so the menu reads as unfolding from
 * the button instead of appearing over it. Dismissal is a quicker collapse —
 * closing should not cost the user the same wait as opening.
 */
export function PopoverMenu(props: PopoverMenuProps) {
  return NATIVE_HEADER ? <SystemMenu {...props} /> : <DrawnMenu {...props} />;
}

/**
 * On the iPhone, the system's action sheet: the choices rise from the bottom
 * with Cancel apart under them, and a destructive one in the system red. The
 * chosen item runs only once the sheet has gone, for the reason `pending`
 * gives below.
 */
function SystemMenu({ visible, onDismiss, items }: PopoverMenuProps) {
  useEffect(() => {
    if (!visible) return;
    ActionSheetIOS.showActionSheetWithOptions(
      {
        options: [...items.map((item) => item.label), 'Cancel'],
        cancelButtonIndex: items.length,
        destructiveButtonIndex: items.flatMap((item, i) => (item.destructive ? [i] : [])),
        // The choices in the system blue, for the appearance the sheet opens
        // in; the destructive one keeps its red.
        tintColor: colorsFor(Appearance.getColorScheme()).systemAccent,
      },
      (index) => {
        onDismiss();
        const chosen = items[index];
        if (chosen) setTimeout(chosen.onPress);
      },
    );
    // Shown once per opening; the items are read at that moment.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  return null;
}

function DrawnMenu({
  visible,
  onDismiss,
  items,
  top,
}: PopoverMenuProps) {
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
              transformOrigin: 'top right',
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
          <View style={styles.panel}>
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
                  accessibilityState={{ selected: !!item.checked }}
                  style={({ pressed }) => [
                    styles.item,
                    item.checked && styles.itemChecked,
                    pressed && styles.pressed,
                  ]}
                >
                  <Text
                    variant="cardTitle"
                    color={
                      item.destructive
                        ? colors.destructive
                        : item.muted
                          ? colors.inkMuted
                          : colors.ink
                    }
                  >
                    {item.label}
                  </Text>
                  {item.checked ? (
                    <Ionicons name="checkmark" size={18} color={colors.ink} />
                  ) : null}
                </Pressable>
              ))}
            </View>
          </View>
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
  // The drop stays out here, on the unclipped wrapper — on iOS a view
  // cannot both clip its children and cast one. Pinned under the corner
  // button on the gutter, so it grows out of the control it drops from
  // rather than swelling from its own middle.
  menu: {
    position: 'absolute',
    right: layout.gutter,
    minWidth: 240,
    borderRadius: radii.xl,
    ...shadows.floating,
  },
  // Solid white rather than the liquid glass it used to be: over a busy
  // photo the lens let the picture through and the options read faint.
  // Clipped here so the checked band keeps to the rounded corners.
  panel: {
    borderRadius: radii.xl,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  items: {
    paddingVertical: spacing.sm,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing['2xl'],
  },
  // The picked option sits on the fill band, inset from the menu's edge so
  // it reads as a highlight rather than a stripe.
  itemChecked: {
    marginHorizontal: spacing.sm,
    paddingHorizontal: spacing['2xl'] - spacing.sm,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceSunken,
  },
  pressed: {
    opacity: 0.6,
  },
});

export default PopoverMenu;
