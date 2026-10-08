import {
  Platform,
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
 *
 * On the web the page starts below the browser's own bar (or below the status
 * bar, added to the home screen), so there is no status bar to clear and the
 * line drops to the standard top gap — any real inset still comes through
 * `topPadding`.
 */
export const headerLineTop = Platform.OS === 'web' ? screenTopGap : 56;

interface CommonProps {
  children: React.ReactNode;
  /**
   * Every screen sits on the same white `plain` Profile is built on, by
   * default. `alt` is the settings stack's own fill grey, so its white groups
   * read as cards.
   */
  tone?: 'plain' | 'alt';
  /** Adds the horizontal page gutter. Off for edge-to-edge photo layouts. */
  padded?: boolean;
  /** Reserves room for the floating tab bar. */
  tabBar?: boolean;
  /**
   * A title row that stays put above the page — usually a `ScreenHeader
   * bar`. It sits on the header line on the page's own tone, so its buttons
   * never float over content the way a button pinned beside a scrolling
   * title does. Both shells draw it through the same `HeaderBar`, so every
   * screen's title and corner buttons land on exactly the same line.
   */
  header?: React.ReactNode;
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
export const topPadding = (insetTop: number) =>
  Math.max(insetTop + screenTopGap, screenTopGap);

const TONES = {
  plain: colors.backgroundPlain,
  alt: colors.backgroundAlt,
} as const;

/**
 * The fixed row a screen's `header` sits in: on the header line, on the
 * page's own tone, and always on the gutter — even over an edge-to-edge page,
 * whose title still has to line up with every other screen's.
 */
function HeaderBar({ tone, children }: { tone: keyof typeof TONES; children: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <View
      style={[
        styles.headerBar,
        styles.padded,
        {
          backgroundColor: TONES[tone],
          paddingTop: Math.max(headerLineTop, topPadding(insets.top)),
        },
      ]}
    >
      {children}
    </View>
  );
}

/** Static full-height screen. */
export function Screen({
  children,
  tone = 'plain',
  padded = true,
  tabBar,
  header,
  style,
}: CommonProps) {
  const insets = useSafeAreaInsets();

  const page = (
    <View
      style={[
        styles.flex,
        {
          backgroundColor: TONES[tone],
          // Under a fixed header the page starts a title's gap below the bar,
          // not below the status bar — the bar has already cleared that.
          paddingTop: header ? layout.title : topPadding(insets.top),
        },
        padded && styles.padded,
        style,
      ]}
    >
      {children}
      {tabBar ? <View style={{ height: tabBarClearance }} /> : null}
    </View>
  );

  if (!header) return page;

  return (
    <View style={[styles.flex, { backgroundColor: TONES[tone] }]}>
      <HeaderBar tone={tone}>{header}</HeaderBar>
      {page}
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
}

/** Scrolling screen that keeps content clear of the floating tab bar. */
export function ScreenScroll({
  children,
  tone = 'plain',
  padded = true,
  tabBar,
  style,
  bottomExtra = 0,
  contentContainerStyle,
  header,
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

  const scroller = (
    <ScrollView
      ref={ref}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps={keyboardShouldPersistTaps}
      {...rest}
      style={[styles.flex, { backgroundColor: TONES[tone] }, style]}
      contentContainerStyle={[
        // Under a fixed header the page starts a title's gap below the bar,
        // not below the status bar — the bar has already cleared that.
        { paddingTop: header ? layout.title : topPadding(insets.top) },
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
      <HeaderBar tone={tone}>{header}</HeaderBar>
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
  // A stack's gap under the row, so content scrolling up under the bar is cut
  // off clear of the buttons' shadows rather than against them.
  headerBar: {
    paddingBottom: layout.stack,
  },
});

export default Screen;
