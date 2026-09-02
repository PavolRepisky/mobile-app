import { Caveat_600SemiBold } from '@expo-google-fonts/caveat';
import {
  PlayfairDisplay_500Medium,
  PlayfairDisplay_500Medium_Italic,
  PlayfairDisplay_700Bold,
  PlayfairDisplay_700Bold_Italic,
  PlayfairDisplay_900Black,
  PlayfairDisplay_900Black_Italic,
} from '@expo-google-fonts/playfair-display';
import {
  Quicksand_400Regular,
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
import { AppProvider } from '@/hooks/useAppState';

SplashScreen.preventAutoHideAsync().catch(() => {
  /* no-op: splash may already be hidden on fast refresh */
});

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    PlayfairDisplay_500Medium,
    PlayfairDisplay_500Medium_Italic,
    PlayfairDisplay_700Bold,
    PlayfairDisplay_700Bold_Italic,
    PlayfairDisplay_900Black,
    PlayfairDisplay_900Black_Italic,
    Quicksand_400Regular,
    Quicksand_500Medium,
    Quicksand_600SemiBold,
    Quicksand_700Bold,
    Caveat_600SemiBold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded, fontError]);

  // Headlines are the whole design; showing them in a fallback face first
  // would flash badly, so hold the splash until Playfair is ready.
  if (!fontsLoaded && !fontError) {
    return <View style={{ flex: 1, backgroundColor: colors.background }} />;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AppProvider>
          <StatusBar style="dark" />
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: colors.background },
              animation: 'slide_from_right',
            }}
          >
            <Stack.Screen name="index" />
            <Stack.Screen name="(tabs)" />
            <Stack.Screen
              name="story"
              options={{ animation: 'fade', presentation: 'fullScreenModal' }}
            />
            <Stack.Screen
              name="invite"
              options={{
                presentation: 'transparentModal',
                animation: 'fade',
                // Without this the stack's own opaque `contentStyle` paints
                // over the tab behind, and the blurred backdrop has nothing
                // left to show.
                contentStyle: { backgroundColor: 'transparent' },
              }}
            />
            <Stack.Screen
              name="friend/[id]"
              options={{
                presentation: 'fullScreenModal',
                animation: 'slide_from_bottom',
              }}
            />
            <Stack.Screen
              name="post/[id]"
              options={{
                presentation: 'transparentModal',
                animation: 'fade',
                // Without this the stack's own opaque `contentStyle` paints
                // over the feed, and the blurred backdrop has nothing left
                // to show.
                contentStyle: { backgroundColor: 'transparent' },
              }}
            />
            {/* Opened from inside the friend sheet, so it has to cover the
                whole screen the way that sheet does — otherwise it reads as
                a panel over the profile rather than a page of its own. */}
            <Stack.Screen
              name="wall/[id]"
              options={{ presentation: 'fullScreenModal' }}
            />
            {/* Reached from the profile, but also from the pin screen above,
                which is itself a full-screen modal — and a card pushed on top
                of one comes up as a page sheet: inset, corners rounded, the
                screen behind still showing over it. Declaring the same
                presentation is what keeps it a page from both directions. */}
            <Stack.Screen
              name="wall/create"
              options={{ presentation: 'fullScreenModal' }}
            />
            {/* The viewfinder rises from the bottom the way a capture screen
                should. A push rather than a modal: on the root stack it covers
                the tabs anyway, and it is opened from a dialog, where
                presenting a view controller on top of one still dismissing is
                what drops the screen on iOS. */}
            <Stack.Screen
              name="photo/camera"
              options={{
                animation: 'slide_from_bottom',
                contentStyle: { backgroundColor: colors.mediaBackdrop },
              }}
            />
            <Stack.Screen name="feed/[id]" />
            <Stack.Screen name="recipe/[id]" />
            <Stack.Screen name="challenge/select" />
            <Stack.Screen name="challenge/detail" />
            <Stack.Screen name="account/settings" />
            <Stack.Screen name="account/bio" />
            <Stack.Screen name="account/views" />
          </Stack>
        </AppProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
