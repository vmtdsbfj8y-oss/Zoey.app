import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import { GlassSurface } from '@/components/ui/glass-surface';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { tokens } from '@/constants/tokens';
import {
  acknowledgeFederal,
  acknowledgeMassachusetts,
  getOnboardingState,
  needsRefresh,
  saveLegalName,
  signAcknowledgment,
  type ConsentResult,
  type OnboardingState,
} from '@/lib/mobile-onboarding';

/**
 * The consent flow, driven entirely by the engine.
 *
 * ==========================  NO LOCAL STEP MACHINE  ==========================
 *
 * Which screen shows is `state.step`, read from the server. Nothing here advances a counter or
 * remembers where the consumer got to: after every successful submit it re-reads, so the app and
 * the record can never disagree about what has been consented to. Closing the app mid-flow and
 * reopening resumes at the outstanding step for the same reason -- there was never local progress
 * to lose.
 *
 * ==========================  THE DOCUMENT IS THE SERVER'S  ==========================
 *
 * Bodies are rendered exactly as returned and `expectedHash` is echoed back untouched. If the
 * server says REFRESH_REQUIRED the copy on screen is stale: it is replaced and the consumer reads
 * again rather than being allowed to consent to something they were not shown.
 */
export function ConsentFlow({ onComplete }: { onComplete: () => void }) {
  const [state, setState] = useState<OnboardingState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [signature, setSignature] = useState('');
  const [consentTicked, setConsentTicked] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  /*
   * A ref, not state. Two taps in the same frame both read the old state value and both submit --
   * the same problem that produced eighteen Run Zoey requests. A legal acknowledgment is a worse
   * thing to send twice.
   */
  const inFlight = useRef(false);

  const load = useCallback(async () => {
    const next = await getOnboardingState();
    setState(next);
    setLoading(false);
    if (next?.step === 'COMPLETE') onComplete();
  }, [onComplete]);

  useEffect(() => {
    load();
  }, [load]);

  const submit = useCallback(
    async (action: () => Promise<ConsentResult>) => {
      if (inFlight.current) return;
      inFlight.current = true;
      setSubmitting(true);
      setError(null);

      try {
        const result = await action();
        if (result.ok) {
          setSignature('');
          setConsentTicked(false);
          await load();
        } else {
          setError(result.message);
          // Stale copy: pull the current one so they re-read before trying again.
          if (needsRefresh(result)) await load();
        }
      } finally {
        setSubmitting(false);
        inFlight.current = false;
      }
    },
    [load]
  );

  if (loading) {
    return (
      <View className="items-center py-16">
        <ActivityIndicator color={tokens.violet400} />
      </View>
    );
  }

  if (!state || state.step === 'UNAVAILABLE') {
    return (
      <Notice
        title="We can't continue just yet"
        body={state?.message ?? 'Your documents could not be loaded right now. Please try again shortly.'}
        onRetry={load}
      />
    );
  }

  const doc = state.document;

  if (state.step === 'NEEDS_LEGAL_NAME') {
    return (
      <Card title="Your full legal name">
        <Text className="font-sans text-[13px] leading-[19px] text-parchment/70">
          This is the name that appears on your consumer acknowledgment, and the name you will type
          to sign it. Use your name as it appears on your ID.
        </Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="First and last name"
          placeholderTextColor="rgba(244,239,255,0.35)"
          autoCapitalize="words"
          autoCorrect={false}
          className="mt-4 rounded-2xl border border-violet-500/30 bg-parchment/5 px-4 py-3 font-sans text-[15px] text-parchment"
        />
        {error ? <ErrorLine message={error} /> : null}
        <SubmitButton
          label="Continue"
          busy={submitting}
          disabled={name.trim().length === 0}
          onPress={() => submit(() => saveLegalName(name))}
        />
      </Card>
    );
  }

  if (!doc) {
    return <Notice title="We can't continue just yet" body={state.message} onRetry={load} />;
  }

  const isSignature = state.step === 'NEEDS_SIGNATURE';
  const needsConsentTick = state.step === 'NEEDS_FEDERAL_DISCLOSURE';

  return (
    <Card title={doc.title}>
      <Text className="font-sans text-[11px] text-parchment/45">Version: {doc.version}</Text>

      {/* The canonical body, exactly as returned. Never paraphrased or trimmed. */}
      <ScrollView
        className="mt-3 max-h-80 rounded-2xl border border-violet-500/20 bg-parchment/5 px-3 py-3"
        nestedScrollEnabled>
        <Text className="font-sans text-[12.5px] leading-[19px] text-parchment/85">{doc.body}</Text>
      </ScrollView>

      {doc.electronicConsentBody ? (
        <ScrollView className="mt-3 max-h-40 rounded-2xl border border-violet-500/20 bg-parchment/5 px-3 py-3" nestedScrollEnabled>
          <Text className="font-sans text-[12px] leading-[18px] text-parchment/70">{doc.electronicConsentBody}</Text>
        </ScrollView>
      ) : null}

      {doc.cancellationFormsBody ? (
        <ScrollView className="mt-3 max-h-48 rounded-2xl border border-violet-500/20 bg-parchment/5 px-3 py-3" nestedScrollEnabled>
          <Text className="font-sans text-[12px] leading-[18px] text-parchment/70">{doc.cancellationFormsBody}</Text>
        </ScrollView>
      ) : null}

      {needsConsentTick ? (
        <Pressable
          accessibilityRole="checkbox"
          accessibilityState={{ checked: consentTicked }}
          onPress={() => setConsentTicked((v) => !v)}
          className="mt-4 flex-row items-start gap-2.5 active:opacity-70">
          <View
            className="mt-0.5 h-5 w-5 items-center justify-center rounded-md border"
            style={{
              borderColor: consentTicked ? tokens.violet400 : 'rgba(168,85,247,0.4)',
              backgroundColor: consentTicked ? tokens.violet500 : 'transparent',
            }}>
            {consentTicked ? <IconSymbol name="checkmark" size={13} color={tokens.parchment} /> : null}
          </View>
          <Text className="flex-1 font-sans text-[12.5px] leading-[18px] text-parchment/80">
            I agree to receive these documents electronically.
          </Text>
        </Pressable>
      ) : null}

      <Text className="mt-4 font-sans text-[12.5px] text-parchment/70">
        {isSignature ? 'Type your full legal name to sign:' : 'Type your full legal name to acknowledge:'}
      </Text>
      <TextInput
        value={signature}
        onChangeText={setSignature}
        placeholder={state.legalName}
        placeholderTextColor="rgba(244,239,255,0.35)"
        autoCapitalize="words"
        autoCorrect={false}
        className="mt-2 rounded-2xl border border-violet-500/30 bg-parchment/5 px-4 py-3 font-sans text-[15px] text-parchment"
      />

      {error ? <ErrorLine message={error} /> : null}

      <SubmitButton
        label={isSignature ? 'Sign and continue' : 'I acknowledge'}
        busy={submitting}
        disabled={signature.trim().length === 0 || (needsConsentTick && !consentTicked)}
        onPress={() =>
          submit(() => {
            if (state.step === 'NEEDS_FEDERAL_DISCLOSURE') {
              return acknowledgeFederal({
                expectedHash: doc.expectedHash,
                signatureName: signature,
                electronicConsent: consentTicked,
              });
            }
            if (state.step === 'NEEDS_MA_STATEMENT') {
              return acknowledgeMassachusetts({ expectedHash: doc.expectedHash, signatureName: signature });
            }
            return signAcknowledgment({ expectedHash: doc.expectedHash, signatureName: signature });
          })
        }
      />
    </Card>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <GlassSurface radius={22}>
      <View className="p-4">
        <Text className="font-display text-[18px] leading-[23px] text-parchment">{title}</Text>
        <View className="mt-2">{children}</View>
      </View>
    </GlassSurface>
  );
}

