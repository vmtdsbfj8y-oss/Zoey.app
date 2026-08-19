import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GlassSurface } from '@/components/ui/glass-surface';
import { ScreenBackground } from '@/components/ui/screen-background';
import { ZoeyAvatar } from '@/components/ui/zoey-avatar';
import { tokens } from '@/constants/tokens';
import { linkMobileAccount, looksLikeLinkCode } from '@/lib/mobile-api';

/**
 * "Connect your Zoey account" -- what a signed-in but unlinked client sees.
 *
 * NO LONGER THE NORMAL PATH. A new app account provisions its own client file on its first
 * authenticated request, so this screen is a FALLBACK: it appears when automatic provisioning is
 * unavailable, or for an existing Pinnacle client whose file predates the app and has to be
 * connected deliberately. The wording below says that, rather than presenting a code as the way in.
 *
 * This is an
 * onboarding step, not an error screen. It is styled as part of the app for that reason: no red,
 * no warning icon, Zoey's face at the top.
 *
 * The app sends the code and nothing else. Which file it opens is decided server-side by the code,
 * and who is connecting is decided by the verified session -- neither is something this screen
 * could assert.
 */
export function ConnectAccountScreen({
  onLinked,
  title = 'Connect your Zoey account',
  subtitle = 'If you already have a file with Pinnacle, your specialist can give you a one-time code that connects this app to your own file — nobody else can see it.',
}: {
  onLinked: () => void;
  /**
   * Wording only. The same screen serves first-time connection and the recovery case where an app
   * signup created a blank file and the consumer's real one is elsewhere -- the mechanism is
   * identical, so it stays one screen and one code path rather than a second copy that could drift.
   */
  title?: string;
  subtitle?: string;
}) {
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cleaned = code.replace(/\s+/g, '');
  const ready = looksLikeLinkCode(cleaned) && !busy;

  async function submit() {
    if (!ready) return;
    setBusy(true);
    setError(null);

    const result = await linkMobileAccount(cleaned);
    if (result.ok) {
      // The account is linked server-side. The caller re-asks for the overview, which now
      // succeeds -- no sign-out, no app restart.
      onLinked();
      return;
    }

    setBusy(false);
    // The server's own message. It already distinguishes an expired code from a used one from a
    // phone that belongs to somebody else, and re-wording it here would only make it vaguer.
    setError(result.message);
  }

  return (
    <ScreenBackground idPrefix="connect">
      <SafeAreaView edges={['top']} className="flex-1">
        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <View className="gap-4 px-4 pb-16 pt-6">
            <View className="items-center gap-3 pt-4">
              <ZoeyAvatar size={72} />
              <Text className="text-center font-display text-[22px] text-parchment">{title}</Text>
              <Text className="max-w-[300px] text-center font-sans text-[13px] leading-[19px] text-parchment/55">
                {subtitle}
              </Text>
            </View>

            <GlassSurface radius={22} glow>
              <View className="gap-3 p-4">
                <Text className="font-sans text-[11px] uppercase tracking-wide text-parchment/45">
                  One-time code
                </Text>
                <TextInput
                  value={code}
                  onChangeText={(value) => {
                    setCode(value);
                    if (error) setError(null);
                  }}
                  placeholder="Paste or type your code"
                  placeholderTextColor="rgba(244,239,255,0.3)"
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!busy}
                  multiline
                  className="rounded-[16px] border border-white/10 bg-ink-800 px-4 py-3 font-mono text-[13px] leading-[19px] text-parchment"
                />

                {error ? (
                  <Text className="font-sans text-[12.5px] leading-[18px]" style={{ color: tokens.signalPending }}>
                    {error}
                  </Text>
                ) : null}

                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Connect account"
                  accessibilityState={{ disabled: !ready }}
                  onPress={ready ? submit : undefined}
                  className="flex-row items-center justify-center gap-2 rounded-full py-3.5 active:opacity-85"
                  style={{ backgroundColor: ready ? tokens.violet500 : 'rgba(168,85,247,0.22)' }}>
                  {busy ? <ActivityIndicator color={tokens.parchment} /> : null}
                  <Text
                    className="font-sans-semibold text-[14px]"
                    style={{ color: ready ? tokens.parchment : 'rgba(244,239,255,0.55)' }}>
                    {busy ? 'Connecting…' : 'Connect'}
                  </Text>
                </Pressable>
              </View>
            </GlassSurface>

            <Text className="text-center font-sans text-[11.5px] leading-[17px] text-parchment/40">
              Codes expire shortly after they are created. If yours has expired, ask your specialist
              for a new one.
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </ScreenBackground>
  );
}
