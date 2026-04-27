import { Stack } from 'expo-router';
import { PaperProvider, MD3LightTheme } from 'react-native-paper';
import { useFonts } from 'expo-font';
import { Inter_400Regular, Inter_600SemiBold } from '@expo-google-fonts/inter';
import { Colors, Fonts } from '../theme';

const theme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: Colors.primary,
    secondary: Colors.accent,
    background: Colors.paper,
    surface: Colors.white,
    onPrimary: Colors.white,
  },
};

export default function RootLayout() {
  // Fonts load async — app renders immediately with system fallback,
  // then re-renders once custom fonts are ready.
  useFonts({
    Galley: require('../assets/fonts/Galley.ttf'),
    Inter_400Regular,
    Inter_600SemiBold,
  });

  return (
    <PaperProvider theme={theme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="record/[id]"
          options={{
            title: 'Record Detail',
            headerBackTitle: 'Albums',
            headerStyle: { backgroundColor: Colors.primaryDark },
            headerTintColor: Colors.white,
            headerTitleStyle: { fontFamily: Fonts.heading, fontSize: 20 },
          }}
        />
      </Stack>
    </PaperProvider>
  );
}
