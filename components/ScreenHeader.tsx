import { useRouter } from 'expo-router';
import {
  StyleSheet,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';

import { colors, layout, spacing } from '@/constants/theme';
import { Headline } from './Headline';
import { IconButton } from './IconButton';
import { profileActionButton, profileActionIcon } from './ProfileLayout';
import { Text, type TextProps } from './Text';

export interface ScreenHeaderProps {
  /** Headline-scale title with optional `*accent*` markers. */
  title?: string;
  /** Inter subtitle under the title. */
  subtitle?: string;
  /** Smaller functional title instead of the headline — used by Settings / Bio. */
  plainTitle?: string;
  /** Type scale for `plainTitle`, for screens that want a quieter title. */
  plainTitleVariant?: TextProps['variant'];
  /** Size overrides on top of `plainTitleVariant`. */
  plainTitleStyle?: StyleProp<TextStyle>;
  /** Type scale for `subtitle`, for screens that want it to carry the weight. */
  subtitleVariant?: TextProps['variant'];
  onBack?: () => void;
  /** Circle X on the right instead of a back chevron on the left. */
  onClose?: () => void;
  showBack?: boolean;
  /** Something in the leading corner in place of the back button — a tab
   * root's own action, which has nowhere to go back to. */
  left?: React.ReactNode;
  right?: React.ReactNode;
  /**
   * The row a `ScreenScroll`'s fixed `header` holds: exactly the round
   * corner buttons' height, no margin under it, the title set one line at
   * page-title size and inset clear of both corners, and the back button the
   * same white disc every tab root's corner button is.
   */
  bar?: boolean;
  style?: StyleProp<ViewStyle>;
}

/**
 * The floating circular back button over a centred title. The button overlays
 * the title row rather than pushing it, which is why the title is centred on
 * the full width and the button is absolutely placed.
 */
export function ScreenHeader({
  title,
  subtitle,
  plainTitle,
  plainTitleVariant,
  plainTitleStyle,
  subtitleVariant = 'body',
  onBack,
  onClose,
  showBack = true,
  left,
  right,
  bar,
  style,
}: ScreenHeaderProps) {
  const router = useRouter();
  const goBack = onBack ?? (() => router.back());
  const cornerButton = bar
    ? { size: profileActionButton, iconSize: profileActionIcon, background: colors.surface }
    : {};

  return (
    <View style={[bar ? styles.barWrap : styles.wrap, style]}>
      <View style={bar ? styles.barTitle : styles.titleBlock}>
        {plainTitle ? (
          <Text
            variant={plainTitleVariant ?? (bar ? 'pageTitle' : 'sectionTitle')}
            center
            numberOfLines={bar ? 1 : undefined}
            style={plainTitleStyle}
          >
            {plainTitle}
          </Text>
        ) : null}
        {title ? <Headline size="title">{title}</Headline> : null}
        {subtitle ? (
          <Text
            variant={subtitleVariant}
            color={colors.inkMuted}
            center
            style={styles.sub}
          >
            {subtitle}
          </Text>
        ) : null}
      </View>

      {left ? (
        <View style={styles.left}>{left}</View>
      ) : showBack && !onClose ? (
        <IconButton
          name="chevron-back"
          {...cornerButton}
          onPress={goBack}
          accessibilityLabel="Go back"
          style={styles.left}
        />
      ) : null}

      {onClose ? (
        <IconButton
          name="close"
          {...cornerButton}
          onPress={onClose}
          accessibilityLabel="Close"
          style={styles.right}
        />
      ) : null}

      {right ? <View style={styles.right}>{right}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    minHeight: 60,
    justifyContent: 'center',
    marginBottom: spacing.xl,
  },
  titleBlock: {
    paddingHorizontal: 64,
  },
  barWrap: {
    minHeight: profileActionButton,
    justifyContent: 'center',
  },
  // Inset by a corner button and a row's gap on both sides, so a long name
  // stops short of the buttons and still centres on the page.
  barTitle: {
    paddingHorizontal: profileActionButton + layout.inline,
  },
  sub: {
    marginTop: 2,
  },
  left: {
    position: 'absolute',
    left: 0,
  },
  right: {
    position: 'absolute',
    right: 0,
  },
});

export default ScreenHeader;
