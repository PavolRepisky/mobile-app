import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Avatar } from '@/components/Avatar';
import { Card } from '@/components/Card';
import { IconButton } from '@/components/IconButton';
import { PhotoStrip } from '@/components/PhotoStrip';
import { PhotoViewer } from '@/components/PhotoViewer';
import { Pill } from '@/components/Pill';
import { PrimaryButton } from '@/components/Buttons';
import { profileActionTop } from '@/components/ProfileLayout';
import { ReviewCard } from '@/components/ReviewCard';
import { ScreenScroll, topPadding } from '@/components/Screen';
import { TaskRow } from '@/components/TaskRow';
import { Text } from '@/components/Text';
import {
  colors,
  radii,
  screenPadding,
  shadows,
  spacing,
  tabBar,
  tabBarBottom,
} from '@/constants/theme';
import { challengeById } from '@/data/challenges';
import { DISCOVER, PEOPLE, REVIEWS } from '@/data/content';
import { useApp } from '@/hooks/useAppState';
import { shortDate } from '@/lib/format';

/** Side clearance a review card needs inside its page for `shadows.soft` to
 * clear before hitting the ScrollView's own clipped edge. */
const REVIEW_INSET = spacing.md;

/** The creator's avatar, sized to lead the block it sits in. */
const CREATOR_AVATAR_SIZE = 44;

/** Matches the corner "+" elsewhere — both float at the same size. */
const BACK_SIZE = 46;

/**
 * A challenge's info card: name, member count, who started it, its four cover
 * photos, a short description, the daily task list, and what past rounds
 * said about it — everything worth knowing before joining, with nothing left
 * to scroll past on the way to it.
 */
