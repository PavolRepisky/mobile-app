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
  /** Bar only: something in the leading slot in place of the back button. */
  left?: React.ReactNode;
  /** The trailing actions — in a bar, grouped side by side at the end. */
  right?: React.ReactNode;
  /**
   * The row a `ScreenScroll`'s fixed `header` holds: exactly the round
   * corner buttons' height, no margin under it, the back button (the same
   * white disc every corner button is) then the title one line at page-title
   * size, left-aligned, then the actions. A tab root passes
   * `showBack={false}` and its title sits on the gutter.
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

  // The bar reads left to right, the way the page under it does: the way
  // back first, where a thumb and the edge swipe both expect it, the title
  // straight after it on the gutter, and every action grouped at the end —
  // one place to reach for them however many a screen has.
  if (bar) {
    const back =
      showBack && !left ? (
        <IconButton name="chevron-back" {...cornerButton} onPress={goBack} accessibilityLabel="Go back" />
      ) : null;
    return (
      <View style={[styles.barRow, style]}>
        {left ?? back}
        <View style={styles.barTitle}>
          {plainTitle ? (
            <Text variant={plainTitleVariant ?? 'pageTitle'} numberOfLines={1} style={plainTitleStyle}>
              {plainTitle}
            </Text>
          ) : null}
          {subtitle ? (
            <Text variant={subtitleVariant} color={colors.inkMuted} numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}
        </View>
        {right ? <View style={styles.barActions}>{right}</View> : null}
        {onClose ? (
          <IconButton name="close" {...cornerButton} onPress={onClose} accessibilityLabel="Close" />
        ) : null}
      </View>
    );
  }

  return (
    <View style={[styles.wrap, style]}>
      <View style={styles.titleBlock}>
        {plainTitle ? (
          <Text
            variant={plainTitleVariant ?? 'sectionTitle'}
            center
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

      {showBack && !onClose ? (
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
  // Exactly a corner button's height, so a screen with no buttons in its bar
  // still puts its title on the same line as one that has them.
  barRow: {
    minHeight: profileActionButton,
    flexDirection: 'row',
    alignItems: 'center',
    gap: layout.inline,
  },
  barTitle: {
    flex: 1,
  },
  barActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: layout.stack,
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
