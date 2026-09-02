import { useState } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { screenPadding, spacing } from '@/constants/theme';
import { ScreenScroll, topPadding } from './Screen';

/**
 * Diameter of the circle at the top of a profile — the friend's avatar, and
 * the day ring on the To-do home. Both screens read it from here so the two
 * circles stay the same size.
 */
export const profileAvatarSize = 120;

/**
 * Distance from the very top of the screen to the corner button. It is
 * measured from the screen edge rather than from the safe-area inset because
 * the button floats over the scroll view rather than sitting inside it.
 */
export const profileActionTop = 56;
/** The corner row is pinned to the button's height so anything taller beside
 * it — the day's sticky note — grows around the button's centre line instead
 * of pushing it down. */
export const profileActionHeight = 52;

export interface ProfileLayoutProps {
  /**
   * Circle plus whatever hangs off it: the name and bio on a friend's
   * profile. Optional — the To-do home has no identity of its own any more,
   * and leads with the day's collage instead.
   */
  identity?: React.ReactNode;
  /** Floating top-right corner: the close button, the pencil and day note. */
  action?: React.ReactNode;
  /**
   * The other end of that same line — the To-do home's date. Unlike `action`
   * it scrolls with the page: it is the page's heading, not a control that has
   * to stay reachable, and a title pinned over the content it names reads as a
   * mistake. It holds the button's own band open, so the two sit on one line
   * at the top of the scroll and part company as soon as the page moves.
   */
  leading?: React.ReactNode;
  children: React.ReactNode;
  tone?: 'app' | 'plain' | 'alt';
  padded?: boolean;
  /**
   * Passed straight through to the screen: how far under the status bar the
   * page starts. A screen leading with a headline takes the default gap; the
   * To-do home leads with a short label instead, which wants less air above
   * it. The offsets below are worked out from the same number, so the corner
   * button keeps its relationship to the heading whatever it is set to.
   */
  topGap?: number;
  tabBar?: boolean;
  bottomExtra?: number;
  identityStyle?: StyleProp<ViewStyle>;
}

/**
 * The profile layout: a floating corner button, then a centred circle with its
 * caption, then the page. Shared by a friend's profile and the To-do home so
 * the circle lands on the same line and the corner button sits in the same
 * place on both — switching between them should feel like the same screen with
 * different contents, not two screens that nearly agree.
 */
export function ProfileLayout({
  identity,
  action,
  leading,
  children,
  tone = 'app',
  padded = true,
  tabBar,
  topGap,
  bottomExtra,
  identityStyle,
}: ProfileLayoutProps) {
  const insets = useSafeAreaInsets();

  /**
   * The corner button is placed from the display edge rather than from the
   * page, so on a screen with an identity it is that block's top margin which
   * happens to push the page clear of it. Without one there is nothing doing
   * that job, and on a phone with a shallow top inset the page would run
   * under the button — so measure the overlap and hold exactly that open.
   */
  const actionClearance =
    !identity && action && !leading
      ? Math.max(
          0,
          profileActionTop + profileActionHeight - topPadding(insets.top, topGap),
        )
      : 0;

  /**
   * What the leading row has to drop to land on the button's line: the button
   * is placed from the display edge, the scroll from its own top padding.
   */
  const leadingOffset = Math.max(
    0,
    profileActionTop - topPadding(insets.top, topGap),
  );

  /**
   * How much room the heading has to leave on its right. The corner is not
   * always one button — the To-do home hangs the day's sticky note off the
   * same row — so it is measured rather than assumed. It starts at the width
   * of a lone button, which is what every other screen has, so the common case
   * is right on the first frame and never reflows.
   */
  const [actionWidth, setActionWidth] = useState(profileActionHeight);

  return (
    // Absolute overlays need a positioned parent, otherwise their offsets
    // resolve against the scroll content instead of the screen.
    <View style={styles.root}>
      <ScreenScroll
        tone={tone}
        padded={padded}
        tabBar={tabBar}
        topGap={topGap}
        bottomExtra={bottomExtra}
      >
        {actionClearance ? <View style={{ height: actionClearance }} /> : null}
        {leading ? (
          <View
            style={[
              styles.leading,
              {
                marginTop: leadingOffset,
                // On a padded screen the scroll view has already inset the
                // page; on an unpadded one this row has to inset itself, or
                // the heading starts at the display edge. The right side adds
                // the button's own width on top of that, so a long heading
                // wraps rather than running under it.
                paddingLeft: padded ? 0 : screenPadding,
                paddingRight:
                  (padded ? 0 : screenPadding) + actionWidth + spacing.lg,
              },
            ]}
          >
            {leading}
          </View>
        ) : null}
        {identity ? (
          <View style={[styles.identity, identityStyle]}>{identity}</View>
        ) : null}
        {children}
      </ScreenScroll>

      {action ? (
        <View
          style={styles.action}
          onLayout={(e) => setActionWidth(e.nativeEvent.layout.width)}
        >
          {action}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  identity: {
    alignItems: 'center',
    marginTop: spacing['5xl'],
  },
  leading: {
    // The same band as the corner button, so the two share a line — but only
    // as a floor. A heading that runs to a second line grows the band down
    // rather than being clipped by it.
    minHeight: profileActionHeight,
    justifyContent: 'center',
  },
  action: {
    position: 'absolute',
    top: profileActionTop,
    right: screenPadding,
    height: profileActionHeight,
    overflow: 'visible',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  },
});

export default ProfileLayout;