function ErrorLine({ message }: { message: string }) {
  return (
    <View className="mt-3 rounded-2xl border border-signal-pending/30 bg-signal-pending/10 px-3 py-2.5">
      <Text className="font-sans text-[12.5px] leading-[18px] text-signal-pending">{message}</Text>
    </View>
  );
}

/** Acknowledged on the tap itself; never tappable while a request is in flight. */
function SubmitButton({
  label,
  busy,
  disabled,
  onPress,
}: {
  label: string;
  busy: boolean;
  disabled: boolean;
  onPress: () => void;
}) {
  const blocked = busy || disabled;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: blocked }}
      onPress={blocked ? undefined : onPress}
      className="mt-4 items-center rounded-full py-3.5 active:opacity-85"
      style={{ backgroundColor: blocked ? 'rgba(168,85,247,0.28)' : tokens.violet500 }}>
      <View className="flex-row items-center gap-2">
        {busy ? <ActivityIndicator size="small" color={tokens.parchment} /> : null}
        <Text
          className="font-sans-semibold text-[14px]"
          style={{ color: blocked ? 'rgba(244,239,255,0.6)' : tokens.parchment }}>
          {busy ? 'Sending…' : label}
        </Text>
      </View>
    </Pressable>
  );
}

function Notice({ title, body, onRetry }: { title: string; body: string; onRetry: () => void }) {
  return (
    <Card title={title}>
      <Text className="font-sans text-[13px] leading-[19px] text-parchment/70">{body}</Text>
      <SubmitButton label="Try again" busy={false} disabled={false} onPress={onRetry} />
    </Card>
  );
}
