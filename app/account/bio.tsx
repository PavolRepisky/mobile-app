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

import { GlassSurface } from '@/components/GlassSurface';
import { IconButton } from '@/components/IconButton';
import { Text } from '@/components/Text';
import {
  bodyTracking,
  colors,
  fonts,
  radii,
  screenPadding,
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
          {/* The same lens the back button wears, so the two corners of the
              header read as one material. */}
          <GlassSurface radius={radii.pill}>
            <View style={styles.saveBody}>
              <Text variant="button">Save</Text>
            </View>
          </GlassSurface>
        </Pressable>
      </View>

      <View>
        <TextInput
          value={draft}
          onChangeText={(next) => setDraft(next.slice(0, MAX))}
          multiline
          autoFocus
          maxLength={MAX}
          style={styles.input}
        />

        {/* Drawn rather than handed to `placeholder`, which has no styling of
            its own: it would take the input's own size and weight. */}
        {draft.length === 0 ? (
          <View pointerEvents="none" style={styles.placeholder}>
            <Text color={colors.inkMuted} style={styles.placeholderText}>
              Add a short bio...
            </Text>
          </View>
        ) : null}
      </View>

      <Text variant="label" color={colors.inkMuted} style={styles.counter}>
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
  },
  saveBody: {
    paddingHorizontal: spacing['2xl'],
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    height: 220,
    borderRadius: radii.card,
    backgroundColor: colors.surface,
    padding: spacing.xl,
    fontFamily: fonts.body,
    fontSize: 18,
    lineHeight: 24,
    letterSpacing: bodyTracking,
    color: colors.ink,
    textAlignVertical: 'top',
  },
  // Sits where the input's own first line lands: the same inset as its
  // padding, on the same line height.
  placeholder: {
    position: 'absolute',
    left: spacing.xl,
    top: spacing.xl,
  },
  placeholderText: {
    fontFamily: fonts.bodySemi,
    fontSize: 17,
    lineHeight: 24,
    letterSpacing: bodyTracking,
  },
  counter: {
    marginTop: spacing.md,
    marginLeft: spacing.xs,
  },
  pressed: {
    opacity: 0.8,
  },
});
