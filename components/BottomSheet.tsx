import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { absoluteFill, colors, radii, screenPadding, shadows, spacing } from '@/constants/theme';

export interface BottomSheetProps {
  visible: boolean;
  onDismiss: () => void;
  children: React.ReactNode;
  /** Shows the small grabber at the top edge. */
  handle?: boolean;
  /** Sheet fills most of the screen (the Saved recipes sheet). */
  tall?: boolean;
  padded?: boolean;
  style?: StyleProp<ViewStyle>;
}

/**
 * Sheet anchored to the bottom edge, dimming and dismissing on backdrop tap.
 * Used for the inline task editor and the saved-recipes sheet.
 */
export function BottomSheet({
  visible,
  onDismiss,
  children,
  handle = true,
  tall,
  padded = true,
  style,
}: BottomSheetProps) {
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onDismiss}
      statusBarTranslucent
    >
      <View style={styles.root}>
        <Pressable
          accessibilityLabel="Dismiss"
          style={styles.backdrop}
          onPress={onDismiss}
        />

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View
            style={[
              styles.sheet,
              tall && { paddingTop: insets.top + spacing['3xl'] },
              padded && styles.padded,
              { paddingBottom: insets.bottom + spacing.xl },
              style,
            ]}
          >
            {handle ? <View style={styles.handle} /> : null}
            {children}
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...absoluteFill,
    backgroundColor: colors.scrimLight,
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    paddingTop: spacing.md,
    ...shadows.floating,
  },
  padded: {
    paddingHorizontal: screenPadding,
  },
  handle: {
    alignSelf: 'center',
    width: 42,
    height: 5,
    borderRadius: radii.pill,
    backgroundColor: colors.divider,
    marginBottom: spacing.lg,
  },
});

export default BottomSheet;
