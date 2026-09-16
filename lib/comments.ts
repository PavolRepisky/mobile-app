import type { CommentEntry } from '@/components/CommentsSheet';
import type { FriendComment } from '@/hooks/useAppState';

/** A comment node the account's own replies can still be pushed into —
 * `replies` mutable and always present, unlike the public `CommentEntry`. */
interface MutableComment {
  id: string;
  author: string;
  avatar: CommentEntry['avatar'];
  text: string;
  replies: MutableComment[];
}

const cloneThread = (comments: readonly CommentEntry[]): MutableComment[] =>
  comments.map((comment) => ({ ...comment, replies: cloneThread(comment.replies ?? []) }));

/** Every node in the thread, however deep, keyed by id — so a reply to a
 * reply to a reply still finds the exact comment it was aimed at. */
function indexThread(nodes: readonly MutableComment[], into: Map<string, MutableComment>) {
  for (const node of nodes) {
    into.set(node.id, node);
    indexThread(node.replies, into);
  }
}

const freezeThread = (nodes: readonly MutableComment[]): CommentEntry[] =>
  nodes.map((node) => ({ ...node, replies: freezeThread(node.replies) }));

/** Total size of a thread, replies at every depth included. */
export const countComments = (comments: readonly CommentEntry[]): number =>
  comments.reduce((n, comment) => n + 1 + countComments(comment.replies ?? []), 0);

/**
 * Merges a post's seeded comments with the signed-in account's own replies —
 * `useAppState`'s `friendComments`, the only voice it ever holds, this being
 * a single-player app. Each own reply nests under the exact comment it
 * answered, seeded or the account's own, at whatever depth that sits: a
 * reply to a reply to a reply is still findable by id, not flattened to the
 * top of the thread.
 */
export function mergeCommentThread(
  seeded: readonly CommentEntry[],
  own: readonly FriendComment[],
  ownerAvatar: CommentEntry['avatar'],
): CommentEntry[] {
  const tree = cloneThread(seeded);
  const byId = new Map<string, MutableComment>();
  indexThread(tree, byId);

  for (const comment of own) {
    const node: MutableComment = {
      id: comment.id,
      author: 'You',
      avatar: ownerAvatar,
      text: comment.text,
      replies: [],
    };
    const parent = comment.parentId ? byId.get(comment.parentId) : undefined;
    if (parent) {
      parent.replies.push(node);
    } else {
      tree.push(node);
    }
    byId.set(comment.id, node);
  }

  return freezeThread(tree);
}
