import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Avatar, type AvatarSource } from '@/components/Avatar';
import { PrimaryButton } from '@/components/Buttons';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { FriendCard } from '@/components/FriendCard';
import { IconButton } from '@/components/IconButton';
import { Pill } from '@/components/Pill';
import {
  profileActionButton,
  profileActionIcon,
  profileActionTop,
} from '@/components/ProfileLayout';
import { ScreenScroll, topPadding } from '@/components/Screen';
import { SegmentedTabs } from '@/components/SegmentedTabs';
import { TaskRing } from '@/components/TaskRing';
import { Text } from '@/components/Text';
import { absoluteFill, colors, gradients, layout, radii } from '@/constants/theme';
import { FEED_AUTHORS, FRIENDS, type Friend } from '@/data/content';
import { useApp } from '@/hooks/useAppState';

type Tab = 'friends' | 'members';

/** A face in the "Still going today" row — big enough to know who it is at
 * a glance, small enough that five sit across a phone before it scrolls. */
const STORY_RING = 64;
/** The round badges leading the lock card and the empty "Finished today"
 * card — the size of the corner button, so the two read as the same kind of
 * mark. */
const CARD_DISC = profileActionButton;
const CARD_DISC_ICON = profileActionIcon;
/** The friends stacked beside "going today" in the lock card. */
const MINI_AVATAR = 26;
/** How far each stacked face tucks under the one before it. */
const MINI_OVERLAP = 9;
const MINI_RING = 2;
/** A face on a progress row — a step under a post's own avatar, since the
 * row is a line of detail, not a post. */
const ROW_AVATAR = 28;
/** Wide enough for a first name, so every row's bar starts on one line. */
const ROW_NAME = 56;
/** The ring's own stroke — the bars are the ring laid straight, the way the
 * profile's challenge bar is. */
const BAR_HEIGHT = 6;
/** The cut between one task's segment and the next on a progress row. */
const BAR_SEGMENT_GAP = 3;
/** The Members card's chevron — a Settings row's own size. */
const CHEVRON = 20;

const doneCount = (person: Friend) => person.tasks.filter((task) => task.done).length;
const finished = (person: Friend) =>
  person.tasks.length > 0 && doneCount(person) === person.tasks.length;

/**
 * The people you're doing it with, split the way the redesign settled it.
 *
 * Friends: everyone still working through today sits in a row of split rings
 * — one segment per task, the profile's own gauge — and a day only becomes a
 * post in "Finished today" once every task is done. Until someone finishes,
 * that section says so and shows how far along everyone is instead.
 *
 * Members: your challenge as a whole — how many have finished today — and
 * the finishers' posts, each with an Add so a stranger doing the same thing
 * can become a friend.
 *
 * Both sit behind the lock until the account has proven today with one
 * photographed task of its own: the card at the top says what to do, and
 * every post's photos stay blurred under a pill saying when they open.
 */
