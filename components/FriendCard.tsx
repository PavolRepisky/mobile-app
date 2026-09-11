import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  Text as RNText,
  TextInput,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { absoluteFill, bodyTracking, colors, fonts, radii, shadows, spacing } from '@/constants/theme';
import { REACTIONS, type Friend } from '@/data/content';
import { useApp } from '@/hooks/useAppState';
import { Avatar } from './Avatar';
import { PhotoCollage, type CollageCell } from './PhotoCollage';
import { Text } from './Text';

export interface FriendCardProps {
  friend: Friend;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

/**
 * A friend's day as one flat post — avatar, name and how long ago it went up
 * underneath, then the photo itself: their finished tasks cut into one block
 * the way the to-do tab cuts your own day. No card, no tilt, no shadow: it
 * sits directly on the page the way a feed post does, not something dropped
 * on top of it.
 *
 * Only the avatar and the name lead to their profile — the photo itself is
 * for reacting to, not tapping through. A tap on the corner icon, or a double
 * tap anywhere on the grid, slides a reaction bar out from under the toggle —
 * right to left, fused to it as one capsule rather than a separate shape;
 * tapping anywhere else on the photo dismisses it without picking one.
 * A comment field sits under the photo, the one place this app lets you talk
 * back to somebody else's day.
 */

/** How close two taps have to fall to count as one double tap — the same
 * window the "Day N" pill's back-to-today gesture uses. */
const DOUBLE_TAP_MS = 280;

/** How long the reaction row takes to grow in or shrink away — the same
 * duration the bottom sheet slides on. */
const SLIDE_MS = 220;
const easingFor = (open: boolean) =>
  open ? Easing.out(Easing.cubic) : Easing.in(Easing.cubic);

/** Size of the reaction toggle's circle. */
const REACTION_SIZE = 42;

/** Width of one emoji's tap target inside the shared reaction bar. */
const REACTION_ITEM = 44;

/** How far the bar travels as it slides in — its own full width, so it reads
 * as sliding out from under the toggle rather than fading in place. */
const REACTIONS_BAR_WIDTH = REACTIONS.length * REACTION_ITEM;

export function FriendCard({ friend, onPress, style }: FriendCardProps) {
  const { postReactions, reactToPost, friendComments, addFriendComment } = useApp();
  const [picking, setPicking] = useState(false);
  const [draft, setDraft] = useState('');
  const lastTap = useRef(0);

  const shot = friend.tasks.filter((task) => task.done);
  const picked = postReactions[friend.id] ?? null;
  const comments = friendComments[friend.id] ?? [];

  const cells: CollageCell[] = shot.map((task) => ({
    key: task.label,
    label: task.label,
    photo: task.photo,
    seed: task.photoSeed,
  }));

  // Kept mounted for the length of the exit animation, so the row shrinks
  // back into the photo instead of vanishing the moment it closes.
  const [mounted, setMounted] = useState(false);
  const slide = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (picking) setMounted(true);
    const animation = Animated.timing(slide, {
      toValue: picking ? 1 : 0,
      duration: SLIDE_MS,
      easing: easingFor(picking),
      useNativeDriver: true,
    });
    animation.start(({ finished }) => {
      if (finished && !picking) setMounted(false);
    });
    return () => animation.stop();
  }, [picking, slide]);

  const submit = () => {
    if (!draft.trim()) return;
    addFriendComment(friend.id, draft);
    setDraft('');
  };

  /** A single tap on the grid does nothing — only a second one, close behind
   * the first, opens the reaction row, the same as tapping its icon. */
  const tapPhoto = () => {
    const now = Date.now();
    if (now - lastTap.current < DOUBLE_TAP_MS) {
      lastTap.current = 0;
      setPicking((open) => !open);
      return;
    }
    lastTap.current = now;
  };

  return (
    <View style={style}>
      <Pressable
        accessibilityRole={onPress ? 'button' : undefined}
        accessibilityLabel={onPress ? `${friend.name}'s profile` : undefined}
        onPress={onPress}
        style={styles.identity}
      >
        <Avatar source={friend.avatar} size={40} />
        <View style={styles.identityText}>
          <Text variant="bodyBold">{friend.name}</Text>
          {friend.postedAgo ? (
            <Text variant="caption" color={colors.inkMuted}>
              {friend.postedAgo}
            </Text>
          ) : null}
        </View>
      </Pressable>

      {/* A plain View, not a Pressable: the reaction button and the row it
          opens both sit inside it too, and a button cannot itself contain a
          button. */}
      <View style={styles.photoWrap}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="React"
          accessibilityHint="Double tap to react"
          accessibilityState={{ expanded: picking }}
          onPress={tapPhoto}
        >
          {shot.length > 0 ? (
            <PhotoCollage layout="mosaic" radius={radii.sm} cells={cells} />
          ) : (
            <View style={styles.empty}>
              <Text variant="label" color={colors.inkMuted}>
                Nothing posted yet today
              </Text>
            </View>
          )}
        </Pressable>

        {mounted ? (
          // Covers the photo so a tap anywhere outside the bar itself — on
          // the picture, not on one of the emoji — closes it again without
          // picking anything.
          <Pressable
            style={absoluteFill}
            accessibilityLabel="Dismiss reactions"
            onPress={() => setPicking(false)}
          />
        ) : null}

        {/* The reaction toggle, pinned to the photo's corner; the bar fuses
            onto its left edge as one capsule rather than floating as its own
            shape. */}
        <View style={styles.reactionGroup}>
          {mounted ? (
            // The shadow is cast by this outer view and the slide clipped by
            // the inner one, the same split the day tile uses: a view can't
            // both clip its children and cast a shadow.
            <View style={styles.reactionsBarShadow}>
              <View style={styles.reactionsBarClip}>
                <Animated.View
                  pointerEvents={picking ? 'box-none' : 'none'}
                  style={[
                    styles.reactionsBarContent,
                    {
                      opacity: slide,
                      transform: [
                        {
                          translateX: slide.interpolate({
                            inputRange: [0, 1],
                            outputRange: [REACTIONS_BAR_WIDTH, 0],
                          }),
                        },
                      ],
                    },
                  ]}
                >
                  {REACTIONS.map((emoji) => (
                    <Pressable
                      key={emoji}
                      accessibilityRole="button"
                      accessibilityLabel={`React ${emoji}`}
                      accessibilityState={{ selected: picked === emoji }}
                      onPress={() => {
                        reactToPost(friend.id, emoji);
                        setPicking(false);
                      }}
                      style={({ pressed }) => [
                        styles.reactionItem,
                        picked === emoji && styles.reactionItemPicked,
                        pressed && styles.pressed,
                      ]}
                    >
                      <RNText style={styles.reactionEmoji}>{emoji}</RNText>
                    </Pressable>
                  ))}
                </Animated.View>
              </View>
            </View>
          ) : null}

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={picked ? `Reacted ${picked}` : 'Open reactions'}
            accessibilityState={{ expanded: picking }}
            onPress={() => setPicking((open) => !open)}
            hitSlop={8}
            style={({ pressed }) => [
              styles.reaction,
              mounted && styles.reactionJoined,
              pressed && styles.pressed,
            ]}
          >
            {picked ? (
              <RNText style={styles.reactionEmoji}>{picked}</RNText>
            ) : (
              <Ionicons name="happy-outline" size={18} color={colors.inkSoft} />
            )}
          </Pressable>
        </View>
      </View>

      <View style={styles.commentField}>
        <Ionicons
          name="chatbubble"
          size={16}
          color={colors.inkMuted}
          style={styles.commentIcon}
        />
        <TextInput
          value={draft}
          onChangeText={setDraft}
          placeholder="Add a comment..."
          placeholderTextColor={colors.inkMuted}
          returnKeyType="send"
          onSubmitEditing={submit}
          style={styles.commentInput}
        />
      </View>

      {comments.length > 0 ? (
        <View style={styles.comments}>
          {comments.map((comment, i) => (
            <Text key={i} variant="body" color={colors.inkSlate} style={styles.comment}>
              <Text variant="bodyBold">You </Text>
              {comment}
            </Text>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  identity: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  // Centred against the avatar as one two-line block, rather than the name
  // alone: the time hangs right under it with no space of its own to speak of.
  identityText: {
    marginLeft: spacing.md,
    justifyContent: 'center',
  },
  photoWrap: {
    marginTop: spacing.md,
  },
  empty: {
    height: 260,
    borderRadius: radii.sm,
    backgroundColor: colors.surfaceSunken,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reactionGroup: {
    position: 'absolute',
    right: spacing.md,
    bottom: spacing.md,
    flexDirection: 'row',
    height: REACTION_SIZE,
    alignItems: 'center',
  },
  commentField: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 44,
    marginTop: spacing.xs,
    borderRadius: radii.pill,
    backgroundColor: 'transparent',
    paddingHorizontal: spacing.lg,
  },
  commentIcon: {
    marginRight: spacing.sm,
  },
  commentInput: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 15,
    letterSpacing: bodyTracking,
    color: colors.ink,
    padding: 0,
  },
  // Solid rather than `surfaceOnPhoto`: that token's translucency blends with
  // whatever photo sits behind it, and would shift shade over different parts
  // of the mosaic — a flat fill stays identical wherever it lands, which
  // matters once it's fused to the bar beside it.
  reaction: {
    width: REACTION_SIZE,
    height: REACTION_SIZE,
    borderRadius: REACTION_SIZE / 2,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.soft,
  },
  // While the bar is out, the toggle's near corners flatten to butt against
  // it — one capsule, not a circle sitting next to a separate pill.
  reactionJoined: {
    borderTopLeftRadius: 0,
    borderBottomLeftRadius: 0,
  },
  // Casts the capsule's shadow; the radius here only has to match the clip
  // beneath it enough for the shadow's outline to follow the same curve.
  reactionsBarShadow: {
    borderTopLeftRadius: radii.pill,
    borderBottomLeftRadius: radii.pill,
    ...shadows.soft,
  },
  // Clips the sliding content to the bar's own shape: rounded where it meets
  // the open air, flat where it butts against the toggle beside it.
  reactionsBarClip: {
    width: REACTIONS_BAR_WIDTH,
    height: REACTION_SIZE,
    overflow: 'hidden',
    borderTopLeftRadius: radii.pill,
    borderBottomLeftRadius: radii.pill,
    backgroundColor: colors.surface,
  },
  reactionsBarContent: {
    flexDirection: 'row',
    alignItems: 'center',
    // Explicit, not '100%': its parent's height comes from this child (see
    // reactionsBarClip), so a percentage here has nothing to resolve against
    // and the row collapses to the text's line height, leaving it pinned to
    // the top of the pill instead of centred against the toggle beside it.
    height: REACTION_SIZE,
  },
  reactionItem: {
    width: REACTION_ITEM,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  reactionItemPicked: {
    borderRadius: radii.pill,
    backgroundColor: colors.divider,
  },
  reactionEmoji: {
    fontSize: 18,
  },
  comments: {
    marginTop: spacing.md,
    gap: spacing.xs,
  },
  comment: {
    fontSize: 15,
  },
  pressed: {
    opacity: 0.8,
  },
});

export default FriendCard;
