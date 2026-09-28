import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, layout, radii, spacing } from '@/constants/theme';
import { PrimaryButton } from './Buttons';
import { Text } from './Text';

/** The disc behind the glyph when it's drawn on one: big enough to read as
 * a mark rather than a stray icon, sampled off the Challenges canvas. */
const DISC = 56;

export interface EmptyStateProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  /** Muted line under the title, telling the user how to fill the list. */
  hint?: string;
  /** Sets the glyph on a grey disc — for an empty list inside a page, where a
   * bare icon floats loose among the rows around it. */
  disc?: boolean;
  /** One way out of the empty list, as a button under the hint. */
  action?: { label: string; onPress: () => void };
  style?: StyleProp<ViewStyle>;
}

/**
 * Placeholder for a list with nothing in it: glyph, headline, and a muted
 * hint, sitting a little below the top of the empty area rather than dead
 * centre — a tall sheet centres its message somewhere nobody is looking.
 */
export function EmptyState({ icon, title, hint, disc, action, style }: EmptyStateProps) {
  const glyph = <Ionicons name={icon} size={disc ? 26 : 32} color={colors.ink} />;
  return (
    <View style={[styles.root, style]}>
      {disc ? <View style={styles.disc}>{glyph}</View> : glyph}

      <Text variant="sectionTitle" center style={styles.title}>
        {title}
      </Text>

      {hint ? (
        <Text variant="body" color={colors.inkMuted} center style={styles.hint}>
          {hint}
        </Text>
      ) : null}

      {action ? (
        <PrimaryButton
          label={action.label}
          onPress={action.onPress}
          fullWidth={false}
          style={styles.action}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    alignItems: 'center',
    paddingTop: spacing['6xl'],
    // Only enough gutter to keep the hint off the edge; any more and it wraps
    // at 390pt, where the reference sets it on one line.
    paddingHorizontal: spacing.md,
  },
  title: {
    marginTop: spacing.lg,
  },
  hint: {
    marginTop: spacing.xs,
  },
  disc: {
    width: DISC,
    height: DISC,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceSunken,
    alignItems: 'center',
    justifyContent: 'center',
  },
  action: {
    marginTop: layout.block,
  },
});

export default EmptyState;
