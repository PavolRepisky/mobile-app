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

import { BottomSheet } from '@/components/BottomSheet';
import { buttonHeight, PrimaryButton } from '@/components/Buttons';
import { ChallengeLengthSheet } from '@/components/ChallengeLengthSheet';
import { IconButton } from '@/components/IconButton';
import { PhotoLibrarySheet } from '@/components/PhotoLibrarySheet';
import { PhotoSlot } from '@/components/PhotoSlot';
import { Pill, pillHeights } from '@/components/Pill';
import { ScreenScroll } from '@/components/Screen';
import { ScreenHeader } from '@/components/ScreenHeader';
import { CheckCircle } from '@/components/CheckCircle';
import { Text } from '@/components/Text';
import { WheelPicker } from '@/components/WheelPicker';
import {
  colors,
  layout,
  radii,
  shadows,
  spacing,
  tabBarBottom,
  type as typeScale,
} from '@/constants/theme';
import { useApp, type TaskPhoto } from '@/hooks/useAppState';
import { addDays, longDate } from '@/lib/format';

/** The four photos that stand for a challenge everywhere else — its strip on
 * Challenges and on its preview are drawn from exactly this many. */
const PHOTO_COUNT = 4;

/** One print in the pile, sampled off the design: a portrait a little taller
 * than a phone photo's thumbnail, framed in white like something printed. */
const PRINT_WIDTH = 96;
const PRINT_HEIGHT = 132;
const PRINT_FRAME = 3;

/** Degrees each print sits off square, alternating so the pile reads as laid
 * down by hand rather than set in a row. */
const PRINT_TILTS = [-6, 3, -3, 5];

/** The outline round Name and Description — heavier than a hairline so an
 * empty field still reads as somewhere to type. */
const FIELD_RULE = 1.5;

/** The dashed edge of "Add task": the same weight as the add-photo card's own
 * dash, so the two invitations on the page read as one kind of thing. */
const DASH_RULE = 2;

/** The tick leading each task row, and the tap target for its X. */
const TASK_CHECK = 24;
const TASK_DELETE = 36;

/** Where a fresh draft sets the length — the length every preset defaults to. */
const DEFAULT_DAYS = 75;

/** How far ahead a start date can be picked. Long enough to plan a season,
 * short enough that the wheel stays a quick flick. */
const START_WINDOW_DAYS = 90;

/** How long a new challenge stays open to join before Day 1, at the least. */
const JOIN_WINDOW_DAYS = 7;

const MONDAY = 1;

interface DraftTask {
  id: string;
  label: string;
}

