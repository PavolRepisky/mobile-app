import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, radii, shadows, spacing } from '@/constants/theme';
import type { Friend } from '@/data/content';
import { Avatar } from './Avatar';
import { Card } from './Card';
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
 *
 * Tilted a couple of degrees off square and lifted on a shadow, so a short
 * list reads as photographs dropped on the page rather than as table rows.
 */
export function FriendCard({ friend, onPress, style }: FriendCardProps) {
  return (
    // The shadow sits on a wrapper: the card itself clips its content, and on
    // iOS that clipping takes the shadow with it.
    <View style={[styles.shadow, style]}>
      <Card onPress={onPress} padded={false} flat style={styles.card}>
        <View style={styles.body}>
          <View style={styles.identity}>
            <Avatar source={friend.avatar} size={92} />
            <Text variant="sectionTitle" style={styles.name}>
              {friend.name}
            </Text>
            <Text variant="bodyBold" color={colors.inkMuted}>
              Day {friend.day}
            </Text>
          </View>

          <View style={styles.tasks}>
            {friend.tasks.map((task) => (
              <View key={task.label} style={styles.taskRow}>
                <CheckCircle checked={task.done} size={36} />
                <View style={styles.taskBody}>
                  <Text
                    variant="bodyBold"
                    color={colors.inkSlate}
                    numberOfLines={1}
                    style={styles.taskLabel}
                  >
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
    </View>
  );
}

const styles = StyleSheet.create({
  shadow: {
    borderRadius: radii['2xl'],
    // Negative tilts left.
    transform: [{ rotate: '-0.5deg' }],
    // iOS needs something opaque to cast from; it also keeps the shadow off
    // the rounded corners' transparent pixels.
    backgroundColor: colors.surface,
    ...shadows.lifted,
  },
  card: {
    borderRadius: radii['2xl'],
  },
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
    fontSize: 27,
    lineHeight: 33,
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
