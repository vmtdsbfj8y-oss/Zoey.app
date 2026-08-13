// Import per-weight subpaths, NOT the package roots. Each package's root index
// re-exports every weight and italic, which drags ~28 faces into the bundle
// (5.2 MB of assets vs 912 kB). These five are the only faces we use.
import { IBMPlexMono_400Regular } from '@expo-google-fonts/ibm-plex-mono/400Regular';
import { IBMPlexSans_400Regular } from '@expo-google-fonts/ibm-plex-sans/400Regular';
import { IBMPlexSans_500Medium } from '@expo-google-fonts/ibm-plex-sans/500Medium';
import { IBMPlexSans_600SemiBold } from '@expo-google-fonts/ibm-plex-sans/600SemiBold';
import { Poppins_700Bold } from '@expo-google-fonts/poppins/700Bold';
import { DarkTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import 'react-native-reanimated';

import '../global.css';
import { tokens } from '@/constants/tokens';

export const unstable_settings = {
  anchor: '(tabs)',
};

// Hold the splash until fonts resolve -- otherwise the first frame renders in
// the system font and every label reflows once Poppins/Plex land.
SplashScreen.preventAutoHideAsync();

/**
 * Dark-only: there is no light variant of this design, so the navigation theme
 * is pinned rather than following the system. This is also what stops the
 * white flash between screen transitions.
 */
const zoeyTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: tokens.ink950,
    card: tokens.ink900,
    border: tokens.ink700,
    text: tokens.parchment,
    primary: tokens.violet500,
  },
};

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Poppins_700Bold,
    IBMPlexSans_400Regular,
    IBMPlexSans_500Medium,
    IBMPlexSans_600SemiBold,
    IBMPlexMono_400Regular,
  });

  useEffect(() => {
    // Hide on error too, otherwise a font failure leaves the app on the splash.
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <ThemeProvider value={zoeyTheme}>
        <Stack screenOptions={{ contentStyle: { backgroundColor: tokens.ink950 } }}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="chat" options={{ presentation: 'modal', title: 'Zoey AI' }} />
          <Stack.Screen
            name="upload"
            options={{ presentation: 'modal', title: 'Upload Document' }}
          />
        </Stack>
        <StatusBar style="light" />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
