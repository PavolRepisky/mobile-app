import { useRouter } from 'expo-router';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { spacing } from '@/constants/theme';
import { IconButton } from './IconButton';
import { ProgressBar } from './ProgressBar';

export interface OnboardingTopBarProps {
  /** 0–1 along the onboarding run. */
  progress: number;
  onBack?: () => void;
  showBack?: boolean;
  /** Circular X on the right instead of the back chevron. */
  onClose?: () => void;
  style?: StyleProp<ViewStyle>;
}

/**
 * Circular back button on the left with the thin progress line centred beside
 * it — the header on every onboarding question.
 */
export function OnboardingTopBar({
  progress,
  onBack,
  showBack = true,
  onClose,
  style,
}: OnboardingTopBarProps) {
  const router = useRouter();

  return (
    <View style={[styles.bar, style]}>
      {showBack ? (
        <IconButton
          name="chevron-back"
          onPress={onBack ?? (() => router.back())}
          accessibilityLabel="Go back"
        />
      ) : (
        <View style={styles.spacer} />
      )}

      <View style={styles.progress}>
        <ProgressBar progress={progress} />
      </View>

      {onClose ? (
        <IconButton name="close" onPress={onClose} accessibilityLabel="Close" />
      ) : (
        <View style={styles.spacer} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 60,
    marginBottom: spacing['3xl'],
  },
  spacer: {
    width: 52,
  },
  progress: {
    flex: 1,
    alignItems: 'center',
  },
});

export default OnboardingTopBar;
