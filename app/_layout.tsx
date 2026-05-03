import 'react-native-get-random-values';

import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { LogBox } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

LogBox.ignoreLogs([
  'Expo AV has been deprecated',
  '`ImagePicker.MediaTypeOptions` have been deprecated',
  'Sending `onAnimatedValueUpdate`',
]);

import { useAppFonts } from '@/styles/typography';

// Hold the splash until fonts (and any other startup work) are ready.
// Calling this at module top mirrors the Expo SDK guidance.
void SplashScreen.preventAutoHideAsync().catch(() => undefined);

export default function RootLayout() {
  const { fontsLoaded } = useAppFonts();

  useEffect(() => {
    if (fontsLoaded) {
      void SplashScreen.hideAsync().catch(() => undefined);
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <GestureHandlerRootView style={rootStyles.flex}>
      <SafeAreaProvider>
        <Stack screenOptions={{ headerShown: false }} />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const rootStyles = { flex: { flex: 1 } } as const;
