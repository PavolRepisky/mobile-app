import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  Pressable,
  StyleSheet,
  TextInput,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PrimaryButton } from '@/components/Buttons';
import { MAX_DAYS, MIN_DAYS } from '@/components/ChallengeLengthSheet';
import { IconButton } from '@/components/IconButton';
import { PhotoLibrarySheet } from '@/components/PhotoLibrarySheet';
import { PhotoSlot } from '@/components/PhotoSlot';
import { profileActionTop } from '@/components/ProfileLayout';
import { RulerSlider } from '@/components/RulerSlider';
import { ScreenScroll, topPadding } from '@/components/Screen';
import { CheckCircle } from '@/components/TaskRow';
import { Text } from '@/components/Text';
import {
  colors,
  radii,
  screenPadding,
  shadows,
  spacing,
  type as typeScale,
} from '@/constants/theme';
import { useApp, type TaskPhoto } from '@/hooks/useAppState';

/** Matches the corner "+" and the feed's back button — every floating action
 * button in the app is the same size. */
const ACTION_SIZE = 46;

/** Same height the preview page gives its own stacked strip. */
const PHOTO_STRIP_HEIGHT = 190;

/**
 * How far each tile laps over the next, as a % of the strip's width, and the
 * degrees each is nudged off square — copied from `PhotoStrip`'s own stacked
 * layout so the photos cover each other exactly the way they do there.
 */
const TILE_LAP = 3;
const TILE_TILTS = [-1.2, 1.4, -0.9, 1.6];

/** Same length options the settings ruler picks from. */
const DAY_OPTIONS = MAX_DAYS - MIN_DAYS + 1;

/** Where a fresh draft starts the ruler — the length every preset defaults to. */
const DEFAULT_DAYS = 75;

interface DraftTask {
  id: string;
  label: string;
}

/**
 * Build-your-own challenge: name, description, the four photos that stand for
 * it everywhere else, and the daily tasks. Saving adds it to the picker's
 * Custom tab rather than making it the active challenge outright — picking it
 * from there is what starts it, same as a preset.
 */
