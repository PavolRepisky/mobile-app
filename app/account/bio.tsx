import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { IconButton } from '@/components/IconButton';
import { Text } from '@/components/Text';
import {
  colors,
  fonts,
  radii,
  screenPadding,
  shadows,
  spacing,
} from '@/constants/theme';
import { useApp } from '@/hooks/useAppState';

const MAX = 120;

export default function BioScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { profile, setBio } = useApp();
  const [draft, setDraft] = useState(profile.bio ?? '');

  const save = () => {
    setBio(draft.trim() ? draft.trim() : null);
    router.back();
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[styles.root, { paddingTop: insets.top }]}
    >
      <View style={styles.header}>
        <IconButton
          name="chevron-back"
          onPress={() => router.back()}
          accessibilityLabel="Go back"
          style={styles.back}
        />

        <Text variant="sectionTitle" center>
          Bio
        </Text>

        <Pressable
          accessibilityRole="button"
          onPress={save}
          style={({ pressed }) => [styles.save, pressed && styles.pressed]}
        >
          <Text variant="button">Save</Text>
        </Pressable>
      </View>

      <TextInput
        value={draft}
        onChangeText={(next) => setDraft(next.slice(0, MAX))}
        placeholder="Add a short bio..."
        placeholderTextColor={colors.inkMuted}
        multiline
        autoFocus
        maxLength={MAX}
        style={styles.input}
      />

      <Text variant="body" color={colors.inkMuted} style={styles.counter}>
        {draft.length}/{MAX}
      </Text>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.backgroundAlt,
    paddingHorizontal: screenPadding,
  },
  header: {
    minHeight: 60,
    justifyContent: 'center',
    marginBottom: spacing.xl,
  },
  back: {
    position: 'absolute',
    left: 0,
  },
  save: {
    position: 'absolute',
    right: 0,
    paddingHorizontal: spacing['2xl'],
    height: 52,
    borderRadius: radii.pill,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.soft,
  },
  input: {
    height: 220,
    borderRadius: radii.card,
    backgroundColor: colors.surface,
    padding: spacing.xl,
    fontFamily: fonts.body,
    fontSize: 18,
    lineHeight: 24,
    color: colors.ink,
    textAlignVertical: 'top',
  },
  counter: {
    marginTop: spacing.md,
    marginLeft: spacing.xs,
  },
  pressed: {
    opacity: 0.8,
  },
});
