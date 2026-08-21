import { StyleSheet, View } from 'react-native';

import { Card } from '@/components/Card';
import { CheckCircle } from '@/components/TaskRow';
import { AvatarPlaceholder } from '@/components/Placeholder';
import { Text } from '@/components/Text';
import { ValueProp } from '@/components/ValueProp';
import { colors, spacing } from '@/constants/theme';

const PREVIEW = [
  {
    name: 'Maddy',
    seed: 'friend-maddy',
    tasks: [
      ['Walk 10,000 steps', false],
      ['Read 10 pages', false],
      ['Workout', false],
      ['Follow a strict diet', false],
    ],
  },
  {
    name: 'Anna',
    seed: 'friend-anna',
    tasks: [
      ['Walk 10,000 steps', false],
      ['Read 10 pages', false],
      ['Workout', true],
      ['Follow a strict diet', false],
    ],
  },
  {
    name: 'Blake',
    seed: 'friend-blake',
    tasks: [
      ['Walk 10,000 steps', true],
      ['Read 10 pages', false],
      ['Workout', false],
      ['Follow a strict diet', false],
    ],
  },
] as const;

/**
 * "See your friends' tasks and aesthetic." — three friend cards stacked with a
 * slight overlap so the deck reads as a shuffle.
 */
export default function ValueFriendsScreen() {
  return (
    <ValueProp
      headline={"See your friends’\ntasks and *aesthetic.*"}
      href="/(onboarding)/value-thatgirl"
    >
      <View style={styles.stack}>
        {PREVIEW.map((friend, i) => (
          <Card
            key={friend.name}
            style={[styles.card, i > 0 && styles.overlap]}
            padded={false}
          >
            <View style={styles.cardBody}>
              <View style={styles.identity}>
                <AvatarPlaceholder seed={friend.seed} size={84} />
                <Text variant="cardTitle" style={styles.name}>
                  {friend.name}
                </Text>
                <Text variant="body" color={colors.inkMuted}>
                  Day 75
                </Text>
              </View>

              <View style={styles.tasks}>
                {friend.tasks.map(([label, done]) => (
                  <View key={label as string} style={styles.taskRow}>
                    <CheckCircle checked={done as boolean} size={34} />
                    <Text variant="bodyBold" style={styles.taskLabel} numberOfLines={1}>
                      {label as string}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          </Card>
        ))}
      </View>
    </ValueProp>
  );
}

const styles = StyleSheet.create({
  stack: {
    paddingHorizontal: spacing.xl,
  },
  card: {
    // Cards fan out slightly rather than sitting in a rigid column.
    marginHorizontal: 0,
  },
  overlap: {
    marginTop: -spacing['2xl'],
  },
  cardBody: {
    flexDirection: 'row',
    padding: spacing.lg,
  },
  identity: {
    width: 108,
    alignItems: 'center',
  },
  name: {
    marginTop: spacing.sm,
  },
  tasks: {
    flex: 1,
    justifyContent: 'center',
    gap: spacing.xs,
  },
  taskRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  taskLabel: {
    marginLeft: spacing.md,
    flex: 1,
  },
});
