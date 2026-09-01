import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, spacing } from '@/constants/theme';
import { Text } from './Text';

export interface EmptyStateProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  /** Muted line under the title, telling the user how to fill the list. */
  hint?: string;
  style?: StyleProp<ViewStyle>;
}

/**
 * Placeholder for a list with nothing in it: glyph, headline, and a muted
 * hint, sitting a little below the top of the empty area rather than dead
 * centre — a tall sheet centres its message somewhere nobody is looking.
 */
export function EmptyState({ icon, title, hint, style }: EmptyStateProps) {
  return (
    <View style={[styles.root, style]}>
      <Ionicons name={icon} size={32} color={colors.ink} />

      <Text variant="sectionTitle" center style={styles.title}>
        {title}
      </Text>

      {hint ? (
        <Text variant="body" color={colors.inkMuted} center style={styles.hint}>
          {hint}
        </Text>
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
});

export default EmptyState;
