import { useI18n } from '@/lib/i18n/context';
import { Pressable, Text, View } from 'react-native';

import { GlassSurface } from '@/components/ui/glass-surface';
import { tokens } from '@/constants/tokens';
import { answerLabelFor } from '@/lib/interview-copy';
import type { InterviewQuestion } from '@/lib/mobile-interview';

/**
 * One question, and the closed set of answers the engine offered for it.
 *
 * The options are not this component's to choose. It renders `question.options` exactly as they
 * arrived and posts back the `value` it was given, so an engine that adds, removes or renames an
 * answer changes this screen without a release. The only local decision is the LABEL: this build
 * prefers its own translation of a known value and falls back to the engine's text otherwise,
 * which is the `interview-copy` contract.
 *
 * Answering is a single tap and it submits immediately. There is no local "selected but not sent"
 * state to get out of step with the server, and no second confirm step -- the reflect-back at the
 * end is where confirmation happens, once, for everything.
 */
export function GuidedOptions({
  question,
  busy,
  onAnswer,
}: {
  question: InterviewQuestion;
  busy: boolean;
  onAnswer: (value: string) => void;
}) {
  const { t } = useI18n();

  return (
    <GlassSurface radius={22} glow>
      <View className="gap-3 p-4">
        <View className="gap-1">
          <Text className="font-display text-[17px] text-parchment">{t('interview.questionTitle')}</Text>
          {/* The engine's own question text. Never reworded on the device. */}
          <Text className="font-sans text-[13.5px] leading-[19px] text-parchment/80">{question.text}</Text>
        </View>

        <View className="gap-1.5">
          {question.options.map((option) => {
            const label = answerLabelFor(option, t);
            return (
              <Pressable
                key={option.value}
                accessibilityRole="radio"
                accessibilityState={{ selected: false, disabled: busy }}
                accessibilityLabel={t('interview.a11yAnswer', { values: { label } })}
                onPress={busy ? undefined : () => onAnswer(option.value)}
                className="flex-row items-center gap-2.5 rounded-[14px] border px-3 py-3 active:opacity-80"
                style={{
                  borderColor: 'rgba(255,255,255,0.10)',
                  opacity: busy ? 0.5 : 1,
                }}
              >
                <View
                  className="h-4 w-4 rounded-full border"
                  style={{ borderColor: 'rgba(255,255,255,0.28)' }}
                />
                <Text className="flex-1 font-sans text-[13px] text-parchment/90">{label}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    </GlassSurface>
  );
}

/**
 * The progress line under a question.
 *
 * Counts reviewed items against the total the engine sent. It is a reading of server state, not a
 * local step counter -- a resumed session shows the right position because the server remembers,
 * not because the app kept score.
 */
export function InterviewProgress({ answered, total }: { answered: number; total: number }) {
  if (total <= 0) return null;
  return (
    <View className="flex-row items-center justify-center gap-2 pt-1">
      {Array.from({ length: total }).map((_, index) => (
        <View
          key={index}
          className="h-1.5 rounded-full"
          style={{
            width: index < answered ? 18 : 8,
            backgroundColor: index < answered ? tokens.violet400 : 'rgba(255,255,255,0.16)',
          }}
        />
      ))}
    </View>
  );
}
