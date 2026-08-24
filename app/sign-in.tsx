import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SceneLight } from '@/components/welcome/scene-light';
import { GlassSurface } from '@/components/ui/glass-surface';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { ZoeyAvatar } from '@/components/ui/zoey-avatar';
import { LanguageChoice } from '@/components/settings/language-choice';
import { recordLegalAcceptance } from '@/lib/account-api';
import { useI18n } from '@/lib/i18n/context';
import { signupAcceptance } from '@/lib/legal';
import { supabase } from '@/lib/supabase';
import { PROVIDER_SETUP, signInWithProvider, type OAuthProvider } from '@/lib/oauth';

type Mode = 'sign-in' | 'create';

/**
 * Sign in / create account.
 *
 * Every path here lands in the SAME Supabase session -- Apple, Google and email
 * all resolve to `supabase.auth`, so there is no separate account store and the
 * `Stack.Protected` guards, Sign Out and the private API all behave identically
 * whichever the client used.
 */
export default function SignInScreen() {
  const { width } = useWindowDimensions();
  const [mode, setMode] = useState<Mode>('sign-in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [acceptedLegal, setAcceptedLegal] = useState(false);
  const { t, locale } = useI18n();
  const [provider, setProvider] = useState<OAuthProvider | null>(null);

  /* ---- existing Supabase email/password flow, unchanged ---- */

  const submit = async () => {
    const clean = email.trim().toLowerCase();
    if (!clean || password.length < 8)
      return void Alert.alert(
        t('auth.checkInfoTitle'),
        t('auth.checkInfoBody')
      );
    if (mode === 'create' && !acceptedLegal)
      return void Alert.alert(
        t('auth.acceptRequiredTitle'),
        t('auth.acceptRequiredBody')
      );
    setBusy(true);
    try {
      if (mode === 'sign-in') {
        const { error } = await supabase.auth.signInWithPassword({ email: clean, password });
        if (error) throw error;
      } else {
        const { data, error } = await supabase.auth.signUp({
          email: clean,
          password,
          options: { emailRedirectTo: 'zoeyapp://sign-in' },
        });
        if (error) throw error;

        /*
         * Recorded only when a session exists, because writing the acceptance needs an authenticated
         * request. With email verification on there is no session yet, so the record is captured on
         * the first authenticated launch instead -- the server appends and de-duplicates, so calling
         * it again later is free and calling it twice is harmless.
         *
         * Never blocks the signup. A failed consent write must not strand someone outside an account
         * they just created and did agree to.
         */
        if (data.session) {
          void recordLegalAcceptance(signupAcceptance(Date.now(), locale)).catch(() => {});
        }

        if (!data.session)
          Alert.alert(t('auth.verifyEmailTitle'), t('auth.verifyEmailBody'));
      }
    } catch (error) {
      Alert.alert(
        t('auth.unableTitle'),
        error instanceof Error ? error.message : 'Please try again.'
      );
    } finally {
      setBusy(false);
    }
  };

  const reset = async () => {
    const clean = email.trim().toLowerCase();
    if (!clean) return void Alert.alert('Enter your email first');
    setBusy(true);
    const { error } = await supabase.auth.resetPasswordForEmail(clean, {
      redirectTo: 'zoeyapp://reset-password',
    });
    setBusy(false);
    Alert.alert(
      error ? 'Unable to send reset email' : 'Check your email',
      error?.message ?? 'We sent a secure password-reset link.'
    );
  };

  /* ---- Apple / Google, through the same Supabase auth ---- */

  const oauth = async (which: OAuthProvider) => {
    setProvider(which);
    try {
      await signInWithProvider(which);
      // Success needs no navigation: AuthProvider picks the session up and the
      // Stack.Protected guard swaps to the authenticated app. Cancellation just
      // returns here with nothing changed.
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Please try again.';
      // A provider that has not been configured in Supabase says so plainly,
      // with the remaining setup, rather than looking like a random failure.
      const unconfigured = /not enabled|provider|unsupported/i.test(message);
      Alert.alert(
        unconfigured
          ? `${which === 'apple' ? 'Apple' : 'Google'} sign-in isn’t set up yet`
          : 'Unable to continue',
        unconfigured ? `${message}\n\nStill required:\n• ${PROVIDER_SETUP[which].join('\n• ')}` : message
      );
    } finally {
      setProvider(null);
    }
  };

  const anyBusy = busy || provider !== null;

  return (
    <View className="flex-1" style={{ backgroundColor: '#050109' }}>
      <View pointerEvents="none" style={{ position: 'absolute', inset: 0 }}>
        <SceneLight width={width} height={900} />
      </View>

      <SafeAreaView className="flex-1">
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          className="flex-1">
          <ScrollView
            contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}>
            <View className="items-center">
              <ZoeyAvatar size={64} />
              <Text className="mt-4 font-display text-[26px] text-parchment">{t('auth.welcomeTitle')}</Text>
              <Text className="mt-1.5 text-center font-sans text-[13.5px] text-parchment/60">
                Sign in or create your account to continue.
              </Text>
            </View>

            <View className="mt-7 gap-2.5">
              <ProviderButton
                label="Continue with Apple"
                icon="logo-apple"
                tone="light"
                busy={provider === 'apple'}
                disabled={anyBusy}
                onPress={() => oauth('apple')}
              />
              <ProviderButton
                label="Continue with Google"
                icon="logo-google"
                tone="dark"
                busy={provider === 'google'}
                disabled={anyBusy}
                onPress={() => oauth('google')}
              />
            </View>

            <View className="my-6 flex-row items-center gap-3">
              <View className="h-px flex-1" style={{ backgroundColor: 'rgba(244,239,255,0.14)' }} />
              <Text className="font-sans text-[11.5px] text-parchment/45">
                or continue with email
              </Text>
              <View className="h-px flex-1" style={{ backgroundColor: 'rgba(244,239,255,0.14)' }} />
            </View>

            <GlassSurface radius={26} glow>
              <View className="p-5">
                <View
                  className="mb-4 flex-row rounded-full p-1"
                  style={{ backgroundColor: 'rgba(10,4,24,0.6)' }}>
                  {(['sign-in', 'create'] as Mode[]).map((item) => (
                    <Pressable
                      key={item}
                      accessibilityRole="tab"
                      accessibilityState={{ selected: mode === item }}
                      onPress={() => setMode(item)}
                      className="flex-1 rounded-full py-2.5"
                      style={
                        mode === item ? { backgroundColor: 'rgba(168,85,247,0.85)' } : undefined
                      }>
                      <Text
                        className={`text-center font-sans text-[13px] ${mode === item ? 'text-parchment' : 'text-parchment/55'}`}>
                        {item === 'sign-in' ? 'Sign In' : 'Create Account'}
                      </Text>
                    </Pressable>
                  ))}
                </View>

                <TextInput
                  autoCapitalize="none"
                  autoComplete="email"
                  keyboardType="email-address"
                  placeholder={t('auth.email')}
                  placeholderTextColor="#7B7290"
                  value={email}
                  onChangeText={setEmail}
                  className="mb-2.5 rounded-[18px] px-4 py-4 font-sans text-parchment"
                  style={{
                    backgroundColor: 'rgba(10,4,24,0.55)',
                    borderWidth: 1,
                    borderColor: 'rgba(168,85,247,0.22)',
                  }}
                />
                <TextInput
                  autoCapitalize="none"
                  autoComplete={mode === 'sign-in' ? 'current-password' : 'new-password'}
                  secureTextEntry
                  placeholder={t('auth.password')}
                  placeholderTextColor="#7B7290"
                  value={password}
                  onChangeText={setPassword}
                  className="rounded-[18px] px-4 py-4 font-sans text-parchment"
                  style={{
                    backgroundColor: 'rgba(10,4,24,0.55)',
                    borderWidth: 1,
                    borderColor: 'rgba(168,85,247,0.22)',
                  }}
                />

                {/*
                  ONE acknowledgement, on sign-up only, covering both documents.

                  Not a checkbox per document. Eight boxes is consent theatre: it looks more rigorous
                  and reads as less, because nobody reads eight, and a row of unread ticks is weaker
                  evidence of agreement than a single deliberate one. The Terms incorporate the AI,
                  credit and dispute disclosures by reference, and every one of them is reachable from
                  the links below without an account.

                  Required rather than pre-ticked. A box that arrives already checked records that
                  the screen was rendered, not that a person agreed.
                */}
                {/*
                  Offered during sign-up, before the legal acceptance below it. Somebody who reads
                  Spanish must be able to switch BEFORE they are asked to agree to anything -- an
                  acceptance collected in a language the consumer does not read is not consent.
                */}
                {mode === 'create' ? (
                  <View className="mt-5">
                    <Text className="mb-2 font-sans text-[11px] uppercase tracking-wide text-parchment/45">
                      {t('language.title')}
                    </Text>
                    <LanguageChoice compact />
                  </View>
                ) : null}

                {mode === 'create' ? (
                  <View className="mt-4 flex-row items-start gap-3">
                    <Pressable
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: acceptedLegal }}
                      accessibilityLabel="Accept the Terms of Use and Privacy Policy"
                      onPress={() => setAcceptedLegal((v) => !v)}
                      hitSlop={8}
                      className="mt-0.5 h-[22px] w-[22px] items-center justify-center rounded-[7px]"
                      style={{
                        borderWidth: 1.5,
                        borderColor: acceptedLegal ? '#9333EA' : 'rgba(168,85,247,0.4)',
                        backgroundColor: acceptedLegal ? '#9333EA' : 'transparent',
                      }}>
                      {acceptedLegal ? (
                        <IconSymbol name="checkmark.circle" size={14} color="#fff" />
                      ) : null}
                    </Pressable>
                    <Text className="flex-1 font-sans text-[12px] leading-[18px] text-parchment/60">
                      I have read and agree to the{' '}
                      <Text
                        accessibilityRole="link"
                        className="text-violet-300"
                        onPress={() => router.push('/legal/terms')}>
                        Terms of Use
                      </Text>{' '}
                      and{' '}
                      <Text
                        accessibilityRole="link"
                        className="text-violet-300"
                        onPress={() => router.push('/legal/privacy')}>
                        Privacy Policy
                      </Text>
                      .
                    </Text>
                  </View>
                ) : null}

                <Pressable
                  accessibilityRole="button"
                  disabled={anyBusy}
                  onPress={submit}
                  className="mt-4 items-center rounded-full py-4 active:opacity-90"
                  style={{ backgroundColor: '#9333EA', opacity: anyBusy ? 0.6 : 1 }}>
                  {busy ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text className="font-sans-semibold text-[15px] text-white">
                      {mode === 'sign-in' ? t('auth.signInButton') : t('auth.createButton')}
                    </Text>
                  )}
                </Pressable>

                {mode === 'sign-in' ? (
                  <Pressable disabled={anyBusy} onPress={reset} className="mt-3.5">
                    <Text className="text-center font-sans text-[13px] text-violet-300">
                      {t('auth.forgotPassword')}
                    </Text>
                  </Pressable>
                ) : null}

                {/*
                  Reachable from the signed-OUT screen, which is the point. Deciding whether to hand
                  Zoey a photograph of a Social Security card is a decision made here, before the
                  account exists -- so the documents that describe what happens to it have to be
                  readable here too.
                */}
                <Pressable
                  accessibilityRole="link"
                  onPress={() => router.push('/legal')}
                  className="mt-4">
                  <Text className="text-center font-sans text-[12px] text-parchment/45">
                    {t('auth.legalLink')}
                  </Text>
                </Pressable>
              </View>
            </GlassSurface>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

