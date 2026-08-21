import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { colors, radii, shadows, spacing } from '@/constants/theme';
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
  /** Distance from the right edge. */
  right?: number;
}

/**
 * The frosted rounded menu that drops from the pencil button on the To-do home
 * (Edit / Restart / Change Challenge).
 */
export function PopoverMenu({
  visible,
  onDismiss,
  items,
  top,
  right = 20,
}: PopoverMenuProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onDismiss}
      statusBarTranslucent
    >
      <Pressable style={styles.backdrop} onPress={onDismiss}>
        <View style={[styles.menu, { top, right }]}>
          {items.map((item) => (
            <Pressable
              key={item.label}
              accessibilityRole="menuitem"
              onPress={() => {
                onDismiss();
                item.onPress();
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
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.04)',
  },
  menu: {
    position: 'absolute',
    minWidth: 240,
    borderRadius: radii.xl,
    backgroundColor: 'rgba(252,251,248,0.97)',
    paddingVertical: spacing.sm,
    ...shadows.floating,
  },
  item: {
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing['2xl'],
    alignItems: 'center',
  },
  pressed: {
    opacity: 0.6,
  },
});

export default PopoverMenu;
