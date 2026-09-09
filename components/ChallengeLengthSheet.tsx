import { useEffect, useState } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';

import { radii, screenPadding, spacing } from '@/constants/theme';
import { useApp } from '@/hooks/useAppState';
import { addDays, longDate } from '@/lib/format';
import { BottomSheet } from './BottomSheet';
import { PrimaryButton } from './Buttons';
import { DateRange } from './DateRange';
import { Headline } from './Headline';
import { RulerSlider } from './RulerSlider';

/**
 * 7 to 120 days, in single-day steps. Exported so the create-challenge form
 * can drive the same ruler over the same range without a second copy of it.
 */
export const MIN_DAYS = 7;
export const MAX_DAYS = 120;
const OPTIONS = MAX_DAYS - MIN_DAYS + 1;

/**
 * Share of the screen the sheet stands at whatever its content measures. The
 * picker is one control with a lot of air around it, so left to its own
 * content it comes up shorter than it should.
 */
const MIN_HEIGHT_RATIO = 0.78;

const indexFor = (days: number) =>
  Math.min(Math.max(days - MIN_DAYS, 0), OPTIONS - 1);

export interface ChallengeLengthSheetProps {
  visible: boolean;
  onDismiss: () => void;
}

/**
 * The challenge-length picker, reached from Duration in settings. The ruler is
 * a draft until "Continue": leaving by the grabber or the backdrop keeps the
 * length that was already saved.
 */
export function ChallengeLengthSheet({
  visible,
  onDismiss,
}: ChallengeLengthSheetProps) {
  const { height } = useWindowDimensions();
  const { startDate, totalDays, setTotalDays } = useApp();
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
    <BottomSheet
      visible={visible}
      onDismiss={onDismiss}
      style={{ minHeight: Math.round(height * MIN_HEIGHT_RATIO) }}
    >
      <Headline size="headline" weight={700} style={styles.title}>
        {'Set challenge\nlength?'}
      </Headline>

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

      {/* Takes whatever the minimum height leaves over, so the button rides
          the bottom edge instead of trailing the ruler. */}
      <View style={styles.spacer} />

      <PrimaryButton
        label="Continue"
        onPress={() => {
          setTotalDays(days);
          onDismiss();
        }}
        fullWidth={false}
        style={styles.cta}
      />
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  // The gaps are wide on purpose: the picker is the whole of the sheet, and
  // the air either side of the ruler is what gives it its height.
  title: {
    marginTop: spacing.xl,
  },
  // The ticks run to both edges of the sheet rather than stopping at its
  // padding, so the ruler reads as something the sheet is a window onto.
  ruler: {
    marginTop: spacing['4xl'],
    marginHorizontal: -screenPadding,
  },
  spacer: {
    flex: 1,
  },
  cta: {
    alignSelf: 'center',
    minWidth: 240,
    // A floor under the spacer, for a screen short enough to leave none.
    marginTop: spacing['3xl'],
    // Squared off against the app's usual fully-round buttons, to sit as a
    // panel action rather than as the page's own call to action.
    borderRadius: radii.lg,
  },
});

export default ChallengeLengthSheet;