export default function CommunityScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const {
    hasPhotographedTask,
    profile,
    challenge,
    startDate,
    tasks,
    progress,
    captions,
    currentDay,
    trophies,
    livesLeft,
  } = useApp();
  const [tab, setTab] = useState<Tab>('friends');
  // Added from the Members feed — held here the way Add Friends holds its
  // own, since there is no friend graph to write to yet.
  const [added, setAdded] = useState<ReadonlySet<string>>(new Set());

  const locked = !hasPhotographedTask;

  // The shared line the title and the corner button sit on — see Challenges.
  const headerTop = Math.max(profileActionTop, topPadding(insets.top));
  const titleOffset = headerTop - topPadding(insets.top);

  const openProfile = (id: string) =>
    router.push({ pathname: '/friend/[id]', params: { id } });
  const openTasks = () => router.push('/(tabs)/tasks');

  const myAvatar: AvatarSource = profile.avatar ?? profile.avatarSeed;
  const myDone = tasks.filter((task) => progress[currentDay]?.[task.id]?.done).length;
  const myFinished = tasks.length > 0 && myDone === tasks.length;
  const hasStoryToday = tasks.some((task) => {
    const entry = progress[currentDay]?.[task.id];
    return Boolean(entry?.photo || entry?.photoSeed);
  });

  // Your own day, in the same `Friend` shape a card already knows how to
  // draw — a post only once it's finished, like everyone else's. The key is
  // the one Profile's own grid tile hashes its counts from, so the numbers
  // don't drift between the two. The name reads "You": that alone marks it.
  const myPost: Friend | null = useMemo(() => {
    if (!myFinished) return null;
    return {
      id: `day-${currentDay}`,
      name: 'You',
      handle: profile.handle,
      avatar: myAvatar,
      day: currentDay,
      bio: profile.bio,
      friendCount: FRIENDS.length,
      trophies,
      livesLeft,
      caption: captions[currentDay],
      tasks: tasks.map((task) => {
        const entry = progress[currentDay]?.[task.id];
        return {
          label: task.label,
          done: entry?.done ?? false,
          time: entry?.time,
          photo: entry?.photo ?? undefined,
          photoSeed: entry?.photoSeed ?? undefined,
        };
      }),
    };
  }, [myFinished, myAvatar, profile, tasks, progress, captions, currentDay, trophies, livesLeft]);

  const friendsGoing = FRIENDS.filter((friend) => !finished(friend));
  const friendsFinished = FRIENDS.filter(finished);
  const membersFinished = FEED_AUTHORS.filter(finished);

  // Everyone's day at a glance for the empty "Finished today" card, furthest
  // along first — you included, since your day is racing theirs.
  const progressRows = [
    { id: 'you', name: 'You', avatar: myAvatar, done: myDone, total: tasks.length },
    ...FRIENDS.map((friend) => ({
      id: friend.id,
      name: friend.name,
      avatar: friend.avatar,
      done: doneCount(friend),
      total: friend.tasks.length,
    })),
  ].sort((a, b) => b.done / Math.max(b.total, 1) - a.done / Math.max(a.total, 1));

  // The challenge's whole membership, split in the proportion the members in
  // the feed show — the only sample of today there is to read it from.
  const finishedShare = FEED_AUTHORS.length ? membersFinished.length / FEED_AUTHORS.length : 0;
  const membersDone = Math.round(challenge.joined * finishedShare);
  const membersGoing = challenge.joined - membersDone;
  const started = startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  // The lock card speaks to the tab it's on: your friends, or everyone else
  // in the challenge — counted across all of it, the same number the
  // Members card below shows, with faces from the members in the feed.
  const onFriends = tab === 'friends';
  const lockFaces = onFriends ? friendsGoing : FEED_AUTHORS.filter((person) => !finished(person));
  const lockCount = onFriends ? friendsGoing.length : membersGoing;
  const lockGoing = `${lockCount.toLocaleString('en-US')} ${onFriends ? 'friend' : 'member'}${
    lockCount === 1 ? '' : 's'
  } still going`;
  const lockHint = onFriends
    ? "Take a photo of any task to see your friends' days."
    : "Take a photo of any task to see other members' days.";

  const renderPost = (person: Friend, accessory?: React.ReactNode) => (
    <FriendCard
      key={person.id}
      friend={person}
      onPress={() => openProfile(person.id)}
      locked={locked}
      accessory={accessory}
    />
  );

  return (
    // Absolute overlays need a positioned parent, otherwise their offsets
    // resolve against the scroll content instead of the screen.
    <View style={styles.screenRoot}>
      <ScreenScroll tabBar>
        <View style={[styles.header, { marginTop: titleOffset }]}>
          <Text variant="pageTitle" center>
            Community
          </Text>
        </View>

        <SegmentedTabs
          options={[
            { key: 'friends', label: 'Friends' },
            { key: 'members', label: 'Members' },
          ]}
          value={tab}
          onChange={setTab}
          align="left"
          style={styles.tabs}
        />

        {locked ? (
          <Card flat padded={false} radius={radii.md} style={styles.sunkenCard}>
            <View style={styles.cardBody}>
              <View style={styles.lockRow}>
                <View style={[styles.disc, styles.discInk]}>
                  <Ionicons name="lock-closed" size={CARD_DISC_ICON} color={colors.inkInverse} />
                </View>
                <View style={styles.lockText}>
                  <Text variant="itemTitle">Post to unlock</Text>
                  <Text variant="meta" color={colors.inkMuted}>
                    {lockHint}
                  </Text>
                </View>
              </View>
              <View style={styles.lockFooter}>
                <View style={styles.lockGoing}>
                  <View style={styles.miniStack}>
                    {lockFaces.slice(0, 3).map((person, i) => (
                      <Avatar
                        key={person.id}
                        source={person.avatar}
                        size={MINI_AVATAR}
                        style={[styles.miniAvatar, i > 0 && styles.miniTucked]}
                      />
                    ))}
                  </View>
                  <Text variant="meta" color={colors.inkMuted} numberOfLines={2} style={styles.flex}>
                    {lockGoing}
                  </Text>
                </View>
                <Pill
                  tone="solid"
                  icon="camera-outline"
                  label="Shoot a task"
                  bold
                  onPress={openTasks}
                />
              </View>
            </View>
          </Card>
        ) : null}

        {tab === 'friends' ? (
          <>
            {/* Stories are what the lock holds back, so the row only shows
                once it's open. */}
            {!locked && (friendsGoing.length > 0 || !myFinished) ? (
              <View style={styles.section}>
                <Text variant="meta" color={colors.inkMuted} style={styles.heading}>
                  Still going today
                </Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.storyBleed}
                  contentContainerStyle={styles.storyRow}
                >
                  {myFinished ? null : (
                    <StoryFace
                      name="You"
                      avatar={myAvatar}
                      done={myDone}
                      total={tasks.length}
                      onPress={() =>
                        hasStoryToday
                          ? router.push({ pathname: '/story', params: { day: String(currentDay) } })
                          : openTasks()
                      }
                    />
                  )}
                  {friendsGoing.map((friend) => (
                    <StoryFace
                      key={friend.id}
                      name={friend.name}
                      avatar={friend.avatar}
                      done={doneCount(friend)}
                      total={friend.tasks.length}
                      onPress={() => openProfile(friend.id)}
                    />
                  ))}
                </ScrollView>
              </View>
            ) : null}

            <SectionHeading
              title="Finished today"
              meta={String(friendsFinished.length + (myPost ? 1 : 0))}
            />

            {myPost || friendsFinished.length ? (
              <View style={styles.posts}>
                {myPost ? <FriendCard friend={myPost} locked={false} /> : null}
                {friendsFinished.map((friend) => renderPost(friend))}
              </View>
            ) : (
              <Card flat padded={false} radius={radii.md} style={styles.sunkenCard}>
                <View style={[styles.cardBody, styles.emptyBody]}>
                  <View style={styles.emptyIntro}>
                    <View style={[styles.disc, styles.discWhite]}>
                      <Ionicons name="flag-outline" size={CARD_DISC_ICON} color={colors.ink} />
                    </View>
                    <Text variant="itemTitle" center>
                      No one has finished today yet
                    </Text>
                    <Text variant="meta" color={colors.inkMuted} center>
                      {`Finish all ${tasks.length} and your day lands here first.`}
                    </Text>
                  </View>
                  <View style={styles.progressRows}>
                    {progressRows.map((row) => (
                      <ProgressRow key={row.id} {...row} />
                    ))}
                  </View>
                  {locked ? null : (
                    <PrimaryButton
                      label="Shoot your next task"
                      icon="camera-outline"
                      onPress={openTasks}
                    />
                  )}
                </View>
              </Card>
            )}
          </>
        ) : (
          <>
            {/* The challenge everyone here shares, and how today is going
                across all of it. */}
            <Card
              flat
              padded={false}
              radius={radii.md}
              onPress={() => router.push({ pathname: '/feed/[id]', params: { id: challenge.id } })}
              accessibilityLabel={`${challenge.name}, ${membersDone} finished today`}
              accessibilityHint="Opens the challenge"
              style={styles.sunkenCard}
            >
              <View style={styles.cardBody}>
                <View>
                  <View style={styles.challengeRow}>
                    <Text variant="itemTitle" numberOfLines={1} style={styles.flex}>
                      {challenge.name}
                    </Text>
                    <Ionicons name="chevron-forward" size={CHEVRON} color={colors.inkMuted} />
                  </View>
                  <Text variant="meta" color={colors.inkMuted}>
                    {`Started ${started} · ${challenge.joined.toLocaleString('en-US')} members`}
                  </Text>
                </View>
                <View style={styles.barBlock}>
                  <View style={styles.barTrack}>
                    <View style={[styles.barFill, { width: `${finishedShare * 100}%` }]}>
                      <LinearGradient
                        colors={gradients.accent}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={absoluteFill}
                      />
                    </View>
                  </View>
                  <View style={styles.barLabels}>
                    <Text variant="metaBold">
                      {`${membersDone.toLocaleString('en-US')} finished today`}
                    </Text>
                    <Text variant="meta" color={colors.inkMuted}>
                      {`${membersGoing.toLocaleString('en-US')} still going`}
                    </Text>
                  </View>
                </View>
              </View>
            </Card>

            <SectionHeading title="Finished today" meta="newest first" />

            {membersFinished.length ? (
              <View style={styles.posts}>
                {membersFinished.map((person) => {
                  const isAdded = added.has(person.id);
                  return renderPost(
                    person,
                    <Pill
                      tone={isAdded ? 'muted' : 'solid'}
                      size="sm"
                      bold
                      icon={isAdded ? 'checkmark' : 'person-add'}
                      label={isAdded ? 'Added' : 'Add'}
                      onPress={
                        isAdded
                          ? undefined
                          : () => setAdded((prev) => new Set(prev).add(person.id))
                      }
                    />,
                  );
                })}
              </View>
            ) : (
              <EmptyState
                icon="flag-outline"
                title="No one has finished today yet"
                hint="Finished days land here, newest first."
              />
            )}
          </>
        )}
      </ScreenScroll>

      <IconButton
        name="person-add-outline"
        size={profileActionButton}
        iconSize={profileActionIcon}
        background={colors.surface}
        onPress={() => router.push('/add-friends')}
        accessibilityLabel="Find friends"
        style={[styles.cornerRight, { top: headerTop }]}
      />
    </View>
  );
}

