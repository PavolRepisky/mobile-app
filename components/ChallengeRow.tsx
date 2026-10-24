import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Pressable, Share, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, layout, radii, spacing } from '@/constants/theme';
import type { ChallengeCard } from '@/hooks/useChallengeCards';
import { DAY_MS } from '@/lib/round';
import { LongPressMenu } from './LongPressMenu';
import { Text } from './Text';

/** The row's height, sampled off the canvas: a date block and a two-line name
 * with air above and below, so seven rows fill a phone screen. */
const ROW_HEIGHT = 72;
/** The date block: a calendar leaf, a touch taller than it is wide. */
const DATE_WIDTH = 52;
const DATE_HEIGHT = 56;
/** The photo leading a row, the same size as the leaf at its end. */
const THUMB = 52;
/** Under four weeks out, a weekday says "when" better than a month does —
 * past that, the month is what people plan around. */
const WEEKDAY_HORIZON = 28;

const WEEKDAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

export interface ChallengeRowProps {
  card: ChallengeCard;
  /** The grey line under the name — each list picks what matters there. */
  detail: string;
  /** A third line in ink: the task a search found this challenge by. */
  note?: string;
  /** `false` leaves the calendar leaf off a joinable round, for a place that
   * already says when in its grey line — the Starting soon slider. */
  showDate?: boolean;
  /** Up to three of its photos in the thumb, butted together, rather than
   * the first alone — for Discover, where the rows sit under a cover drawn
   * the same way. */
  mosaic?: boolean;
  /** What the row ends on in place of its date or standing — Tasks' row for
   * the era you're on ends on the lives you have left and a chevron. */
  trailing?: React.ReactNode;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
}

/**
 * One challenge in a list: its photo first, so a list reads as the
 * challenges themselves, then its name, and at the end where it stands. A
 * round you can still join ends on its start date as a calendar leaf,
 * because the date is the decision — everyone starts together, and joining
 * shuts on the day. One already under way or over ends on Closed or
 * Finished in the same place.
 */
export function ChallengeRow({
  card,
  detail,
  note,
  showDate = true,
  mosaic,
  trailing,
  onPress,
  style,
}: ChallengeRowProps) {
  const joinable = card.phase === 'upcoming' && card.start;

  return (
    // Held, an era offers what a tap would and passing it on.
    <LongPressMenu
      style={style}
      actions={[
        { label: 'Open', icon: 'eye-outline', onPress },
        {
          label: 'Share',
          icon: 'share-outline',
          onPress: () => {
            Share.share({ message: `Join me on ${card.title} on Selfera.` }).catch(() => {});
          },
        },
      ]}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${card.title}, ${card.statusLabel}`}
        onPress={onPress}
        style={({ pressed }) => [styles.row, pressed && styles.pressed]}
      >
        {mosaic ? (
          <ChallengeMosaic photos={card.photos} style={styles.thumb} />
        ) : (
          <Image source={card.photos[0]} style={styles.thumb} contentFit="cover" />
        )}
        <View style={styles.text}>
          <Text variant="copyBold" numberOfLines={1}>
            {card.title}
          </Text>
          <Text variant="meta" color={colors.inkMuted} numberOfLines={1}>
            {detail}
          </Text>
          {note ? (
            <Text variant="badge" numberOfLines={1}>
              {note}
            </Text>
          ) : null}
        </View>
        {trailing ? (
          trailing
        ) : joinable ? (
          showDate ? <DateLeaf date={card.start!} /> : null
        ) : card.mine ? (
          <Text variant="metaBold">You're in</Text>
        ) : (
          <View style={styles.closed}>
            <Ionicons
              name={card.phase === 'finished' ? 'flag' : 'lock-closed'}
              size={spacing.md}
              color={colors.inkMuted}
            />
            <Text variant="badge" color={colors.inkMuted}>
              {card.phase === 'finished' ? 'Finished' : 'Closed'}
            </Text>
          </View>
        )}
      </Pressable>
    </LongPressMenu>
  );
}

/**
 * The usual grey line for a row: how long and how much a day for a round you
 * can join, how it's going for one under way. `withTopic` leads with the
 * topic, for a list that mixes them; a topic's own page leaves it off and
 * says how many have joined instead.
 */
export function challengeDetail(card: ChallengeCard, withTopic: boolean): string {
  const topic = withTopic ? card.category : undefined;
  const members = card.members?.toLocaleString('en-US');
  const parts =
    card.phase === 'active'
      ? [
          card.statusLabel,
          card.stillGoing !== undefined
            ? `${card.stillGoing.toLocaleString('en-US')} still going`
            : undefined,
        ]
      : card.phase === 'finished'
        ? [topic, `${card.days} days`, members ? `${members} took part` : undefined]
        : [
            topic,
            `${card.days} days`,
            card.tasksCount === 1 ? '1 task a day' : `${card.tasksCount} tasks a day`,
            !withTopic && members ? `${members} joined` : undefined,
          ];
  return parts.filter(Boolean).join(' · ');
}

/** One large and two beside it: more and each turns too small to make out. */
const MOSAIC_PHOTOS = 3;

/**
 * An era's photos butted together with no seam between them, so they read
 * as one picture of what its days look like: the first large on the left,
 * the next two stacked beside it; with two, side by side; with one, alone.
 * Fills whatever box `style` gives it — a row's thumb, Discover's cover.
 */
export function ChallengeMosaic({
  photos,
  style,
}: {
  photos: ChallengeCard['photos'];
  style?: StyleProp<ViewStyle>;
}) {
  const [lead, ...others] = photos.slice(0, MOSAIC_PHOTOS);
  return (
    <View style={[styles.mosaic, style]}>
      <Image source={lead} style={styles.mosaicCell} contentFit="cover" />
      {others.length ? (
        <View style={styles.mosaicCell}>
          {others.map((photo, i) => (
            <Image key={i} source={photo} style={styles.mosaicCell} contentFit="cover" />
          ))}
        </View>
      ) : null}
    </View>
  );
}

/** A calendar leaf: the weekday (or, further out, the month) over the day. */
function DateLeaf({ date }: { date: Date }) {
  const soon = (date.getTime() - Date.now()) / DAY_MS < WEEKDAY_HORIZON;
  return (
    <View style={styles.leaf}>
      <Text variant="badge" color={colors.inkMuted}>
        {soon ? WEEKDAYS[date.getDay()] : MONTHS[date.getMonth()]}
      </Text>
      <Text variant="sectionHeading">{date.getDate()}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: ROW_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    gap: layout.inline,
  },
  leaf: {
    width: DATE_WIDTH,
    height: DATE_HEIGHT,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceSunken,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumb: {
    width: THUMB,
    height: THUMB,
    borderRadius: radii.md,
  },
  // Clipped, so the photos take the box's rounded corners.
  mosaic: {
    flexDirection: 'row',
    overflow: 'hidden',
  },
  mosaicCell: {
    flex: 1,
  },
  text: {
    flex: 1,
    gap: layout.line,
  },
  closed: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: layout.line,
  },
  pressed: {
    opacity: 0.85,
  },
});

export default ChallengeRow;
