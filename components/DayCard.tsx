import { forwardRef, useState } from 'react';
import {
  StyleSheet,
  View,
  type StyleProp,
  type View as RNView,
  type ViewStyle,
} from 'react-native';

import {
  colors,
  radii,
  spacing,
  type as typeScale,
} from '@/constants/theme';
import { longDate, numberToWord } from '@/lib/format';
import { Headline } from './Headline';
import {
  PhotoCollage,
  collageColumns,
  collageHeight,
  type CollageCell,
} from './PhotoCollage';
import { Text } from './Text';

/**
 * The day, composed as one page to be posted.
 *
 * This is the app's face on other people's feeds, so it is deliberately not a
 * grid of thumbnails under a caption: it is the scatter of prints the To-do
 * page already lays out, on the warm paper, under a Playfair "day five". What
 * makes it ours is that pairing — a display italic over hand-laid photographs
 * — and it is what a stranger is meant to recognise the second time.
 *
 * Everything inside is laid out in points at one size and captured scaled up,
 * so there is one composition rather than a screen one and an export one that
 * drift apart.
 */

/** 4:5 — the tallest crop a feed post keeps without cutting into it. */
export const DAY_CARD_ASPECT = 4 / 5;

/** 9:16, for the ink ground a Story wants the card centred on. */
export const DAY_CARD_STORY_ASPECT = 9 / 16;

/**
 * The rule closing the card off. Drawn rather than a hairline, the way the
 * reference does it: a hairline reads as a table, a drawn rule as a stamp.
 */
const RULE = 2;

/**
 * How far the prints may be blown up to fill the page. The scatter's natural
 * heights are sized for the To-do list, where the block is one thing on a long
 * screen; on a card they leave a quiet day sitting in a pool of empty paper.
 * Capped rather than free: past about this the prints stop reading as a
 * handful of photographs laid down and start reading as one poster.
 */
const MAX_SCALE = 1.8;

/** The card's own margin. Named because the prints measure back through it. */
const PAD = spacing['2xl'];

/** Air above and below the prints, holding them off the heading and the rule. */
const PRINTS_GAP = spacing.md;

/** The rule, the gap over it, and the one line of stamp under it. */
const FOOTER_HEIGHT = RULE + spacing.md + typeScale.stamp.lineHeight;

export interface DayCardProps {
  day: number;
  /** The calendar date the day fell on — a card outlives the challenge. */
  date: Date;
  /** Only what was actually photographed. A card is a record, not a checklist. */
  cells: readonly CollageCell[];
  /** Bottom-left stamp, e.g. "Her 75 Challenge". */
  challengeName: string;
  /** Bottom-right stamp, e.g. "@julia_575". */
  handle?: string;
  style?: StyleProp<ViewStyle>;
}

/**
 * `ref` is forwarded so the export can point `captureRef` straight at the
 * card, rather than at a wrapper whose padding would land in the PNG.
 */
export const DayCard = forwardRef<RNView, DayCardProps>(function DayCard(
  { day, date, cells, challengeName, handle, style },
  ref,
) {
  const [height, setHeight] = useState(0);
  const [headerHeight, setHeaderHeight] = useState(0);

  // Taken from the collage rather than restated: the two have to agree, or the
  // block is measured at one width and laid out at another.
  const columns = collageColumns(cells.length);

  // The card's height is fixed by its aspect, so the prints scale to the room
  // left over rather than the card growing to fit them — down where a full day
  // would overrun it, up where a quiet one would rattle around inside it.
  const room = height - PAD * 2 - headerHeight - FOOTER_HEIGHT - PRINTS_GAP * 2;
  const natural = collageHeight(cells, columns, 1);
  const scale =
    room > 0 && natural > 0 ? Math.min(MAX_SCALE, room / natural) : 1;

  return (
    <View
      ref={ref}
      style={[styles.card, style]}
      onLayout={(e) => setHeight(e.nativeEvent.layout.height)}
    >
      <View onLayout={(e) => setHeaderHeight(e.nativeEvent.layout.height)}>
        {/* Bold rather than black — `size="title"` steps the weight down for
            exactly this reason. `*day*` takes the italic of that same bold. */}
        <Headline size="title">{`*day* ${numberToWord(day)}`}</Headline>

        <Text variant="caption" color={colors.inkMuted} center style={styles.date}>
          {longDate(date)}
        </Text>
      </View>

      {/* Centred in what is left, so a short day sits in the middle of the
          page rather than hanging off the heading. */}
      <View style={styles.prints}>
        <PhotoCollage cells={cells} columns={columns} scale={scale} />
      </View>

      <View style={styles.footer}>
        <Text variant="stamp" color={colors.inkSoft}>
          {challengeName.toUpperCase()}
        </Text>
        {handle ? (
          <Text variant="stamp" color={colors.inkMuted}>
            {handle.toUpperCase()}
          </Text>
        ) : null}
      </View>
    </View>
  );
});

/**
 * The card centred on the ground a Story wants: the warm page floating on
 * near-black. The ground is what makes the photographs carry at thumbnail
 * size, and it is the half of the composition people recognise scrolling past.
 */
export const DayCardStory = forwardRef<
  RNView,
  DayCardProps & { groundStyle?: StyleProp<ViewStyle> }
>(function DayCardStory({ groundStyle, ...card }, ref) {
  return (
    <View ref={ref} style={[styles.ground, groundStyle]}>
      <DayCard {...card} style={styles.onGround} />
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    aspectRatio: DAY_CARD_ASPECT,
    // The warm shell rather than white: the card is a page out of the app, and
    // in a feed of white cards the warm one reads as somewhere rather than as
    // a template.
    backgroundColor: colors.background,
    borderRadius: radii.card,
    padding: PAD,
    justifyContent: 'space-between',
    overflow: 'hidden',
  },
  date: {
    marginTop: spacing.xs,
  },
  prints: {
    flex: 1,
    justifyContent: 'center',
    paddingVertical: PRINTS_GAP,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.md,
    borderTopWidth: RULE,
    borderTopColor: colors.dividerStrong,
  },
  ground: {
    aspectRatio: DAY_CARD_STORY_ASPECT,
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing['2xl'],
  },
  onGround: {
    width: '100%',
  },
});

export default DayCard;
