import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import {
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  TextInput,
  useWindowDimensions,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Avatar } from '@/components/Avatar';
import { BottomSheet } from '@/components/BottomSheet';
import { buttonHeight, PrimaryButton } from '@/components/Buttons';
import { ChallengeLengthSheet } from '@/components/ChallengeLengthSheet';
import { IconButton } from '@/components/IconButton';
import { PhotoLibrarySheet } from '@/components/PhotoLibrarySheet';
import { PhotoSlot } from '@/components/PhotoSlot';
import { Pill, pillHeights } from '@/components/Pill';
import { ScreenScroll } from '@/components/Screen';
import { ScreenHeader } from '@/components/ScreenHeader';
import { StepBar } from '@/components/StepBar';
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
import { CHALLENGES, type ChallengeCategory } from '@/data/challenges';
import { FRIENDS } from '@/data/content';
import { LIVES_PER_CHALLENGE, useApp, type TaskPhoto } from '@/hooks/useAppState';
import { CATEGORIES } from '@/hooks/useChallengeCards';
import { addDays, longDate } from '@/lib/format';

/** The photos that stand for a challenge everywhere else — its strip on
 * Challenges and on its preview are drawn from these. Three fill the cover
 * mosaic exactly: one large, two stacked beside it. */
const PHOTO_COUNT = 3;

/** The cover mosaic: two of the small tiles stacked, sampled off the design,
 * so the lead photo beside them reads as the one people see first. */
const COVER_TILE = 84;
const COVER_HEIGHT = COVER_TILE * 2 + layout.grid;

/** The number square leading each task, and the tap target for its X. */
const TASK_NUMBER = 32;
const TASK_DELETE = 32;

/** The ring round the task being typed into — the same weight as the dashed
 * "Add a task" edge, so the two read as one kind of mark. */
const FOCUS_RULE = 2;
const DASH_RULE = 2;

/** Enough for a full morning or a full day without the list turning into a
 * chore to photograph. */
const MAX_TASKS = 8;

/** How many of the topic's popular tasks are offered under the list. */
const SUGGESTION_COUNT = 3;

/** Where a fresh draft sets the length — the length every preset defaults to. */
const DEFAULT_DAYS = 75;

/** How far ahead a start date can be picked. Long enough to plan a season,
 * short enough that the wheel stays a quick flick. */
const START_WINDOW_DAYS = 90;

/** How long a new challenge stays open to join before Day 1, at the least. */
const JOIN_WINDOW_DAYS = 7;

const MONDAY = 1;

/** Lives on offer: none (no misses at all) up to a generous five. */
const LIFE_OPTIONS = [0, 1, 2, 3, 4, 5];

/** The miss that ends a run, spelled out: "A third miss ends their run." */
const ORDINALS = ['first', 'second', 'third', 'fourth', 'fifth', 'sixth'];

/** The finished page's pile: three prints, the middle one on top, each
 * framed in white like something printed and laid down by hand. */
const PRINT_WIDTH = 100;
const PRINT_HEIGHT = 124;
const PRINT_LEAD_WIDTH = 112;
const PRINT_LEAD_HEIGHT = 140;
const PRINT_FRAME = 4;
const PRINT_TILT = 8;
const PILE_WIDTH = 200;
const PILE_HEIGHT = 150;

/** The same size as a person's row on Find friends. */
const INVITE_AVATAR = 48;
/** Friends offered an invite on the finished page — a couple to start with,
 * the share link covers everyone else. */
const INVITE_COUNT = 2;

const STEPS = 3;

type Step = 1 | 2 | 3 | 'live';

interface DraftTask {
  id: string;
  label: string;
  note: string;
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

const livesLabel = (n: number) => `${n} ${n === 1 ? 'life' : 'lives'}`;

function livesHint(n: number): string {
  if (n === 0) return 'No misses at all — one missed day ends a run.';
  const days = n === 1 ? '1 day' : `${n} days`;
  return `People can miss up to ${days}. A ${ORDINALS[n]} miss ends their run.`;
}

/**
 * Build-your-own challenge in three short steps — what it is, what everyone
 * does each day, and the rules — then a page saying it's live with the way
 * to bring people along. Each step asks one question on one field style, so
 * the form never reads as three forms stacked. Every challenge has one Day 1
 * that everyone in it shares, so a created one gets a start date too —
 * friends join before it. Saving adds it to the picker's Custom tab rather
 * than making it the active challenge.
 */
export default function CreateChallengeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { addChallenge } = useApp();
  const scroll = useRef<ScrollView>(null);

