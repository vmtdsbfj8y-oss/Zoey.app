import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native';

import { GlassSurface } from '@/components/ui/glass-surface';
import { tokens } from '@/constants/tokens';
import { getDisputeReview, signDisputePacket, type DisputeReviewState } from '@/lib/mobile-dispute-signature';

/**
 * "Your disputes are ready" -- review, then sign.
 *
 * What the client signs here goes to the credit bureaus under their name, so this screen is
 * deliberately plain: the letters the engine prepared, the certification it requires, their name,
 * and one button. No summary of strategy, no reasoning, no reassurance about outcomes.
 *
 * The packet hash arrives with the review and is sent back untouched. If the packet changed while
 * this screen was open the engine refuses the signature as stale -- so a client can never sign
 * material they did not see.
 */
export function DisputeSignature({
  onSigned,
  /**
   * What the canonical resolver says about signing.
   *
   * The component used to decide for itself, and returned null whenever its own fetch failed or
   * came back in an unexpected shape -- so a screen whose headline said "ready for signature"
   * rendered no form at all, with nothing on screen admitting anything had gone wrong. When the
   * page says signing is required, a failure has to be visible.
   */
  expected = false,
}: {
  onSigned?: () => void;
  expected?: boolean;
}) {
  const [state, setState] = useState<DisputeReviewState>({ status: 'LOADING' });
  const [typedName, setTypedName] = useState('');
  const [attested, setAttested] = useState(false);
  const [consented, setConsented] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [signed, setSigned] = useState<string | null>(null);
  const inFlight = useRef(false);

  const load = useCallback(async () => setState(await getDisputeReview()), []);
  /*
   * Re-read when the page's state changes, for the same reason the questionnaire does: a screen
   * left open while a round finishes must not hold the answer it fetched before the round existed.
   */
  useEffect(() => {
    void load();
  }, [load, expected]);

  const review = state.status === 'READY' ? state.review : null;
  const ready = Boolean(review?.packetHash) && typedName.trim().length >= 2 && attested && consented && !busy;

  const submit = useCallback(async () => {
    if (inFlight.current || !review?.packetHash) return;
    inFlight.current = true;
    setBusy(true);
    setError(null);

    const result = await signDisputePacket({
      packetHash: review.packetHash,
      typedName: typedName.trim(),
      attestationAccepted: attested,
      electronicSignatureConsent: consented,
    });

    inFlight.current = false;
    setBusy(false);

    if (!result.ok) {
      setError(result.message);
      // Most refusals mean the packet moved. Re-read so they are looking at what is actually open.
      void load();
      return;
    }

    setSigned(result.message);
    onSigned?.();
  }, [review, typedName, attested, consented, load, onSigned]);

  if (state.status === 'LOADING') {
    return (
      <View className="items-center py-6">
        <ActivityIndicator color={tokens.violet400} />
      </View>
    );
  }

  if (signed) {
    return (
      <GlassSurface radius={22} glow>
        <View className="gap-1 p-4">
          <Text className="font-sans-semibold text-[14px]" style={{ color: tokens.signalReceived }}>
            SIGNED ✓
          </Text>
          <Text className="font-sans text-[12.5px] leading-[18px] text-parchment/70">{signed}</Text>
        </View>
      </GlassSurface>
    );
  }

  if (!review) {
    if (!expected) return null;
    return <SignatureUnavailable message="We couldn't load your signature packet." onRetry={() => void load()} />;
  }

  // Already signed on another device, or in the portal. Status, not a second signature form.
  if (review.status === 'SIGNED') {
    return (
      <GlassSurface radius={22}>
        <View className="gap-1 p-4">
          <Text className="font-sans-semibold text-[14px] text-parchment">Signed and with your specialist</Text>
          <Text className="font-sans text-[12.5px] leading-[18px] text-parchment/60">
            Your dispute round is with Pinnacle for final review. Nothing else is needed from you right now.
          </Text>
        </View>
      </GlassSurface>
    );
  }

  if (review.status !== 'READY_TO_SIGN' || !review.signature.required) {
    /*
     * The page believes signing is required and the packet does not agree. That is a real
     * disagreement between two server reads, and hiding it is what produced a headline with
     * nothing underneath it. Say so, and offer a refresh.
     */
    if (!expected) return null;
    return (
      <SignatureUnavailable
        message="We couldn't load your signature packet."
        onRetry={() => void load()}
      />
    );
  }

  return (
    <GlassSurface radius={22} glow>
      <View className="gap-3 p-4">
        <View className="gap-1">
          <Text className="font-display text-[17px] text-parchment">Your disputes are ready</Text>
          <Text className="font-sans text-[12.5px] leading-[18px] text-parchment/60">
            Zoey finished preparing this dispute round. Review the documents below and sign to continue.
          </Text>
        </View>

        {/* The letters the engine prepared and hashed. Titles as given -- nothing is rebuilt here. */}
        <View className="gap-1.5 border-t border-white/8 pt-3">
          <Text className="font-sans text-[11px] uppercase tracking-wider text-parchment/45">
            Prepared documents
          </Text>
          {review.letters.map((letter, index) => (
            <View key={`${letter.title}-${index}`} className="flex-row items-start gap-2">
              <Text className="font-sans text-[12.5px] text-parchment/45">{index + 1}.</Text>
              <Text className="flex-1 font-sans text-[13px] leading-[19px] text-parchment/85">{letter.title}</Text>
            </View>
          ))}
          {review.preparedAt ? (
            <Text className="mt-1 font-sans text-[11.5px] text-parchment/40">
              Prepared {new Date(review.preparedAt).toLocaleDateString()}
            </Text>
          ) : null}
        </View>

        {/* The engine's consumer certification, shown exactly as it stands. */}
        {review.attestationText ? (
          <Pressable
            accessibilityRole="checkbox"
            accessibilityState={{ checked: attested }}
            onPress={() => setAttested((v) => !v)}
            className="flex-row items-start gap-2.5 border-t border-white/8 pt-3 active:opacity-80"
          >
            <Box checked={attested} />
            <Text className="flex-1 font-sans text-[12px] leading-[17px] text-parchment/70">{review.attestationText}</Text>
          </Pressable>
        ) : null}

        <Pressable
          accessibilityRole="checkbox"
          accessibilityState={{ checked: consented }}
          onPress={() => setConsented((v) => !v)}
          className="flex-row items-start gap-2.5 active:opacity-80"
        >
          <Box checked={consented} />
          <Text className="flex-1 font-sans text-[12px] leading-[17px] text-parchment/70">
            I agree to sign these documents electronically.
          </Text>
        </Pressable>

        <View className="gap-1.5 border-t border-white/8 pt-3">
          <Text className="font-sans text-[11px] uppercase tracking-wider text-parchment/45">
            Type your full name to sign
          </Text>
          <TextInput
            value={typedName}
            onChangeText={(value) => {
              setTypedName(value);
              if (error) setError(null);
            }}
            placeholder="Your full legal name"
            placeholderTextColor="rgba(244,239,255,0.3)"
            autoCapitalize="words"
            autoCorrect={false}
            editable={!busy}
            className="rounded-[16px] border border-white/10 bg-ink-800 px-4 py-3 font-sans text-[14px] text-parchment"
          />
        </View>

        {error ? (
          <Text className="font-sans text-[12.5px] leading-[18px]" style={{ color: tokens.signalPending }}>
            {error}
          </Text>
        ) : null}

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Sign and continue"
          accessibilityState={{ disabled: !ready, busy }}
          onPress={ready ? () => void submit() : undefined}
          className="mt-1 flex-row items-center justify-center gap-2 rounded-full py-3.5 active:opacity-85"
          style={{ backgroundColor: ready ? tokens.violet500 : 'rgba(168,85,247,0.22)' }}
        >
          {busy ? <ActivityIndicator size="small" color={tokens.parchment} /> : null}
          <Text
            className="font-sans-semibold text-[13px] tracking-[0.06em]"
            style={{ color: ready || busy ? tokens.parchment : 'rgba(244,239,255,0.45)' }}
          >
            {busy ? 'SIGNING...' : 'SIGN & CONTINUE'}
          </Text>
        </Pressable>
      </View>
    </GlassSurface>
  );
}

function Box({ checked }: { checked: boolean }) {
  return (
    <View
      className="mt-0.5 h-4 w-4 rounded-[5px] border"
      style={{
        borderColor: checked ? tokens.violet400 : 'rgba(255,255,255,0.28)',
        backgroundColor: checked ? tokens.violet400 : 'transparent',
      }}
    />
  );
}

/** A visible, safe dead-end: says what happened and offers the only useful action. */
function SignatureUnavailable({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <GlassSurface radius={22}>
      <View className="gap-2 p-4">
        <Text className="font-sans-semibold text-[14px] text-parchment">{message}</Text>
        <Text className="font-sans text-[12.5px] leading-[18px] text-parchment/60">
          Refresh and try again. Nothing has been signed.
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Retry loading signature packet"
          onPress={onRetry}
          className="mt-1 items-center rounded-full border border-white/16 py-2.5 active:opacity-80"
        >
          <Text className="font-sans-semibold text-[12.5px] tracking-[0.06em]" style={{ color: tokens.violet300 }}>
            REFRESH
          </Text>
        </Pressable>
      </View>
    </GlassSurface>
  );
}
