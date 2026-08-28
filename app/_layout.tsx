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
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import 'react-native-reanimated';

import '../global.css';
import { tokens } from '@/constants/tokens';
import { DocumentsProvider } from '@/lib/documents-store';
import { AuthProvider, useAuth } from '@/lib/auth-context';
import { AccountI18nProvider } from '@/lib/i18n/provider-bridge';
import { useI18n } from '@/lib/i18n/context';
import { MembershipProvider } from '@/lib/membership-context';
import { StartupBoundary } from '@/components/ui/startup-boundary';
import { STARTUP_TIMEOUT_MS, canRenderApp, splashShouldHide, startupPhase } from '@/lib/startup-gate';

export const unstable_settings = {
  anchor: '(tabs)',
};

// Hold the splash until fonts resolve -- otherwise the first frame renders in
// the system font and every label reflows once Poppins/Plex land.
//
// Caught, because an unhandled rejection here is a startup failure reported nowhere. If the splash
// cannot be held the app still boots; it just renders a frame earlier than intended.
SplashScreen.preventAutoHideAsync().catch(() => undefined);

/**
 * Hiding the splash, once, and never throwing.
 *
 * Idempotent because several paths legitimately race to call it -- fonts settling, the startup
 * budget expiring, and the error boundary catching a throw. Whichever arrives first wins and the
 * rest are no-ops. `hideAsync` rejects if the splash is already gone, which must never become the
 * error that strands the screen it was trying to clear.
 */
let splashHidden = false;
function hideSplashOnce() {
  if (splashHidden) return;
  splashHidden = true;
  SplashScreen.hideAsync().catch(() => undefined);
}

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
  /*
   * Header titles follow the reader's language.
   *
   * Only the screens this identity-theft flow actually reaches are keyed: Documents hands off to
   * `upload`, Run Zoey opens `interview`, and `settings` is where the language is chosen. The
   * remaining titles below are other features' copy and are deliberately left alone rather than
   * half-translated from here.
   */
  const { t } = useI18n();
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
          <Stack.Screen name="upload" options={{ presentation: 'modal', title: t('upload.title') }} />
          <Stack.Screen name="interview" options={{ presentation: 'modal', title: t('interview.title') }} />
          <Stack.Screen name="settings" options={{ title: t('settings.title') }} />
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
    Poppins_700Bold,
    IBMPlexSans_400Regular,
    IBMPlexSans_500Medium,
    IBMPlexSans_600SemiBold,
    IBMPlexMono_400Regular,
  });

  /*
   * The font wait is BUDGETED. `useFonts` resolving is the happy path, not a precondition: a font
   * that never settles used to hold the splash indefinitely, and a reflow into Poppins is a far
   * smaller cost than a launch screen that never goes away.
   */
  const [timedOut, setTimedOut] = useState(false);
  const [renderError, setRenderError] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => setTimedOut(true), STARTUP_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [attempt]);

  const phase = startupPhase({ fontsLoaded, fontError: Boolean(fontError), timedOut, renderError });

  /*
   * One place decides, and it hides the splash for every phase except the bounded wait. This runs
   * on mount too, so a phase that is already terminal on the first render still clears the splash.
   */
  useEffect(() => {
    if (splashShouldHide(phase)) hideSplashOnce();
  }, [phase]);

  const handleError = useCallback(() => {
    // Belt and braces: the boundary hides the splash directly, because the effect above belongs to
    // a component that may itself be part of what just failed.
    hideSplashOnce();
    setRenderError(true);
  }, []);

  const handleRetry = useCallback(() => {
    setRenderError(false);
    setTimedOut(false);
    // Remounts the provider tree, so a transient failure gets a genuinely fresh attempt.
    setAttempt((n) => n + 1);
  }, []);

  return (
    <StartupBoundary hasError={phase === 'FAILED'} onError={handleError} onRetry={handleRetry}>
      {canRenderApp(phase) ? (
        <SafeAreaProvider key={attempt}>
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
      ) : (
        // The bounded wait. The splash is still up in front of this.
        <View className="flex-1" style={{ backgroundColor: tokens.ink950 }} />
      )}
    </StartupBoundary>
  );
}
