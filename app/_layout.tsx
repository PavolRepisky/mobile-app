import { Caveat_600SemiBold } from '@expo-google-fonts/caveat';
import { Fraunces_900Black } from '@expo-google-fonts/fraunces';
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
    Quicksand_400Regular,
    Quicksand_500Medium,
    Quicksand_600SemiBold,
    Quicksand_700Bold,
    Caveat_600SemiBold,
    Fraunces_900Black,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded, fontError]);

  // Headlines are the whole design; showing them in a fallback face first
  // would flash badly, so hold the splash until every face is ready.
  if (!fontsLoaded && !fontError) {
    return <View style={{ flex: 1, backgroundColor: colors.backgroundPlain }} />;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AppProvider>
          <StatusBar style="dark" />
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: colors.backgroundPlain },
              animation: 'slide_from_right',
            }}
          >
            <Stack.Screen name="index" />
            <Stack.Screen name="(tabs)" />
            <Stack.Screen
              name="story"
              options={{ animation: 'fade', presentation: 'fullScreenModal' }}
            />
            <Stack.Screen name="add-friends" />
            <Stack.Screen name="add-friend/[handle]" />
            <Stack.Screen
              name="friend/[id]"
              options={{
                presentation: 'fullScreenModal',
                animation: 'slide_from_bottom',
              }}
            />
            {/* Opened from inside the friend sheet, so it has to cover the
                whole screen the way that sheet does — otherwise it reads as
                a panel over the profile rather than a page of its own. */}
            <Stack.Screen
              name="friend/post/[id]"
              options={{ presentation: 'fullScreenModal' }}
            />
            <Stack.Screen name="feed/[id]" />
            <Stack.Screen name="challenge/create" />
            <Stack.Screen name="account/settings" />
          </Stack>
        </AppProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
