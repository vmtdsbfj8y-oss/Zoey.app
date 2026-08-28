import { useI18n } from '@/lib/i18n/context';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import { GlassSurface } from '@/components/ui/glass-surface';
import { tokens } from '@/constants/tokens';
import { classificationKeyFor } from '@/lib/interview-copy';
import type { InterviewSummary } from '@/lib/mobile-interview';

/**
 * Zoey's understanding, read back before any of it counts.
 *
 * This is the consent gate of the whole feature. The engine has proposed classifications, but
 * nothing is confirmed, nothing is attested and nothing can reach a final status until a person
 * reads these lines and says yes. The three answers are the engine's three: YES confirms,
 * CHANGE reopens the review, NOT_SURE hands it to a specialist.
 *
 * "I'm not sure" is deliberately as easy to press as "Yes". A summary screen that makes agreement
 * the only comfortable option is not consent, and the strongest classification in the system --
 * "I did not open this account" -- is downstream of exactly this tap.
 */
export function ReflectBackCard({
  summary,
  busy,
  decision,
  onDecide,
}: {
  summary: InterviewSummary;
  busy: boolean;
  decision: 'YES' | 'CHANGE' | 'NOT_SURE' | null;
  onDecide: (decision: 'YES' | 'CHANGE' | 'NOT_SURE') => void;
}) {
  const { t } = useI18n();

  const choices: { value: 'YES' | 'CHANGE' | 'NOT_SURE'; label: string; primary: boolean }[] = [
    { value: 'YES', label: t('interview.summaryConfirm'), primary: true },
    { value: 'CHANGE', label: t('interview.summaryChange'), primary: false },
    { value: 'NOT_SURE', label: t('interview.summaryNotSure'), primary: false },
  ];

  return (
    <GlassSurface radius={22} glow>
      <View className="gap-3 p-4">
        <View className="gap-1">
          <Text className="font-display text-[17px] text-parchment">{t('interview.summaryTitle')}</Text>
          <Text className="font-sans text-[12.5px] leading-[18px] text-parchment/60">
            {t('interview.summaryHint')}
          </Text>
        </View>

        {summary.itemLines.map((line) => {
          const key = classificationKeyFor(line.classificationKey);
          return (
            <View key={line.itemKey} className="gap-0.5 border-t border-white/10 pt-3">
              <Text className="font-sans-medium text-[13.5px] text-parchment">{line.label}</Text>
              {/* This build's words for the enum; the engine's own sentence when it knows a newer one. */}
              <Text className="font-sans text-[12.5px] leading-[18px] text-parchment/70">
                {key ? t(key) : line.line}
              </Text>
            </View>
          );
        })}

        <View className="gap-1.5 pt-1">
          {choices.map((choice) => {
            const active = decision === choice.value && busy;
            return (
              <Pressable
                key={choice.value}
                accessibilityRole="button"
                accessibilityLabel={choice.value === 'YES' ? t('interview.a11yConfirm') : choice.label}
                accessibilityState={{ disabled: busy, busy: active }}
                onPress={busy ? undefined : () => onDecide(choice.value)}
                className="flex-row items-center justify-center gap-2 rounded-full py-3.5 active:opacity-85"
                style={{
                  backgroundColor: choice.primary ? tokens.violet500 : 'transparent',
                  borderWidth: choice.primary ? 0 : 1,
                  borderColor: 'rgba(255,255,255,0.15)',
                  opacity: busy && !active ? 0.5 : 1,
                }}
              >
                {active ? <ActivityIndicator size="small" color={tokens.parchment} /> : null}
                <Text
                  className="font-sans-semibold text-[13px] tracking-[0.04em]"
                  style={{ color: choice.primary ? tokens.parchment : tokens.violet300 }}
                >
                  {choice.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    </GlassSurface>
  );
}
