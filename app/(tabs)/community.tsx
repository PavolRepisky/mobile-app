import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Avatar, type AvatarSource } from '@/components/Avatar';
import { PrimaryButton } from '@/components/Buttons';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { FriendCard } from '@/components/FriendCard';
import { IconButton, cornerButtonSize, cornerIconSize } from '@/components/IconButton';
import { Pill } from '@/components/Pill';
import { ScreenScroll } from '@/components/Screen';
import { ScreenHeader } from '@/components/ScreenHeader';
import { SegmentedTabs } from '@/components/SegmentedTabs';
import { TaskRing } from '@/components/TaskRing';
import { Text } from '@/components/Text';
import { colors, layout, radii } from '@/constants/theme';
import { FEED_AUTHORS, FRIENDS, type Friend } from '@/data/content';
import { orderBySlot, useApp } from '@/hooks/useAppState';

type Tab = 'friends' | 'members';

/** A face in the "Still going today" row — the canvas's 72, a step up from
 * the old 64 so the row reads as stories rather than a strip of avatars;
 * four and a bit sit across a phone, the cut-off face saying it scrolls. */
const STORY_RING = 72;
/** The round badges leading the lock card and the empty "Finished today"
 * card — the size of the corner button, so the two read as the same kind of
 * mark. */
const CARD_DISC = cornerButtonSize;
const CARD_DISC_ICON = cornerIconSize;
/** The friends stacked beside "going today" in the lock card. */
const MINI_AVATAR = 26;
/** How far each stacked face tucks under the one before it. */
const MINI_OVERLAP = 9;
const MINI_RING = 2;
/** A face on a progress row — a step under a post's own avatar, since the
 * row is a line of detail, not a post. */
const ROW_AVATAR = 28;
/** A face on a member card — the size of the old story ring, big enough to
 * know a stranger by before adding them. */
const MEMBER_AVATAR = 64;
/** Two cards and most of a third across a phone, so the row says it
 * scrolls — and wide enough that "Request sent" fits the pill on one line. */
const MEMBER_CARD = 140;
/** Wide enough for a first name, so every row's bar starts on one line. */
const ROW_NAME = 56;
/** The ring's own stroke — the bars are the ring laid straight, the way the
 * profile's challenge bar is. */
const BAR_HEIGHT = 6;
/** The cut between one task's segment and the next on a progress row. */
const BAR_SEGMENT_GAP = 3;

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
 * Members: the finishers' posts from your challenge as a whole, each with
 * an Add so a stranger doing the same thing can become a friend.
 *
 * Both sit behind the lock until the account has proven today with one
 * photographed task of its own: the card at the top says what to do, and
 * every post's photos stay blurred under a pill saying when they open.
 */