  const [step, setStep] = useState<Step>(1);
  const [today] = useState(startOfToday);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [topic, setTopic] = useState<ChallengeCategory | null>(null);
  const [photos, setPhotos] = useState<TaskPhoto[]>([]);
  // The photo being replaced, or the next free one when adding.
  const [activeSlot, setActiveSlot] = useState<number | null>(null);
  const [tasks, setTasks] = useState<DraftTask[]>([
    { id: 'draft-task-0', label: '', note: '' },
  ]);
  const [focusedTask, setFocusedTask] = useState<string | null>(null);
  const [startOffset, setStartOffset] = useState(() => defaultStartOffset(today));
  const [pendingOffset, setPendingOffset] = useState(startOffset);
  const [startOpen, setStartOpen] = useState(false);
  const [days, setDays] = useState(DEFAULT_DAYS);
  const [lengthOpen, setLengthOpen] = useState(false);
  const [lives, setLives] = useState(LIVES_PER_CHALLENGE);
  const [pendingLives, setPendingLives] = useState(lives);
  const [livesOpen, setLivesOpen] = useState(false);
  const [invited, setInvited] = useState<readonly string[]>([]);

  const startDate = addDays(today, startOffset);
  const endDate = addDays(startDate, days - 1);
  const startOffsets = Array.from({ length: START_WINDOW_DAYS }, (_, i) => i + 1);

  const goTo = (next: Step) => {
    setStep(next);
    // A fresh step starts at its question, not wherever the last one was
    // scrolled to.
    scroll.current?.scrollTo({ y: 0, animated: false });
  };

  const addTaskRow = (label = '') =>
    setTasks((list) =>
      list.length >= MAX_TASKS
        ? list
        : [...list, { id: `draft-task-${list.length}-${Date.now()}`, label, note: '' }],
    );

  const updateTask = (id: string, patch: Partial<DraftTask>) =>
    setTasks((list) => list.map((t) => (t.id === id ? { ...t, ...patch } : t)));

  const deleteTaskRow = (id: string) =>
    setTasks((list) => list.filter((t) => t.id !== id));

  // A suggestion fills the first empty row before it adds one, so tapping
  // one on a fresh list doesn't leave a blank row stranded above it.
  const addSuggestion = (label: string) => {
    const blank = tasks.find((t) => !t.label.trim());
    if (blank) updateTask(blank.id, { label });
    else addTaskRow(label);
  };

  const filledTasks = tasks.filter((t) => t.label.trim().length > 0);
  const taken = new Set(filledTasks.map((t) => t.label.trim().toLowerCase()));
  const suggestions = topic
    ? CHALLENGES.filter((c) => c.category === topic)
        .flatMap((c) => c.tasks.map((t) => t.label))
        .filter((label, i, all) => all.indexOf(label) === i && !taken.has(label.toLowerCase()))
        .slice(0, SUGGESTION_COUNT)
    : [];

  const basicsDone = name.trim().length > 0 && photos.length === PHOTO_COUNT;
  const tasksDone = filledTasks.length > 0;

  const create = () => {
    addChallenge({
      name: name.trim(),
      description: description.trim(),
      category: topic ?? undefined,
      photos,
      tasks: filledTasks.map((t) => ({
        label: t.label.trim(),
        ...(t.note.trim() ? { note: t.note.trim() } : null),
      })),
      days,
      startDate,
      lives,
    });
    goTo('live');
  };

  const shareInvite = () => {
    Share.share({
      message: `Join me on "${name.trim()}" — it starts ${longDate(startDate)} on Her 75.`,
    }).catch(() => {});
  };

  // The dock's own gap: what the floating tab bar keeps off the bottom edge,
  // so the band reads as that bar filled in.
  const dockGap = tabBarBottom(insets.bottom);

