import { useRef, useState } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, layout } from '@/constants/theme';
import { clockTime } from '@/lib/format';
import { BottomSheet } from './BottomSheet';
import { PrimaryButton } from './Buttons';
import { Pill } from './Pill';
import { PopoverMenu, type PopoverItem } from './PopoverMenu';
import { Text } from './Text';
import { WheelPicker } from './WheelPicker';

/** Every quarter hour of the day: fine enough for a nudge, few enough that
 * the wheel still flicks from morning to night. */
const QUARTER_HOURS = Array.from({ length: 24 * 4 }, (_, i) => i * 15);

/** The ring round an open pill. Always drawn, in the pill's own fill until
 * its menu opens, so opening one doesn't nudge its row by the ring's width. */
const OPEN_RING = 2;

export interface ReminderPillProps {
  /** Minutes after midnight, or null for Never. */
  value: number | null;
  onChange: (value: number | null) => void;
  /** What the wheel is setting — the task's name, or "Last call". */
  title: string;
  /** Where the wheel starts while there's no time set yet. */
  fallback: number;
  /** Set on a fill-grey card, where the pill's own grey would vanish: it
   * turns white instead. */
  onFill?: boolean;
  style?: StyleProp<ViewStyle>;
}

/**
 * A reminder, the way the join flow sets one: its time, or Never in the
 * muted grey with the bell struck through. A tap drops a menu from under it
 * — the time in force, "Pick a time…", Never — and picking a time raises the
 * same date-wheel drum the create form picks a start day on.
 *
 * The menu and sheet live inside the pill, so a screen with a reminder on
 * every row doesn't have to track which one is open.
 */
export function ReminderPill({ value, onChange, title, fallback, onFill, style }: ReminderPillProps) {
  const box = useRef<View>(null);
  const [menuTop, setMenuTop] = useState<number | null>(null);
  const [wheelOpen, setWheelOpen] = useState(false);
  const [pending, setPending] = useState(fallback);

  const items: PopoverItem[] = [
    ...(value !== null ? [{ label: clockTime(value), checked: true, onPress: () => {} }] : []),
    {
      label: 'Pick a time…',
      onPress: () => {
        setPending(value ?? fallback);
        setWheelOpen(true);
      },
    },
    { label: 'Never', muted: true, checked: value === null, onPress: () => onChange(null) },
  ];

  return (
    <View ref={box} collapsable={false} style={style}>
      <Pill
        label={value === null ? 'Never' : clockTime(value)}
        icon={value === null ? 'notifications-off-outline' : 'notifications-outline'}
        labelColor={value === null ? colors.inkMuted : undefined}
        trailingIcon={menuTop !== null ? 'chevron-up' : 'chevron-down'}
        tone="muted"
        size="sm"
        labelVariant="metaBold"
        onPress={() =>
          box.current?.measureInWindow((_x, y, _w, h) => setMenuTop(y + h + layout.stack))
        }
        style={[styles.pill, onFill && styles.pillOnFill, menuTop !== null && styles.pillOpen]}
      />

      <PopoverMenu
        visible={menuTop !== null}
        top={menuTop ?? 0}
        items={items}
        onDismiss={() => setMenuTop(null)}
      />

      {/* Done sets it; tapping away leaves it as it was. */}
      <BottomSheet visible={wheelOpen} onDismiss={() => setWheelOpen(false)}>
        <Text variant="sectionHeading" center>
          {title}
        </Text>
        <WheelPicker
          // Remounted on every open, so the drum starts on the time already
          // set rather than wherever it was last left.
          key={wheelOpen ? 'open' : 'closed'}
          values={QUARTER_HOURS}
          value={pending}
          onChange={setPending}
          format={clockTime}
          style={styles.wheel}
        />
        <PrimaryButton
          label="Done"
          onPress={() => {
            onChange(pending);
            setWheelOpen(false);
          }}
        />
      </BottomSheet>
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
  wheel: {
    marginVertical: layout.block,
  },
});