/** A section's title with its quiet count or note at the far end — the way
 * My Profile sets "Days" against its switch. */
function SectionHeading({ title, meta }: { title: string; meta: string }) {
  return (
    <View style={styles.sectionHeading}>
      <Text variant="sectionHeading">{title}</Text>
      <Text variant="metaBold" color={colors.inkMuted}>
        {meta}
      </Text>
    </View>
  );
}

function StoryFace({
  name,
  avatar,
  done,
  total,
  onPress,
}: {
  name: string;
  avatar: AvatarSource;
  done: number;
  total: number;
  onPress: () => void;
}) {
  return (
    <View style={styles.storyFace}>
      <TaskRing
        avatar={avatar}
        done={done}
        total={total}
        size={STORY_RING}
        onPress={onPress}
        accessibilityLabel={`${name}, ${done} of ${total} done`}
      />
      <Text variant="meta" numberOfLines={1} center style={styles.storyName}>
        {name}
      </Text>
    </View>
  );
}

/** One person's day as a line: face, name, a bar cut into their own tasks,
 * and the count. */
function ProgressRow({
  name,
  avatar,
  done,
  total,
}: {
  name: string;
  avatar: AvatarSource;
  done: number;
  total: number;
}) {
  return (
    <View style={styles.progressRow} accessibilityLabel={`${name}, ${done} of ${total} done`}>
      <Avatar source={avatar} size={ROW_AVATAR} />
      <Text variant="metaBold" numberOfLines={1} style={styles.rowName}>
        {name}
      </Text>
      <View style={styles.segments}>
        {Array.from({ length: total }, (_, i) => (
          <View key={i} style={[styles.segment, i < done && styles.segmentDone]} />
        ))}
      </View>
      <Text variant="metaBold" color={colors.inkMuted}>
        {`${done}/${total}`}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screenRoot: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  // Sized to the corner button, so the title centres on the same line as the
  // button pinned beside it — the way My Profile lines up its own two.
  header: {
    minHeight: profileActionButton,
    justifyContent: 'center',
    marginBottom: layout.title,
  },
  cornerRight: {
    position: 'absolute',
    right: layout.gutter,
  },
  tabs: {
    marginBottom: layout.section,
  },
  // My Profile's challenge card: the fill grey, the `md` corner, no shadow.
  sunkenCard: {
    marginBottom: layout.section,
    backgroundColor: colors.surfaceSunken,
  },
  cardBody: {
    padding: layout.card,
    gap: layout.block,
  },
  disc: {
    width: CARD_DISC,
    height: CARD_DISC,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  discInk: {
    backgroundColor: colors.ink,
  },
  discWhite: {
    backgroundColor: colors.surface,
  },
  lockRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: layout.inline,
  },
  lockText: {
    flex: 1,
    gap: layout.line,
  },
  lockFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: layout.inline,
  },
  lockGoing: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: layout.stack,
  },
  miniStack: {
    flexDirection: 'row',
  },
  // Ringed in the card's own grey, so each face reads as tucked behind the
  // next rather than merged into it.
  miniAvatar: {
    borderWidth: MINI_RING,
    borderColor: colors.surfaceSunken,
    borderRadius: radii.pill,
  },
  miniTucked: {
    marginLeft: -MINI_OVERLAP,
  },
  section: {
    marginBottom: layout.section,
  },
  heading: {
    marginBottom: layout.heading,
  },
  // The row runs to the screen's edges, so faces scroll in from under the
  // edge rather than stopping short at the gutter.
  storyBleed: {
    marginHorizontal: -layout.gutter,
  },
  storyRow: {
    paddingHorizontal: layout.gutter,
    gap: layout.inline,
  },
  // A heading's gap under the ring leaves room for the badge hanging off it
  // before the name starts.
  storyFace: {
    width: STORY_RING,
    alignItems: 'center',
    gap: layout.heading,
  },
  storyName: {
    alignSelf: 'stretch',
  },
  sectionHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: layout.heading,
  },
  posts: {
    gap: layout.section,
  },
  emptyBody: {
    gap: layout.section,
  },
  emptyIntro: {
    alignItems: 'center',
    gap: layout.line,
  },
  progressRows: {
    gap: layout.stack,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: layout.inline,
  },
  rowName: {
    width: ROW_NAME,
  },
  segments: {
    flex: 1,
    flexDirection: 'row',
    gap: BAR_SEGMENT_GAP,
  },
  // White on the card's grey, the way the profile's challenge bar keeps its
  // track: a divider grey sits within a shade of the fill and vanishes.
  segment: {
    flex: 1,
    height: BAR_HEIGHT,
    borderRadius: radii.pill,
    backgroundColor: colors.surface,
  },
  segmentDone: {
    backgroundColor: colors.ink,
  },
  challengeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: layout.inline,
  },
  barBlock: {
    gap: layout.stack,
  },
  barTrack: {
    height: BAR_HEIGHT,
    borderRadius: radii.pill,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: radii.pill,
    overflow: 'hidden',
  },
  barLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
});
