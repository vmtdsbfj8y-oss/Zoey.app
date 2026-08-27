import { useI18n } from '@/lib/i18n/context';
import { Pressable, Text, View } from 'react-native';

import { GlassSurface } from '@/components/ui/glass-surface';
import { tokens } from '@/constants/tokens';
import { evidenceCopyFor } from '@/lib/interview-copy';
import type { InterviewEvidenceNeed } from '@/lib/mobile-interview';

/**
 * What would help the case next, as the engine's deterministic rules decided it.
 *
 * These are not suggestions this screen composed. The engine's rule bridge computes them from
 * CONFIRMED answers only -- an unconfirmed proposal requires nothing -- and the app renders the
 * ruling. That is why the list can say REQUIRED without over-promising: the requirement is a fact
 * about the case, produced downstream of a person's own confirmation.
 *
 * Uploading happens in the documents tab, which already owns every slot, its camera/file rules and
 * its optimizer. This card links there rather than growing a second upload path.
 */
export function EvidenceNeeds({
  needs,
  onOpenDocuments,
}: {
  needs: InterviewEvidenceNeed[];
  onOpenDocuments?: () => void;
}) {
  const { t } = useI18n();
  if (needs.length === 0) return null;

  const tone = (requirement: string) =>
    requirement === 'REQUIRED' ? tokens.violet300 : 'rgba(244,239,255,0.55)';

  return (
    <GlassSurface radius={22}>
      <View className="gap-3 p-4">
        <Text className="font-display text-[15px] text-parchment">{t('interview.evidenceTitle')}</Text>

        {needs.map((need) => {
          const copy = evidenceCopyFor(need, t);
          return (
            <View key={need.slot} className="gap-0.5 border-t border-white/10 pt-3">
              <View className="flex-row items-center justify-between gap-2">
                <Text className="flex-1 font-sans-medium text-[13.5px] text-parchment">{copy.name}</Text>
                {copy.requirement ? (
                  <Text
                    className="font-sans-semibold text-[10.5px] tracking-[0.08em]"
                    style={{ color: tone(need.requirement) }}
                  >
                    {copy.requirement.toUpperCase()}
                  </Text>
                ) : null}
              </View>
              {/* The engine's plain-language reason, shown as written. */}
              <Text className="font-sans text-[12px] leading-[17px] text-parchment/60">{copy.reason}</Text>
            </View>
          );
        })}

        {onOpenDocuments ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('interview.evidenceAction')}
            onPress={onOpenDocuments}
            className="mt-1 items-center rounded-full border border-white/15 py-2.5 active:opacity-80"
          >
            <Text
              className="font-sans-semibold text-[12.5px] tracking-[0.06em]"
              style={{ color: tokens.violet300 }}
            >
              {t('interview.evidenceAction')}
            </Text>
          </Pressable>
        ) : null}
      </View>
    </GlassSurface>
  );
}
