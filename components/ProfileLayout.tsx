import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { screenPadding, spacing } from '@/constants/theme';
import { ScreenScroll } from './Screen';

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
   * profile, the "Day N" pill on the To-do home.
   */
  identity: React.ReactNode;
  /** Floating top-right corner: the close button, the pencil and day note. */
  action?: React.ReactNode;
  children: React.ReactNode;
  tone?: 'app' | 'plain' | 'alt';
  padded?: boolean;
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
  children,
  tone = 'app',
  padded = true,
  tabBar,
  bottomExtra,
  identityStyle,
}: ProfileLayoutProps) {
  return (
    // Absolute overlays need a positioned parent, otherwise their offsets
    // resolve against the scroll content instead of the screen.
    <View style={styles.root}>
      <ScreenScroll
        tone={tone}
        padded={padded}
        tabBar={tabBar}
        bottomExtra={bottomExtra}
      >
        <View style={[styles.identity, identityStyle]}>{identity}</View>
        {children}
      </ScreenScroll>

      {action ? <View style={styles.action}>{action}</View> : null}
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
