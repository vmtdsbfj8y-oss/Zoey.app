import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, Switch, Text, TextInput, View } from 'react-native';

import { ErrorState, InfoNote, LoadingState, SectionLabel } from '@/components/more/states';
import { GlassSurface } from '@/components/ui/glass-surface';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { ScreenBackground } from '@/components/ui/screen-background';
import { tokens } from '@/constants/tokens';
import { useAsync } from '@/hooks/use-async';
import { deleteAccount, getProfile, updateProfile, type Profile } from '@/lib/account-api';
import { useAuth } from '@/lib/auth-context';
import { LanguageChoice } from '@/components/settings/language-choice';
import { useI18n } from '@/lib/i18n/context';
import {
  DELIVERY,
  NOTIFICATION_CATEGORIES,
  notificationStatusKey,
  type NotificationStatus,
} from '@/lib/notification-preferences';

/**
 * Only the free-text string fields. Narrower than `keyof Profile`, which also
 * covers `notifications` (an object) and `updatedAt` (a number) -- those must
 * never be written by this form.
 */
type ProfileTextKey = 'firstName' | 'lastName' | 'email' | 'phone' | 'city' | 'state';

type TextField = {
  key: ProfileTextKey;
  label: string;
  placeholder: string;
  keyboard?: 'email-address' | 'phone-pad';
};

const FIELDS: TextField[] = [
  { key: 'firstName', label: 'First name', placeholder: 'Not set' },
  { key: 'lastName', label: 'Last name', placeholder: 'Not set' },
  { key: 'email', label: 'Email', placeholder: 'Not set', keyboard: 'email-address' },
  { key: 'phone', label: 'Phone', placeholder: 'Not set', keyboard: 'phone-pad' },
  { key: 'city', label: 'City', placeholder: 'Not set' },
  { key: 'state', label: 'State', placeholder: 'Not set' },
];

/*
 * Categories come from the shared registry rather than being written out here, so the labels the
 * consumer reads, the keys the server persists and the assertions the tests make are one list.
 *
 * `osPermission` is NOT_DETERMINED and stays that way: Zoey has no delivery path, so it has never
 * asked iOS for permission. Reading it from a real permission API the moment one exists is a
 * one-line change, and until then claiming any other state would be inventing a fact about the
 * device.
 */
const NOTIFICATION_STATUS: NotificationStatus = { delivery: DELIVERY, osPermission: 'NOT_DETERMINED' };

/** A row that goes somewhere. Same shape as `ComingSoonRow`, minus the apology. */
function NavigationRow({
  icon,
  title,
  detail,
  onPress,
}: {
  icon: Parameters<typeof IconSymbol>[0]['name'];
  title: string;
  detail: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityHint={detail}
      onPress={onPress}
      className="flex-row items-center gap-3 px-3.5 py-3 active:opacity-70">
      <IconSymbol name={icon} size={17} color="rgba(244,239,255,0.7)" />
      <View className="flex-1">
        <Text className="font-sans-medium text-[14px] text-parchment">{title}</Text>
        <Text className="mt-0.5 font-sans text-[11.5px] text-parchment/45">{detail}</Text>
      </View>
      <IconSymbol name="chevron.right" size={15} color="rgba(244,239,255,0.35)" />
    </Pressable>
  );
}

/** A row that is deliberately inert, labelled so nobody mistakes it for working. */
function ComingSoonRow({ icon, title, detail }: { icon: Parameters<typeof IconSymbol>[0]['name']; title: string; detail: string }) {
  return (
    <View className="flex-row items-center gap-3 px-3.5 py-3">
      <IconSymbol name={icon} size={17} color="rgba(244,239,255,0.45)" />
      <View className="flex-1">
        <Text className="font-sans-medium text-[14px] text-parchment/70">{title}</Text>
        <Text className="mt-0.5 font-sans text-[11.5px] text-parchment/40">{detail}</Text>
      </View>
      <View
        className="rounded-full px-2 py-0.5"
        style={{ backgroundColor: 'rgba(244,239,255,0.08)' }}>
        <Text className="font-sans text-[10px] text-parchment/50">Not available yet</Text>
      </View>
    </View>
  );
}

