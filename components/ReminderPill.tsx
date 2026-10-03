import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, layout } from '@/constants/theme';
import { clockTime } from '@/lib/format';
import { Pill } from './Pill';
import { Text } from './Text';
import { WheelPicker } from './WheelPicker';

/** Every quarter hour of the day: fine enough for a nudge, few enough that
 * the wheel still flicks from morning to night. */
const QUARTER_HOURS = Array.from({ length: 24 * 4 }, (_, i) => i * 15);

/** Never, as a stop on the wheel — ahead of the first time, so turning a
 * reminder off is the same flick as moving it. */
const NEVER = -1;
const REMINDER_STOPS = [NEVER, ...QUARTER_HOURS];

/** The ring round an open pill. Always drawn, in the pill's own fill until
 * its wheel opens, so opening one doesn't nudge its row by the ring's width. */
const OPEN_RING = 2;

export interface ReminderPillProps {
  /** Minutes after midnight, or null for Never. */
  value: number | null;
  onPress: () => void;
  /** Whether its wheel is out — the pill takes an ink ring and its caret
   * turns up. */
  open?: boolean;
  /** Set on a fill-grey card, where the pill's own grey would vanish: it
   * turns white instead. */
  onFill?: boolean;
  style?: StyleProp<ViewStyle>;
}

/**
 * A reminder's time, or Never in the muted grey with the bell struck
 * through. It only says what's set; the wheel that changes it is laid out
 * by the list it sits in — see `ReminderRow`.
 */
export function ReminderPill({ value, onPress, open, onFill, style }: ReminderPillProps) {
  return (
    <Pill
      label={value === null ? 'Never' : clockTime(value)}
      icon={value === null ? 'notifications-off-outline' : 'notifications-outline'}
      labelColor={value === null ? colors.inkMuted : undefined}
      trailingIcon={open ? 'chevron-up' : 'chevron-down'}
      tone="muted"
      size="sm"
      labelVariant="metaBold"
      onPress={onPress}
      style={[styles.pill, onFill && styles.pillOnFill, open && styles.pillOpen, style]}
    />
  );
}

export interface ReminderRowProps {
  label: string;
  /** A muted line under the label — a task's note, what the last call is. */
  hint?: string;
  /** The label in `copyBold`, for a list that is the page's whole point
   * rather than one Settings line among others. */
  strong?: boolean;
  value: number | null;
  onChange: (value: number | null) => void;
  /** Whether this row's wheel is out. The list holds which one is, so only
   * one is open at a time. */
  open: boolean;
  onToggle: () => void;
  /** Rules the row off from the one below it. */
  divider?: boolean;
}

/**
 * One reminder as a line of a list: what it's for, and its pill. Tapping the
 * pill opens the wheel under the line, in place — Never at its top, then
 * every quarter hour — and each stop it turns to is kept as it goes, so
 * there's no menu or sheet stacked over the page or window it sits in.
 */
export function ReminderRow({
  label,
  hint,
  strong,
  value,
  onChange,
  open,
  onToggle,
  divider,
}: ReminderRowProps) {
  return (
    <View style={divider && styles.rowDivider}>
      <View style={styles.row}>
        <View style={styles.rowText}>
          <Text variant={strong ? 'copyBold' : 'copy'} numberOfLines={1}>
            {label}
          </Text>
          {hint ? (
            <Text variant="meta" color={colors.inkMuted} numberOfLines={strong ? 1 : undefined}>
              {hint}
            </Text>
          ) : null}
        </View>
        <ReminderPill value={value} open={open} onPress={onToggle} />
      </View>
      {open ? (
        <WheelPicker
          values={REMINDER_STOPS}
          value={value ?? NEVER}
          onChange={(stop) => onChange(stop === NEVER ? null : stop)}
          format={(stop) => (stop === NEVER ? 'Never' : clockTime(stop))}
          style={styles.rowWheel}
        />
      ) : null}
    </View>
  );
}

export default ReminderPill;

const styles = StyleSheet.create({
  pill: {
    backgroundColor: colors.surfaceSunken,
    borderWidth: OPEN_RING,
    borderColor: colors.surfaceSunken,
  },
  pillOnFill: {
    backgroundColor: colors.surface,
    borderColor: colors.surface,
  },
  pillOpen: {
    borderColor: colors.ink,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: layout.inline,
    paddingVertical: layout.inline,
  },
  rowDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.surfaceSunken,
  },
  rowText: {
    flex: 1,
    gap: layout.line / 2,
  },
  rowWheel: {
    marginBottom: layout.inline,
  },
});
