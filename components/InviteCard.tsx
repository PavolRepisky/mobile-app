import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, radii, shadows, spacing } from '@/constants/theme';
import { Headline } from './Headline';
import { Text } from './Text';

export interface InviteCardProps {
  /** Whose challenge the invite is for. */
  name: string;
  code: string;
  /** The onboarding version is tilted slightly, like a physical card. */
  tilted?: boolean;
  style?: StyleProp<ViewStyle>;
}

/** The paper-textured invite card carrying the join code. */
export function InviteCard({ name, code, tilted, style }: InviteCardProps) {
  return (
    <View
      style={[
        styles.card,
        tilted && { transform: [{ rotate: '-1.5deg' }] },
        style,
      ]}
    >
      <Headline size="headline" weight={700}>
        {`You're *invited*\nto join ${name}'s\nchallenge`}
      </Headline>

      <Text variant="sectionTitle" center style={styles.code}>
        {code}
      </Text>
      <Text variant="bodyStrong" center>
        Use this code to join
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: radii.sm,
    paddingVertical: spacing['4xl'],
    paddingHorizontal: spacing['2xl'],
    alignItems: 'center',
    ...shadows.soft,
  },
  code: {
    marginTop: spacing['3xl'],
    letterSpacing: 1,
  },
});

export default InviteCard;
