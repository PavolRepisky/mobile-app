import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, screenPadding, spacing } from '@/constants/theme';
import { PrimaryButton } from './Buttons';
import { Headline } from './Headline';

export interface ValuePropProps {
  /** Headline with `*accent*` markers. */
  headline: string;
  /** The illustration above the copy. */
  children: React.ReactNode;
  cta?: string;
  href: string;
}

/**
 * Shared shape of the three value-prop screens: artwork filling the upper two
 * thirds, then a hero headline and a single button pinned to the bottom.
 */
export function ValueProp({
  headline,
  children,
  cta = 'Continue',
  href,
}: ValuePropProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.art}>{children}</View>

      <View
        style={[styles.footer, { paddingBottom: insets.bottom + spacing.xl }]}
      >
        <Headline size="hero" style={styles.headline}>
          {headline}
        </Headline>
        <PrimaryButton
          label={cta}
          onPress={() => router.push(href as never)}
          fullWidth={false}
          style={styles.cta}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.backgroundOnboarding,
  },
  art: {
    flex: 1,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  footer: {
    paddingHorizontal: screenPadding,
    alignItems: 'center',
  },
  headline: {
    marginBottom: spacing['2xl'],
  },
  cta: {
    minWidth: 240,
  },
});

export default ValueProp;
