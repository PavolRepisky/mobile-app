import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { buttonHeight, PrimaryButton } from '@/components/Buttons';
import { ReminderRow } from '@/components/ReminderPill';
import { ScreenScroll } from '@/components/Screen';
import { ScreenHeader } from '@/components/ScreenHeader';
import { SignaturePad } from '@/components/SignaturePad';
import { StepBar } from '@/components/StepBar';
import { Text } from '@/components/Text';
import { colors, layout, radii, tabBarBottom } from '@/constants/theme';
import {
  DEFAULT_TASK_REMINDER,
  LIVES_PER_CHALLENGE,
  useApp,
} from '@/hooks/useAppState';
import { useChallengeListing } from '@/hooks/useChallengeCards';
import { addDays, fullDate, longDate, ordinal } from '@/lib/format';
import { askForNotifications } from '@/lib/reminders';
import { localDay } from '@/lib/round';

/** The tick leading each line of the pledge. */
const PLEDGE_TICK_SIZE = 18;
/** The gear leading the "change them later" line. */
const SETTINGS_ICON = 14;

const STEPS = 2;

/**
 * Joining, after Join on the challenge's own page, in two steps. First when
 * each task should nudge you — a time or Never, and the last call — with a
 * word that it can all be changed later in Settings. Then the pledge — the
 * days, the photos and the lives in the first person — read and signed with
 * a finger. Signing is what joins, and it's only then that the reminders are
 * kept: backing out of the flow leaves the ones you had.
 */
