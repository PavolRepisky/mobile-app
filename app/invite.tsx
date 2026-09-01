import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import { PrimaryButton } from '@/components/Buttons';
import { Headline } from '@/components/Headline';
import { Text } from '@/components/Text';
import {
  absoluteFill,
  bodyTracking,
  colors,
  fonts,
  radii,
  screenPadding,
  shadows,
  spacing,
} from '@/constants/theme';
import { useApp } from '@/hooks/useAppState';

/** How long the code field takes to open out to the full panel width. */
const EXPAND = 220;

/**
 * The invite panel raised by the `+` on the Friends tab. Presented as a
 * transparent modal over a dimmed Friends tab, so the app stays visible behind
 * it rather than the panel reading as a whole screen.
 */
export default function InviteScreen() {
  const router = useRouter();
  const { profile, inviteCode } = useApp();

  const [expanded, setExpanded] = useState(false);
  const [code, setCode] = useState('');
  const grow = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Width is not a transform, so this one cannot be native-driven.
    const animation = Animated.timing(grow, {
      toValue: expanded ? 1 : 0,
      duration: EXPAND,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    });

    animation.start();
    return () => animation.stop();
  }, [expanded, grow]);

  const fieldWidth = grow.interpolate({
    inputRange: [0, 1],
    // 65% of the panel's inner width is the reference's 196pt field.
    outputRange: ['65%', '100%'],
  });

  return (
    // The code field autofocuses when it opens out, and the panel sits low
    // enough that the keyboard would cover it; this lifts the whole panel.
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.root}
    >
      <Pressable
        accessibilityLabel="Dismiss"
        style={[absoluteFill, styles.backdrop]}
        onPress={() => router.back()}
      />

      <View style={styles.panel}>
        {/* The line lightens to Medium so the italic accent carries it. */}
        <Headline size="headline" weight={500} accentWeight={700}>
          {`You're *invited*\nto join ${profile.name}'s\nchallenge`}
        </Headline>

        <Text variant="sectionTitle" center style={styles.code}>
          {inviteCode}
        </Text>
        <Text variant="bodyStrong" center style={styles.codeHint}>
          Use this code to join
        </Text>

        <PrimaryButton
          label="Send invites"
          icon="share-outline"
          iconSize={23}
          onPress={() => router.back()}
          fullWidth={false}
          style={styles.send}
          labelStyle={styles.sendLabel}
        />

        <Text variant="bodyBold" color={colors.inkMuted} center style={styles.or}>
          or
        </Text>

        <Animated.View style={[styles.codeField, { width: fieldWidth }]}>
          {expanded ? (
            <View style={styles.codeRow}>
              <TextInput
                autoFocus
                value={code}
                onChangeText={setCode}
                placeholder="Enter code..."
                placeholderTextColor={colors.inkMuted}
                autoCapitalize="characters"
                autoCorrect={false}
                returnKeyType="send"
                onSubmitEditing={() => router.back()}
                style={styles.codeInput}
              />
              <Pressable
                accessibilityRole="button"
                onPress={() => router.back()}
                style={({ pressed }) => [
                  styles.sendCode,
                  code.trim() ? styles.sendCodeReady : null,
                  pressed && styles.pressed,
                ]}
              >
                <Text variant="button" color={colors.inkInverse}>
                  Send
                </Text>
              </Pressable>
            </View>
          ) : (
            <Pressable
              accessibilityRole="button"
              onPress={() => setExpanded(true)}
              style={styles.codeFieldTap}
            >
              <Text
                variant="button"
                color={colors.inkMuted}
                style={styles.codeFieldLabel}
              >
                Use a friend&apos;s code
              </Text>
            </Pressable>
          )}
        </Animated.View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: screenPadding,
  },
  backdrop: {
    backgroundColor: colors.scrimLight,
  },
  panel: {
    backgroundColor: colors.surfaceMuted,
    // Square: the reference panel turns its corners hard.
    borderRadius: 0,
    paddingVertical: spacing['4xl'],
    paddingHorizontal: spacing['2xl'],
    borderWidth: 1,
    borderColor: colors.dividerStrong,
    ...shadows.lifted,
  },
  code: {
    marginTop: spacing['3xl'],
    fontSize: 30,
    lineHeight: 36,
    letterSpacing: 1,
  },
  codeHint: {
    fontSize: 18,
    lineHeight: 24,
  },
  // No width of its own: hugging the label keeps it near half the panel
  // without risking a wrapped label. The tighter gutter pulls it in further.
  send: {
    alignSelf: 'center',
    marginTop: spacing.xl,
    borderRadius: radii.md,
    paddingHorizontal: spacing.lg,
    ...shadows.floating,
  },
  sendLabel: {
    fontSize: 20,
    lineHeight: 26,
  },
  or: {
    marginTop: spacing.sm,
    fontSize: 17,
    lineHeight: 22,
  },
  codeField: {
    alignSelf: 'center',
    marginTop: spacing.sm,
    height: 58,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.field,
    overflow: 'hidden',
  },
  // Padding lives on the contents, not the field: the collapsed label is
  // centred and only wants clearance, while the expanded row is set against
  // the left edge and wants a proper gutter.
  codeFieldTap: {
    flex: 1,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  codeFieldLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: 19,
    lineHeight: 25,
  },
  codeRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  codeInput: {
    flex: 1,
    paddingVertical: 0,
    fontFamily: fonts.bodyBold,
    fontSize: 19,
    letterSpacing: bodyTracking,
    color: colors.ink,
  },
  // Grey until there is something to send, then it reads as a live action.
  sendCode: {
    height: 38,
    marginLeft: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.md,
    backgroundColor: colors.inkMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendCodeReady: {
    backgroundColor: colors.ink,
  },
  pressed: {
    opacity: 0.85,
  },
});
