// Import per-weight subpaths, NOT the package roots. Each package's root index
// re-exports every weight and italic, which drags ~28 faces into the bundle
// (5.2 MB of assets vs 912 kB). These five are the only faces we use.
import { IBMPlexMono_400Regular } from '@expo-google-fonts/ibm-plex-mono/400Regular';
import { IBMPlexSans_400Regular } from '@expo-google-fonts/ibm-plex-sans/400Regular';
import { IBMPlexSans_500Medium } from '@expo-google-fonts/ibm-plex-sans/500Medium';
import { IBMPlexSans_600SemiBold } from '@expo-google-fonts/ibm-plex-sans/600SemiBold';
import { Poppins_600SemiBold } from '@expo-google-fonts/poppins/600SemiBold';
import { Poppins_700Bold } from '@expo-google-fonts/poppins/700Bold';
import { DarkTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import 'react-native-reanimated';

import '../global.css';
import { tokens } from '@/constants/tokens';
import { DocumentsProvider } from '@/lib/documents-store';
import { AuthProvider, useAuth } from '@/lib/auth-context';
import { AccountI18nProvider } from '@/lib/i18n/provider-bridge';
import { MembershipProvider } from '@/lib/membership-context';

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

function ProtectedNavigator() {
  const { loading, session } = useAuth();
  if (loading) return <View className="flex-1 items-center justify-center bg-ink-950"><ActivityIndicator color={tokens.violet500} /></View>;
  return (
    <ThemeProvider value={zoeyTheme}>
      <Stack screenOptions={{ contentStyle: { backgroundColor: tokens.ink950 } }}>
        <Stack.Protected guard={!session}>
          {/*
            `welcome` is declared FIRST so a signed-out launch lands on the
            cinematic screen; `sign-in` is pushed from its Get Started button and
            keeps every Supabase call it already had.
          */}
          <Stack.Screen name="welcome" options={{ headerShown: false }} />
          <Stack.Screen name="sign-in" options={{ headerShown: false }} />
        </Stack.Protected>
        <Stack.Protected guard={Boolean(session)}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="chat" options={{ presentation: 'modal', title: 'Zoey AI' }} />
          <Stack.Screen name="settings" options={{ title: 'Settings' }} />
          <Stack.Screen name="subscription" options={{ title: 'Subscription' }} />
          <Stack.Screen name="membership" options={{ title: 'Zoey Membership' }} />
          <Stack.Screen name="credit-services" options={{ title: 'Credit Services' }} />
          <Stack.Screen name="signed-acknowledgment" options={{ title: 'Signed acknowledgment' }} />
          <Stack.Screen name="goals" options={{ title: 'Goals' }} />
          {/*
            Credit Score is a bottom tab now, so it is declared by `(tabs)`.
            Leaving the root entry here would name a route that no longer exists
            at this level. `router.push('/credit-score')` still works from More
            -- it selects the tab.
          */}
        </Stack.Protected>
        <Stack.Screen name="reset-password" options={{ headerShown: false }} />
        {/*
          Legal & Privacy sits OUTSIDE both guards, so it resolves with or without a session.

          Deliberate: somebody deciding whether to hand Zoey a photograph of their Social Security
          card has to be able to read the privacy policy BEFORE creating an account, and the signup
          screen links straight to it. Putting these routes inside the signed-in guard would make the
          privacy policy require the account it describes.
        */}
        <Stack.Screen name="legal/index" options={{ title: 'Legal & Privacy' }} />
        <Stack.Screen name="legal/[doc]" options={{ title: 'Legal' }} />
      </Stack>
      <StatusBar style="light" />
    </ThemeProvider>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Poppins_600SemiBold,
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
      <AuthProvider>
        {/*
          Inside AuthProvider so the locale can follow the signed-in account, and OUTSIDE everything
          that renders copy so a language change re-renders the whole tree at once. Nothing below
          needs to know a language changed; they re-render because context did.
        */}
        <AccountI18nProvider>
        {/* Inside AuthProvider: membership is read per verified Supabase user. */}
        <MembershipProvider>
          <DocumentsProvider>
            <ProtectedNavigator />
          </DocumentsProvider>
        </MembershipProvider>
        </AccountI18nProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
