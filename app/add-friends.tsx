import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Avatar } from '@/components/Avatar';
import { EmptyState } from '@/components/EmptyState';
import { Pill } from '@/components/Pill';
import { ScreenScroll } from '@/components/Screen';
import { SearchBar } from '@/components/SearchBar';
import { SegmentedTabs } from '@/components/SegmentedTabs';
import { Text } from '@/components/Text';
import { colors, radii, spacing } from '@/constants/theme';
import { FEED_AUTHORS, FRIENDS } from '@/data/content';

/** Stable per key rather than random, so a row's mutual count doesn't
 * reshuffle on every render — the same trick the profile screen's own fake
 * counts use. */
function fakeCount(key: string, min: number, max: number): number {
  let h = 0;
  for (let i = 0; i < key.length; i += 1) h = (h * 31 + key.charCodeAt(i)) | 0;
  return min + (Math.abs(h) % (max - min + 1));
}

/** A bare glyph, sized on its own rather than the circular IconButton's —
 * the profile screen's own header convention. */
const headerIconSize = 26;
/** The outline glyph has no bold cut of its own — stacking a second copy a
 * hair off the first thickens the stroke without switching to the filled
 * icon. */
const headerBoldOffset = 0.6;

/** The little overlapping avatars under a suggestion's name. */
const mutualAvatarSize = 20;
const mutualAvatarOverlap = 10;

/** The square tile behind each invite channel's glyph. */
const channelTileSize = 64;

const INVITE_CHANNELS = [
  { key: 'messages', label: 'Messages', icon: 'chatbubble-outline' as const },
  { key: 'whatsapp', label: 'WhatsApp', icon: 'logo-whatsapp' as const },
  { key: 'instagram', label: 'Instagram', icon: 'logo-instagram' as const },
  { key: 'email', label: 'Email', icon: 'mail-outline' as const },
  { key: 'more', label: 'More', icon: 'ellipsis-horizontal' as const },
];

type Tab = 'suggestions' | 'find';

/**
 * The full-page suggestion list raised by the `+` on the profile screen,
 * replacing the invite-code panel that used to open there. Suggestions read
 * off `FEED_AUTHORS` — people posting in the same challenge who aren't a
 * friend yet — and the mutual-friends preview reads off the real `FRIENDS`
 * list, so both are actual app data rather than invented names.
 */
