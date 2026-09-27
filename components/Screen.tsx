import { useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type ScrollViewProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  colors,
  layout,
  screenPadding,
  screenTopGap,
  spacing,
  tabBarClearance,
} from '@/constants/theme';

/**
 * The line every screen's title row sits on, measured from the very top of
 * the display — the corner buttons of the tab roots and the round back button
 * of a pushed page all share it, so moving between screens never makes the
 * header jump.
 */
export const headerLineTop = 56;

interface CommonProps {
  children: React.ReactNode;
  /**
   * Every screen sits on the same white `plain` Profile is built on, by
   * default. `app` is the warm off-white the shell used to run on, `alt` the
   * settings stack's own cooler off-white, `warm` a touch warmer still —
   * kept for a screen that deliberately wants to break from the white, not
   * used anywhere today.
   */
  tone?: 'app' | 'plain' | 'alt' | 'warm';
  /** Adds the horizontal page gutter. Off for edge-to-edge photo layouts. */
  padded?: boolean;
  /** Reserves room for the floating tab bar. */
  tabBar?: boolean;
  /**
   * Gap between the status bar and the first thing on the screen. Screens
   * opening on a headline take the default; ones opening on a control row sit
   * closer, since the row reads as the header itself.
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
/**
 * Where a screen's content starts, measured from the very top of the display.
 * Exported because anything floating *over* a screen has to know it: the
 * corner action button is placed from the display edge, so the only way to
 * work out how far the page has to be pushed down to clear it is from here.
 */
export const topPadding = (insetTop: number, gap: number = screenTopGap) =>
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
  tone = 'plain',
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
  /** The scroller itself, for a screen that scrolls to something on its own
   * — Community landing on a post a story linked to. */
  ref?: React.Ref<ScrollView>;
  /**
   * A title row that stays put while the page scrolls under it — usually a
   * `ScreenHeader bar`. It sits on the header line on the page's own tone,
   * so its buttons never float over content the way a button pinned beside
   * a scrolling title does; a hairline appears under it once anything has
   * scrolled beneath.
   */
  header?: React.ReactNode;
}

/** Scrolling screen that keeps content clear of the floating tab bar. */
export function ScreenScroll({
  children,
  tone = 'plain',
  padded = true,
  tabBar,
  topGap = screenTopGap,
  style,
  bottomExtra = 0,
  contentContainerStyle,
  header,
  onScroll,
  // React Native's default here is `never`, which puts a *capture* responder
  // on the scroller: while a keyboard is up it eats the first tap anywhere
  // below it and only dismisses the keys. A Modal is a React child of the
  // screen that opened it, so that swallowed everything inside a sheet too —
  // its backdrop and its buttons both needed tapping twice.
  keyboardShouldPersistTaps = 'handled',
  ref,
  ...rest
}: ScreenScrollProps) {
  const insets = useSafeAreaInsets();
  const [scrolled, setScrolled] = useState(false);

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const next = event.nativeEvent.contentOffset.y > 0;
    if (next !== scrolled) setScrolled(next);
    onScroll?.(event);
  };

  const scroller = (
    <ScrollView
      ref={ref}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps={keyboardShouldPersistTaps}
      scrollEventThrottle={header ? 16 : rest.scrollEventThrottle}
      {...rest}
      onScroll={header ? handleScroll : onScroll}
      style={[styles.flex, { backgroundColor: TONES[tone] }, style]}
      contentContainerStyle={[
        // Under a fixed header the page starts a title's gap below the bar,
        // not below the status bar — the bar has already cleared that.
        { paddingTop: header ? layout.title : topPadding(insets.top, topGap) },
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

  if (!header) return scroller;

  return (
    <View style={[styles.flex, { backgroundColor: TONES[tone] }]}>
      <View
        style={[
          styles.headerBar,
          padded && styles.padded,
          {
            backgroundColor: TONES[tone],
            paddingTop: Math.max(headerLineTop, topPadding(insets.top)),
          },
          scrolled && styles.headerBarScrolled,
        ]}
      >
        {header}
      </View>
      {scroller}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  padded: {
    paddingHorizontal: screenPadding,
  },
  // A stack's gap under the row, so the hairline that appears on scroll sits
  // clear of the buttons rather than touching their shadows.
  headerBar: {
    paddingBottom: layout.stack,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'transparent',
  },
  headerBarScrolled: {
    borderBottomColor: colors.inkGhost,
  },
});

export default Screen;
