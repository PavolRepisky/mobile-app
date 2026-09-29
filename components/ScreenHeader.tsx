import { useRouter } from 'expo-router';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, layout } from '@/constants/theme';
import { IconButton, InHeaderBar, cornerButtonSize, cornerIconSize } from './IconButton';
import { Text } from './Text';

/** How far the bar's title is raised to sit optically centred on the corner
 * buttons — see `titleText`. */
const TITLE_LIFT = 1.5;

export interface ScreenHeaderProps {
  /** The screen's title, one line at page-title size. */
  plainTitle?: string;
  /** A tab root passes `false`, and its title sits on the gutter. */
  showBack?: boolean;
  /** An X instead of the chevron, for a flow whose first step is left
   * rather than stepped back from. */
  backIcon?: 'chevron-back' | 'close';
  /** Replaces leaving the screen — a multi-step form steps back through
   * itself first. */
  onBack?: () => void;
  /** Drawn in the title's place, for a bar that says where you are some
   * other way than a title: the create form's step bar. */
  middle?: React.ReactNode;
  /** The trailing actions, grouped side by side at the end. */
  right?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

/**
 * The row a `ScreenScroll`'s fixed `header` holds: exactly the round corner
 * buttons' height, no margin under it, the back button (the same white disc
 * every corner button is) then the title, left-aligned, then the actions.
 *
 * It reads left to right, the way the page under it does: the way back first,
 * where a thumb and the edge swipe both expect it, the title straight after it
 * on the gutter, and every action grouped at the end — one place to reach for
 * them however many a screen has.
 */
export function ScreenHeader({
  plainTitle,
  showBack = true,
  backIcon = 'chevron-back',
  onBack,
  middle,
  right,
  style,
}: ScreenHeaderProps) {
  const router = useRouter();

  return (
    <InHeaderBar.Provider value>
      <View style={[styles.row, style]}>
        {showBack ? (
          <IconButton
            name={backIcon}
            size={cornerButtonSize}
            iconSize={cornerIconSize}
            background={colors.surface}
            onPress={onBack ?? (() => router.back())}
            accessibilityLabel={backIcon === 'close' ? 'Close' : 'Go back'}
          />
        ) : null}
        <View style={styles.title}>
          {middle ?? (plainTitle ? (
            <Text variant="pageTitle" numberOfLines={1} style={styles.titleText}>
              {plainTitle}
            </Text>
          ) : null)}
        </View>
        {right ? <View style={styles.actions}>{right}</View> : null}
      </View>
    </InHeaderBar.Provider>
  );
}

const styles = StyleSheet.create({
  // Exactly a corner button's height, so a screen with no buttons in its bar
  // still puts its title on the same line as one that has them.
  row: {
    minHeight: cornerButtonSize,
    flexDirection: 'row',
    alignItems: 'center',
    gap: layout.inline,
  },
  title: {
    flex: 1,
  },
  // Centring the title's line box on the buttons still leaves the word low:
  // Quicksand hangs its capitals ~0.6pt under the middle of a 23/28 line, and
  // the lowercase and descenders under them pull the word's weight further
  // down. Measured off the screens, lifting it by this much puts the word's
  // middle on the corner buttons' centre. Android's extra font padding is
  // dropped so it lands in the same place there.
  titleText: {
    transform: [{ translateY: -TITLE_LIFT }],
    includeFontPadding: false,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: layout.stack,
  },
});

export default ScreenHeader;
