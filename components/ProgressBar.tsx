import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, radii } from '@/constants/theme';

export interface ProgressBarProps {
  /** 0–1. */
  progress: number;
  width?: number;
  height?: number;
  /** Animates from 0 to `progress` on mount — the two loading interstitials. */
  animate?: boolean;
  duration?: number;
  onComplete?: () => void;
  style?: StyleProp<ViewStyle>;
}

/**
 * The thin determinate line under the onboarding headers, and the fill on the
 * "Finding your perfect challenge" / "Personalizing your space" interstitials.
 */
export function ProgressBar({
  progress,
  width = 190,
  height = 4,
  animate,
  duration = 2200,
  onComplete,
  style,
}: ProgressBarProps) {
  const value = useRef(new Animated.Value(animate ? 0 : progress)).current;
  const done = useRef(onComplete);
  done.current = onComplete;

  useEffect(() => {
    const animation = Animated.timing(value, {
      toValue: progress,
      duration: animate ? duration : 240,
      useNativeDriver: false,
    });
    animation.start(({ finished }) => {
      if (finished) done.current?.();
    });
    return () => animation.stop();
  }, [animate, duration, progress, value]);

  const fillWidth = value.interpolate({
    inputRange: [0, 1],
    outputRange: [0, width],
    extrapolate: 'clamp',
  });

  return (
    <View
      accessibilityRole="progressbar"
      style={[styles.track, { width, height, borderRadius: height / 2 }, style]}
    >
      <Animated.View
        style={[
          styles.fill,
          { width: fillWidth, height, borderRadius: height / 2 },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    backgroundColor: colors.divider,
    borderRadius: radii.pill,
    overflow: 'hidden',
  },
  fill: {
    backgroundColor: colors.ink,
  },
});

export default ProgressBar;
