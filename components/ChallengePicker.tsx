import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { colors, spacing } from '@/constants/theme';
import { CHALLENGES, CUSTOM_CHALLENGE } from '@/data/challenges';
import { joinedLabel } from '@/lib/format';
import { Headline } from './Headline';
import { ChallengeRow, PhotoStrip } from './PhotoStrip';
import { SegmentedTabs } from './SegmentedTabs';
import { Text } from './Text';

export type PickerTab = 'popular' | 'custom';

export interface ChallengePickerProps {
  onSelect: (challengeId: string) => void;
  initialTab?: PickerTab;
}

/**
 * "Select your challenge" — the Most Popular list, plus a Custom tab holding a
 * single build-your-own entry. Reached from the pencil menu on the To-do
 * home, so it lives here rather than in a route file.
 */
export function ChallengePicker({
  onSelect,
  initialTab = 'popular',
}: ChallengePickerProps) {
  const [tab, setTab] = useState<PickerTab>(initialTab);

  return (
    <View>
      <Headline size="hero" style={styles.headline}>
        {'Select\nyour challenge'}
      </Headline>

      <SegmentedTabs
        options={[
          { key: 'popular', label: 'Most Popular' },
          { key: 'custom', label: 'Custom' },
        ]}
        value={tab}
        onChange={setTab}
        style={styles.tabs}
      />

      {tab === 'popular' ? (
        <View style={styles.list}>
          {CHALLENGES.map((challenge) => (
            <ChallengeRow
              key={challenge.id}
              title={challenge.name}
              seeds={challenge.photoSeeds}
              joined={joinedLabel(challenge.joined)}
              onPress={() => onSelect(challenge.id)}
              style={styles.row}
            />
          ))}
        </View>
      ) : (
        <View style={styles.list}>
          <PhotoStrip
            seeds={CUSTOM_CHALLENGE.photoSeeds}
            onPress={() => onSelect(CUSTOM_CHALLENGE.id)}
          />
          <Text variant="sectionTitle" style={styles.customTitle}>
            Create your challenge
          </Text>
          <Text variant="body" color={colors.inkMuted}>
            Choose your own tasks
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  headline: {
    marginBottom: spacing['2xl'],
  },
  tabs: {
    marginBottom: spacing['2xl'],
  },
  list: {
    marginHorizontal: -spacing.xl,
    paddingHorizontal: spacing.xl,
  },
  row: {
    marginBottom: spacing['2xl'],
  },
  customTitle: {
    marginTop: spacing.lg,
  },
});

export default ChallengePicker;
