import { Ionicons } from '@expo/vector-icons';
import { useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Keyboard,
  PanResponder,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import {
  absoluteFill,
  bodyTracking,
  colors,
  fonts,
  radii,
  shadows,
  spacing,
} from '@/constants/theme';
import type { Challenge, ChallengeTask } from '@/data/challenges';
import { challengeStrip, REVIEWS } from '@/data/content';
import { joinedLabel } from '@/lib/format';
import { BottomSheet } from './BottomSheet';
import { CheckCircle } from './TaskRow';
import { PhotoStrip } from './PhotoStrip';
import { ReviewCard } from './ReviewCard';
import { StickyNote } from './StickyNote';
import { Text } from './Text';

/** How far left a row has to be pulled before letting go of it deletes the
 * task. Generous on purpose: there is no undo behind it. */
const DELETE_AT = 120;

export interface ChallengeDetailProps {
  challenge: Challenge;
  tasks: readonly ChallengeTask[];
  onAddTask: () => void;
  onRenameTask: (taskId: string, label: string) => void;
  onDeleteTask: (taskId: string) => void;
  onReorder: (from: number, to: number) => void;
  /**
   * Raised while a task is being dragged. The screen has to stop its own
   * scrolling for the length of it: a UIScrollView pans natively, outside the
   * responder system, so it takes the gesture off the row and the drag reads
   * as a scroll. Blocking it from here is Android-only, so the scroller has to
   * be told.
   */
  onDraggingChange?: (dragging: boolean) => void;
}

/**
 * The body of a challenge screen: photo strip, the "Create Daily Task+" well,
 * the reorderable sticky-note task list, then the review wall.
 *
 * Tapping a task's pencil raises an inline sheet with the label in a field.
 */
export function ChallengeDetail({
  challenge,
  tasks,
  onAddTask,
  onRenameTask,
  onDeleteTask,
  onReorder,
  onDraggingChange,
}: ChallengeDetailProps) {
  const [editing, setEditing] = useState<ChallengeTask | null>(null);
  const [draft, setDraft] = useState('');
  /**
   * The note the editor was opened on. Held in its own state rather than read
   * off `editing`, because `editing` is cleared the moment the sheet starts
   * closing and the sheet is on screen for the length of its slide down after
   * that — reading off it blinked the note out and left the field sitting
   * alone for a beat. Never cleared; the next open overwrites it.
   */
  const [editingNote, setEditingNote] = useState<{
    value: number;
    tint: number;
  } | null>(null);

  // --- Dragging a task to a new place in the list ---------------------------
  //
  // Rows are measured rather than assumed: a long label wraps to two lines, so
  // there is no one row height to count in. The row under the finger follows
  // it, the rows it has passed step aside by exactly its height, and the list
  // itself is only rewritten on release — reordering mid-drag would move the
  // row out from under the finger that is holding it.
  const heights = useRef<number[]>([]);
  const pan = useRef(new Animated.Value(0)).current;
  const [drag, setDrag] = useState<{ from: number; height: number } | null>(null);
  const [hover, setHover] = useState(0);
  // The gesture handlers are re-created on every render but an in-flight drag
  // keeps reading these, so everything it needs lives in a ref.
  const dragFrom = useRef<number | null>(null);
  const hoverAt = useRef(0);
  const count = useRef(tasks.length);
  count.current = tasks.length;
  const callbacks = useRef({ onReorder, onDeleteTask, onDraggingChange });
  callbacks.current = { onReorder, onDeleteTask, onDraggingChange };
  // Measured on the same pass as the heights: a row let go of is thrown clear
  // of the screen, and that is however wide it happens to be.
  const rowWidth = useRef(0);

  /** Which slot the row has been dragged over: past half of a row takes it. */
  const targetIndex = (from: number, dy: number) => {
    const rows = heights.current;
    let to = from;
    let travelled = 0;

    if (dy > 0) {
      for (let j = from + 1; j < count.current; j++) {
        const h = rows[j] ?? 0;
        travelled += h;
        if (dy < travelled - h / 2) break;
        to = j;
      }
    } else if (dy < 0) {
      for (let j = from - 1; j >= 0; j--) {
        const h = rows[j] ?? 0;
        travelled += h;
        if (-dy < travelled - h / 2) break;
        to = j;
      }
    }

    return to;
  };

  /**
   * How far the dragged row's own slot moves when it lands on `to`: the full
   * height of every row it has crossed. The rows standing aside have each
   * moved by exactly the dragged row's height, so at the end of that travel
   * the whole list is standing where the reorder is about to put it.
   */
  const slotDelta = (from: number, to: number) => {
    const rows = heights.current;
    let delta = 0;
    if (to > from) for (let j = from + 1; j <= to; j++) delta += rows[j] ?? 0;
    else for (let j = to; j < from; j++) delta -= rows[j] ?? 0;
    return delta;
  };

  const endDrag = () => {
    const from = dragFrom.current;
    if (from === null) return;
    dragFrom.current = null;
    const to = hoverAt.current;
    callbacks.current.onDraggingChange?.(false);

    // The row is not dropped and the list is not rewritten on the spot. `pan`
    // is written straight to the view, so zeroing it here reached the screen a
    // frame before the reordered list did and the row flashed back to the slot
    // it came from before appearing in its new one. Instead the row glides
    // from under the finger to the slot it was dropped on, and only then does
    // the list take over — from a frame that is already pixel-for-pixel what
    // the reorder produces, so the handover cannot be seen.
    Animated.timing(pan, {
      toValue: slotDelta(from, to),
      duration: 160,
      easing: Easing.out(Easing.quad),
      useNativeDriver: false,
    }).start(() => {
      // `pan` is deliberately left where it is: clearing it would be the same
      // one-frame jump again. The next grant zeroes it before it is read.
      setDrag(null);
      if (to !== from) callbacks.current.onReorder(from, to);
    });
  };

  /**
   * One responder per row, made once and kept. Re-creating them every render
   * swaps the handlers out from under a gesture that is already running, and
   * the drag re-renders on every row it crosses.
   */
  const handles = useRef<Record<number, ReturnType<typeof PanResponder.create>>>(
    {},
  );

  const dragHandle = (index: number) => {
    if (handles.current[index]) return handles.current[index];

    handles.current[index] = PanResponder.create({
      // Claimed on touch rather than on movement, so the page behind stops
      // scrolling the moment the handle is held.
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      // Nothing gets to take the row off the finger holding it. Switching the
      // page's scrolling off takes a render to reach the native scroller, and
      // in that gap its recogniser asks for the gesture — which is what was
      // cutting the drag short and dropping the row back where it started.
      onPanResponderTerminationRequest: () => false,
      onShouldBlockNativeResponder: () => true,
      onPanResponderGrant: () => {
        // On touch, before the finger has moved: the scroller has to be off
        // by the time it would otherwise start tracking.
        callbacks.current.onDraggingChange?.(true);
        // A settle still in flight is handed over now rather than left to
        // finish under the new gesture: stopping it runs its callback, which
        // commits the reorder it was carrying.
        pan.stopAnimation();
        dragFrom.current = index;
        hoverAt.current = index;
        pan.setValue(0);
        setHover(index);
        setDrag({ from: index, height: heights.current[index] ?? 0 });
      },
      onPanResponderMove: (_event, gesture) => {
        if (dragFrom.current === null) return;
        pan.setValue(gesture.dy);
        const to = targetIndex(dragFrom.current, gesture.dy);
        if (to !== hoverAt.current) {
          hoverAt.current = to;
          setHover(to);
        }
      },
      onPanResponderRelease: endDrag,
      onPanResponderTerminate: endDrag,
    });

    return handles.current[index];
  };

  /**
   * One horizontal pan per task, made once and kept, alongside the offset it
   * writes to. Keyed by id rather than by index: unlike the drag, which is
   * about where a row sits, a swipe is about *which* task it is carrying, and
   * the list moves underneath both.
   */
  const swipes = useRef<
    Record<
      string,
      { x: Animated.Value; responder: ReturnType<typeof PanResponder.create> }
    >
  >({});

  const swipeFor = (taskId: string) => {
    const made = swipes.current[taskId];
    if (made) return made;

    const x = new Animated.Value(0);
    const settle = (toValue: number, then?: () => void) =>
      Animated.timing(x, {
        toValue,
        duration: 180,
        easing: Easing.out(Easing.quad),
        // The JS driver, as the vertical drag uses: the two share one
        // transform, and a style cannot be half handed to the native one.
        useNativeDriver: false,
      }).start(({ finished }) => {
        if (finished) then?.();
      });

    const responder = PanResponder.create({
      // Only a deliberate pull to the left. Up and down belong to the drag
      // handle and to the page's own scrolling, and a row already being
      // carried is not also swiped.
      onMoveShouldSetPanResponder: (_event, gesture) =>
        dragFrom.current === null &&
        gesture.dx < -6 &&
        Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.6,
      onPanResponderTerminationRequest: () => false,
      onShouldBlockNativeResponder: () => true,
      // Right of where it started is a no-op rather than a stretch: there is
      // nothing revealed on that side to pull towards.
      onPanResponderMove: (_event, gesture) =>
        x.setValue(Math.min(0, gesture.dx)),
      onPanResponderRelease: (_event, gesture) => {
        const letGo = gesture.dx < -DELETE_AT || gesture.vx < -0.5;
        if (!letGo) return settle(0);
        settle(-(rowWidth.current || DELETE_AT * 4), () => {
          delete swipes.current[taskId];
          callbacks.current.onDeleteTask(taskId);
        });
      },
      onPanResponderTerminate: () => settle(0),
    });

    swipes.current[taskId] = { x, responder };
    return swipes.current[taskId];
  };

  /** How far a row that is not being dragged stands aside for the one that is. */
  const standAside = (index: number) => {
    if (!drag || index === drag.from) return 0;
    if (hover > drag.from && index > drag.from && index <= hover) return -drag.height;
    if (hover < drag.from && index >= hover && index < drag.from) return drag.height;
    return 0;
  };

  const openEditor = (task: ChallengeTask) => {
    const index = tasks.findIndex((t) => t.id === task.id);
    setEditing(task);
    setEditingNote({ value: index + 1, tint: task.tint ?? index });
    setDraft(task.label);
  };

  const commit = () => {
    if (editing && draft.trim()) onRenameTask(editing.id, draft.trim());
    // The keyboard is sent down here rather than left to go on its own when
    // the field unmounts at the end of the sheet's slide: waiting made it two
    // dismissals a beat apart instead of one movement.
    Keyboard.dismiss();
    setEditing(null);
  };

  return (
    <View>
      <PhotoStrip
        // The same photographs the picker showed a moment ago, so choosing a
        // challenge and then editing it are plainly the same thing.
        photos={challengeStrip(challenge.id)}
        badge={challenge.joined ? joinedLabel(challenge.joined) : undefined}
        height={170}
      />

      <Pressable
        accessibilityRole="button"
        onPress={onAddTask}
        style={({ pressed }) => [styles.addWell, pressed && styles.pressed]}
      >
        <Text variant="sectionTitle" color={colors.inkMuted}>
          Create Daily Task+
        </Text>
      </Pressable>

      <View style={styles.taskList}>
        {tasks.map((task, i) => {
          const lifted = drag?.from === i;
          const swipe = swipeFor(task.id);
          return (
            // The slot stays put; the row inside it is what moves. The lifted
            // row is raised from out here, because a stacking order only
            // counts against siblings and its siblings are the other slots.
            <View
              key={task.id}
              onLayout={(e) => {
                heights.current[i] = e.nativeEvent.layout.height;
                rowWidth.current = e.nativeEvent.layout.width;
              }}
              style={lifted ? styles.taskSlotLifted : undefined}
            >
              {/* Uncovered as the row is pulled off it. Painted the whole
                  width rather than as a tab at the edge, so a long pull reads
                  as the row being cleared away rather than as a button slowly
                  appearing. Its opacity is tied to the pull so it is not there
                  at rest: a row being *dragged* vacates this same slot, and
                  red underneath a row on the move would read as a warning. */}
              <Animated.View
                pointerEvents="none"
                style={[
                  styles.deleteLayer,
                  {
                    opacity: swipe.x.interpolate({
                      inputRange: [-4, 0],
                      outputRange: [1, 0],
                      extrapolate: 'clamp',
                    }),
                  },
                ]}
              >
                <Ionicons
                  name="trash-outline"
                  size={22}
                  color={colors.inkInverse}
                />
              </Animated.View>

              <Animated.View
                {...swipe.responder.panHandlers}
                style={[
                  styles.taskRow,
                  lifted && styles.taskRowLifted,
                  {
                    transform: [
                      { translateY: lifted ? pan : standAside(i) },
                      { translateX: swipe.x },
                    ],
                  },
                ]}
              >
                {/* A handle rather than a button: it is held and moved, so it
                    takes the gesture on touch. Reordering and deleting are
                    both offered to assistive technology from here, which has
                    neither a drag nor a swipe. */}
                <View
                  {...dragHandle(i).panHandlers}
                  accessible
                  accessibilityRole="adjustable"
                  accessibilityLabel={`Reorder ${task.label}`}
                  accessibilityActions={[
                    { name: 'increment', label: 'Move down' },
                    { name: 'decrement', label: 'Move up' },
                    { name: 'delete', label: 'Delete task' },
                  ]}
                  onAccessibilityAction={(e) => {
                    const action = e.nativeEvent.actionName;
                    if (action === 'delete') return onDeleteTask(task.id);
                    onReorder(i, action === 'increment' ? i + 1 : i - 1);
                  }}
                  hitSlop={10}
                  style={styles.handle}
                >
                  <Ionicons
                    name="reorder-three"
                    size={22}
                    color={colors.field}
                  />
                </View>

                {/* The numeral is the position, so it renumbers on a reorder;
                    the colour and the tilt ride along on the task, so the note
                    the finger dropped is plainly the note it picked up. */}
                <StickyNote
                  value={i + 1}
                  size={62}
                  colorIndex={task.tint ?? i}
                  tilt={(task.tint ?? i) % 2 ? 1.5 : -1.5}
                />

                <Text variant="bodyBold" style={styles.taskLabel}>
                  {task.label}
                </Text>

                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Edit ${task.label}`}
                  onPress={() => openEditor(task)}
                  style={({ pressed }) => [
                    styles.editButton,
                    pressed && styles.pressed,
                  ]}
                >
                  <Ionicons name="pencil" size={18} color={colors.ink} />
                </Pressable>
              </Animated.View>
            </View>
          );
        })}
      </View>

      <View style={styles.reviews}>
        {REVIEWS.map((review) => (
          <ReviewCard key={review.id} review={review} style={styles.review} />
        ))}
      </View>

      <BottomSheet visible={!!editing} onDismiss={commit} handle={false}>
        <View style={styles.editorRow}>
          {/* The note the row was carrying, so the sheet is plainly this task
              and not a field that appeared out of nowhere. */}
          {editingNote ? (
            <StickyNote
              value={editingNote.value}
              size={46}
              colorIndex={editingNote.tint}
              tilt={editingNote.tint % 2 ? 1.5 : -1.5}
            />
          ) : null}

          <View style={styles.editorField}>
            <TextInput
              value={draft}
              onChangeText={setDraft}
              autoFocus
              multiline
              style={styles.editorInput}
              placeholder="Task"
              placeholderTextColor={colors.inkMuted}
            />
          </View>

          <CheckCircle checked onPress={commit} size={54} />
        </View>
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  addWell: {
    marginTop: spacing['3xl'],
    height: 78,
    borderRadius: radii.card,
    backgroundColor: colors.surfaceSunken,
    alignItems: 'center',
    justifyContent: 'center',
  },
  taskList: {
    marginTop: spacing.lg,
  },
  taskSlotLifted: {
    zIndex: 2,
  },
  taskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.dividerStrong,
    // Opaque even at rest, so the delete panel underneath stays hidden until
    // the row is actually pulled off it.
    backgroundColor: colors.background,
  },
  // Off the page and over the rows it is passing, on its own ground so the
  // hairlines below do not show through it.
  taskRowLifted: {
    borderBottomColor: 'transparent',
    ...shadows.card,
  },
  deleteLayer: {
    ...absoluteFill,
    backgroundColor: colors.destructive,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingRight: spacing.xl,
  },
  handle: {
    paddingRight: spacing.md,
  },
  taskLabel: {
    flex: 1,
    marginLeft: spacing.lg,
  },
  editButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.surfaceSunken,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.md,
  },
  reviews: {
    marginTop: spacing['3xl'],
    gap: spacing.xl,
  },
  review: {
    ...shadows.soft,
  },
  editorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingTop: spacing.xl,
    paddingBottom: spacing.md,
  },
  // A well of the same sunken grey the pencil button and the "Create Daily
  // Task+" slot use, so the label reads as something to type in rather than as
  // a line of text that happens to sit next to a button.
  editorField: {
    flex: 1,
    minHeight: 54,
    justifyContent: 'center',
    borderRadius: radii.md,
    backgroundColor: colors.surfaceSunken,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  editorInput: {
    fontFamily: fonts.bodyBold,
    fontSize: 18,
    lineHeight: 24,
    letterSpacing: bodyTracking,
    color: colors.ink,
    // A multiline field brings its own padding on Android, which would sit
    // inside the well's and push the text off centre.
    padding: 0,
  },
  pressed: {
    opacity: 0.85,
  },
});

export default ChallengeDetail;
