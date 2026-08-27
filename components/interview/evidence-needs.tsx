import { useI18n } from '@/lib/i18n/context';
import { Pressable, Text, View } from 'react-native';

import { GlassSurface } from '@/components/ui/glass-surface';
import { tokens } from '@/constants/tokens';
import { evidenceCopyFor } from '@/lib/interview-copy';
import { actionLabelKey, evidenceRows } from '@/lib/interview-evidence-actions';
import type { InterviewEvidenceNeed } from '@/lib/mobile-interview';
import type { DocumentSlot } from '@/lib/documents-data';

/**
 * What would help the case next, and a way to act on each one.
 *
 * ==============================  TWO SERVER LISTS, NEITHER INVENTED  ==============================
 *
 * The requirement level is the interview's, computed from CONFIRMED answers only, and it is
 * rendered exactly as sent -- a RECOMMENDED document is never promoted to REQUIRED to make the
 * screen feel more urgent. The action (Upload / View / Replace) comes from the intake checklist's
 * own status for that slot. `interview-evidence-actions` is the join; this component only draws it.
 *
 * ==============================  WHY EACH ROW HAS ITS OWN BUTTON  ==============================
 *
 * This card used to end in a single "Go to documents" link, which dropped the consumer at the top
 * of a generic list and left them to find the row the interview had just asked for. Naming a
 * document and then not taking them to it is the part that made the handoff incomplete. Each row
 * now carries its own action and passes the engine's slot id through, so Documents can open
 * focused on that exact card.
 *
 * Uploading itself stays in the documents screen, which already owns the source rules, the
 * permission prompts, the size ladder and the storage path. Nothing here touches a file.
 */
export function EvidenceNeeds({
  needs,
  slots,
  onOpenDocument,
}: {
  needs: InterviewEvidenceNeed[];
  /** The intake checklist, for status. Empty is fine: every row then reads as "Upload". */
  slots: DocumentSlot[];
  /** Receives the engine's slot id, untouched. */
  onOpenDocument: (documentType: string) => void;
}) {
  const { t } = useI18n();
  if (needs.length === 0) return null;

  const rows = evidenceRows(needs, slots);

  const tone = (requirement: string) =>
    requirement === 'REQUIRED' ? tokens.violet300 : 'rgba(244,239,255,0.55)';

  return (
    <GlassSurface radius={22}>
      <View className="gap-3 p-4">
        <Text className="font-display text-[15px] text-parchment">{t('interview.evidenceTitle')}</Text>

        {rows.map((row) => {
          const copy = evidenceCopyFor(
            { slot: row.documentType, requirement: row.requirement, reason: row.reason },
            t
          );
          const actionLabel = t(actionLabelKey(row.action));
          return (
            <View key={row.documentType} className="gap-2 border-t border-white/10 pt-3">
              <View className="flex-row items-center justify-between gap-2">
                <Text className="flex-1 font-sans-medium text-[13.5px] text-parchment">{copy.name}</Text>
                {copy.requirement ? (
                  <Text
                    className="font-sans-semibold text-[10.5px] tracking-[0.08em]"
                    style={{ color: tone(row.requirement) }}
                  >
                    {copy.requirement.toUpperCase()}
                  </Text>
                ) : null}
              </View>

              {/* The engine's plain-language reason, shown as written. */}
              <Text className="font-sans text-[12px] leading-[17px] text-parchment/60">{copy.reason}</Text>

              {/* The row's status line, when the checklist has one for this slot. */}
              {row.slot ? (
                <Text className="font-sans text-[11.5px] text-parchment/45">{row.slot.detail}</Text>
              ) : null}

              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('interview.a11yDocumentAction', {
                  values: { action: actionLabel, name: copy.name },
                })}
                accessibilityHint={t('interview.a11yDocumentHint')}
                onPress={() => onOpenDocument(row.documentType)}
                // 44pt minimum: this is the only way out of the completed screen.
                style={{ minHeight: 44 }}
                className="items-center justify-center self-start rounded-full border border-white/15 px-5 active:opacity-80"
              >
                <Text
                  className="font-sans-semibold text-[12.5px] tracking-[0.06em]"
                  style={{ color: tokens.violet300 }}
                >
                  {actionLabel}
                </Text>
              </Pressable>
            </View>
          );
        })}
      </View>
    </GlassSurface>
  );
}
