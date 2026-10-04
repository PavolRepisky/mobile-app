import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';

import { supabase } from '@/lib/supabase';

/**
 * Signing in and out: Apple, Google, or an email and password.
 *
 * Apple and Google both go through the browser sheet — Supabase's own
 * sign-in page, which hands a one-time code back through the app's link.
 * That works the same in Expo Go and in a release build, which the native
 * sign-in buttons don't: those need a development build, and can replace
 * this later without changing who anyone is.
 */

// Closes the browser sheet on the web when it lands back on the app.
WebBrowser.maybeCompleteAuthSession();

export type Provider = 'apple' | 'google';

/** Opens the provider's sign-in and resolves once the session is stored —
 * or with `false` if the person backed out. */
export async function signInWith(provider: Provider): Promise<boolean> {
  // `exp://…` inside Expo Go, `her75://…` in the app itself; both are on the
  // project's list of allowed redirects.
  const redirectTo = Linking.createURL('auth/callback');

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: { redirectTo, skipBrowserRedirect: true },
  });
  if (error) throw error;

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  if (result.type !== 'success') return false;

  const { queryParams } = Linking.parse(result.url);
  const failure = queryParams?.error_description ?? queryParams?.error;
  if (failure) throw new Error(String(failure));
  const code = queryParams?.code;
  if (typeof code !== 'string') throw new Error('Sign-in came back without a code');

  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
  if (exchangeError) throw exchangeError;

  await syncTimezone();
  return true;
}

/**
 * Which sign-in buttons to show. A provider that isn't switched on in the
 * project would only open a browser sheet saying so, so its button stays
 * hidden until it is — Apple and Google can be turned on later without the
 * app changing.
 */
export async function enabledProviders(): Promise<Record<Provider, boolean>> {
  try {
    const response = await fetch(`${process.env.EXPO_PUBLIC_SUPABASE_URL}/auth/v1/settings`, {
      headers: { apikey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '' },
    });
    const settings = (await response.json()) as { external?: Partial<Record<Provider, boolean>> };
    return { apple: !!settings.external?.apple, google: !!settings.external?.google };
  } catch {
    return { apple: false, google: false };
  }
}

/** What went wrong, in the words the sign-in screen shows. */
function explain(error: { message: string; code?: string }): Error {
  switch (error.code) {
    case 'invalid_credentials':
      return new Error("That email and password don't match.");
    case 'user_already_exists':
    case 'email_exists':
      return new Error('There’s already an account with that email. Log in instead.');
    case 'weak_password':
      return new Error('Pick a longer password — at least 8 characters.');
    case 'email_address_invalid':
    case 'validation_failed':
      return new Error('That doesn’t look like an email address.');
    case 'over_request_rate_limit':
    case 'over_email_send_rate_limit':
      return new Error('Too many tries. Wait a minute and try again.');
    default:
      return new Error(error.message);
  }
}

/**
 * A new account from an email and password. The name becomes the profile's
 * name, and its first word the start of the handle. Resolves `true` when
 * the account is signed in straight away, `false` when the project asks for
 * the email to be confirmed first — the screen then says to check it.
 */
export async function signUpWithEmail(name: string, email: string, password: string): Promise<boolean> {
  const { data, error } = await supabase.auth.signUp({
    email: email.trim(),
    password,
    options: { data: { full_name: name.trim() } },
  });
  if (error) throw explain(error);
  if (!data.session) return false;
  await syncTimezone();
  return true;
}

export async function signInWithEmail(email: string, password: string) {
  const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
  if (error) throw explain(error);
  await syncTimezone();
}

/**
 * A challenge day runs midnight to midnight where you are, and the server
 * works out which day that is from the zone on your profile — so it's kept
 * up to date with the phone's on every sign-in, and again when you travel.
 */
export async function syncTimezone() {
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const { data } = await supabase.auth.getUser();
  if (!timezone || !data.user) return;
  const { error } = await supabase.from('profiles').update({ timezone }).eq('id', data.user.id);
  if (error) throw error;
}

/** Ends the session everywhere it's signed in; offline, it still forgets the
 * one on this phone, since logging out mustn't depend on a connection. */
export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) await supabase.auth.signOut({ scope: 'local' });
}

/** Settings' Delete account: every photo, every day, the account itself. */
export async function deleteAccount() {
  const { error } = await supabase.functions.invoke('delete-account', { method: 'POST' });
  if (error) throw error;
  // The account is gone server-side; this just forgets the local session.
  await supabase.auth.signOut({ scope: 'local' });
}
