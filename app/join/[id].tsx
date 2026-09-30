import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { buttonHeight, PrimaryButton } from '@/components/Buttons';
import { ScreenScroll } from '@/components/Screen';
import { ScreenHeader } from '@/components/ScreenHeader';
import { SignaturePad } from '@/components/SignaturePad';
import { Text } from '@/components/Text';
import { colors, layout, radii, tabBarBottom } from '@/constants/theme';
import { challengeById } from '@/data/challenges';
import { DISCOVER } from '@/data/content';
import { LIVES_PER_CHALLENGE, useApp } from '@/hooks/useAppState';
import { addDays, fullDate, longDate, ordinal } from '@/lib/format';
import { localDay } from '@/lib/round';

/** The tick leading each line of the pledge. */
const PLEDGE_TICK_SIZE = 18;

/**
 * Joining, after Join on the challenge's own page: the pledge — the days, the
 * photos and the lives in the first person — read and signed with a finger.
 * Signing is what joins. Reminders are set on the Tasks tab, not here.
 */
export default function JoinScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { selectChallenge, profile } = useApp();

  const section = DISCOVER.find((s) => s.id === String(id)) ?? DISCOVER[0];
  const challenge = challengeById(section.id);
  const totalDays = challenge.defaultDays;
  const start = localDay(section.startDate);
  const end = addDays(start, totalDays - 1);
  const lives = challenge.lives ?? LIVES_PER_CHALLENGE;

  const [signed, setSigned] = useState(false);
  const [signing, setSigning] = useState(false);
  const [today] = useState(() => new Date());

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
        header={<ScreenHeader />}
      >
        <View style={styles.question}>
          <Text variant="headlineSm">Make it official</Text>
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
      </ScreenScroll>

      {/* Just the button on the page's white: the page is short enough that
          nothing scrolls under it to need a band. */}
      <View style={[styles.dock, { paddingBottom: dockGap }]}>
        <PrimaryButton
          label="Sign & join"
          disabled={!signed}
          onPress={() => {
            selectChallenge(section.id, start);
            // Straight onto the day's tasks, where the reminders are set.
            router.dismissTo('/(tabs)/tasks');
          }}
        />
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
  },
});
