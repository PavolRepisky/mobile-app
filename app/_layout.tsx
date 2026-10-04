import { Fraunces_900Black } from '@expo-google-fonts/fraunces';
import {
  Quicksand_500Medium,
  Quicksand_600SemiBold,
  Quicksand_700Bold,
} from '@expo-google-fonts/quicksand';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { colors } from '@/constants/theme';
import { AppProvider, useApp } from '@/hooks/useAppState';
import { SessionProvider, useSession } from '@/hooks/useSession';

SplashScreen.preventAutoHideAsync().catch(() => {
  /* no-op: splash may already be hidden on fast refresh */
});

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Quicksand_500Medium,
    Quicksand_600SemiBold,
    Quicksand_700Bold,
    Fraunces_900Black,
  });

  // Headlines are the whole design; showing them in a fallback face first
  // would flash badly, so hold the splash until every face is ready.
  if (!fontsLoaded && !fontError) {
    return <View style={{ flex: 1, backgroundColor: colors.backgroundPlain }} />;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <SessionProvider>
          <AppProvider>
            <StatusBar style="dark" />
            <RootStack />
          </AppProvider>
        </SessionProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

/**
 * Signed out, the sign-in page is the only one there is; signed in, it's
 * gone and the app is everything else. A session appearing or ending swaps
 * one set for the other, so neither signing in nor out has to navigate.
 */
function RootStack() {
  const { session, ready: sessionReady } = useSession();
  const { ready: accountReady } = useApp();
  const signedIn = !!session;
  // The splash waits on the stored session being read back, so a signed-in
  // launch never shows the sign-in page for a frame first — and, signed in,
  // on the account's own data, so the demo account behind it never shows.
  const ready = sessionReady && (!signedIn || accountReady);

  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => {});
  }, [ready]);

  if (!ready) {
    return <View style={{ flex: 1, backgroundColor: colors.backgroundPlain }} />;
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.backgroundPlain },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Protected guard={!signedIn}>
        <Stack.Screen name="sign-in" options={{ animation: 'fade' }} />
      </Stack.Protected>

      <Stack.Protected guard={signedIn}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />
        <Stack.Screen
          name="story"
          options={{ animation: 'fade', presentation: 'fullScreenModal' }}
        />
        <Stack.Screen name="add-friends" />
        <Stack.Screen name="add-friend/[handle]" />
        {/* Someone else's profile and days are ordinary pages, pushed
            the way your own Profile's are. As a modal, everything opened
            from them — the challenge, their days — came up as a sheet
            over it instead of a page of its own. */}
        <Stack.Screen name="friend/[id]" />
        <Stack.Screen name="friend/post/[id]" />
        <Stack.Screen name="feed/[id]" />
        <Stack.Screen name="join/[id]" />
        <Stack.Screen name="challenges/search" />
        <Stack.Screen name="challenges/[filter]" />
        <Stack.Screen name="challenge/create" />
        <Stack.Screen name="account/settings" />
      </Stack.Protected>
    </Stack>
  );
}