export default function SettingsScreen() {
  const { signOut } = useAuth();
  const { data, error, loading, retry, setLocal } = useAsync(() => getProfile(), []);

  const [draft, setDraft] = useState<Profile>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | undefined>();
  const [signingOut, setSigningOut] = useState(false);
  const [deleting, setDeleting] = useState(false);

  /**
   * Ends the Supabase session.
   *
   * There is no navigation call here on purpose. `supabase.auth.signOut()`
   * clears the session, `onAuthStateChange` pushes `session = null` into
   * AuthProvider, and the `Stack.Protected guard={Boolean(session)}` in
   * app/_layout.tsx unmounts every authenticated route and lands on `welcome`.
   * Routing manually would race that guard, and the guard is also what makes
   * going Back to an authenticated screen impossible -- those screens no longer
   * exist in the navigator, rather than merely being popped off the stack.
   */
  async function confirmSignOut() {
    Alert.alert('Sign out of Zoey?', 'Your documents, disputes and goals stay on your account.', [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: async () => {
          setSigningOut(true);
          try {
            await signOut();
          } catch (err) {
            // A failed revoke means the session is still live -- say so rather
            // than pretending, which is what faking a local logout would do.
            setSigningOut(false);
            Alert.alert(
              'Could not sign out',
              err instanceof Error
                ? err.message
                : 'Zoey could not end your session. Check your connection and try again.'
            );
          }
        },
      },
    ]);
  }

  /**
   * DELETE ACCOUNT -- two deliberate confirmations, then a server call.
   *
   * The first alert explains what is destroyed and is dismissible. The second
   * is a separate decision, phrased as the final one, and it is the only place
   * the request is issued. Two taps that are both "continue" is not two
   * confirmations, so the wording differs: the first offers Continue, the
   * second offers Delete forever.
   *
   * The client performs no deletion of its own. It cannot: removing a Supabase
   * auth user needs the service-role key, which is server-only by design. This
   * asks the server, and the server decides.
   *
   * On success there is no navigation call, for the same reason sign-out has
   * none: `signOut()` clears the session, AuthProvider pushes `session = null`,
   * and the `Stack.Protected` guard in app/_layout.tsx unmounts every
   * authenticated route and lands on `welcome`. That guard -- not a router
   * push -- is what makes Back unable to return to a signed-in screen.
   *
   * On failure the session is deliberately left ALONE. Signing out after a
   * failed deletion would strand the account: still live, and no longer signed
   * in to check.
   *
   * The wording says "everything in it" nowhere, and that is not squeamishness. The deletion process
   * intentionally retains a little -- records of correspondence actually mailed, and enough to stop a
   * deleted account being silently recreated. Promising total erasure in a confirmation dialog would
   * be the one sentence in this flow that is false, and it would be the sentence people quote back.
   * What is retained and why is on the Account Deletion page; the dialog points at it rather than
   * reciting it, because a two-tap destructive confirmation is not the place to read a policy.
   */
  async function confirmDeleteAccount() {
    Alert.alert(
      t('delete.confirmTitle'),
      t('delete.confirmBody'),
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: t('common.continue'),
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              t('delete.finalTitle'),
              t('delete.finalBody'),
              [
                { text: t('delete.keepAccount'), style: 'cancel' },
                {
                  text: t('delete.deleteForever'),
                  style: 'destructive',
                  onPress: async () => {
                    setDeleting(true);
                    try {
                      await deleteAccount();
                    } catch (err) {
                      setDeleting(false);
                      Alert.alert(
                        t('delete.failedTitle'),
                        err instanceof Error
                          ? err.message
                          : t('delete.failedBody')
                      );
                      return;
                    }

                    // The account is gone server-side. Clearing the local
                    // session is what returns the app to signed-out; a failure
                    // here leaves a token for an account that no longer exists,
                    // which is harmless but worth saying out loud.
                    try {
                      await signOut();
                    } catch {
                      setDeleting(false);
                      Alert.alert(
                        t('delete.doneTitle'),
                        t('delete.doneBody')
                      );
                    }
                  },
                },
              ]
            );
          },
        },
      ]
    );
  }

  useEffect(() => {
    if (data) setDraft(data);
  }, [data]);

  const dirty =
    !!data && FIELDS.some((f) => (draft[f.key] ?? '') !== ((data[f.key] as string) ?? ''));

  /* Null once delivery works AND permission is granted -- at which point the switches speak alone. */
  const { t } = useI18n();
  const statusKey = notificationStatusKey(NOTIFICATION_STATUS);
  const statusMessage = statusKey ? t(statusKey) : null;

  async function save() {
    setSaving(true);
    setSaveError(undefined);
    try {
      // '' clears a field server-side, so untouched-and-empty stays empty.
      const patch: Partial<Record<ProfileTextKey, string>> = {};
      for (const f of FIELDS) patch[f.key] = draft[f.key] ?? '';
      const next = await updateProfile(patch);
      setLocal(next);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Could not save.');
    } finally {
      setSaving(false);
    }
  }

  async function toggleNotification(key: keyof NonNullable<Profile['notifications']>, value: boolean) {
    const previous = data?.notifications ?? {};
    // Optimistic, reverted on failure -- a switch that does not move feels broken.
    setLocal({ ...(data ?? {}), notifications: { ...previous, [key]: value } });
    try {
      const next = await updateProfile({ notifications: { [key]: value } });
      setLocal(next);
    } catch {
      setLocal({ ...(data ?? {}), notifications: previous });
      Alert.alert(t('notifications.couldNotSaveTitle'), t('notifications.couldNotSaveBody'));
    }
  }

  return (
    <ScreenBackground idPrefix="settings">
      <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View className="gap-3 px-4 pb-16 pt-4">
          {/*
            Profile-dependent sections only. The loading and error states are
            scoped to THIS group -- they must never take over the whole screen,
            because Sign Out lives below and has to stay reachable when the
            profile API is down. That was the bug: an unreachable API hid the
            only way to end the session.
          */}
          <SectionLabel>{t('settings.personalInformation')}</SectionLabel>
          {loading ? <LoadingState label={t('settings.loadingSettings')} /> : null}
          {!loading && error ? <ErrorState message={error} onRetry={retry} /> : null}

          {!loading && !error && data ? (
            <>
              <GlassSurface radius={20} glow>
                <View className="p-1">
                  {FIELDS.map((f, i) => (
                    <View
                      key={f.key}
                      className="px-3 py-2.5"
                      style={i > 0 ? { borderTopWidth: 1, borderTopColor: 'rgba(168,85,247,0.14)' } : undefined}>
                      <Text className="font-sans text-[11px] uppercase tracking-wide text-parchment/45">
                        {f.label}
                      </Text>
                      <TextInput
                        value={(draft[f.key] as string) ?? ''}
                        onChangeText={(v) => setDraft((d) => ({ ...d, [f.key]: v }))}
                        placeholder={f.placeholder}
                        placeholderTextColor="rgba(244,239,255,0.3)"
                        keyboardType={f.keyboard ?? 'default'}
                        autoCapitalize={f.keyboard === 'email-address' ? 'none' : 'words'}
                        className="mt-0.5 font-sans text-[15px] text-parchment"
                        style={{ paddingVertical: 2 }}
                      />
                    </View>
                  ))}
                </View>
              </GlassSurface>

              {saveError ? (
                <Text className="font-sans text-[12px]" style={{ color: tokens.signalPending }}>
                  {saveError}
                </Text>
              ) : null}

              <Pressable
                accessibilityRole="button"
                accessibilityState={{ disabled: !dirty || saving }}
                onPress={dirty && !saving ? save : undefined}
                className="items-center rounded-full py-3 active:opacity-85"
                style={{
                  backgroundColor: dirty ? tokens.violet500 : 'rgba(168,85,247,0.22)',
                  opacity: saving ? 0.7 : 1,
                }}>
                <Text className="font-sans-semibold text-[13px] text-parchment">
                  {saving ? t('common.saving') : dirty ? t('settings.saveChanges') : t('common.saved')}
                </Text>
              </Pressable>

              <SectionLabel>{t('language.title')}</SectionLabel>
              <LanguageChoice />

              <SectionLabel>{t('notifications.title')}</SectionLabel>
              {/*
                The explanation comes BEFORE the switches, not after them.

                It used to sit underneath, which meant the first thing on screen was four confident
                toggles and the correction arrived only if you kept reading. Order is the whole
                difference between disclosing a limitation and burying one.
              */}
              {statusMessage ? (
                <GlassSurface radius={20}>
                  <View className="flex-row gap-3 p-3.5">
                    <IconSymbol name="info.circle" size={15} color={tokens.signalPending} />
                    <Text className="flex-1 font-sans text-[11.5px] leading-[17px] text-parchment/60">
                      {statusMessage}
                    </Text>
                  </View>
                </GlassSurface>
              ) : null}
              <GlassSurface radius={20} glow>
                <View className="p-1">
                  {NOTIFICATION_CATEGORIES.map((n, i) => (
                    <View
                      key={n.key}
                      className="flex-row items-center gap-3 px-3 py-2.5"
                      style={i > 0 ? { borderTopWidth: 1, borderTopColor: 'rgba(168,85,247,0.14)' } : undefined}>
                      <View className="flex-1">
                        <Text className="font-sans-medium text-[14px] text-parchment">{t(n.labelKey)}</Text>
                        <Text className="mt-0.5 font-sans text-[11.5px] text-parchment/45">
                          {t(n.detailKey)}
                        </Text>
                      </View>
                      <Switch
                        value={data.notifications?.[n.key] ?? false}
                        onValueChange={(v) => toggleNotification(n.key, v)}
                        trackColor={{ false: 'rgba(244,239,255,0.15)', true: tokens.violet500 }}
                        thumbColor={tokens.parchment}
                      />
                    </View>
                  ))}
                </View>
              </GlassSurface>
            </>
          ) : null}

          {/*
            Always rendered. Sign Out depends only on there being a Supabase
            session, never on the profile request succeeding.
          */}
          <SectionLabel>{t('settings.securityPrivacy')}</SectionLabel>
          <GlassSurface radius={20} glow>
                <View className="p-1">
                  <ComingSoonRow
                    icon="lock.fill"
                    title="Password &amp; sign-in"
                    detail="Password reset is available from sign in"
                  />
                  <View style={{ borderTopWidth: 1, borderTopColor: 'rgba(168,85,247,0.14)' }} />
                  {/*
                    Was a "Not available yet" row reading "Download or delete your data" -- while
                    Delete account sat working, three rows below it. The page it now opens explains
                    what you can see, change, export and delete, and says plainly which of those has
                    no self-service button yet rather than implying none of them do.
                  */}
                  <NavigationRow
                    icon="hand.raised.fill"
                    title="Data &amp; privacy choices"
                    detail="See, correct, export or delete your information"
                    onPress={() => router.push('/legal/data-choices')}
                  />
                  <View style={{ borderTopWidth: 1, borderTopColor: 'rgba(168,85,247,0.14)' }} />
                  <NavigationRow
                    icon="doc.text.fill"
                    title="Legal &amp; privacy"
                    detail="Privacy Policy, Terms, AI and credit disclosures"
                    onPress={() => router.push('/legal')}
                  />
                  <View style={{ borderTopWidth: 1, borderTopColor: 'rgba(168,85,247,0.14)' }} />
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={t('settings.signOut')}
                    accessibilityState={{ disabled: signingOut }}
                    onPress={signingOut ? undefined : confirmSignOut}
                    className="flex-row items-center gap-3 px-3.5 py-3 active:opacity-70"
                    style={signingOut ? { opacity: 0.6 } : undefined}>
                    <IconSymbol
                      name="rectangle.portrait.and.arrow.right"
                      size={17}
                      color={tokens.violet300}
                    />
                    <View className="flex-1">
                      <Text className="font-sans-medium text-[14px] text-parchment">
                        {signingOut ? 'Signing out…' : 'Sign out'}
                      </Text>
                      <Text className="mt-0.5 font-sans text-[11.5px] text-parchment/45">
                        Securely end this session on this device
                      </Text>
                    </View>
                    {signingOut ? <ActivityIndicator color={tokens.violet300} /> : null}
                  </Pressable>

                  <View style={{ borderTopWidth: 1, borderTopColor: 'rgba(232,56,200,0.22)' }} />

                  {/*
                    Destructive, and styled as destructive. It sits last, below
                    a warmer divider, so it cannot be hit while reaching for
                    Sign out -- and it is disabled outright while a deletion is
                    in flight so a second tap cannot fire a second request.
                  */}
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={t('delete.action')}
                    accessibilityHint={t('delete.a11yHint')}
                    accessibilityState={{ disabled: deleting }}
                    onPress={deleting ? undefined : confirmDeleteAccount}
                    className="flex-row items-center gap-3 px-3.5 py-3 active:opacity-70"
                    style={deleting ? { opacity: 0.6 } : undefined}>
                    <IconSymbol name="trash" size={17} color={tokens.signalDispute} />
                    <View className="flex-1">
                      <Text
                        className="font-sans-medium text-[14px]"
                        style={{ color: tokens.signalDispute }}>
                        {deleting ? t('delete.deleting') : t('delete.action')}
                      </Text>
                      <Text className="mt-0.5 font-sans text-[11.5px] text-parchment/45">
                        Permanently erase your account and everything in it
                      </Text>
                    </View>
                    {deleting ? <ActivityIndicator color={tokens.signalDispute} /> : null}
                  </Pressable>
                </View>
              </GlassSurface>
          <InfoNote>
            Zoey never shows your SSN, full identity details or documents on this screen. Sign out
            clears the protected session from this device. Deleting your account removes your
            profile, documents, disputes, goals and score history, and cannot be undone — a limited
            amount of information is kept afterwards, explained under Legal &amp; privacy.
          </InfoNote>
        </View>
      </ScrollView>
    </ScreenBackground>
  );
}
