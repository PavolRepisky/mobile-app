import { useState, type ReactNode } from 'react';
import { StyleSheet, TextInput, View, type StyleProp, type ViewStyle } from 'react-native';

import { PrimaryButton } from '@/components/Buttons';
import { PhotoStrip } from '@/components/PhotoStrip';
import { ScreenScroll } from '@/components/Screen';
import { SegmentedTabs } from '@/components/SegmentedTabs';
import { Text } from '@/components/Text';
import { colors, layout, radii, type as typeScale } from '@/constants/theme';
import { challengeStrip } from '@/data/content';
import { signInWithEmail, signUpWithEmail } from '@/lib/backend/auth';

type Mode = 'signup' | 'login';

const MODES = [
  { key: 'signup', label: 'Sign up' },
  { key: 'login', label: 'Log in' },
] as const;

/** Supabase's own floor, said up front rather than after a failed try. */
const MIN_PASSWORD = 8;

/**
 * The only page someone signed out can reach. The flagship challenge's prints
 * across the top say what the app is before a word is read; under them, an
 * email and password, as a new account or a way back into one. Apple and
 * Google can join above the form later — `lib/backend/auth` already signs
 * in with both.
 */
export default function SignIn() {
  const [mode, setMode] = useState<Mode>('signup');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Set when the project asks for the email to be confirmed before the
  // account can be used; signing in waits on that.
  const [confirmSent, setConfirmSent] = useState(false);

  const signingUp = mode === 'signup';
  const looksLikeEmail = /^\S+@\S+\.\S+$/.test(email.trim());
  const ready =
    looksLikeEmail &&
    (signingUp ? name.trim().length > 0 && password.length >= MIN_PASSWORD : password.length > 0);

  // A session landing is what moves the app on to the tabs — the root
  // layout swaps this page out as soon as one exists — so success needs no
  // navigation here.
  const run = async (attempt: () => Promise<unknown>) => {
    setBusy(true);
    setError(null);
    try {
      await attempt();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong. Try again.');
    } finally {
      setBusy(false);
    }
  };

  const submit = () =>
    run(async () => {
      if (signingUp) {
        const signedIn = await signUpWithEmail(name, email, password);
        if (!signedIn) setConfirmSent(true);
      } else {
        await signInWithEmail(email, password);
      }
    });

  const switchMode = (next: Mode) => {
    setMode(next);
    setError(null);
    setConfirmSent(false);
  };

  return (
    <ScreenScroll automaticallyAdjustKeyboardInsets contentContainerStyle={styles.page}>
      <PhotoStrip photos={challengeStrip('her75')} />

      <View style={styles.intro}>
        <Text variant="headline">Her 75</Text>
        <Text variant="copy" color={colors.inkMuted}>
          Photograph your day, keep your streak, and do it with friends.
        </Text>
      </View>

      <View style={styles.form}>
        <SegmentedTabs options={MODES} value={mode} onChange={switchMode} />

        <View style={styles.fields}>
          {signingUp ? (
            <Field label="Name">
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="What friends call you"
                placeholderTextColor={colors.inkMuted}
                autoComplete="name"
                textContentType="name"
                returnKeyType="next"
                style={styles.input}
              />
            </Field>
          ) : null}
          <Field label="Email">
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              placeholderTextColor={colors.inkMuted}
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
              keyboardType="email-address"
              textContentType="emailAddress"
              returnKeyType="next"
              style={styles.input}
            />
          </Field>
          <Field label="Password">
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder={signingUp ? `At least ${MIN_PASSWORD} characters` : 'Your password'}
              placeholderTextColor={colors.inkMuted}
              secureTextEntry
              autoCapitalize="none"
              autoComplete={signingUp ? 'new-password' : 'current-password'}
              textContentType={signingUp ? 'newPassword' : 'password'}
              returnKeyType="go"
              onSubmitEditing={ready && !busy ? submit : undefined}
              style={styles.input}
            />
          </Field>
        </View>

        {error ? (
          <Text variant="meta" center>
            {error}
          </Text>
        ) : null}
        {confirmSent ? (
          <Text variant="meta" center>
            Check {email.trim()} for a link to confirm it, then log in.
          </Text>
        ) : null}

        <PrimaryButton
          label={busy ? 'One moment…' : signingUp ? 'Create account' : 'Log in'}
          disabled={!ready || busy}
          onPress={submit}
        />
      </View>
    </ScreenScroll>
  );
}

/** A labelled field on the fill grey — the create form's, so typing into
 * the app looks the same wherever it happens. */
function Field({ label, children, style }: { label: string; children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[styles.field, style]}>
      <Text variant="metaBold">{label}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    gap: layout.section,
    paddingBottom: layout.section,
  },
  intro: {
    gap: layout.line,
  },
  form: {
    gap: layout.block,
  },
  fields: {
    gap: layout.inline,
  },
  field: {
    gap: layout.line,
    backgroundColor: colors.surfaceSunken,
    borderRadius: radii.lg,
    paddingVertical: layout.inline,
    paddingHorizontal: layout.block,
  },
  input: {
    ...typeScale.copy,
    color: colors.ink,
    padding: 0,
  },
});