export default function CommunityScreen() {
  const router = useRouter();
  const {
    feedLocked,
    inChallenge,
    daysUntilStart,
    profile,
    challenge,
    tasks,
    progress,
    captions,
    currentDay,
    livesLeft,
    watchedStories,
    friendRequests: added,
    toggleFriendRequest: toggleAdded,
  } = useApp();
  const [tab, setTab] = useState<Tab>('friends');

  // A story's last frame links the post it became: `post` names it, and the
  // feed opens on the tab it's in and scrolls it up under the title. Stories
  // only last the day, so the link lands here in the feed, where the post
  // stays. Positions are measured as the posts lay out — each post's offset
  // inside its tab's list, plus that list's offset in the scroll — and the
  // param is cleared once used, so coming back to the tab doesn't jump again.
  const { post: focusPost } = useLocalSearchParams<{ post?: string }>();
  const scrollRef = useRef<ScrollView>(null);
  const listY = useRef<Partial<Record<Tab, number>>>({});
  const postY = useRef<Record<string, number>>({});
  const focusTab: Tab | null = focusPost
    ? FEED_AUTHORS.some((person) => person.id === focusPost)
      ? 'members'
      : 'friends'
    : null;

  useEffect(() => {
    if (focusTab) setTab(focusTab);
  }, [focusPost, focusTab]);

  const scrollToFocus = () => {
    if (!focusPost || !focusTab || tab !== focusTab) return;
    const list = listY.current[focusTab];
    const item = postY.current[focusPost];
    if (list === undefined || item === undefined) return;
    scrollRef.current?.scrollTo({ y: Math.max(0, list + item - layout.section), animated: true });
    router.setParams({ post: undefined });
  };

  const onListLayout = (which: Tab) => (y: number) => {
    listY.current[which] = y;
    scrollToFocus();
  };
  const onPostLayout = (id: string) => (y: number) => {
    postY.current[id] = y;
    scrollToFocus();
  };

  // Only while there is a today of your own to prove — see `feedLocked`.
  const locked = feedLocked;

  const openProfile = (id: string) =>
    router.push({ pathname: '/friend/[id]', params: { id } });
  const openTasks = () => router.push('/(tabs)/tasks');

  const myAvatar: AvatarSource = profile.avatar ?? profile.avatarSeed;
  // Whether you have a today of your own: in a challenge that has started.
  // Without one there's no face of yours in the rows, no progress of yours
  // to race and no post of yours — only everyone else's.
  const myDayRunning = inChallenge && daysUntilStart === 0;
  const myDone = myDayRunning
    ? tasks.filter((task) => progress[currentDay]?.[task.id]?.done).length
    : 0;
  const myFinished = myDayRunning && tasks.length > 0 && myDone === tasks.length;
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
      livesLeft,
      caption: captions[currentDay],
      // In the squares they were shot into on the Tasks tab, so the post
      // goes up the way it was laid out there.
      tasks: orderBySlot(tasks, progress[currentDay]).map((task) => {
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
  }, [myFinished, myAvatar, profile, tasks, progress, captions, currentDay, livesLeft]);

  const friendsGoing = FRIENDS.filter((friend) => !finished(friend));

  // The "Still going today" row as the story viewer plays it through: you,
  // then everyone after you, skipping faces with no photo yet — there's no
  // story there to land on. `me` is the viewer's name for yours.
  const storyQueue = [
    ...(myDayRunning && !myFinished && hasStoryToday ? ['me'] : []),
    ...friendsGoing
      .filter((friend) => friend.tasks.some((task) => task.photo || task.photoSeed))
      .map((friend) => friend.id),
  ].join(',');
  const friendsFinished = FRIENDS.filter(finished);
  const membersFinished = FEED_AUTHORS.filter(finished);

  // Everyone's day at a glance for the empty "Finished today" card, furthest
  // along first — you included, since your day is racing theirs.
  const progressRows = [
    ...(myDayRunning
      ? [{ id: 'you', name: 'You', avatar: myAvatar, done: myDone, total: tasks.length }]
      : []),
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

  // The lock card speaks to the tab it's on: your friends, or everyone else
  // in the challenge — counted across all of it, with faces from the
  // members in the feed.
  const onFriends = tab === 'friends';
  const lockFaces = onFriends ? friendsGoing : FEED_AUTHORS.filter((person) => !finished(person));
  const lockCount = onFriends ? friendsGoing.length : membersGoing;
  const lockGoing = `${lockCount.toLocaleString('en-US')} ${onFriends ? 'friend' : 'member'}${
    lockCount === 1 ? '' : 's'
  } still going`;
  const lockHint = onFriends
    ? "Finish any of today's tasks to see how your friends are doing."
    : "Finish any of today's tasks to see how other members are doing.";

  const renderPost = (person: Friend, accessory?: React.ReactNode) => (
    <View key={person.id} onLayout={(e) => onPostLayout(person.id)(e.nativeEvent.layout.y)}>
      <FriendCard
        friend={person}
        onPress={() => openProfile(person.id)}
        locked={locked}
        accessory={accessory}
      />
    </View>
  );

  return (
    // Challenges' own fixed title row: the title on the gutter, Find friends
    // at the end, staying put while the feed scrolls under it.
    <View style={styles.screenRoot}>
      <ScreenScroll
        tabBar
        ref={scrollRef}
        header={
          <ScreenHeader
            plainTitle="Community"
            showBack={false}
            right={
              <IconButton
                name="person-add-outline"
                size={cornerButtonSize}
                iconSize={cornerIconSize}
                background={colors.surface}
                onPress={() => router.push('/add-friends')}
                accessibilityLabel="Find friends"
              />
            }
          />
        }
      >

        <SegmentedTabs
          options={[
            { key: 'friends', label: 'Friends' },
            { key: 'members', label: 'Members' },
          ]}
          value={tab}
          onChange={setTab}
          style={styles.tabs}
        />


        {locked ? (
          <Card flat radius={radii.md} style={styles.sunkenCard}>
            <View style={styles.cardBody}>
              <View style={styles.lockRow}>
                <View style={[styles.disc, styles.discInk]}>
                  <Ionicons name="lock-closed" size={CARD_DISC_ICON} color={colors.inkInverse} />
                </View>
                <View style={styles.lockText}>
                  <Text variant="itemTitle">Complete a task to unlock</Text>
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
            {!locked && (friendsGoing.length > 0 || (myDayRunning && !myFinished)) ? (
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
                  {myFinished || !myDayRunning ? null : (
                    <StoryFace
                      name="You"
                      avatar={myAvatar}
                      done={myDone}
                      total={tasks.length}
                      watched={watchedStories[`me-${currentDay}`]?.length ?? 0}
                      onPress={() =>
                        hasStoryToday
                          ? router.push({
                              pathname: '/story',
                              params: { day: String(currentDay), queue: storyQueue },
                            })
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
                      watched={watchedStories[friend.id]?.length ?? 0}
                      // The same story viewer yours opens in.
                      onPress={() =>
                        router.push({
                          pathname: '/story',
                          params: { friend: friend.id, queue: storyQueue },
                        })
                      }
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
              <View
                style={styles.posts}
                onLayout={(e) => onListLayout('friends')(e.nativeEvent.layout.y)}
              >
                {myPost ? (
                  <View onLayout={(e) => onPostLayout(myPost.id)(e.nativeEvent.layout.y)}>
                    <FriendCard friend={myPost} locked={false} />
                  </View>
                ) : null}
                {friendsFinished.map((friend) => renderPost(friend))}
              </View>
            ) : (
              <Card flat radius={radii.md} style={styles.sunkenCard}>
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
            {/* Everyone else on the challenge, finished today or not, as
                faces to add — the feed below only shows who's done. Shares
                the posts' requests, so adding here flips their Add too. */}
            {FEED_AUTHORS.length ? (
              <View style={styles.section}>
                <SectionHeading
                  title="In it with you"
                  meta={challenge.joined.toLocaleString('en-US')}
                />
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.storyBleed}
                  contentContainerStyle={styles.memberRow}
                >
                  {FEED_AUTHORS.map((person) => (
                    <MemberCard
                      key={person.id}
                      person={person}
                      added={added.has(person.id)}
                      onPress={() => openProfile(person.id)}
                      onToggleAdd={() => toggleAdded(person.id)}
                    />
                  ))}
                </ScrollView>
              </View>
            ) : null}

            <SectionHeading title="Finished today" meta={String(membersFinished.length)} />

            {membersFinished.length ? (
              <View
                style={styles.posts}
                onLayout={(e) => onListLayout('members')(e.nativeEvent.layout.y)}
              >
                {membersFinished.map((person) => {
                  const isAdded = added.has(person.id);
                  return renderPost(
                    person,
                    <Pill
                      tone={isAdded ? 'muted' : 'solid'}
                      size="sm"
                      bold
                      // Just the words once sent: the request is waiting on
                      // them, and a check would say it's done.
                      icon={isAdded ? undefined : 'person-add'}
                      label={isAdded ? 'Request sent' : 'Add'}
                      onPress={() => toggleAdded(person.id)}
                    />,
                  );
                })}
              </View>
            ) : (
              <EmptyState
                icon="flag-outline"
                disc
                title="No one has finished today yet"
                hint="Finished days land here, newest first."
              />
            )}
          </>
        )}
      </ScreenScroll>
    </View>
  );
}

/** A section's title with its quiet count at the far end — the way My
 * Profile sets "Days" against its switch. */
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
  watched,
  onPress,
}: {
  name: string;
  avatar: AvatarSource;
  done: number;
  total: number;
  watched: number;
  onPress: () => void;
}) {
  return (
    <View style={styles.storyFace}>
      <TaskRing
        avatar={avatar}
        done={done}
        total={total}
        watched={watched}
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

/** A stranger on the challenge as a card to add: face, name, how their
 * today is going, and the same Add the Members posts carry. Not their day —
 * everyone here is on the challenge's same day, so it would read the same on
 * every card. */
function MemberCard({
  person,
  added,
  onPress,
  onToggleAdd,
}: {
  person: Friend;
  added: boolean;
  onPress: () => void;
  onToggleAdd: () => void;
}) {
  return (
    <View style={styles.memberCard}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${person.name}'s profile`}
        onPress={onPress}
        style={({ pressed }) => [styles.memberWho, pressed && styles.pressed]}
      >
        <Avatar source={person.avatar} size={MEMBER_AVATAR} />
        <View style={styles.memberText}>
          <Text variant="copyBold" numberOfLines={1} center>
            {person.name}
          </Text>
          <Text variant="badge" color={colors.inkMuted} center>
            {finished(person)
              ? 'Done today'
              : `${doneCount(person)}/${person.tasks.length} today`}
          </Text>
        </View>
      </Pressable>
      {/* Sent, the pill turns white rather than the posts' muted grey — on
          the card's own fill grey, grey vanished. */}
      <Pill
        tone={added ? 'floating' : 'solid'}
        size="sm"
        bold
        icon={added ? undefined : 'person-add'}
        label={added ? 'Request sent' : 'Add'}
        onPress={onToggleAdd}
        style={styles.memberAdd}
      />
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
  memberRow: {
    paddingHorizontal: layout.gutter,
    gap: layout.stack,
  },
  // The fill grey the page's other cards sit in; stretched so the Add runs
  // the card's width.
  memberCard: {
    width: MEMBER_CARD,
    padding: layout.block,
    gap: layout.stack,
    borderRadius: radii.lg,
    backgroundColor: colors.surfaceSunken,
  },
  memberWho: {
    alignItems: 'center',
    gap: layout.stack,
  },
  memberText: {
    alignSelf: 'stretch',
  },
  memberAdd: {
    alignSelf: 'stretch',
  },
  pressed: {
    opacity: 0.7,
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
});
