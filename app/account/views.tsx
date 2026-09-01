import { StyleSheet, View } from 'react-native';

import { ScreenHeader } from '@/components/ScreenHeader';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { colors } from '@/constants/theme';

/** Profile views, empty by default — there is no backend to populate it. */
export default function ProfileViewsScreen() {
  return (
    <Screen tone="warm">
      <ScreenHeader
        plainTitle="Profile views"
        plainTitleVariant="sectionTitle"
        plainTitleStyle={styles.title}
        subtitle="No views today"
        subtitleVariant="bodyBold"
      />

      <View style={styles.empty}>
        <Text variant="bodyStrong" color={colors.inkMuted}>
          No profile views yet
        </Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 20,
    lineHeight: 26,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