export default function AddFriendsScreen() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('suggestions');
  const [query, setQuery] = useState('');
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [added, setAdded] = useState<Set<string>>(new Set());

  const suggestions = useMemo(
    () => FEED_AUTHORS.filter((person) => !dismissed.has(person.id)),
    [dismissed],
  );

  // Real friends standing in for "people you both know" — there's no mutual
  // graph to read one off, and every row shares the same small preview.
  const mutualPreview = FRIENDS.slice(0, 3);

  return (
    <View style={styles.screenRoot}>
      <ScreenScroll tone="plain">
        <View style={styles.header}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Go back"
            onPress={() => router.back()}
            hitSlop={spacing.md}
            style={({ pressed }) => pressed && styles.pressed}
          >
            <View style={styles.headerIconStack}>
              <Ionicons name="chevron-back" size={headerIconSize} color={colors.ink} />
              <Ionicons
                name="chevron-back"
                size={headerIconSize}
                color={colors.ink}
                style={styles.headerIconOverlay}
              />
            </View>
          </Pressable>

          <Text variant="sectionTitle" center style={styles.headerTitle}>
            Add Friends
          </Text>

          <View style={styles.headerIconStack} />
        </View>

        <SearchBar
          value={query}
          onChangeText={setQuery}
          placeholder="Search by username or name"
          style={styles.search}
        />

        <SegmentedTabs
          options={[
            { key: 'suggestions', label: 'Suggestions' },
            { key: 'find', label: 'Find friends' },
          ]}
          value={tab}
          onChange={setTab}
          align="left"
          style={styles.tabs}
        />

        {tab === 'find' ? (
          <EmptyState
            icon="search-outline"
            title="Find friends"
            hint="Search a username or name above to find people."
          />
        ) : (
          <>
            <View style={styles.sectionHeader}>
              <Text variant="cardTitleBold">Suggested for you</Text>
              <Text variant="bodyBold" color={colors.accent}>
                See all
              </Text>
            </View>

            <View style={styles.list}>
              {suggestions.map((person, index) => {
                const mutualCount = fakeCount(person.id, 1, 4);
                const isAdded = added.has(person.id);

                return (
                  <View key={person.id} style={[styles.row, index > 0 && styles.rowDivider]}>
                    <Avatar source={person.avatar} size={56} />

                    <View style={styles.rowBody}>
                      <Text variant="cardTitleBold">{person.name}</Text>
                      <Text variant="label" color={colors.inkMuted}>
                        {person.handle}
                      </Text>

                      <View style={styles.mutualRow}>
                        <View style={styles.mutualStack}>
                          {mutualPreview.map((friend, i) => (
                            <Avatar
                              key={friend.id}
                              source={friend.avatar}
                              size={mutualAvatarSize}
                              style={[
                                styles.mutualAvatar,
                                i > 0 && styles.mutualAvatarOverlap,
                              ]}
                            />
                          ))}
                        </View>
                        <Text variant="caption" color={colors.inkMuted}>
                          {mutualCount} mutual friend{mutualCount === 1 ? '' : 's'}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.rowActions}>
                      <Pill
                        label={isAdded ? 'Added' : 'Add'}
                        tone={isAdded ? 'solid' : 'outline'}
                        onPress={
                          isAdded
                            ? undefined
                            : () =>
                                setAdded((prev) => new Set(prev).add(person.id))
                        }
                      />
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`Dismiss ${person.name}`}
                        hitSlop={spacing.sm}
                        onPress={() =>
                          setDismissed((prev) => new Set(prev).add(person.id))
                        }
                      >
                        <Ionicons name="close" size={20} color={colors.inkMuted} />
                      </Pressable>
                    </View>
                  </View>
                );
              })}
            </View>

            <Text variant="cardTitleBold" style={styles.inviteTitle}>
              Invite your friends
            </Text>

            <View style={styles.channelsRow}>
              {INVITE_CHANNELS.map((channel) => (
                <View key={channel.key} style={styles.channel}>
                  <View style={styles.channelTile}>
                    <Ionicons name={channel.icon} size={24} color={colors.ink} />
                  </View>
                  <Text variant="caption" color={colors.inkMuted}>
                    {channel.label}
                  </Text>
                </View>
              ))}
            </View>
          </>
        )}
      </ScreenScroll>
    </View>
  );
}

const styles = StyleSheet.create({
  screenRoot: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xl,
  },
  headerTitle: {
    flex: 1,
  },
  headerIconStack: {
    width: headerIconSize + headerBoldOffset,
    height: headerIconSize + headerBoldOffset,
  },
  headerIconOverlay: {
    position: 'absolute',
    left: headerBoldOffset,
    top: headerBoldOffset,
  },
  pressed: {
    opacity: 0.85,
  },
  search: {
    marginBottom: spacing.xl,
  },
  tabs: {
    marginBottom: spacing['2xl'],
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  list: {
    marginBottom: spacing['3xl'],
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.lg,
  },
  rowDivider: {
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  rowBody: {
    flex: 1,
  },
  mutualRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xs,
    gap: spacing.xs,
  },
  mutualStack: {
    flexDirection: 'row',
  },
  mutualAvatar: {
    borderWidth: 2,
    borderColor: colors.surface,
  },
  mutualAvatarOverlap: {
    marginLeft: -mutualAvatarOverlap,
  },
  rowActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  inviteTitle: {
    marginBottom: spacing.lg,
  },
  channelsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing['3xl'],
  },
  channel: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  channelTile: {
    width: channelTileSize,
    height: channelTileSize,
    borderRadius: radii.lg,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
