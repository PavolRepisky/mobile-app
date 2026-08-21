import {
  ScrollView,
  StyleSheet,
  View,
  type ScrollViewProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  colors,
  screenPadding,
  spacing,
  tabBarClearance,
} from '@/constants/theme';

interface CommonProps {
  children: React.ReactNode;
  /** The tab app sits on the warm off-white; `plain` is near-white. */
  tone?: 'app' | 'plain' | 'alt';
  /** Adds the horizontal page gutter. Off for edge-to-edge photo layouts. */
  padded?: boolean;
  /** Reserves room for the floating tab bar. */
  tabBar?: boolean;
  style?: StyleProp<ViewStyle>;
}

const TONES = {
  app: colors.background,
  plain: colors.backgroundPlain,
  alt: colors.backgroundAlt,
} as const;

/** Static full-height screen. */
export function Screen({
  children,
  tone = 'app',
  padded = true,
  tabBar,
  style,
}: CommonProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.flex,
        { backgroundColor: TONES[tone], paddingTop: insets.top },
        padded && styles.padded,
        style,
      ]}
    >
      {children}
      {tabBar ? <View style={{ height: tabBarClearance }} /> : null}
    </View>
  );
}

export interface ScreenScrollProps
  extends CommonProps,
    Omit<ScrollViewProps, 'style' | 'children'> {
  /** Extra bottom padding on top of the safe-area / tab-bar allowance. */
  bottomExtra?: number;
}

/** Scrolling screen that keeps content clear of the floating tab bar. */
export function ScreenScroll({
  children,
  tone = 'app',
  padded = true,
  tabBar,
  style,
  bottomExtra = 0,
  contentContainerStyle,
  ...rest
}: ScreenScrollProps) {
  const insets = useSafeAreaInsets();

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      {...rest}
      style={[styles.flex, { backgroundColor: TONES[tone] }, style]}
      contentContainerStyle={[
        { paddingTop: insets.top },
        padded && styles.padded,
        {
          paddingBottom:
            (tabBar ? tabBarClearance : insets.bottom + spacing.xl) +
            bottomExtra,
        },
        contentContainerStyle,
      ]}
    >
      {children}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  padded: {
    paddingHorizontal: screenPadding,
  },
});

export default Screen;