function startOfToday(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

/** The first Monday at least a week out: a week for friends to join, and
 * every challenge's Day 1 lands at the start of a week. */
function defaultStartOffset(today: Date): number {
  const weekOut = addDays(today, JOIN_WINDOW_DAYS).getDay();
  return JOIN_WINDOW_DAYS + ((MONDAY - weekOut + 7) % 7);
}

/**
 * Build-your-own challenge on one scroll: the photos that stand for it, its
 * name and description, the day it starts and how long it runs, then the
 * daily tasks. Every challenge has one Day 1 that everyone in it shares, so a
 * created one gets a start date too — friends join before it. Saving adds it
 * to the picker's Custom tab rather than making it the active challenge.
 */
export default function CreateChallengeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { addChallenge } = useApp();

  const [today] = useState(startOfToday);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [photos, setPhotos] = useState<TaskPhoto[]>([]);
  // The print being replaced, or the next free one when adding.
  const [activeSlot, setActiveSlot] = useState<number | null>(null);
  const [startOffset, setStartOffset] = useState(() => defaultStartOffset(today));
  const [pendingOffset, setPendingOffset] = useState(startOffset);
  const [startOpen, setStartOpen] = useState(false);
  const [days, setDays] = useState(DEFAULT_DAYS);
  const [lengthOpen, setLengthOpen] = useState(false);
  const [tasks, setTasks] = useState<DraftTask[]>([
    { id: 'draft-task-0', label: '' },
  ]);

  const startDate = addDays(today, startOffset);
  const startOffsets = Array.from({ length: START_WINDOW_DAYS }, (_, i) => i + 1);

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
    photos.length === PHOTO_COUNT &&
    tasks.some((t) => t.label.trim().length > 0);

  const save = () => {
    addChallenge({
      name: name.trim(),
      description: description.trim(),
      photos,
      tasks: tasks.map((t) => t.label.trim()).filter(Boolean),
      days,
      startDate,
    });
    router.back();
  };

  const missing = PHOTO_COUNT - photos.length;

  // The Join dock's own gap: what the floating tab bar keeps off the bottom
  // edge, so the band reads as that bar filled in.
  const dockGap = tabBarBottom(insets.bottom);

  return (
    // Absolute overlays need a positioned parent, otherwise their offsets
    // resolve against the scroll content instead of the screen.
    <View style={styles.screenRoot}>
      <ScreenScroll
        tone="plain"
        // Room for the dock, so the last task clears it. The scroll already
        // pads for the safe area, which the dock's own gap covers.
        bottomExtra={layout.block + buttonHeight + dockGap - insets.bottom}
        automaticallyAdjustKeyboardInsets
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        // Title and back button in the scroll's fixed header, level with each
        // other however far the form has scrolled.
        header={<ScreenHeader plainTitle="New challenge" />}
      >

        {/* The photos as a small pile of prints rather than four empty
            wells: each photo picked lands on the pile, tilted, and the card
            that adds the next one trails it until there are four. */}
        <View style={styles.prints}>
          {photos.map((photo, i) => (
            <View
              key={i}
              style={[
                styles.print,
                i > 0 && styles.printLapped,
                { transform: [{ rotate: `${PRINT_TILTS[i % PRINT_TILTS.length]}deg` }] },
              ]}
            >
              <PhotoSlot
                photo={photo}
                width={PRINT_WIDTH - PRINT_FRAME * 2}
                height={PRINT_HEIGHT - PRINT_FRAME * 2}
                radius={radii.md - PRINT_FRAME}
                onPress={() => setActiveSlot(i)}
                accessibilityLabel={`Change photo ${i + 1}`}
              />
            </View>
          ))}
          {missing > 0 ? (
            <PhotoSlot
              photo={null}
              width={PRINT_WIDTH}
              height={PRINT_HEIGHT}
              radius={radii.md}
              emptyLabel={
                photos.length === 0 ? 'Add photos' : `Add ${missing} more`
              }
              tilt={PRINT_TILTS[photos.length % PRINT_TILTS.length]}
              style={photos.length > 0 && styles.printLapped}
              onPress={() => setActiveSlot(photos.length)}
              accessibilityLabel="Add photos"
            />
          ) : null}
        </View>

        <View style={styles.fields}>
          <Field label="Name">
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Name your challenge"
              placeholderTextColor={colors.inkMuted}
              style={styles.input}
            />
          </Field>
          <Field label="Description">
            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder="What's it about, and who's it for?"
              placeholderTextColor={colors.inkMuted}
              multiline
              style={[styles.input, styles.multiline]}
            />
          </Field>
        </View>

        <View style={styles.settings}>
          <View style={styles.settingRow}>
            <Text variant="itemTitle">Starts</Text>
            <Pill
              label={longDate(startDate)}
              icon="calendar-outline"
              tone="muted"
              labelVariant="metaBold"
              onPress={() => {
                setPendingOffset(startOffset);
                setStartOpen(true);
              }}
              style={styles.settingPill}
            />
          </View>
          <View style={styles.settingRow}>
            <Text variant="itemTitle">Length</Text>
            <Pill
              label={`${days} days`}
              trailingIcon="chevron-down"
              tone="muted"
              labelVariant="metaBold"
              onPress={() => setLengthOpen(true)}
              style={styles.settingPill}
            />
          </View>
        </View>

        <Text variant="itemTitle" style={styles.tasksHeading}>
          Daily tasks
        </Text>
        <View style={styles.taskList}>
          {tasks.map((task, i) => (
            <View key={task.id} style={styles.taskRow}>
              {/* Ticked, the way the task will look once it's done each
                  day — the row previews the list rather than numbering it. */}
              <CheckCircle size={TASK_CHECK} />
              <TextInput
                value={task.label}
                onChangeText={(label) => updateTaskLabel(task.id, label)}
                placeholder={`Task ${i + 1}`}
                placeholderTextColor={colors.inkMuted}
                style={styles.taskInput}
              />
              <IconButton
                name="close"
                size={TASK_DELETE}
                iconSize={18}
                color={colors.inkMuted}
                background={colors.surfaceSunken}
                shadow={false}
                onPress={() => deleteTaskRow(task.id)}
                accessibilityLabel={`Delete task ${i + 1}`}
              />
            </View>
          ))}

          <Pressable
            accessibilityRole="button"
            onPress={addTaskRow}
            style={({ pressed }) => [styles.addTask, pressed && styles.pressed]}
          >
            <Ionicons name="add" size={18} color={colors.ink} />
            <Text variant="copyBold">Add task</Text>
          </Pressable>
        </View>
      </ScreenScroll>

      {/* Docked on a white band like Join on a challenge's preview, so the
          tasks scroll away under it rather than showing through. */}
      <View style={[styles.dock, { paddingBottom: dockGap }]}>
        <PrimaryButton
          label="Create"
          disabled={!canSave}
          onPress={save}
        />
      </View>

      <PhotoLibrarySheet
        visible={activeSlot !== null}
        onPick={(photo) => {
          if (activeSlot === null) return;
          const slot = activeSlot;
          setPhotos((list) =>
            slot < list.length
              ? list.map((p, i) => (i === slot ? photo : p))
              : [...list, photo],
          );
          setActiveSlot(null);
        }}
        onDismiss={() => setActiveSlot(null)}
      />

      {/* The start day on the iPhone's own date-wheel drum, the way My
          Profile picks a year. Done sets it; tapping away leaves it. */}
      <BottomSheet visible={startOpen} onDismiss={() => setStartOpen(false)}>
        <Text variant="sectionHeading" center>
          Starts
        </Text>
        <WheelPicker
          // Remounted on every open, so the drum starts on the day already
          // picked rather than wherever it was last left.
          key={startOpen ? 'open' : 'closed'}
          values={startOffsets}
          value={pendingOffset}
          onChange={setPendingOffset}
          format={(offset) => longDate(addDays(today, offset))}
          style={styles.wheel}
        />
        <PrimaryButton
          label="Done"
          onPress={() => {
            setStartOffset(pendingOffset);
            setStartOpen(false);
          }}
        />
      </BottomSheet>

      <ChallengeLengthSheet
        visible={lengthOpen}
        onDismiss={() => setLengthOpen(false)}
        days={days}
        startDate={startDate}
        onConfirm={setDays}
      />
    </View>
  );
}