  const contentWidth = width - layout.gutter * 2;

  const header =
    step === 'live' ? undefined : (
      <ScreenHeader
        backIcon={step === 1 ? 'close' : 'chevron-back'}
        onBack={step === 1 ? undefined : () => goTo((step - 1) as Step)}
        middle={<StepBar step={step} total={STEPS} />}
        right={
          <Text variant="metaBold" color={colors.inkMuted}>
            {step} of {STEPS}
          </Text>
        }
      />
    );

  const dock =
    step === 1 ? (
      <PrimaryButton label="Next: daily tasks" disabled={!basicsDone} onPress={() => goTo(2)} />
    ) : step === 2 ? (
      <PrimaryButton label="Next: rules" disabled={!tasksDone} onPress={() => goTo(3)} />
    ) : step === 3 ? (
      <PrimaryButton label="Create challenge" onPress={create} />
    ) : (
      <View style={styles.liveActions}>
        <PrimaryButton label="Share invite link" icon="share-outline" onPress={shareInvite} />
        <Pressable
          accessibilityRole="button"
          onPress={() => router.back()}
          hitSlop={spacing.sm}
          style={({ pressed }) => pressed && styles.pressed}
        >
          <Text variant="copyBold">Done</Text>
        </Pressable>
      </View>
    );

  // The finished page's dock carries a text link under the button as well.
  const dockHeight = step === 'live' ? buttonHeight + layout.block + typeScale.copyBold.lineHeight : buttonHeight;

  return (
    // Absolute overlays need a positioned parent, otherwise their offsets
    // resolve against the scroll content instead of the screen.
    <View style={styles.screenRoot}>
      <ScreenScroll
        ref={scroll}
        tone="plain"
        // Room for the dock, so the last row clears it. The scroll already
        // pads for the safe area, which the dock's own gap covers.
        bottomExtra={layout.block + dockHeight + dockGap - insets.bottom}
        automaticallyAdjustKeyboardInsets
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        header={header}
      >
        {step === 1 ? (
          <>
            <Question
              title="What's your challenge?"
              hint="A name and a few photos people will see first."
            />

            <Cover
              photos={photos}
              width={contentWidth}
              onPick={setActiveSlot}
            />

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

            <Text variant="itemTitle" style={styles.heading}>
              Topic
            </Text>
            <View style={styles.chips}>
              {CATEGORIES.map((category) => {
                const on = topic === category;
                return (
                  <Pill
                    key={category}
                    label={category}
                    icon={on ? 'checkmark' : undefined}
                    tone={on ? 'solid' : 'muted'}
                    labelVariant="metaBold"
                    // Tapping the picked one again clears it: a topic is
                    // optional, and there's no other way back to none.
                    onPress={() => setTopic(on ? null : category)}
                    style={!on && styles.flatPill}
                  />
                );
              })}
            </View>
          </>
        ) : null}

        {step === 2 ? (
          <>
            <Question
              title="What will everyone do each day?"
              hint="Each task is proven with one photo. Add a line so everyone does it the same way."
            />

            <View style={styles.taskList}>
              {tasks.map((task, i) => {
                const focused = focusedTask === task.id;
                return (
                  <View key={task.id} style={[styles.taskRow, focused && styles.taskRowFocused]}>
                    <View style={[styles.taskNumber, focused && styles.taskNumberFocused]}>
                      <Text variant="metaBold">{i + 1}</Text>
                    </View>
                    <View style={styles.taskFields}>
                      <TextInput
                        value={task.label}
                        onChangeText={(label) => updateTask(task.id, { label })}
                        onFocus={() => setFocusedTask(task.id)}
                        onBlur={() => setFocusedTask(null)}
                        placeholder={`Task ${i + 1}`}
                        placeholderTextColor={colors.inkMuted}
                        style={styles.taskInput}
                      />
                      <TextInput
                        value={task.note}
                        onChangeText={(note) => updateTask(task.id, { note })}
                        onFocus={() => setFocusedTask(task.id)}
                        onBlur={() => setFocusedTask(null)}
                        placeholder="How should people do it? (optional)"
                        placeholderTextColor={colors.inkMuted}
                        multiline
                        style={styles.noteInput}
                      />
                    </View>
                    <IconButton
                      name="close"
                      size={TASK_DELETE}
                      iconSize={16}
                      color={colors.inkMuted}
                      background={focused ? colors.surface : colors.surfaceSunken}
                      shadow={false}
                      onPress={() => deleteTaskRow(task.id)}
                      accessibilityLabel={`Remove task ${i + 1}`}
                    />
                  </View>
                );
              })}

              {tasks.length < MAX_TASKS ? (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => addTaskRow()}
                  style={({ pressed }) => [styles.addTask, pressed && styles.pressed]}
                >
                  <Ionicons name="add" size={18} color={colors.ink} />
                  <Text variant="copyBold">Add a task</Text>
                  <Text variant="copyBold" color={colors.inkMuted}>
                    · {tasks.length} of {MAX_TASKS}
                  </Text>
                </Pressable>
              ) : null}
            </View>

            {suggestions.length > 0 && tasks.length < MAX_TASKS ? (
              <>
                <Text variant="metaBold" color={colors.inkMuted} style={styles.heading}>
                  Popular in {topic}
                </Text>
                <View style={styles.chips}>
                  {suggestions.map((label) => (
                    <Pill
                      key={label}
                      label={label}
                      icon="add"
                      tone="muted"
                      labelVariant="metaBold"
                      onPress={() => addSuggestion(label)}
                      style={styles.flatPill}
                    />
                  ))}
                </View>
              </>
            ) : null}
          </>
        ) : null}