export default function FeedScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { selectChallenge } = useApp();
  const [openPhotoIndex, setOpenPhotoIndex] = useState<number | null>(null);

  // --- Swiping between reviews -----------------------------------------------
  //
  // One card fills the page, measured off the wrapper rather than assumed,
  // since it depends on the screen's own padding. The dot under it reads off
  // every scroll frame rather than off momentum's end: a released drag that
  // doesn't carry enough velocity to page never raises momentum, and the web
  // build's wheel-driven scroll raises no momentum event at all.
  const [reviewWidth, setReviewWidth] = useState(0);
  const [reviewIndex, setReviewIndex] = useState(0);

  const section = DISCOVER.find((s) => s.id === String(id)) ?? DISCOVER[0];
  const challenge = challengeById(section.id);
  const creator = PEOPLE.find((p) => p.id === section.creatorId) ?? PEOPLE[0];

  /**
   * The shared line the title and the back button both sit on: normally the
   * button's own fixed offset, but on a deep safe-area inset (Dynamic Island,
   * a tall notch) the scroll's own top padding can run past it — in which
   * case the button drops to meet the content instead of the title
   * disappearing under a fixed corner.
   */
  const headerTop = Math.max(profileActionTop, topPadding(insets.top));
  const titleOffset = headerTop - topPadding(insets.top);

  // Same gap the floating tab bar itself keeps off the bottom edge, reused
  // above the button too so the dock reads as evenly padded rather than
  // trailing a long stretch of blank safe area beneath it.
  const dockGap = tabBarBottom(insets.bottom);
  const dockHeight = dockGap * 2 + tabBar.height;

  return (
    // Absolute overlays need a positioned parent, otherwise their offsets
    // resolve against the scroll content instead of the screen.
    <View style={styles.screenRoot}>
      {/* Clears the docked bar below, whatever its actual height ends up
          being on this device's safe area. */}
      <ScreenScroll bottomExtra={Math.max(0, dockHeight - (insets.bottom + spacing.xl))}>
        {/* A band the same height as the back button, dropped to the
            button's own line — centring the text inside it is what lines the
            two up, rather than the two happening to agree. */}
        <View style={[styles.titleBand, { marginTop: titleOffset }]}>
          <Text variant="sectionTitle" center>
            {challenge.name}
          </Text>
        </View>

        {/* Avatar and name lead to their profile, the same pair `FriendCard`
            opens one from — a fact about the challenge that happens to be
            tappable, not a control of its own. Leads the block now rather
            than the member count: whose challenge this is matters more than
            how many people are doing it. */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`View ${creator.name}'s profile`}
          onPress={() =>
            router.push({ pathname: '/friend/[id]', params: { id: creator.id } })
          }
          style={({ pressed }) => [styles.creator, pressed && styles.pressed]}
        >
          <Avatar source={creator.avatar} size={CREATOR_AVATAR_SIZE} />
          <View style={styles.creatorText}>
            <Text variant="taskLabel">{creator.name}</Text>
            <Text variant="labelBold" color={colors.inkMuted}>
              Created {shortDate(new Date(section.startDate))}
            </Text>
          </View>
        </Pressable>

        {/* Flat muted pills rather than Discover's glass one — that one
            floats over a photo strip and refracts it; these sit on the page
            itself, so a plain fill reads right. Left with everything else on
            the page rather than indented under the creator: they're facts
            about the challenge, not a caption on their line. */}
        <View style={styles.meta}>
          <Pill
            label={`${section.members.toLocaleString('en-US')} members`}
            tone="muted"
            size="sm"
            icon="people"
            color={colors.inkSoft}
            bold
          />
          <Pill
            label={`${challenge.defaultDays} days`}
            tone="muted"
            size="sm"
            icon="calendar"
            color={colors.inkSoft}
            bold
          />
        </View>

        <Text variant="bodyStrong" color={colors.inkSoft} style={styles.description}>
          {challenge.description}
        </Text>

        {/* The same plain stacked strip the profile screen shows a joined
            challenge with — no arc, no badge, just the hand-laid tiles. */}
        <PhotoStrip
          photos={section.photos}
          height={190}
          onPressPhoto={setOpenPhotoIndex}
          style={styles.strip}
        />

        <Text variant="sectionTitleSm" style={styles.tasksTitle}>
          Daily Tasks
        </Text>

        <Card padded={false}>
          {/* Nothing here is the reader's own progress yet — there's no day
              to be undone against — so every row shows filled rather than
              hollow, reading as "what's included" instead of an empty
              checklist. `strike={false}` keeps the label plain: these tasks
              aren't finished, just listed. */}
          {challenge.tasks.map((task, i) => (
            <TaskRow
              key={task.id}
              label={task.label}
              done
              strike={false}
              divider={i < challenge.tasks.length - 1}
            />
          ))}
        </Card>

        <Text variant="sectionTitleSm" style={styles.reviewsTitle}>
          Reviews
        </Text>

        {/* Bled out by the same inset each card is margined by, so that inset
            becomes room for the shadow to clear the ScrollView's own clipped
            edge rather than shrinking the card — the card itself lands at
            exactly the tasks list's width. */}
        <View
          style={styles.reviewsWrap}
          onLayout={(e) => setReviewWidth(e.nativeEvent.layout.width)}
        >
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            scrollEventThrottle={32}
            onScroll={(e) => {
              if (!reviewWidth) return;
              const i = Math.round(e.nativeEvent.contentOffset.x / reviewWidth);
              setReviewIndex(Math.min(REVIEWS.length - 1, Math.max(0, i)));
            }}
            // Vertical room for the card's own drop shadow: a horizontal
            // ScrollView clips to its content's height exactly, and a card
            // sized flush against that box would have its shadow cut off top
            // and bottom.
            contentContainerStyle={{ paddingVertical: REVIEW_INSET }}
          >
            {REVIEWS.map((review) => (
              <ReviewCard
                key={review.id}
                review={review}
                style={[
                  styles.review,
                  {
                    width: Math.max(0, reviewWidth - REVIEW_INSET * 2),
                    marginHorizontal: REVIEW_INSET,
                  },
                ]}
              />
            ))}
          </ScrollView>

          {REVIEWS.length > 1 && (
            <View style={styles.reviewDots}>
              {REVIEWS.map((review, i) => (
                <View
                  key={review.id}
                  style={[
                    styles.reviewDot,
                    i === reviewIndex && styles.reviewDotActive,
                  ]}
                />
              ))}
            </View>
          )}
        </View>
      </ScreenScroll>

      {/* Pinned to the same line as every other tab root's corner button,
          measured from the screen edge rather than from the scroll content —
          solid ink like the "+" elsewhere, not the glass lens, so it reads as
          a control rather than another surface. */}
      <IconButton
        name="chevron-back"
        size={BACK_SIZE}
        iconSize={20}
        background={colors.ink}
        color={colors.inkInverse}
        shadow={false}
        onPress={() => router.back()}
        accessibilityLabel="Go back"
        style={[styles.back, { top: headerTop }, shadows.floating]}
      />

      {/* Same docked bar as the challenge editor's Validate action: a solid
          strip of page background anchored to the bottom edge, not a pill
          floating over the content. Padded and sized to read as a filled-in
          version of the floating tab bar rather than a shrunken button
          adrift in its own space. */}
      <View style={[styles.dock, { paddingTop: dockGap, paddingBottom: dockGap }]}>
        <PrimaryButton
          label="Join Challenge"
          onPress={() => {
            selectChallenge(section.id);
            router.push('/challenge/detail');
          }}
          style={styles.join}
        />
      </View>

      <PhotoViewer
        photos={section.photos}
        index={openPhotoIndex}
        onDismiss={() => setOpenPhotoIndex(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screenRoot: {
    flex: 1,
    backgroundColor: colors.background,
  },
  back: {
    position: 'absolute',
    left: screenPadding,
  },
  titleBand: {
    minHeight: BACK_SIZE,
    justifyContent: 'center',
    // Tight under the title, so the pill reads as its caption rather than a
    // floating section of its own — the description below keeps its own
    // wider gap instead.
    marginBottom: spacing.sm,
  },
  creator: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    // Wider than meta's own gap to description below it, so the creator
    // reads as its own section rather than just another line stacked into
    // the badges-and-description block that follows.
    marginBottom: spacing.xl,
  },
  creatorText: {
    marginLeft: spacing.sm,
  },
  meta: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  description: {
    marginBottom: spacing.xl,
  },
  strip: {
    marginBottom: spacing['3xl'],
  },
  tasksTitle: {
    marginBottom: spacing.md,
  },
  // No marginBottom of its own: the pager's own top padding (REVIEW_INSET,
  // reserved for the card's shadow) supplies the gap to the card below,
  // matching `tasksTitle`'s spacing.md exactly rather than stacking on it.
  reviewsTitle: {
    marginTop: spacing['3xl'],
  },
  reviewsWrap: {
    marginHorizontal: -REVIEW_INSET,
  },
  review: {
    ...shadows.soft,
  },
  reviewDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  reviewDot: {
    width: 6,
    height: 6,
    borderRadius: radii.pill,
    backgroundColor: colors.dividerStrong,
  },
  reviewDotActive: {
    backgroundColor: colors.ink,
  },
  dock: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: screenPadding,
    backgroundColor: colors.background,
  },
  // Squared off against the app's fully-round default, matching the
  // challenge editor's Validate button this dock is modelled on, and the
  // create-challenge form's own "Add Task" — same corner, same height,
  // PrimaryButton's own default rather than the tab bar's row height.
  join: {
    borderRadius: radii.md,
  },
  pressed: {
    opacity: 0.85,
  },
});
