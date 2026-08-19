import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import { GlassSurface } from '@/components/ui/glass-surface';
import { tokens } from '@/constants/tokens';
import {
  ANSWER_LABELS,
  getConfirmation,
  submitConfirmation,
  type ConfirmationAnswer,
  type ConfirmationState,
} from '@/lib/mobile-confirmation';

/**
 * "Zoey needs a few answers."
 *
 * The engine stops here deliberately: strategy cannot be built on inquiries nobody has confirmed.
 * Until now the only way past it was an email round-trip, which meant the client's own app showed a
 * blocked case and no way to unblock it.
 *
 * Nothing here decides anything. The questions are the engine's, the answer values are the
 * engine's, and completing the request resumes the same workflow the portal would resume -- this
 * screen collects three taps and sends them.
 */
export function InquiryQuestionnaire({ onCompleted }: { onCompleted?: () => void }) {
  const [state, setState] = useState<ConfirmationState>({ status: 'LOADING' });
  const [answers, setAnswers] = useState<Record<string, ConfirmationAnswer>>({});
  const [attested, setAttested] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  // Set before the first await: two taps in one frame both read the old state.
  const inFlight = useRef(false);

  const load = useCallback(async () => setState(await getConfirmation()), []);
  useEffect(() => {
    void load();
  }, [load]);

  const view = state.status === 'READY' ? state.view : null;
  const questions = view?.questions ?? [];
  const allAnswered = questions.length > 0 && questions.every((q) => answers[q.id]);
  const ready = allAnswered && attested && !busy;

  const submit = useCallback(async () => {
    if (inFlight.current || !view?.requestId) return;
    inFlight.current = true;
    setBusy(true);
    setError(null);

    const result = await submitConfirmation({
      requestId: view.requestId,
      answers,
      attestationAccepted: attested,
    });

    inFlight.current = false;
    setBusy(false);

    if (!result.ok) {
      setError(result.message);
      // The form may be stale. Re-read so the client is answering what is actually open.
      void load();
      return;
    }

    setDone(result.message);
    onCompleted?.();
  }, [view, answers, attested, load, onCompleted]);

  if (state.status === 'LOADING') {
    return (
      <View className="items-center py-6">
        <ActivityIndicator color={tokens.violet400} />
      </View>
    );
  }

  if (done) {
    return (
      <GlassSurface radius={22} glow>
        <View className="gap-1 p-4">
          <Text className="font-sans-semibold text-[14px] text-parchment">{done}</Text>
          <Text className="font-sans text-[12.5px] leading-[18px] text-parchment/60">
            Your answers are recorded. There is nothing else you need to do right now.
          </Text>
        </View>
      </GlassSurface>
    );
  }

  // Nothing outstanding, or we could not ask. Neither is a questionnaire.
  if (state.status === 'UNAVAILABLE' || !view || view.state !== 'REQUIRED' || questions.length === 0) return null;

  return (
    <GlassSurface radius={22} glow>
      <View className="gap-3 p-4">
        <View className="gap-1">
          <Text className="font-display text-[17px] text-parchment">Zoey needs a few answers</Text>
          <Text className="font-sans text-[12.5px] leading-[18px] text-parchment/60">
            Confirm whether you recognize these recent credit inquiries so Zoey can finish your strategy.
          </Text>
        </View>

        {questions.map((question, index) => (
          <View key={question.id} className="gap-2 border-t border-white/8 pt-3">
            <View className="gap-0.5">
              <Text className="font-sans-medium text-[13.5px] text-parchment">
                {index + 1}. {question.creditor ?? 'This inquiry'}
              </Text>
              {/* Only what the report itself carried. Absent stays absent. */}
              {question.inquiryDate || question.bureau ? (
                <Text className="font-sans text-[11.5px] text-parchment/45">
                  {[question.inquiryDate, question.bureau].filter(Boolean).join(' · ')}
                </Text>
              ) : null}
              <Text className="mt-1 font-sans text-[12.5px] text-parchment/70">{question.prompt}</Text>
            </View>

            <View className="gap-1.5">
              {ANSWER_LABELS.map((option) => {
                const selected = answers[question.id] === option.value;
                return (
                  <Pressable
                    key={option.value}
                    accessibilityRole="radio"
                    accessibilityState={{ selected }}
                    accessibilityLabel={`${question.creditor ?? 'Inquiry'}: ${option.label}`}
                    onPress={() => setAnswers((current) => ({ ...current, [question.id]: option.value }))}
                    className="flex-row items-center gap-2.5 rounded-[14px] border px-3 py-2.5 active:opacity-80"
                    style={{
                      borderColor: selected ? tokens.violet400 : 'rgba(255,255,255,0.10)',
                      backgroundColor: selected ? 'rgba(168,85,247,0.14)' : 'transparent',
                    }}
                  >
                    <View
                      className="h-4 w-4 rounded-full border"
                      style={{
                        borderColor: selected ? tokens.violet400 : 'rgba(255,255,255,0.28)',
                        backgroundColor: selected ? tokens.violet400 : 'transparent',
                      }}
                    />
                    <Text className="font-sans text-[13px] text-parchment/90">{option.label}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ))}

        {/* The engine's own attestation wording, shown as given and required before sending. */}
        {view.attestationText ? (
          <Pressable
            accessibilityRole="checkbox"
            accessibilityState={{ checked: attested }}
            onPress={() => setAttested((v) => !v)}
            className="mt-1 flex-row items-start gap-2.5 border-t border-white/8 pt-3 active:opacity-80"
          >
            <View
              className="mt-0.5 h-4 w-4 rounded-[5px] border"
              style={{
                borderColor: attested ? tokens.violet400 : 'rgba(255,255,255,0.28)',
                backgroundColor: attested ? tokens.violet400 : 'transparent',
              }}
            />
            <Text className="flex-1 font-sans text-[12px] leading-[17px] text-parchment/70">{view.attestationText}</Text>
          </Pressable>
        ) : null}

        {error ? (
          <Text className="font-sans text-[12.5px] leading-[18px]" style={{ color: tokens.signalPending }}>
            {error}
          </Text>
        ) : null}

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Submit answers"
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
            {busy ? 'SUBMITTING...' : 'SUBMIT ANSWERS'}
          </Text>
        </Pressable>

        {!allAnswered ? (
          <Text className="text-center font-sans text-[11.5px] text-parchment/45">
            Answer all {questions.length} questions to continue.
          </Text>
        ) : !attested ? (
          <Text className="text-center font-sans text-[11.5px] text-parchment/45">
            Tick the confirmation above to continue.
          </Text>
        ) : null}
      </View>
    </GlassSurface>
  );
}
