import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { ProfileHeader, ProfileView } from '@/components/ProfileView';
import { ScreenScroll } from '@/components/Screen';
import { useSession } from '@/hooks/useSession';
import { useRelation, useSocial } from '@/hooks/useSocial';
import { possessive } from '@/lib/names';
import { profileDays, profileRun } from '@/lib/profileDays';
import { shareProfile } from '@/lib/shareProfile';

/**
 * A friend's or a challenge member's profile, opened from the Community tab,
 * a story, Find friends, or who posted in a challenge feed. It is your own
 * Profile page — `ProfileView` under `ProfileHeader`, the same ring, card,
 * days and username title — with the way back in place of Settings, since
 * there's nothing here to edit.
 *
 * Whoever Community already loaded shows at once; their whole run — every
 * earlier day — fills in as it arrives. Their today keeps to the Community
 * lock: until you've proven your own, its photos don't come through.
 */
export default function FriendProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const userId = String(id);
  const router = useRouter();
  const { session } = useSession();
  const social = useSocial();
  const { loadPage, accept, toggleRequest } = social;
  const relation = useRelation(userId);

  useEffect(() => {
    loadPage(userId);
  }, [userId, loadPage]);

  const page = social.page(userId);
  const friend = page?.person ?? social.person(userId);

  const days = useMemo(
    () => profileDays(page?.days ?? (friend ? [{ day: friend.day, tasks: friend.tasks }] : [])),
    [page, friend],
  );
  const dayOf = useCallback((day: number) => days.get(day) ?? null, [days]);

  const taskCount = friend?.tasks.length ?? 0;
  const today = friend?.day ?? 0;
  const hasStoryToday = Boolean(days.get(today)?.shots.length);

  const posted = [...days.entries()]
    .filter(([day, record]) => record.shots.length > 0 && (day < today || record.done === taskCount))
    .map(([day]) => day)
    .sort((a, b) => b - a);

  const playStory = useCallback(
    () => router.push({ pathname: '/story', params: { friend: userId } }),
    [router, userId],
  );
  const openDay = useCallback(
    (day: number) =>
      router.push({ pathname: '/friend/post/[id]', params: { id: userId, day: String(day) } }),
    [router, userId],
  );
  const openPastDay = useCallback(
    (run: string, day: number) =>
      router.push({ pathname: '/friend/post/[id]', params: { id: userId, day: String(day), run } }),
    [router, userId],
  );
  const pastRuns = useMemo(
    () => (page?.pastRuns ?? []).map((run) => profileRun(run, openPastDay)),
    [page, openPastDay],
  );
  // Your own link, shared from your profile and opened on your phone: your
  // own page is the Profile tab, not this one with Add friend on it.
  if (userId === session?.user.id) return <Redirect href="/profile" />;

  if (!friend) {
    // Nothing loaded yet: the bar, so the way back is there from the start.
    return (
      <View style={styles.screenRoot}>
        <ScreenScroll tone="plain" header={<ProfileHeader />}>
          {null}
        </ScreenScroll>
      </View>
    );
  }

  // What the first button says follows where you stand with them: already
  // friends, asked by them (one tap accepts), asked by you, or neither.
  const relationAction = relation.isFriend
    ? { label: 'Friends' }
    : relation.requestReceived
      ? { label: 'Accept request', onPress: () => accept(userId) }
      : {
          label: relation.requestSent ? 'Request sent' : 'Add friend',
          onPress: () => toggleRequest(userId),
        };
  const actions = [
    relationAction,
    {
      label: 'Share profile',
      onPress: () => shareProfile({ id: userId, name: friend.name, handle: friend.handle }),
    },
  ];

  return (
    <View style={styles.screenRoot}>
      {/* Every pushed page's fixed bar: the way back, then their username. */}
      <ScreenScroll
        tone="plain"
        onRefresh={() => loadPage(userId)}
        header={<ProfileHeader handle={friend.handle} />}
      >
        <ProfileView
          avatar={friend.avatar}
          name={friend.name}
          bio={friend.bio}
          challenge={page?.challenge ?? null}
          startDate={page?.startDate ?? new Date()}
          currentDay={today}
          totalDays={page?.totalDays ?? today}
          taskCount={taskCount}
          dayOf={dayOf}
          posted={posted}
          pastRuns={pastRuns}
          lives={page?.lives ?? undefined}
          friendCount={page?.friendCount}
          onPlayStory={hasStoryToday ? playStory : undefined}
          onOpenDay={openDay}
          emptyHint={`${friend.name} hasn't finished a day yet.`}
          daysTitle={`${possessive(friend.name)} Eras`}
          actions={actions}
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
