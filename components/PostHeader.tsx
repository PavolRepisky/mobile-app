import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, layout, radii, spacing } from '@/constants/theme';
import { type AvatarSource } from './Avatar';
import { TaskRing } from './TaskRing';
import { Text } from './Text';

/** The poster's face beside their name — the height of a reaction pill, so
 * the header and the action row under a post sit on one scale. */
const POST_AVATAR = 32;
/** That face in My Profile's ring: the photo stays at `POST_AVATAR`, and the
 * band and its gap go around it in the profile's own proportions (6 and 5 on
 * a 120 face). */
const POST_RING = Math.round(POST_AVATAR * (1 + (2 * (6 + 5)) / 120));
/** The drawn dot between the day and the challenge. */
const SUBTITLE_DOT = 3;

/** "9:40pm" as "9:40 PM" — a space before the half of the day, in capitals,
 * however the time was stored. */
const displayTime = (time: string) =>
  time.trim().replace(/\s*([ap])\.?m\.?$/i, (_, half: string) => ` ${half.toUpperCase()}M`);

export interface PostHeaderProps {
  avatar: AvatarSource;
  name: string;
  /** When the day was posted, or when the photo on show was taken. */
  time?: string;
  day: number;
  challengeName: string;
  /** The day's tasks, done and all — what the ring is drawn from. */
  done?: number;
  total?: number;
  /** Set over a photo: white type, the softer white for the detail. */
  onMedia?: boolean;
  onPressProfile?: () => void;
  onPressChallenge?: () => void;
  /** Drawn at the far end of the row — Members' Add, a story's close. */
  accessory?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

/**
 * Who posted a day and which day it was: the face, the name and the time,
 * then "Day N · challenge" under them. The one header a post wears wherever
 * it's met — Community, My days, a story — so it only ever changes here.
 *
 * The face and the name lead to the profile; the challenge leads to its feed
 * — separate tap targets, so neither is nested inside the other.
 */
export function PostHeader({
  avatar,
  name,
  time,
  day,
  challengeName,
  done = 0,
  total = 0,
  onMedia,
  onPressProfile,
  onPressChallenge,
  accessory,
  style,
}: PostHeaderProps) {
  const ink = onMedia ? colors.inkInverse : colors.ink;
  const soft = onMedia ? colors.onMediaSoft : colors.inkMuted;

  const challengeLink = (
    <Text
      variant="meta"
      color={soft}
      numberOfLines={1}
      accessibilityRole={onPressChallenge ? 'button' : undefined}
      accessibilityLabel={onPressChallenge ? `Open ${challengeName}` : undefined}
      onPress={onPressChallenge}
      // Plain, not underlined: the day leads, and the challenge is the same
      // one on every post.
      style={styles.shrink}
    >
      {challengeName}
    </Text>
  );
  const dayLabel = (
    <Text variant="meta" color={soft}>
      Day {day}
    </Text>
  );

  return (
    <View style={[styles.row, style]}>
      <Pressable
        accessibilityRole={onPressProfile ? 'button' : undefined}
        accessibilityLabel={onPressProfile ? `${name}'s profile` : undefined}
        onPress={onPressProfile}
        style={({ pressed }) => pressed && onPressProfile && styles.pressed}
      >
        {/* The day's own ring, the one My Profile draws: a segment per
            task, the done ones in the accent — so each day says at a
            glance how full it was. */}
        <TaskRing
          avatar={avatar}
          done={done}
          total={total}
          size={POST_RING}
          badge={false}
          look="profile"
        />
      </Pressable>

      <View style={styles.text}>
        <View style={styles.line}>
          <Text
            variant="itemTitle"
            color={ink}
            numberOfLines={1}
            accessibilityRole={onPressProfile ? 'button' : undefined}
            accessibilityLabel={onPressProfile ? `${name}'s profile` : undefined}
            onPress={onPressProfile}
            style={styles.shrink}
          >
            {name}
          </Text>
          {time ? (
            <Text variant="meta" color={soft}>
              {displayTime(time)}
            </Text>
          ) : null}
        </View>
        {/* The day leads: it's what tells one post from the next. */}
        <View style={styles.line}>
          {dayLabel}
          <View style={[styles.dot, { backgroundColor: soft }]} />
          {challengeLink}
        </View>
      </View>

      {accessory}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  text: {
    flex: 1,
    marginLeft: layout.inline,
  },
  // A bare step rather than a `layout` role: the air either side of the
  // separator dot is an optical call — close enough that the day, the dot
  // and the challenge read as one line of detail.
  line: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + spacing.xs / 2,
  },
  // Gives way before the time or the day does, so a long name or challenge
  // ellipsizes rather than pushing the rest off the row.
  shrink: {
    flexShrink: 1,
  },
  // A drawn dot rather than a "·" glyph, so its size and the gap either side
  // are its own to set, not whatever a character happens to render at.
  dot: {
    width: SUBTITLE_DOT,
    height: SUBTITLE_DOT,
    borderRadius: radii.pill,
  },
  pressed: {
    opacity: 0.85,
  },
});

export default PostHeader;