export default function CreateChallengeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { addChallenge } = useApp();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [photos, setPhotos] = useState<(TaskPhoto | null)[]>([
    null,
    null,
    null,
    null,
  ]);
  const [activeSlot, setActiveSlot] = useState<number | null>(null);
  const [dayIndex, setDayIndex] = useState(DEFAULT_DAYS - MIN_DAYS);
  const [tasks, setTasks] = useState<DraftTask[]>([
    { id: 'draft-task-0', label: '' },
  ]);

  const days = MIN_DAYS + dayIndex;

  const addTaskRow = () =>
    setTasks((list) => [
      ...list,
      { id: `draft-task-${list.length}-${Date.now()}`, label: '' },
    ]);

  const updateTaskLabel = (id: string, label: string) =>
    setTasks((list) => list.map((t) => (t.id === id ? { ...t, label } : t)));

  const deleteTaskRow = (id: string) =>
    setTasks((list) => list.filter((t) => t.id !== id));

  const canSave =
    name.trim().length > 0 &&
    photos.every((p) => p !== null) &&
    tasks.some((t) => t.label.trim().length > 0);

  const save = () => {
    addChallenge({
      name: name.trim(),
      description: description.trim(),
      photos: photos.filter((p): p is TaskPhoto => p !== null),
      tasks: tasks.map((t) => t.label.trim()).filter(Boolean),
      days,
    });
    router.back();
  };

  /**
   * The shared line the title and both corner buttons sit on — same
   * accommodation the feed and Discover make for a deep safe-area inset.
   */
  const headerTop = Math.max(profileActionTop, topPadding(insets.top));
  const titleOffset = headerTop - topPadding(insets.top);

  // The strip only ever shows what's filled plus one open slot to fill next —
  // the rest stay off until the reader reaches them, so it visibly builds
  // itself the way the preview page's own photos read as laid down one at a
  // time rather than four wells waiting at once.
  const filledCount = photos.filter((p) => p !== null).length;
  const visibleCount = Math.min(photos.length, filledCount + 1);

  return (
    // Absolute overlays need a positioned parent, otherwise their offsets
    // resolve against the scroll content instead of the screen.
    <View style={styles.screenRoot}>
      <ScreenScroll
        tone="plain"
        automaticallyAdjustKeyboardInsets
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
      >
        <View style={[styles.titleBand, { marginTop: titleOffset }]}>
          <Text variant="sectionTitle" center>
            Create Challenge
          </Text>
        </View>

        <Field label="Name">
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Name your challenge"
            placeholderTextColor={colors.inkMuted}
            style={styles.input}
          />
        </Field>

        <Field label="Description" style={styles.tall}>
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="What's it about, and who's it for?"
            placeholderTextColor={colors.inkMuted}
            multiline
            style={[styles.input, styles.multiline]}
          />
        </Field>

        <Text variant="sectionTitleSm" style={styles.sectionLabel}>
          Duration
        </Text>
        {/* Same ruler settings drives Duration with, minus the date-range
            caption underneath it — a draft challenge has no start date yet,
            so there's nothing for it to read out but the day count itself,
            which the readout pill above the ruler already carries. */}
        <RulerSlider
          length={DAY_OPTIONS}
          index={dayIndex}
          onChange={setDayIndex}
          readout={`${days} days`}
          style={styles.ruler}
        />

        <Text variant="sectionTitleSm" style={styles.sectionLabel}>
          Photos
        </Text>
        <View style={{ height: PHOTO_STRIP_HEIGHT }}>
          {photos.map((photo, i) => {
            if (i >= visibleCount) return null;
            // Sized against the full four-up layout, not against how many
            // are showing yet — a lone photo keeps the width it will end up
            // with rather than stretching to fill the empty strip and then
            // shrinking as the rest arrive.
            const share = 100 / photos.length;
            const left = i * share;
            const right =
              i === photos.length - 1 ? 100 : (i + 1) * share + TILE_LAP;
            return (
              <View
                key={i}
                style={[
                  styles.photoTile,
                  {
                    left: `${left}%`,
                    width: `${right - left}%`,
                    transform: [
                      { rotate: `${TILE_TILTS[i % TILE_TILTS.length]}deg` },
                    ],
                  },
                ]}
              >
                <PhotoSlot
                  photo={photo}
                  width="100%"
                  height={PHOTO_STRIP_HEIGHT}
                  radius={radii.md}
                  shadow={false}
                  emptyLabel={photo ? undefined : 'Add photo'}
                  onPress={() => setActiveSlot(i)}
                  accessibilityLabel={
                    photo ? `Change photo ${i + 1}` : `Add photo ${i + 1}`
                  }
                />
              </View>
            );
          })}
        </View>

        <Text variant="sectionTitleSm" style={styles.sectionLabel}>
          Tasks
        </Text>
        <View style={styles.taskList}>
          {tasks.map((task, i) => (
            <View key={task.id} style={styles.taskRow}>
              <CheckCircle checked />
              <View style={styles.taskField}>
                <TextInput
                  value={task.label}
                  onChangeText={(label) => updateTaskLabel(task.id, label)}
                  placeholder={`Task ${i + 1}`}
                  placeholderTextColor={colors.inkMuted}
                  style={styles.taskInput}
                />
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Delete task ${i + 1}`}
                onPress={() => deleteTaskRow(task.id)}
                style={({ pressed }) => [
                  styles.deleteButton,
                  pressed && styles.pressed,
                ]}
              >
                <Ionicons name="trash-outline" size={18} color={colors.ink} />
              </Pressable>
            </View>
          ))}

          <PrimaryButton
            label="Add Task"
            icon="add"
            onPress={addTaskRow}
            style={styles.addButton}
          />
        </View>

        <PhotoLibrarySheet
          visible={activeSlot !== null}
          onPick={(photo) => {
            if (activeSlot === null) return;
            const slot = activeSlot;
            setPhotos((list) => list.map((p, i) => (i === slot ? photo : p)));
            setActiveSlot(null);
          }}
          onDismiss={() => setActiveSlot(null)}
        />
      </ScreenScroll>

      {/* Pinned to the same line as every other tab root's corner button,
          measured from the screen edge rather than from the scroll content —
          solid ink like the "+" on Discover, not the glass lens, so it reads
          as a control rather than another surface. */}
      <IconButton
        name="chevron-back"
        size={ACTION_SIZE}
        iconSize={20}
        background={colors.ink}
        color={colors.inkInverse}
        shadow={false}
        onPress={() => router.back()}
        accessibilityLabel="Back"
        style={[styles.back, { top: headerTop }, shadows.floating]}
      />
      <IconButton
        name="checkmark"
        size={ACTION_SIZE}
        iconSize={20}
        background={colors.ink}
        color={colors.inkInverse}
        shadow={false}
        onPress={canSave ? save : undefined}
        accessibilityLabel="Save challenge"
        style={[
          styles.save,
          { top: headerTop },
          shadows.floating,
          !canSave && styles.disabled,
        ]}
      />
    </View>
  );
}

/** One outlined box: its name in the heavy cut, the field under it. */
function Field({
  label,
  children,
  style,
}: {
  label: string;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[styles.field, style]}>
      <Text variant="bodyBold">{label}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  screenRoot: {
    flex: 1,
  },
  back: {
    position: 'absolute',
    left: screenPadding,
  },
  save: {
    position: 'absolute',
    right: screenPadding,
  },
  titleBand: {
    minHeight: ACTION_SIZE,
    justifyContent: 'center',
  },
  disabled: {
    opacity: 0.35,
  },
  field: {
    marginTop: spacing['2xl'],
    borderWidth: 1,
    borderColor: colors.divider,
    borderRadius: radii.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  tall: {
    minHeight: 148,
  },
  input: {
    marginTop: spacing.xs,
    ...typeScale.bodySemi,
    color: colors.ink,
    padding: 0,
  },
  multiline: {
    flex: 1,
    textAlignVertical: 'top',
  },
  sectionLabel: {
    marginTop: spacing['3xl'],
    marginBottom: spacing.lg,
  },
  // Ticks run to both page edges rather than stopping at the gutter, same as
  // the settings sheet's own ruler — it reads as a strip the page is a
  // window onto, not a control boxed inside it.
  ruler: {
    marginHorizontal: -screenPadding,
  },
  photoTile: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    ...shadows.soft,
  },
  taskList: {
    // No margin of its own — ScreenScroll's own bottom padding is already
    // the page's closing air; stacking this on top of it was what read as a
    // dead gap under the last button.
  },
  taskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  taskField: {
    flex: 1,
    minHeight: 54,
    justifyContent: 'center',
    borderRadius: radii.md,
    backgroundColor: colors.surfaceSunken,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  taskInput: {
    ...typeScale.taskLabel,
    color: colors.ink,
    padding: 0,
  },
  deleteButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.surfaceSunken,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Matches "Join Challenge" on the preview page's dock — that button
  // overrides PrimaryButton's own full pill down to this softer corner.
  addButton: {
    marginTop: spacing.lg,
    borderRadius: radii.md,
  },
  pressed: {
    opacity: 0.85,
  },
});