        {step === 3 ? (
          <>
            <Question title="Set the rules" />

            <View style={styles.rules}>
              <Rule
                label="Starts"
                hint="Everyone starts together. Joining closes that day."
              >
                <Pill
                  label={longDate(startDate)}
                  icon="calendar-outline"
                  tone="muted"
                  labelVariant="metaBold"
                  onPress={() => {
                    setPendingOffset(startOffset);
                    setStartOpen(true);
                  }}
                  style={styles.flatPill}
                />
              </Rule>
              <Rule label="Length" hint={`Ends ${longDate(endDate)}.`}>
                <Pill
                  label={`${days} days`}
                  trailingIcon="chevron-down"
                  tone="muted"
                  labelVariant="metaBold"
                  onPress={() => setLengthOpen(true)}
                  style={styles.flatPill}
                />
              </Rule>
              <Rule label="Lives" hint={livesHint(lives)}>
                <Pill
                  label={livesLabel(lives)}
                  icon="heart"
                  trailingIcon="chevron-down"
                  tone="muted"
                  labelVariant="metaBold"
                  onPress={() => {
                    setPendingLives(lives);
                    setLivesOpen(true);
                  }}
                  style={styles.flatPill}
                />
              </Rule>
            </View>
          </>
        ) : null}

        {step === 'live' ? (
          <View style={styles.live}>
            <View style={styles.pile}>
              {photos[1] ? (
                <Print photo={photos[1]} tilt={-PRINT_TILT} style={styles.printLeft} />
              ) : null}
              {photos[2] ? (
                <Print photo={photos[2]} tilt={PRINT_TILT} style={styles.printRight} />
              ) : null}
              <Print photo={photos[0]} lead style={styles.printLead} />
            </View>

            <View style={styles.liveText}>
              <Text variant="pageTitle" center>
                {name.trim()} is live
              </Text>
              <Text variant="copy" color={colors.inkMuted} center>
                It starts {longDate(startDate)}. Bring people along before joining closes.
              </Text>
            </View>

            <View style={styles.invites}>
              {FRIENDS.slice(0, INVITE_COUNT).map((friend) => {
                const sent = invited.includes(friend.id);
                return (
                  <View key={friend.id} style={styles.inviteRow}>
                    <Avatar source={friend.avatar} size={INVITE_AVATAR} />
                    <Text variant="copyBold" style={styles.inviteName}>
                      {friend.name}
                    </Text>
                    <Pill
                      label={sent ? 'Invited' : 'Invite'}
                      icon={sent ? 'checkmark' : undefined}
                      // An ink ring, as the design draws it: two solid pills
                      // down the list would stack into a wall of black.
                      tone="outline"
                      size="sm"
                      bold
                      onPress={
                        sent ? undefined : () => setInvited((list) => [...list, friend.id])
                      }
                      // Once sent it has no press and so no button round it,
                      // and a bare pill sets itself to the row's top edge —
                      // held on the row's centre line, it stays put.
                      style={styles.invitePill}
                    />
                  </View>
                );
              })}
            </View>
          </View>
        ) : null}
      </ScreenScroll>

