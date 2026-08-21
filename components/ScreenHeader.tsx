import { useRouter } from 'expo-router';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, spacing } from '@/constants/theme';
import { Headline } from './Headline';
import { IconButton } from './IconButton';
import { Text } from './Text';

export interface ScreenHeaderProps {
  /** Playfair title with optional `*accent*` markers. */
  title?: string;
  /** Inter subtitle under the title (Settings, Profile views). */
  subtitle?: string;
  /** Small caps Inter title instead of Playfair — used by Settings / Bio. */
  plainTitle?: string;
  onBack?: () => void;
  /** Circle X on the right instead of a back chevron on the left. */
  onClose?: () => void;
  showBack?: boolean;
  right?: React.ReactNode;
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
  onBack,
  onClose,
  showBack = true,
  right,
  style,
}: ScreenHeaderProps) {
  const router = useRouter();
  const goBack = onBack ?? (() => router.back());

  return (
    <View style={[styles.wrap, style]}>
      <View style={styles.titleBlock}>
        {plainTitle ? (
          <Text variant="sectionTitle" center>
            {plainTitle}
          </Text>
        ) : null}
        {title ? <Headline size="title">{title}</Headline> : null}
        {subtitle ? (
          <Text variant="body" color={colors.inkMuted} center style={styles.sub}>
            {subtitle}
          </Text>
        ) : null}
      </View>

      {showBack && !onClose ? (
        <IconButton
          name="chevron-back"
          onPress={goBack}
          accessibilityLabel="Go back"
          style={styles.left}
        />
      ) : null}

      {onClose ? (
        <IconButton
          name="close"
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
