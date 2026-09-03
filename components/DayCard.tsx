import { Image } from 'expo-image';
import { forwardRef, useState } from 'react';
import {
  StyleSheet,
  View,
  type ImageSourcePropType,
  type StyleProp,
  type View as RNView,
  type ViewStyle,
} from 'react-native';

import {
  absoluteFill,
  colors,
  radii,
  spacing,
  type as typeScale,
} from '@/constants/theme';
import { longDate } from '@/lib/format';
import { PhotoCollage, type CollageCell } from './PhotoCollage';
import { StickerText } from './StickerText';
import { Text } from './Text';

/**
 * The day, composed as one page to be posted.
 *
 * This is the app's face on other people's feeds, so it is deliberately not a
 * grid of thumbnails under a caption: it is a pile of instant prints thrown
 * down over a photograph of the challenge itself, with the day die-cut over
 * the top of them. What makes it ours is that stack — a display word outlined
 * in white, over hand-laid prints, over the challenge — and it is what a
 * stranger is meant to recognise the second time.
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
 * How far the sticker's outline stands off its letterforms. Heavy on purpose:
 * this is the one thing on the card that has to survive being seen at
 * thumbnail size in somebody's feed, and a thin outline is the first thing to
 * disappear when the whole card is an inch wide.
 */
const STICKER_STROKE = 15;

/** Degrees the day is applied at. A sticker is never put on square. */
const STICKER_TILT = -7;

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
  /**
   * The challenge's own photograph, behind everything. The prints are laid on
   * it the way they would be laid on a table, which is what the card is a
   * picture of.
   */
  background?: ImageSourcePropType | null;
  style?: StyleProp<ViewStyle>;
}

/**
 * `ref` is forwarded so the export can point `captureRef` straight at the
 * card, rather than at a wrapper whose padding would land in the PNG.
 */
export const DayCard = forwardRef<RNView, DayCardProps>(function DayCard(
  { day, date, cells, challengeName, handle, background, style },
  ref,
) {
  const [height, setHeight] = useState(0);
  const [headerHeight, setHeaderHeight] = useState(0);

  // The card's height is fixed by its aspect, so the pile is handed the room
  // left over and fits itself into it — drawn narrower where a full day would
  // overrun, full width where a quiet one leaves the space going spare.
  const room = height - PAD * 2 - headerHeight - FOOTER_HEIGHT - PRINTS_GAP * 2;

  return (
    <View
      ref={ref}
      style={[styles.card, style]}
      onLayout={(e) => setHeight(e.nativeEvent.layout.height)}
    >
      {background ? (
        <Image
          source={background}
          style={absoluteFill}
          contentFit="cover"
          // Blurred in the image rather than under a `BlurView`: a native blur
          // is a live effect the snapshot does not always catch, and a card
          // that exports without its background is worse than one without a
          // blur. This bakes in, so what is on screen is what is captured.
          blurRadius={18}
        />
      ) : null}

      {/* The challenge is the ground, not the subject: held back far enough
          that white type reads over whatever it happens to be a picture of. */}
      <View style={styles.wash} />

      <View onLayout={(e) => setHeaderHeight(e.nativeEvent.layout.height)}>
        <Text variant="stamp" color={colors.onMediaSoft}>
          {longDate(date).toUpperCase()}
        </Text>
      </View>

      {/* Centred in what is left, so a short day sits in the middle of the
          page rather than hanging off the heading. */}
      <View style={styles.prints}>
        <PhotoCollage cells={cells} maxHeight={room > 0 ? room : undefined} />
      </View>

      <View style={styles.footer}>
        <Text variant="stamp" color={colors.inkInverse}>
          {challengeName.toUpperCase()}
        </Text>
        {handle ? (
          <Text variant="stamp" color={colors.onMediaSoft}>
            {handle.toUpperCase()}
          </Text>
        ) : null}
      </View>

      {/* Applied last and over everything, the way a sticker goes on: it laps
          the prints rather than being given a gap of its own. */}
      <View style={styles.sticker} pointerEvents="none">
        <StickerText
          size="headline"
          stroke={STICKER_STROKE}
          tilt={STICKER_TILT}
        >
          {`Day ${day}`}
        </StickerText>
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
    // Behind the challenge photograph rather than instead of it: the warm
    // shell is what shows while the image is still decoding, and what shows
    // for a challenge that has no photograph of its own.
    backgroundColor: colors.background,
    borderRadius: radii.card,
    padding: PAD,
    justifyContent: 'space-between',
    overflow: 'hidden',
  },
  wash: {
    ...absoluteFill,
    backgroundColor: colors.scrim,
  },
  sticker: {
    // Dead centre, over the whole pile. The prints are the record and the day
    // is the headline on it, so the day sits on top of them rather than in a
    // margin beside them.
    ...absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
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