      {/* Docked on a white band like Join on a challenge's preview, so the
          form scrolls away under it rather than showing through. */}
      <View style={[styles.dock, { paddingBottom: dockGap }]}>{dock}</View>

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

      <BottomSheet visible={livesOpen} onDismiss={() => setLivesOpen(false)}>
        <Text variant="sectionHeading" center>
          Lives
        </Text>
        <WheelPicker
          key={livesOpen ? 'open' : 'closed'}
          values={LIFE_OPTIONS}
          value={pendingLives}
          onChange={setPendingLives}
          format={livesLabel}
          style={styles.wheel}
        />
        <PrimaryButton
          label="Done"
          onPress={() => {
            setLives(pendingLives);
            setLivesOpen(false);
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

/** Each step's one question, with the line under it saying what it's for. */
function Question({ title, hint }: { title: string; hint?: string }) {
  return (
    <View style={styles.question}>
      <Text variant="pageTitle">{title}</Text>
      {hint ? (
        <Text variant="copy" color={colors.inkMuted}>
          {hint}
        </Text>
      ) : null}
    </View>
  );
}

/**
 * The cover as the mosaic it will be: the first photo large, the rest beside
 * it. Whatever's still missing is one tile saying how many more, in the space
 * those photos will take, so the gap always reads as a single ask.
 */
function Cover({
  photos,
  width,
  onPick,
}: {
  photos: readonly TaskPhoto[];
  width: number;
  onPick: (slot: number) => void;
}) {
  const missing = PHOTO_COUNT - photos.length;
  const leadWidth = Math.round(((width - layout.grid) * 2) / 3);
  const sideWidth = width - layout.grid - leadWidth;

  const add = (w: number, h: number, label: string) => (
    <PhotoSlot
      photo={null}
      width={w}
      height={h}
      radius={radii.md}
      emptyLabel={label}
      onPress={() => onPick(photos.length)}
      accessibilityLabel="Add photos"
    />
  );
  const photo = (i: number, w: number, h: number) => (
    <PhotoSlot
      photo={photos[i]}
      width={w}
      height={h}
      radius={radii.md}
      onPress={() => onPick(i)}
      accessibilityLabel={`Change photo ${i + 1}`}
    />
  );

  if (photos.length === 0) {
    return (
      <View style={styles.cover}>{add(width, COVER_HEIGHT, `Add ${PHOTO_COUNT} photos`)}</View>
    );
  }

  const more = `${missing} more`;
  return (
    <View style={[styles.cover, styles.coverRow]}>
      {photo(0, leadWidth, COVER_HEIGHT)}
      {photos.length === 1 ? (
        add(sideWidth, COVER_HEIGHT, more)
      ) : (
        <View style={styles.coverSide}>
          {photo(1, sideWidth, COVER_TILE)}
          {photos.length === 2 ? add(sideWidth, COVER_TILE, more) : photo(2, sideWidth, COVER_TILE)}
        </View>
      )}
    </View>
  );
}

/** One filled box, the app's one field style — the same grey as a
 * dialog's field and the task cards: its name in the small bold cut, the
 * field under it. */
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

/** A rule: its name and its pill on one line, what it means for people
 * under them — the consequence spelled out, not just the setting. */
function Rule({
  label,
  hint,
  children,
}: {
  label: string;
  hint: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.rule}>
      <View style={styles.ruleRow}>
        <Text variant="itemTitle">{label}</Text>
        {children}
      </View>
      <Text variant="meta" color={colors.inkMuted}>
        {hint}
      </Text>
    </View>
  );
}

/** A photo in the finished page's pile, framed in white like a print. */
function Print({
  photo,
  lead,
  tilt,
  style,
}: {
  photo: TaskPhoto | undefined;
  lead?: boolean;
  tilt?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const w = lead ? PRINT_LEAD_WIDTH : PRINT_WIDTH;
  const h = lead ? PRINT_LEAD_HEIGHT : PRINT_HEIGHT;
  return (
    <View
      style={[
        styles.print,
        tilt ? { transform: [{ rotate: `${tilt}deg` }] } : null,
        style,
      ]}
    >
      <PhotoSlot
        photo={photo ?? null}
        width={w - PRINT_FRAME * 2}
        height={h - PRINT_FRAME * 2}
        radius={radii.md - PRINT_FRAME}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screenRoot: {
    flex: 1,
  },
  question: {
    gap: layout.line,
    marginBottom: layout.section,
  },
  cover: {
    marginBottom: layout.section,
  },
  coverRow: {
    flexDirection: 'row',
    gap: layout.grid,
  },
  coverSide: {
    gap: layout.grid,
  },
  fields: {
    gap: layout.inline,
  },
  field: {
    gap: layout.line,
    backgroundColor: colors.surfaceSunken,
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
  heading: {
    marginTop: layout.section,
    marginBottom: layout.heading,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: layout.stack,
  },
  // Flat, in the palette's fill grey rather than `muted`'s warmer one — the
  // same as the task rows and the fields' fills.
  flatPill: {
    backgroundColor: colors.surfaceSunken,
  },
  taskList: {
    gap: layout.stack,
  },
  // The ring is always drawn, in the row's own fill until the row is being
  // typed in, so focusing one doesn't nudge the list by its width.
  taskRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: layout.inline,
    borderRadius: radii.lg,
    borderWidth: FOCUS_RULE,
    borderColor: colors.surfaceSunken,
    backgroundColor: colors.surfaceSunken,
    paddingVertical: layout.inline,
    paddingLeft: layout.inline,
    paddingRight: layout.stack,
  },
  taskRowFocused: {
    borderColor: colors.ink,
    backgroundColor: colors.surface,
  },
  taskNumber: {
    width: TASK_NUMBER,
    height: TASK_NUMBER,
    borderRadius: radii.sm,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  taskNumberFocused: {
    backgroundColor: colors.surfaceSunken,
  },
  taskFields: {
    flex: 1,
    gap: layout.line,
    // Sits the task's name on the number square's centre line.
    paddingTop: layout.line,
  },
  taskInput: {
    ...typeScale.copyBold,
    color: colors.ink,
    padding: 0,
  },
  noteInput: {
    ...typeScale.meta,
    color: colors.inkMuted,
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
    borderRadius: radii.lg,
    borderWidth: DASH_RULE,
    borderStyle: 'dashed',
    borderColor: colors.inkGhost,
  },
  rules: {
    gap: layout.section,
  },
  rule: {
    gap: layout.stack,
  },
  ruleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  live: {
    alignItems: 'center',
    paddingTop: spacing['4xl'],
  },
  pile: {
    width: PILE_WIDTH,
    height: PILE_HEIGHT,
    marginBottom: layout.section,
  },
  print: {
    position: 'absolute',
    padding: PRINT_FRAME,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    ...shadows.hard,
  },
  // The two behind sit a little lower than the lead, so its top edge is the
  // pile's highest point.
  printLeft: {
    left: 0,
    top: spacing.lg,
  },
  printRight: {
    right: 0,
    top: spacing.lg,
  },
  printLead: {
    left: (PILE_WIDTH - PRINT_LEAD_WIDTH) / 2,
    top: 0,
  },
  liveText: {
    gap: layout.stack,
    marginBottom: layout.section,
  },
  invites: {
    alignSelf: 'stretch',
    gap: layout.block,
  },
  inviteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: layout.inline,
  },
  inviteName: {
    flex: 1,
  },
  invitePill: {
    alignSelf: 'center',
  },
  liveActions: {
    alignItems: 'center',
    gap: layout.block,
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
