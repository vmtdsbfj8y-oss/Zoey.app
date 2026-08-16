import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, Switch, Text, TextInput, View } from 'react-native';

import { ErrorState, InfoNote, LoadingState, SectionLabel } from '@/components/more/states';
import { GlassSurface } from '@/components/ui/glass-surface';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { ScreenBackground } from '@/components/ui/screen-background';
import { tokens } from '@/constants/tokens';
import { useAsync } from '@/hooks/use-async';
import { getProfile, updateProfile, type Profile } from '@/lib/account-api';
import { useAuth } from '@/lib/auth-context';

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

const NOTIFICATIONS: { key: keyof NonNullable<Profile['notifications']>; label: string; detail: string }[] = [
  { key: 'disputeUpdates', label: 'Dispute updates', detail: 'When a bureau responds to a dispute' },
  { key: 'documentRequests', label: 'Document requests', detail: 'When Zoey needs something from you' },
  { key: 'scoreChanges', label: 'Score changes', detail: 'When a new report shows a score change' },
  { key: 'productNews', label: 'Product news', detail: 'Occasional updates about Zoey' },
];

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

  useEffect(() => {
    if (data) setDraft(data);
  }, [data]);

  const dirty =
    !!data && FIELDS.some((f) => (draft[f.key] ?? '') !== ((data[f.key] as string) ?? ''));

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
      Alert.alert('Could not save', 'That change was not saved. Check your connection.');
    }
  }

  return (
    <ScreenBackground idPrefix="settings">
      <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View className="gap-3 px-4 pb-16 pt-4">
          {loading ? <LoadingState label="Loading your settings…" /> : null}
          {!loading && error ? <ErrorState message={error} onRetry={retry} /> : null}

          {!loading && !error && data ? (
            <>
              <SectionLabel>Personal information</SectionLabel>
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
                  {saving ? 'Saving…' : dirty ? 'Save changes' : 'Saved'}
                </Text>
              </Pressable>

              <SectionLabel>Notifications</SectionLabel>
              <GlassSurface radius={20} glow>
                <View className="p-1">
                  {NOTIFICATIONS.map((n, i) => (
                    <View
                      key={n.key}
                      className="flex-row items-center gap-3 px-3 py-2.5"
                      style={i > 0 ? { borderTopWidth: 1, borderTopColor: 'rgba(168,85,247,0.14)' } : undefined}>
                      <View className="flex-1">
                        <Text className="font-sans-medium text-[14px] text-parchment">{n.label}</Text>
                        <Text className="mt-0.5 font-sans text-[11.5px] text-parchment/45">
                          {n.detail}
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
              <InfoNote>
                Preferences are saved, but Zoey cannot send push notifications yet — that needs
                notification permissions and a delivery service, which are not set up.
              </InfoNote>

              <SectionLabel>Security &amp; privacy</SectionLabel>
              <GlassSurface radius={20} glow>
                <View className="p-1">
                  <ComingSoonRow
                    icon="lock.fill"
                    title="Password &amp; sign-in"
                    detail="Password reset is available from sign in"
                  />
                  <View style={{ borderTopWidth: 1, borderTopColor: 'rgba(168,85,247,0.14)' }} />
                  <ComingSoonRow
                    icon="hand.raised.fill"
                    title="Privacy &amp; data"
                    detail="Download or delete your data"
                  />
                  <View style={{ borderTopWidth: 1, borderTopColor: 'rgba(168,85,247,0.14)' }} />
                  <Pressable onPress={() => signOut()} className="flex-row items-center gap-3 px-3.5 py-3">
                    <IconSymbol name="rectangle.portrait.and.arrow.right" size={17} color={tokens.violet300} />
                    <View className="flex-1"><Text className="font-sans-medium text-[14px] text-parchment">Sign out</Text><Text className="mt-0.5 font-sans text-[11.5px] text-parchment/45">Securely end this session</Text></View>
                  </Pressable>
                </View>
              </GlassSurface>
              <InfoNote>
                Zoey never shows your SSN, full identity details or documents on this screen. Sign
                out clears the protected session from this device.
              </InfoNote>
            </>
          ) : null}
        </View>
      </ScrollView>
    </ScreenBackground>
  );
}
