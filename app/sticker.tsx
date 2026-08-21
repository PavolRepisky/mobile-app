import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { IconButton } from '@/components/IconButton';
import { ScreenScroll } from '@/components/Screen';
import { SegmentedTabs } from '@/components/SegmentedTabs';
import { StickerCard } from '@/components/StickerCard';
import { StickyNote } from '@/components/StickyNote';
import { Text } from '@/components/Text';
import { screenPadding, spacing } from '@/constants/theme';
import { useApp } from '@/hooks/useAppState';
import { shortDate } from '@/lib/format';

type Tab = 'sticker' | 'postit';

/** Seven notes per row, as in the reference grid. */
const PER_ROW = 7;

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
                  />

                  {day === currentDay ? (
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => {}}
                      style={({ pressed }) => [
                        styles.save,
                        pressed && styles.pressed,
                      ]}
                    >
                      <Ionicons name="download-outline" size={22} />
                      <Text variant="sectionTitle" style={styles.saveLabel}>
                        Save sticker
                      </Text>
                    </Pressable>
                  ) : null}
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
        style={styles.close}
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
    top: 52,
    right: screenPadding,
  },
  stickers: {
    alignItems: 'center',
    gap: spacing['3xl'],
  },
  stickerBlock: {
    alignSelf: 'stretch',
    paddingHorizontal: spacing['2xl'],
    alignItems: 'center',
  },
  save: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xl,
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
