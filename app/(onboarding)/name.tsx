import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PrimaryButton } from '@/components/Buttons';
import { Headline } from '@/components/Headline';
import { OnboardingTopBar } from '@/components/OnboardingTopBar';
import { Placeholder } from '@/components/Placeholder';
import {
  colors,
  fonts,
  radii,
  screenPadding,
  spacing,
} from '@/constants/theme';
import { useApp } from '@/hooks/useAppState';
import { stepProgress } from '@/lib/onboarding';

/** Row of pale cream swatches under the field, as in the reference. */
const SWATCHES = ['sw-1', 'sw-2', 'sw-3', 'sw-4', 'sw-5'];

export default function NameScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { answer } = useApp();
  const [value, setValue] = useState('');

  const submit = () => {
    answer('name', value.trim());
    router.push('/(onboarding)/source');
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[
        styles.root,
        { paddingTop: insets.top, paddingBottom: insets.bottom + spacing.xl },
      ]}
    >
      <OnboardingTopBar progress={stepProgress('name')} />

      <Headline size="hero">{"What's your\nname?"}</Headline>

      <TextInput
        value={value}
        onChangeText={setValue}
        placeholder="Your name"
        placeholderTextColor={colors.inkMuted}
        autoFocus
        autoCapitalize="words"
        returnKeyType="done"
        onSubmitEditing={value.trim() ? submit : undefined}
        style={styles.input}
      />

      <View style={styles.swatches}>
        {SWATCHES.map((seed, i) => (
          <Placeholder
            key={seed}
            seed={seed}
            radius={radii.pill}
            style={[
              styles.swatch,
              { height: 74 + (i % 3) * 12, transform: [{ rotate: `${(i - 2) * 4}deg` }] },
            ]}
          />
        ))}
      </View>

      <View style={styles.spacer} />

      <PrimaryButton
        label="Continue"
        disabled={!value.trim()}
        onPress={submit}
        fullWidth={false}
        style={styles.cta}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.backgroundOnboarding,
    paddingHorizontal: screenPadding,
  },
  input: {
    marginTop: spacing['4xl'],
    height: 74,
    borderRadius: radii.lg,
    backgroundColor: '#F0F0F0',
    paddingHorizontal: spacing['2xl'],
    fontFamily: fonts.body,
    fontSize: 20,
    color: colors.ink,
  },
  swatches: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    marginTop: spacing['3xl'],
  },
  swatch: {
    width: 46,
    opacity: 0.5,
  },
  spacer: {
    flex: 1,
  },
  cta: {
    alignSelf: 'center',
    minWidth: 240,
  },
});