export default function JoinScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { selectChallenge, profile, reminders } = useApp();

  const { section, challenge } = useChallengeListing(String(id));
  const totalDays = challenge.defaultDays;
  const start = localDay(section.startDate);
  const end = addDays(start, totalDays - 1);
  const lives = challenge.lives ?? LIVES_PER_CHALLENGE;

  const [step, setStep] = useState<1 | 2>(1);
  const [signed, setSigned] = useState(false);
  const [signing, setSigning] = useState(false);
  // Waiting on the server to take the signature, and why it didn't if it
  // didn't — most likely the round started while the pledge was being read.
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [today] = useState(() => new Date());

  // A draft of the challenge's reminders, starting from any already set for
  // its tasks, kept until signing.
  const [taskTimes, setTaskTimes] = useState<Record<string, number | null>>(() =>
    Object.fromEntries(
      challenge.tasks.map((task) => [
        task.id,
        task.id in reminders.tasks ? reminders.tasks[task.id] : DEFAULT_TASK_REMINDER,
      ]),
    ),
  );
  const [lastCall, setLastCall] = useState<number | null>(reminders.lastCall);
  /** The one row whose wheel is out — a task's id, or `lastCall`. */
  const [editing, setEditing] = useState<string | null>(null);
  const toggle = (key: string) => setEditing((current) => (current === key ? null : key));

  const back = () => {
    if (step === 1) {
      router.back();
      return;
    }
    // The pad clears as it unmounts, so the button waits on a fresh signature.
    setSigned(false);
    setStep(1);
  };

  const dockGap = tabBarBottom(insets.bottom);

  return (
    // Absolute overlays need a positioned parent, otherwise their offsets
    // resolve against the scroll content instead of the screen.
    <View style={styles.screenRoot}>
      <ScreenScroll
        // Room for the docked button; the scroll already pads for the safe
        // area, which the dock's own gap covers.
        bottomExtra={layout.block + buttonHeight + dockGap - insets.bottom}
        // The pad takes the drag while a finger is signing.
        scrollEnabled={!signing}
        // The create form's bar: the way back, where the flow is, and the
        // count — so the bar never reads as blank.
        header={
          <ScreenHeader
            onBack={back}
            middle={<StepBar step={step} total={STEPS} />}
            right={
              <Text variant="metaBold" color={colors.inkMuted}>
                {step} of {STEPS}
              </Text>
            }
          />
        }
      >
        {step === 1 ? (
          <>
            <View style={styles.question}>
              <Text variant="pageTitle">When should we remind you?</Text>
              <Text variant="copy" color={colors.inkMuted}>
                Pick a time for each task, or Never if you don't need a nudge.
              </Text>
            </View>

            {/* Each pill opens its wheel under its row, the way Settings sets
                them, and the last call closes the list. */}
            <View>
              {challenge.tasks.map((task) => (
                <ReminderRow
                  key={task.id}
                  label={task.label}
                  hint={task.note}
                  strong
                  value={taskTimes[task.id] ?? null}
                  onChange={(at) => setTaskTimes((times) => ({ ...times, [task.id]: at }))}
                  open={editing === task.id}
                  onToggle={() => toggle(task.id)}
                  divider
                />
              ))}
              <ReminderRow
                label="Last call"
                hint="Only if a task is still missing, so you don't lose a life."
                strong
                value={lastCall}
                onChange={setLastCall}
                open={editing === 'lastCall'}
                onToggle={() => toggle('lastCall')}
              />
            </View>

            {/* Said up front, so picking now doesn't feel like for good. */}
            <View style={styles.later}>
              <Ionicons name="settings-outline" size={SETTINGS_ICON} color={colors.inkMuted} />
              <Text variant="meta" color={colors.inkMuted}>
                You can change these any time in Settings.
              </Text>
            </View>
          </>
        ) : (
          <>
            <View style={styles.question}>
              <Text variant="pageTitle">Make it official</Text>
              <Text variant="copy" color={colors.inkMuted}>
                Read it, then sign with your finger.
              </Text>
            </View>

            <View style={styles.pledge}>
              <Text variant="itemTitle">
                I, {profile.name}, commit to {challenge.name}.
              </Text>
              <PledgeLine>
                For {totalDays} days, from {longDate(start)} to {longDate(end)}
              </PledgeLine>
              <PledgeLine>
                {challenge.tasks.length === 1
                  ? 'A photo of the task, every day, before midnight'
                  : `A photo of all ${challenge.tasks.length} tasks, every day, before midnight`}
              </PledgeLine>
              <PledgeLine>
                {lives === 0
                  ? 'No lives — one missed day ends my run'
                  : `${lives} ${lives === 1 ? 'life' : 'lives'} — a ${ordinal(lives + 1)} missed day ends my run`}
              </PledgeLine>
            </View>

            <SignaturePad
              caption={`${profile.name} · ${fullDate(today)}`}
              onSignedChange={setSigned}
              onDrawingChange={setSigning}
              style={styles.signature}
            />
          </>
        )}
      </ScreenScroll>

      {/* Just the button on the page's white: the page is short enough that
          nothing scrolls under it to need a band. */}
      <View style={[styles.dock, { paddingBottom: dockGap }]}>
        {step === 2 && joinError ? (
          <Text variant="meta" center>
            {joinError}
          </Text>
        ) : null}
        {step === 1 ? (
          <PrimaryButton label="Continue" onPress={() => setStep(2)} />
        ) : (
          <PrimaryButton
            label={joining ? 'Joining…' : 'Sign & join'}
            disabled={!signed || joining}
            onPress={async () => {
              setJoining(true);
              setJoinError(null);
              try {
                // The reminders go in with the signature, onto the new
                // membership — not onto the challenge being left.
                await selectChallenge(section.id, start, {
                  tasks: { ...reminders.tasks, ...taskTimes },
                  lastCall,
                });
                // The reminders just picked only fire with the phone's say-so —
                // asked now, the moment they start to mean something.
                await askForNotifications().catch(() => false);
                // Straight onto the day's tasks.
                router.dismissTo('/(tabs)/tasks');
              } catch (e) {
                setJoinError(e instanceof Error ? e.message : 'That didn’t go through. Try again.');
              } finally {
                setJoining(false);
              }
            }}
          />
        )}
      </View>
    </View>
  );
}

/** One line of the pledge, ticked. */
function PledgeLine({ children }: { children: React.ReactNode }) {
  return (
    <View style={styles.pledgeLine}>
      <Ionicons
        name="checkmark"
        size={PLEDGE_TICK_SIZE}
        color={colors.ink}
        style={styles.pledgeTick}
      />
      <Text variant="copy" style={styles.pledgeText}>
        {children}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screenRoot: {
    flex: 1,
    backgroundColor: colors.backgroundPlain,
  },
  question: {
    gap: layout.line,
    marginBottom: layout.section,
  },
  later: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: layout.line,
    marginTop: layout.block,
  },
  pledge: {
    gap: layout.heading,
    padding: layout.card,
    borderRadius: radii.lg,
    backgroundColor: colors.surfaceSunken,
  },
  pledgeLine: {
    flexDirection: 'row',
    gap: layout.stack,
  },
  // Sits the tick on the first line of the text beside it.
  pledgeTick: {
    marginTop: layout.line / 2,
  },
  pledgeText: {
    flex: 1,
  },
  signature: {
    marginTop: layout.section,
  },
  dock: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingTop: layout.block,
    paddingHorizontal: layout.gutter,
    backgroundColor: colors.surface,
    gap: layout.stack,
  },
});