/** Native-looking provider button: Apple on white, Google on dark glass. */
function ProviderButton({
  label,
  icon,
  tone,
  busy,
  disabled,
  onPress,
}: {
  label: string;
  icon: 'logo-apple' | 'logo-google';
  tone: 'light' | 'dark';
  busy: boolean;
  disabled: boolean;
  onPress: () => void;
}) {
  const light = tone === 'light';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled, busy }}
      disabled={disabled}
      onPress={onPress}
      className="flex-row items-center justify-center gap-2.5 rounded-full py-4 active:opacity-85"
      style={{
        backgroundColor: light ? '#FFFFFF' : 'rgba(18,8,34,0.85)',
        borderWidth: 1,
        borderColor: light ? 'transparent' : 'rgba(244,239,255,0.16)',
        opacity: disabled && !busy ? 0.5 : 1,
      }}>
      {busy ? (
        <ActivityIndicator color={light ? '#000' : '#fff'} />
      ) : (
        <>
          <Ionicons name={icon} size={19} color={light ? '#000000' : '#FFFFFF'} />
          <Text
            className="font-sans-semibold text-[15px]"
            style={{ color: light ? '#000000' : '#FFFFFF' }}>
            {label}
          </Text>
        </>
      )}
    </Pressable>
  );
}
