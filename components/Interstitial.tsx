import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { colors, screenPadding, spacing } from '@/constants/theme';
import { Headline } from './Headline';
import { ProgressBar } from './ProgressBar';

export interface InterstitialProps {
  /** Headline with `*accent*` markers. */
  headline: string;
  /** Route to replace with once the bar fills. */
  next: string;
  /** Base headline weight. */
  weight?: 700 | 900;
  duration?: number;
}

/**
 * A timed pause: centred headline over a filling progress line, then it moves
 * on by itself. There is no button — these two screens auto-advance.
 */
export function Interstitial({
  headline,
  next,
  weight = 900,
  duration = 2400,
}: InterstitialProps) {
  const router = useRouter();

  return (
    <View style={styles.root}>
      <Headline size="hero" weight={weight} style={styles.headline}>
        {headline}
      </Headline>

      <ProgressBar
        progress={1}
        animate
        duration={duration}
        width={260}
        height={3}
        onComplete={() => router.replace(next as never)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.backgroundOnboarding,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: screenPadding,
  },
  headline: {
    marginBottom: spacing.xl,
  },
});

export default Interstitial;