/** One outlined box: its name in the small bold cut, the field under it. */
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
      <Text variant="metaBold">{label}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  screenRoot: {
    flex: 1,
  },
  // Centred as a pile; the vertical padding is room for the tilted corners,
  // which a rotation pushes past the row's own bounds.
  prints: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    marginBottom: layout.section,
  },
  print: {
    padding: PRINT_FRAME,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    ...shadows.hard,
  },
  // Each print laps the one before it a little, so four fit across the
  // page and they read as one pile rather than a row of tiles.
  printLapped: {
    marginLeft: -spacing.md,
  },
  fields: {
    gap: layout.inline,
  },
  field: {
    gap: layout.line,
    borderWidth: FIELD_RULE,
    borderColor: colors.inkGhost,
    borderRadius: radii.lg,
    paddingVertical: layout.inline,
    paddingHorizontal: layout.block,
  },
  input: {
    ...typeScale.copy,
    color: colors.ink,
    padding: 0,
  },
  // Two lines tall before anything is typed, so it reads as the field to
  // say more in.
  multiline: {
    minHeight: typeScale.copy.lineHeight * 2,
    textAlignVertical: 'top',
  },
  settings: {
    marginTop: layout.section,
    gap: layout.inline,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  // Flat, in the palette's fill grey rather than `muted`'s warmer one — the
  // same as the task rows under it.
  settingPill: {
    backgroundColor: colors.surfaceSunken,
  },
  tasksHeading: {
    marginTop: layout.section,
    marginBottom: layout.heading,
  },
  taskList: {
    gap: layout.stack,
  },
  taskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: layout.inline,
    minHeight: pillHeights.lg,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceSunken,
    paddingLeft: layout.inline,
    paddingRight: layout.line,
  },
  taskInput: {
    flex: 1,
    ...typeScale.copy,
    color: colors.ink,
    padding: 0,
  },
  // An outline rather than a fill: it's where the next row will go, not a
  // row yet.
  addTask: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: layout.line,
    height: pillHeights.lg,
    borderRadius: radii.pill,
    borderWidth: DASH_RULE,
    borderStyle: 'dashed',
    borderColor: colors.inkGhost,
  },
  dock: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingTop: layout.block,
    paddingHorizontal: layout.gutter,
    backgroundColor: colors.surface,
    ...shadows.floating,
  },
  wheel: {
    marginVertical: layout.block,
  },
  pressed: {
    opacity: 0.7,
  },
});
