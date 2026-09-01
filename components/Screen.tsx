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
  screenTopGap,
  spacing,
  tabBarClearance,
} from '@/constants/theme';

interface CommonProps {
  children: React.ReactNode;
  /**
   * The tab app sits on the warm off-white; `plain` is white, `warm` a touch
   * warmer than the shell.
   */
  tone?: 'app' | 'plain' | 'alt' | 'warm';
  /** Adds the horizontal page gutter. Off for edge-to-edge photo layouts. */
  padded?: boolean;
  /** Reserves room for the floating tab bar. */
  tabBar?: boolean;
  /**
   * Gap between the status bar and the first thing on the screen. Screens
   * opening on a headline take the default; ones opening on a control row —
   * the recipe tabs — sit closer, since the row reads as the header itself.
   */
  topGap?: number;
  style?: StyleProp<ViewStyle>;
}

/**
 * The gap sits on top of the safe-area inset, but the total never falls below
 * the standard one: where there is no inset to clear — web, and the browser
 * preview the layouts are checked in — the content would otherwise start hard
 * against the top edge.
 */
const topPadding = (insetTop: number, gap: number) =>
  Math.max(insetTop + gap, screenTopGap);

const TONES = {
  app: colors.background,
  plain: colors.backgroundPlain,
  alt: colors.backgroundAlt,
  warm: colors.backgroundWarm,
} as const;

/** Static full-height screen. */
export function Screen({
  children,
  tone = 'app',
  padded = true,
  tabBar,
  topGap = screenTopGap,
  style,
}: CommonProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.flex,
        {
          backgroundColor: TONES[tone],
          paddingTop: topPadding(insets.top, topGap),
        },
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
  topGap = screenTopGap,
  style,
  bottomExtra = 0,
  contentContainerStyle,
  // React Native's default here is `never`, which puts a *capture* responder
  // on the scroller: while a keyboard is up it eats the first tap anywhere
  // below it and only dismisses the keys. A Modal is a React child of the
  // screen that opened it, so that swallowed everything inside a sheet too —
  // its backdrop and its buttons both needed tapping twice.
  keyboardShouldPersistTaps = 'handled',
  ...rest
}: ScreenScrollProps) {
  const insets = useSafeAreaInsets();

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps={keyboardShouldPersistTaps}
      {...rest}
      style={[styles.flex, { backgroundColor: TONES[tone] }, style]}
      contentContainerStyle={[
        { paddingTop: topPadding(insets.top, topGap) },
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
