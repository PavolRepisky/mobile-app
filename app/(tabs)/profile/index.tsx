import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo } from 'react';

import { ProfileView, type ProfileDay } from '@/components/ProfileView';
import { ScreenScroll } from '@/components/Screen';
import { ScreenHeader } from '@/components/ScreenHeader';
import { orderBySlot, useApp, usePostedDays } from '@/hooks/useAppState';
import { useSession } from '@/hooks/useSession';
import { useMyPastRuns, useSocial } from '@/hooks/useSocial';
import { profileRun } from '@/lib/profileDays';
import { shareProfile } from '@/lib/shareProfile';

/**
 * Your own profile. The page itself is `ProfileView`, the same one anyone
 * else's profile opens on — this screen only reads your days off the app's
 * state and puts Share and Settings in the header.
 *
 * The era you're in comes from the app's own state, so a photo taken a
 * moment ago is already on it. Eras you were in before come from your page
 * on the server, the same one anyone opening your profile reads, and their
 * days stay on it for good.
 */
export default function ProfileScreen() {
  const router = useRouter();
  const {
    profile, currentDay, totalDays, startDate, challenge, tasks, progress, inChallenge,
    daysUntilStart, membershipId, livesLeft, livesTotal, reload,
  } = useApp();
  const { session } = useSession();
  const userId = session?.user.id ?? null;
  const { page, loadPage } = useSocial();

  // Loaded again whenever the era you're in changes — leaving one, or the
  // settle job ending it, is exactly when a run becomes a past one.
  useEffect(() => {
    if (userId) loadPage(userId);
  }, [userId, membershipId, loadPage]);

  const dayOf = useCallback(
    (day: number): ProfileDay => ({
      shots: orderBySlot(tasks, progress[day]).flatMap((task) => {
        const entry = progress[day]?.[task.id];
        return entry?.photo || entry?.photoSeed
          ? [{ key: task.id, photo: entry.thumb ?? entry.photo ?? null, seed: entry.photoSeed ?? null }]
          : [];
      }),
      done: tasks.filter((task) => progress[day]?.[task.id]?.done).length,
    }),
    [tasks, progress],
  );

  // Today is a story as soon as one task has its photo — until then there is
  // nothing to watch, and the photo is just a photo.
  const hasStoryToday = inChallenge && dayOf(currentDay).shots.length > 0;
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
  const openPastDay = useCallback(
    (run: string, day: number) =>
      router.push({ pathname: '/day/[day]', params: { day: String(day), run } }),
    [router],
  );
  const myPage = userId ? page(userId) : undefined;
  const myPastRuns = useMyPastRuns();
  const pastRuns = useMemo(
    () => myPastRuns.map((run) => profileRun(run, openPastDay)),
    [myPastRuns, openPastDay],
  );

  return (
    // Every tab root's fixed title row: the title, then Share — the profile
    // to the phone's own share sheet — and Settings at the end, in reach
    // however far down the days go.
    <ScreenScroll
      tabBar
      onRefresh={() => Promise.all([reload(), userId ? loadPage(userId) : null])}
      tone="plain"
      header={
        <ScreenHeader
          plainTitle="My Profile"
          showBack={false}
          actions={[
            {
              icon: 'share-outline',
              label: 'Share profile',
              onPress: () => {
                if (userId) shareProfile({ id: userId, name: profile.name, handle: profile.handle });
              },
            },
            { icon: 'settings-outline', label: 'Settings', onPress: () => router.push('/account/settings') },
          ]}
        />
      }
    >
      <ProfileView
        // The photo itself is edited in Settings, not from here — a tap on
        // it plays today's story.
        avatar={profile.avatar ?? profile.avatarSeed}
        name={profile.name}
        handle={profile.handle}
        bio={profile.bio}
        challenge={inChallenge ? challenge : null}
        startDate={startDate}
        currentDay={daysUntilStart > 0 ? 0 : currentDay}
        totalDays={totalDays}
        taskCount={tasks.length}
        dayOf={dayOf}
        posted={postedDays}
        pastRuns={pastRuns}
        lives={{ left: livesLeft, total: livesTotal }}
        friendCount={myPage?.friendCount}
        onPlayStory={
          hasStoryToday
            ? () => router.push({ pathname: '/story', params: { day: String(currentDay) } })
            : undefined
        }
        onOpenDay={openDay}
        emptyHint="Finish a day's tasks to see it here."
        daysTitle="My Eras"
      />
    </ScreenScroll>
  );
}
