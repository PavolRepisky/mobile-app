import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, spacing } from '@/constants/theme';
import type { Friend } from '@/data/content';
import { Card } from './Card';
import { AvatarPlaceholder } from './Placeholder';
import { CheckCircle } from './TaskRow';
import { Text } from './Text';

export interface FriendCardProps {
  friend: Friend;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

/**
 * Avatar and day count on the left, that friend's checklist on the right with
 * completion times under the ticked rows.
 */
export function FriendCard({ friend, onPress, style }: FriendCardProps) {
  return (
    <Card onPress={onPress} padded={false} style={style}>
      <View style={styles.body}>
        <View style={styles.identity}>
          <AvatarPlaceholder seed={friend.avatarSeed} size={92} />
          <Text variant="sectionTitle" style={styles.name}>
            {friend.name}
          </Text>
          <Text variant="bodyStrong" color={colors.inkMuted}>
            Day {friend.day}
          </Text>
        </View>

        <View style={styles.tasks}>
          {friend.tasks.map((task) => (
            <View key={task.label} style={styles.taskRow}>
              <CheckCircle checked={task.done} size={36} />
              <View style={styles.taskBody}>
                <Text variant="bodyBold" numberOfLines={1} style={styles.taskLabel}>
                  {task.label}
                </Text>
                {task.done && task.time ? (
                  <Text variant="caption" color={colors.inkMuted}>
                    {task.time}
                  </Text>
                ) : null}
              </View>
            </View>
          ))}
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  body: {
    flexDirection: 'row',
    padding: spacing.lg,
  },
  identity: {
    width: 112,
    alignItems: 'center',
    justifyContent: 'center',
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
  taskBody: {
    flex: 1,
    marginLeft: spacing.md,
  },
  taskLabel: {
    fontSize: 15,
  },
});

export default FriendCard;
