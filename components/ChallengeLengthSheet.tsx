import { useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';

import { layout, screenPadding } from '@/constants/theme';
import { addDays, longDate } from '@/lib/format';
import { BottomSheet } from './BottomSheet';
import { PrimaryButton } from './Buttons';
import { DateRange } from './DateRange';
import { RulerSlider } from './RulerSlider';
import { Text } from './Text';

/** 7 to 120 days, in single-day steps. */
const MIN_DAYS = 7;
const MAX_DAYS = 120;
const OPTIONS = MAX_DAYS - MIN_DAYS + 1;

const indexFor = (days: number) =>
  Math.min(Math.max(days - MIN_DAYS, 0), OPTIONS - 1);

export interface ChallengeLengthSheetProps {
  visible: boolean;
  onDismiss: () => void;
  /** The create form's draft: its length so far, and the Day 1 the range
   * under the ruler counts from. */
  days: number;
  startDate: Date;
  /** Hands the pick back on "Done". */
  onConfirm: (days: number) => void;
}

/**
 * The challenge-length picker on the create form. The ruler is a draft until
 * "Done": leaving by the grabber or the backdrop keeps the length the form
 * already had.
 */
export function ChallengeLengthSheet({
  visible,
  onDismiss,
  days: totalDays,
  startDate,
  onConfirm: setTotalDays,
}: ChallengeLengthSheetProps) {
  const [index, setIndex] = useState(() => indexFor(totalDays));
  // The sheet stays mounted through its exit animation, so the ruler holds
  // whatever it was last scrolled to. Opening counts as a fresh start: the
  // draft returns to what is saved, and the key remounts the ruler there.
  const [opened, setOpened] = useState(0);

  useEffect(() => {
    if (!visible) return;
    setIndex(indexFor(totalDays));
    setOpened((n) => n + 1);
  }, [visible, totalDays]);

  const days = MIN_DAYS + index;
  const end = addDays(startDate, days - 1);

  return (
    <BottomSheet visible={visible} onDismiss={onDismiss}>
      <Text variant="sectionHeading" center>
        Length
      </Text>

      <RulerSlider
        key={opened}
        length={OPTIONS}
        index={index}
        onChange={setIndex}
        readout={`${days} days`}
        caption={
          <DateRange
            from={longDate(startDate)}
            to={longDate(end)}
            variant="bodyBold"
          />
        }
        style={styles.ruler}
      />

      <PrimaryButton
        label="Done"
        onPress={() => {
          setTotalDays(days);
          onDismiss();
        }}
      />
    </BottomSheet>
  );
}

// Built like every other picker sheet — the year on My Profile, a new
// challenge's start day and lives: its name as a section heading, the
// picker, then Done across the foot.
const styles = StyleSheet.create({
  // The ticks run to both edges of the sheet rather than stopping at its
  // padding, so the ruler reads as something the sheet is a window onto.
  ruler: {
    marginVertical: layout.block,
    marginHorizontal: -screenPadding,
  },
});

export default ChallengeLengthSheet;
