import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  TextInput,
  View,
  useWindowDimensions,
  type TextInput as RNTextInput,
} from 'react-native';

import { bodyTracking, colors, fonts, radii, spacing } from '@/constants/theme';
import { Avatar, type AvatarSource } from './Avatar';
import { BottomSheet } from './BottomSheet';
import { Text } from './Text';

export interface CommentEntry {
  id: string;
  author: string;
  avatar: AvatarSource;
  text: string;
  /** A reply can itself carry replies — the thread nests as deep as
   * whoever's replying takes it, not just the one level under a top-level
   * comment. */
  replies?: readonly CommentEntry[];
}

export interface CommentsSheetProps {
  visible: boolean;
  onDismiss: () => void;
  comments: readonly CommentEntry[];
  draft: string;
  onChangeDraft: (text: string) => void;
  /** `parentId` is the exact comment being replied to, at whatever depth it
   * sits, or `null` for a fresh top-level comment of the account's own. */
  onSubmit: (parentId: string | null) => void;
  /** Whoever is typing — the signed-in account's own circle on the composer. */
  composerAvatar: AvatarSource;
}

/** Share of the screen the sheet stands at — tall enough for a real thread,
 * short of the `tall` sheets elsewhere so the post it belongs to still shows
 * through above it, the way Instagram's own comment sheet leaves the photo's
 * top edge in view. */
const HEIGHT_RATIO = 0.7;

/** Indent per level of nesting — `spacing.lg` stepped out for every reply a
 * thread goes, so depth reads at a glance instead of needing the eye to
 * count avatars back to the top-level comment. */
const INDENT = spacing.lg;

interface ReplyTarget {
  id: string;
  author: string;
}

interface Row {
  key: string;
  comment: CommentEntry;
  /** How many replies deep this row sits — 0 for a top-level comment. */
  depth: number;
}

const rowsFor = (comments: readonly CommentEntry[], depth = 0): Row[] =>
  comments.flatMap((comment) => [
    { key: comment.id, comment, depth },
    ...rowsFor(comment.replies ?? [], depth + 1),
  ]);

/**
 * A post's comments, reached by tapping its comment icon rather than shown on
 * the post itself — the thread and the composer both live only here, the way
 * Instagram's own sheet works. Opens with the keyboard already up: replying
 * is the reason this sheet gets opened, so it asks for the reply straight
 * away rather than waiting for a second tap on the field.
 */
export function CommentsSheet({
  visible,
  onDismiss,
  comments,
  draft,
  onChangeDraft,
  onSubmit,
  composerAvatar,
}: CommentsSheetProps) {
  const { height } = useWindowDimensions();
  const input = useRef<RNTextInput>(null);
  const [replyTarget, setReplyTarget] = useState<ReplyTarget | null>(null);

  useEffect(() => {
    if (visible) {
      input.current?.focus();
    } else {
      // A sheet reopened later starts over, not mid-reply to whatever was
      // last tapped.
      setReplyTarget(null);
    }
  }, [visible]);

  const startReply = (target: ReplyTarget) => {
    setReplyTarget(target);
    input.current?.focus();
  };

  const submit = () => {
    onSubmit(replyTarget?.id ?? null);
    setReplyTarget(null);
  };

  return (
    <BottomSheet
      visible={visible}
      onDismiss={onDismiss}
      // Instagram's own composer sits flush against the edge it clears —
      // the safe area or the keyboard — rather than the sheet's usual
      // roomy distance short of it.
      bottomGap={0}
      style={{ height: Math.round(height * HEIGHT_RATIO) }}
    >
      <Text variant="cardTitleBold" center style={styles.title}>
        Comments
      </Text>

      <FlatList
        data={rowsFor(comments)}
        keyExtractor={(row) => row.key}
        style={styles.list}
        contentContainerStyle={styles.listContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <Text variant="body" color={colors.inkMuted} center style={styles.empty}>
            No comments yet — be the first to say something.
          </Text>
        }
        renderItem={({ item }) => (
          <View style={[styles.row, item.depth > 0 && { marginLeft: item.depth * INDENT }]}>
            <Avatar source={item.comment.avatar} size={item.depth > 0 ? 22 : 28} />
            <View style={styles.rowBody}>
              <Text variant="body" color={colors.inkSlate}>
                <Text variant="bodyBold">{item.comment.author} </Text>
                {item.comment.text}
              </Text>
              <Pressable
                accessibilityRole="button"
                onPress={() => startReply({ id: item.comment.id, author: item.comment.author })}
                hitSlop={spacing.sm}
                style={styles.replyButton}
              >
                <Text variant="label" color={colors.inkMuted}>
                  Reply
                </Text>
              </Pressable>
            </View>
          </View>
        )}
      />

      {replyTarget ? (
        <View style={styles.replyBanner}>
          <Text variant="label" color={colors.inkMuted}>
            Replying to {replyTarget.author}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Cancel reply"
            onPress={() => setReplyTarget(null)}
            hitSlop={spacing.sm}
          >
            <Ionicons name="close" size={16} color={colors.inkMuted} />
          </Pressable>
        </View>
      ) : null}

      <View style={styles.composer}>
        <Avatar source={composerAvatar} size={28} />
        <View style={styles.field}>
          <TextInput
            ref={input}
            value={draft}
            onChangeText={onChangeDraft}
            placeholder={replyTarget ? `Reply to ${replyTarget.author}...` : 'Add a comment...'}
            placeholderTextColor={colors.inkMuted}
            returnKeyType="send"
            onSubmitEditing={submit}
            style={styles.input}
          />
        </View>
        {draft.trim() ? (
          <Pressable accessibilityRole="button" onPress={submit} hitSlop={spacing.sm}>
            <Text variant="bodyBold" color={colors.inkSlate}>
              Post
            </Text>
          </Pressable>
        ) : null}
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  // A true Bold cut rather than `cardTitle`'s Semi — the one thing this
  // sheet asks to carry more weight than every other small heading in it.
  title: {
    marginBottom: spacing.lg,
  },
  // Takes the height the title and composer leave, so the thread scrolls
  // inside the fixed sheet rather than pushing the composer off the bottom
  // of it.
  list: {
    flex: 1,
  },
  listContent: {
    gap: spacing.md,
  },
  empty: {
    marginTop: spacing['3xl'],
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  rowBody: {
    flex: 1,
  },
  replyButton: {
    marginTop: spacing.xs / 2,
    alignSelf: 'flex-start',
  },
  replyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.sm,
  },
  // Padded the same top and bottom, so the field sits centred in its own
  // row rather than crowding one edge of it — the safe-area/keyboard
  // clearance is separate, reserved space past this, not part of it.
  composer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.divider,
  },
  // The pill field itself, `SearchBar`'s own cut — sunken on the sheet's
  // white the way Instagram's own comment field sits on its feed, rather
  // than a bare line with nothing marking where the tap target is.
  field: {
    flex: 1,
    height: 36,
    justifyContent: 'center',
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceSunken,
    paddingHorizontal: spacing.md,
  },
  input: {
    fontFamily: fonts.body,
    fontSize: 15,
    letterSpacing: bodyTracking,
    color: colors.ink,
    padding: 0,
  },
});

export default CommentsSheet;
