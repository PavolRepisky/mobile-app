import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, layout, radii, spacing } from '@/constants/theme';
import { Pill } from './Pill';
import { Text } from './Text';

/** The disc behind the glyph, and the glyph on it: big enough to lead the
 * empty space as its mark, with nothing round it to do that instead. */
const DISC = 56;
const GLYPH = 26;

export interface EmptyStateAction {
  label: string;
  onPress: () => void;
  /** Leading glyph on the pill — a share mark on Share link. */
  icon?: keyof typeof Ionicons.glyphMap;
}

export interface EmptyStateProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  /** Muted line under the title, telling the user how to fill the list. */
  hint?: string;
  /** Sets the hint a size up from detail (`note`) — for an empty state
   * that is the whole page, like a fresh profile, where the line is the
   * page's one message rather than a note under a list. */
  hintAsCopy?: boolean;
  /** One way out of the empty list, as a pill under the hint. */
  action?: EmptyStateAction;
  /** A quieter second way out beside the first — Show code beside Share
   * link — the pair then sharing the width equally. */
  secondaryAction?: EmptyStateAction;
  /** Sets it on a fill-grey card on the grouped corner — for a block that
   * leads a page with something to do, like Find friends' invite, rather
   * than an empty list. The disc turns white so it holds on the grey. */
  card?: boolean;
  style?: StyleProp<ViewStyle>;
}

/**
 * Placeholder for a list with nothing in it: the glyph on a grey disc, the
 * title, a muted line saying how to fill it and the way out as a pill,
 * centred straight on the page with room above and below. No card round it —
 * a filled one stood out louder than an empty list should, and an outlined
 * one read as a box drawn round nothing. Drawn on the iPhone too: the
 * system's empty view set its words in San Francisco.
 */
export function EmptyState({
  icon,
  title,
  hint,
  hintAsCopy,
  action,
  secondaryAction,
  card,
  style,
}: EmptyStateProps) {
  return (
    <View style={[styles.root, card && styles.card, style]}>
      <View style={[styles.disc, card && styles.discOnCard]}>
        <Ionicons name={icon} size={GLYPH} color={colors.ink} />
      </View>
      <View style={styles.text}>
        <Text variant="itemTitle" center>
          {title}
        </Text>
        {hint ? (
          <Text variant={hintAsCopy ? 'note' : 'meta'} color={colors.inkMuted} center>
            {hint}
          </Text>
        ) : null}
      </View>
      {action && secondaryAction ? (
        <View style={styles.pair}>
          <View style={styles.pairCell}>
            <Pill
              tone="solid"
              icon={action.icon}
              label={action.label}
              onPress={action.onPress}
              style={styles.pairPill}
            />
          </View>
          <View style={styles.pairCell}>
            <Pill
              tone="muted"
              icon={secondaryAction.icon}
              label={secondaryAction.label}
              onPress={secondaryAction.onPress}
              style={styles.pairPill}
            />
          </View>
        </View>
      ) : action ? (
        <Pill
          tone="solid"
          icon={action.icon}
          label={action.label}
          onPress={action.onPress}
          style={styles.action}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    alignItems: 'center',
    gap: layout.block,
    paddingVertical: spacing['3xl'],
    paddingHorizontal: layout.card,
  },
  // Both axes named: a bare `padding` loses to the root's own vertical and
  // horizontal padding, whichever comes last.
  card: {
    paddingVertical: layout.card,
    paddingHorizontal: layout.card,
    borderRadius: radii.lg,
    backgroundColor: colors.surfaceSunken,
  },
  disc: {
    width: DISC,
    height: DISC,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceSunken,
    alignItems: 'center',
    justifyContent: 'center',
  },
  discOnCard: {
    backgroundColor: colors.surface,
  },
  text: {
    alignSelf: 'stretch',
    alignItems: 'center',
    gap: layout.line,
  },
  // Centred under the words, sized to its label.
  action: {
    alignSelf: 'center',
  },
  // Two ways out share the width equally rather than hugging their labels.
  pair: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    gap: layout.stack,
  },
  pairCell: {
    flex: 1,
  },
  pairPill: {
    alignSelf: 'stretch',
  },
});

export default EmptyState;
