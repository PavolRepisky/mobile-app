import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { IconButton } from '@/components/IconButton';
import { ScreenScroll } from '@/components/Screen';
import { SegmentedTabs } from '@/components/SegmentedTabs';
import { StickerCard } from '@/components/StickerCard';
import { StickyNote } from '@/components/StickyNote';
import { Text } from '@/components/Text';
import { screenPadding, screenTopGap, spacing } from '@/constants/theme';
import { useApp } from '@/hooks/useAppState';
import { shortDate } from '@/lib/format';

type Tab = 'sticker' | 'postit';

/** Seven notes per row, as in the reference grid. */
const PER_ROW = 7;

/**
 * Sticker cards are pinned up rather than laid out: each one takes a small
 * fixed tilt off the day number, so the column reads as a stack of prints the
 * way the task photos on the To-do page do.
 */
const TILTS = [-1.6, 1.2, -0.9, 1.8, -1.3];

/**
 * Scatters the four pastels across the wall. A plain `day % 4` would line the
 * colours up into vertical stripes, since the row length and the palette
 * length share a factor — this hash breaks that up.
 */
function noteColor(day: number): number {
  return Math.abs(Math.imul(day, 2654435761) >>> 0) % 4;
}

/**
 * Two views of the same history: shareable sticker cards per completed day,
 * or the full run of days as a wall of pastel post-its.
 */
export default function StickerScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { challenge, tasks, startDate, endDate, totalDays, currentDay, progress } =
    useApp();
  const [tab, setTab] = useState<Tab>('sticker');

  // Newest first, and only days that have been reached.
  const days = Array.from({ length: currentDay }, (_, i) => currentDay - i);
  const from = shortDate(startDate);
  const to = shortDate(endDate);

  return (
    // Absolute overlays need a positioned parent, otherwise their offsets
    // resolve against the scroll content instead of the screen.
    <View style={styles.screenRoot}>
      <ScreenScroll bottomExtra={spacing['4xl']}>
        <View style={styles.header}>
          <SegmentedTabs
            options={[
              { key: 'sticker', label: 'Sticker' },
              { key: 'postit', label: 'Post-it' },
            ]}
            value={tab}
            onChange={setTab}
          />
        </View>

        {tab === 'sticker' ? (
          <View style={styles.stickers}>
            {days.map((day) => {
              const dayMap = progress[day] ?? {};
              const done = tasks.filter((t) => dayMap[t.id]?.done);
              if (done.length === 0) return null;

              return (
                <View key={day} style={styles.stickerBlock}>
                  <StickerCard
                    day={day}
                    from={from}
                    to={to}
                    tasks={done.map((t) => t.label)}
                    mode="checked"
                    challengeName={challenge.stamp}
                    tilt={TILTS[day % TILTS.length]}
                  />

                  {/* Every day is shareable, not just today's. */}
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Save the day ${day} sticker`}
                    onPress={() => {}}
                    style={({ pressed }) => [
                      styles.save,
                      pressed && styles.pressed,
                    ]}
                  >
                    <Ionicons name="download-outline" size={20} />
                    <Text variant="button" style={styles.saveLabel}>
                      Save sticker
                    </Text>
                  </Pressable>
                </View>
              );
            })}
          </View>
        ) : (
          <View style={styles.grid}>
            {Array.from({ length: totalDays }, (_, i) => i + 1).map((day) => {
              // Days already lived through have been torn off the wall.
              const torn = day < currentDay;
              return (
                <View key={day} style={styles.gridCell}>
                  <StickyNote
                    value={day}
                    size={46}
                    colorIndex={noteColor(day)}
                    muted={torn}
                    tilt={((day * 7) % 5) - 2}
                  />
                </View>
              );
            })}
          </View>
        )}
      </ScreenScroll>

      <IconButton
        name="close"
        onPress={() => router.back()}
        accessibilityLabel="Close"
        // Full screen, so the button has the status bar to clear. It floats
        // over the scroll view rather than sitting in it, so it repeats the
        // screen's own top padding and then centres itself on the tab row.
        style={[
          styles.close,
          { top: Math.max(insets.top + screenTopGap, screenTopGap) + 2 },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screenRoot: {
    flex: 1,
  },
  header: {
    minHeight: 56,
    justifyContent: 'center',
    marginBottom: spacing['2xl'],
  },
  close: {
    position: 'absolute',
    right: screenPadding,
  },
  stickers: {
    alignItems: 'center',
    gap: spacing['3xl'],
  },
  stickerBlock: {
    alignSelf: 'stretch',
    // A shallow gutter of its own on top of the page padding: the card reads
    // as pinned to the page rather than butting up against its edges.
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
  },
  save: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  saveLabel: {
    marginLeft: spacing.sm,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: spacing.xl,
  },
  gridCell: {
    width: `${100 / PER_ROW}%`,
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  pressed: {
    opacity: 0.75,
  },
});
