import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { ChallengePicker } from '@/components/ChallengePicker';
import { IconButton } from '@/components/IconButton';
import { ScreenScroll } from '@/components/Screen';
import { spacing } from '@/constants/theme';
import { useApp } from '@/hooks/useAppState';

/** The in-app version, reached from Edit / Change Challenge on the home. */
export default function SelectChallengeScreen() {
  const router = useRouter();
  const { selectChallenge } = useApp();

  return (
    <ScreenScroll bottomExtra={spacing['3xl']}>
      <View style={styles.head}>
        <IconButton
          name="chevron-back"
          onPress={() => router.back()}
          accessibilityLabel="Go back"
          style={styles.back}
        />
      </View>

      <ChallengePicker
        onSelect={(id) => {
          selectChallenge(id);
          router.push('/challenge/detail');
        }}
        onCreateNew={() => router.push('/challenge/create')}
      />
    </ScreenScroll>
  );
}

const styles = StyleSheet.create({
  head: {
    minHeight: 60,
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  back: {
    position: 'absolute',
    left: 0,
  },
});
