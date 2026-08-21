import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Card } from '@/components/Card';
import { Headline } from '@/components/Headline';
import { IconButton } from '@/components/IconButton';
import { Pill } from '@/components/Pill';
import { PhotoSlot } from '@/components/PhotoSlot';
import { PhotoStrip } from '@/components/PhotoStrip';
import { AvatarPlaceholder } from '@/components/Placeholder';
import { ScreenScroll } from '@/components/Screen';
import { SegmentedTabs } from '@/components/SegmentedTabs';
import { Text } from '@/components/Text';
import { WallSection } from '@/components/WallSection';
import { colors, spacing } from '@/constants/theme';
import { WALL_SECTIONS } from '@/data/content';
import { useApp } from '@/hooks/useAppState';

type Tab = 'profile' | 'wall';

export default function ProfileScreen() {
  const router = useRouter();
  const { profile, challenge, progress, setAvatarSeed } = useApp();
  const [tab, setTab] = useState<Tab>('profile');

  // Days that have at least one proof photo, newest first.
  const photoDays = Object.keys(progress)
    .map(Number)
    .sort((a, b) => b - a)
    .map((day) => ({
      day,
      seeds: Object.values(progress[day] ?? {})
        .map((p) => p.photoSeed)
        .filter((s): s is string => !!s),
    }))
    .filter((entry) => entry.seeds.length > 0);

  return (
    // Absolute overlays need a positioned parent, otherwise their offsets
    // resolve against the scroll content instead of the screen.
    <View style={styles.screenRoot}>
      <ScreenScroll tabBar>
        <View style={styles.topBar}>
          <IconButton
            name="footsteps"
            onPress={() => router.push('/account/views')}
            accessibilityLabel="Profile views"
          />
          <View style={styles.spacer} />
          <IconButton
            name="ellipsis-horizontal"
            background="transparent"
            shadow={false}
            onPress={() => router.push('/account/settings')}
            accessibilityLabel="Settings"
          />
        </View>

        <View style={styles.identity}>
          <View>
            <AvatarPlaceholder seed={profile.avatarSeed} size={150} />
            {!profile.avatarSeed ? (
              <Pressable
                accessibilityRole="button"
                onPress={() => setAvatarSeed(`avatar-${Date.now() % 89}`)}
                style={styles.addPhoto}
              >
                <Text variant="label" color={colors.inkMuted} center>
                  Add{'\n'}photo
                </Text>
              </Pressable>
            ) : null}
          </View>

          <Text variant="sectionTitle" style={styles.name}>
            {profile.name}
          </Text>
          <Text variant="body" color={colors.inkMuted}>
            {profile.handle}
          </Text>

          <Pressable
            accessibilityRole="button"
            onPress={() => router.push('/account/bio')}
            style={styles.bioRow}
          >
            <Text variant="body" color={colors.inkMuted}>
              {profile.bio ?? 'Add a bio'}
            </Text>
            <Ionicons
              name="pencil"
              size={15}
              color={colors.inkMuted}
              style={styles.bioPencil}
            />
          </Pressable>
        </View>

        <SegmentedTabs
          options={[
            { key: 'profile', label: 'Profile' },
            { key: 'wall', label: 'My Wall' },
          ]}
          value={tab}
          onChange={setTab}
          style={styles.tabs}
        />

        {tab === 'profile' ? (
          <>
            <View style={styles.joined}>
              <PhotoStrip seeds={challenge.photoSeeds} height={150} />
              <View pointerEvents="none" style={styles.joinedBadge}>
                <Pill
                  icon="checkmark"
                  label={`Joined ${challenge.name}`}
                  style={styles.joinedPill}
                />
              </View>
            </View>

            {photoDays.map((entry) => (
              <View key={entry.day} style={styles.daySection}>
                <Text variant="sectionTitle" style={styles.dayTitle}>
                  Day {entry.day}
                </Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.dayRow}
                >
                  {entry.seeds.map((seed) => (
                    <PhotoSlot
                      key={seed}
                      seed={seed}
                      width={136}
                      height={196}
                      shadow={false}
                    />
                  ))}
                </ScrollView>
              </View>
            ))}

            <Card
              onPress={() => {}}
              padded={false}
              style={styles.promo}
            >
              <View style={styles.promoRow}>
                <AvatarPlaceholder seed="support-art" size={96} />
                <View style={styles.promoBody}>
                  <Headline size="title">{'Her 75\n*support*'}</Headline>
                  <Text variant="body" color={colors.inkMuted} center style={styles.promoList}>
                    {'• suggest a feature\n• report a bug\n• get help'}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={22} color={colors.ink} />
              </View>
            </Card>

            <Card onPress={() => {}} padded={false} style={styles.promo}>
              <View style={styles.promoRow}>
                <View style={styles.promoBody}>
                  <View style={styles.promoAvatars}>
                    {['amb-1', 'amb-2', 'amb-3', 'amb-4'].map((seed, i) => (
                      <AvatarPlaceholder
                        key={seed}
                        seed={seed}
                        size={62}
                        style={i > 0 ? styles.avatarOverlap : undefined}
                      />
                    ))}
                  </View>
                  <Headline size="title">
                    {"We're hiring\nTikTok & Instagram\n*ambassadors*"}
                  </Headline>
                  <Text variant="body" color={colors.inkMuted} center style={styles.promoList}>
                    Get paid to do your challenge
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={22} color={colors.ink} />
              </View>
            </Card>
          </>
        ) : (
          <View>
            {WALL_SECTIONS.map((section) => (
              <WallSection key={section} title={section} seed={`me-${section}`} />
            ))}
          </View>
        )}
      </ScreenScroll>
    </View>
  );
}

const styles = StyleSheet.create({
  screenRoot: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 56,
  },
  spacer: {
    flex: 1,
  },
  identity: {
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  addPhoto: {
    position: 'absolute',
    right: -18,
    top: 12,
    backgroundColor: colors.surface,
    borderRadius: 16,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  name: {
    marginTop: spacing.lg,
  },
  bioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  bioPencil: {
    marginLeft: spacing.sm,
  },
  tabs: {
    marginTop: spacing.lg,
    marginBottom: spacing['2xl'],
  },
  joined: {
    marginHorizontal: -spacing.xl,
    paddingHorizontal: spacing.xl,
  },
  joinedBadge: {
    position: 'absolute',
    top: spacing.md,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  joinedPill: {
    alignSelf: 'center',
  },
  daySection: {
    marginTop: spacing['2xl'],
    marginHorizontal: -spacing.xl,
    paddingLeft: spacing.xl,
  },
  dayTitle: {
    marginBottom: spacing.md,
  },
  dayRow: {
    gap: spacing.md,
    paddingRight: spacing.xl,
  },
  promo: {
    marginTop: spacing['2xl'],
  },
  promoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.xl,
  },
  promoBody: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: spacing.md,
  },
  promoList: {
    marginTop: spacing.sm,
  },
  promoAvatars: {
    flexDirection: 'row',
    marginBottom: spacing.md,
  },
  avatarOverlap: {
    marginLeft: -spacing.lg,
  },
});
