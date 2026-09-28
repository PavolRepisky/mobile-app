import { useRouter } from 'expo-router';
import { useCallback, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { IconButton } from '@/components/IconButton';
import { profileActionButton, profileActionIcon } from '@/components/ProfileLayout';
import { ProfileView, type ProfileDay } from '@/components/ProfileView';
import { ScreenScroll } from '@/components/Screen';
import { ScreenHeader } from '@/components/ScreenHeader';
import { colors } from '@/constants/theme';
import { useApp, usePostedDays } from '@/hooks/useAppState';

/**
 * Your own profile. The page itself is `ProfileView`, the same one anyone
 * else's profile opens on — this screen only reads your days off the app's
 * state and puts Settings in the header.
 */
export default function ProfileScreen() {
  const router = useRouter();
  const { profile, currentDay, totalDays, startDate, challenge, tasks, progress } = useApp();

  const dayOf = useCallback(
    (day: number): ProfileDay => ({
      shots: tasks.flatMap((task) => {
        const entry = progress[day]?.[task.id];
        return entry?.photo || entry?.photoSeed
          ? [{ key: task.id, photo: entry.photo ?? null, seed: entry.photoSeed ?? null }]
          : [];
      }),
      done: tasks.filter((task) => progress[day]?.[task.id]?.done).length,
    }),
    [tasks, progress],
  );

  // Today is a story as soon as one task has its photo — until then there is
  // nothing to watch, and the photo is just a photo.
  const hasStoryToday = dayOf(currentDay).shots.length > 0;
  const dayFinished = (day: number) => tasks.length > 0 && dayOf(day).done === tasks.length;

  // Same order the day pager pages through — opening a tile and paging down
  // must land on the next tile in this exact sequence. Today only joins the
  // grid once it is finished: until then it is still a story in progress,
  // and the ring above already shows it.
  const postedDays = usePostedDays().filter((day) => day < currentDay || dayFinished(day));

  const openDay = useCallback(
    (day: number) => router.push({ pathname: '/day/[day]', params: { day: String(day) } }),
    [router],
  );
  // Today is being done in Tasks, so that's where its calendar cell leads.
  const today = useMemo(
    () => ({ onPress: () => router.push('/tasks'), hint: 'Opens Tasks.' }),
    [router],
  );

  return (
    <View style={styles.screenRoot}>
      {/* The Profile tab breaks from the warm app shell and sits on white,
          the way the reference screen does. */}
      {/* Every tab root's fixed title row: the title on the gutter and
          Settings at the end, in reach however far down the days go. */}
      <ScreenScroll
        tabBar
        tone="plain"
        header={
          <ScreenHeader
            bar
            plainTitle="My Profile"
            showBack={false}
            right={
              <IconButton
                name="settings-outline"
                size={profileActionButton}
                iconSize={profileActionIcon}
                background={colors.surface}
                onPress={() => router.push('/account/settings')}
                accessibilityLabel="Settings"
              />
            }
          />
        }
      >
        <ProfileView
          // The photo itself is edited in Settings, not from here — and the
          // friend code lives on Find friends, with everything else about
          // adding people.
          avatar={profile.avatar ?? profile.avatarSeed}
          name={profile.name}
          handle={profile.handle}
          bio={profile.bio}
          challenge={challenge}
          startDate={startDate}
          currentDay={currentDay}
          totalDays={totalDays}
          taskCount={tasks.length}
          dayOf={dayOf}
          posted={postedDays}
          onPlayStory={
            hasStoryToday
              ? () => router.push({ pathname: '/story', params: { day: String(currentDay) } })
              : undefined
          }
          onOpenDay={openDay}
          today={today}
          emptyHint="Finish a day's tasks to see it here."
        />
      </ScreenScroll>
    </View>
  );
}

const styles = StyleSheet.create({
  screenRoot: {
    flex: 1,
  },
});
