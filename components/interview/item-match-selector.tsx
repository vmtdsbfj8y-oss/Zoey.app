import { useState } from 'react';
import { useI18n } from '@/lib/i18n/context';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import { GlassSurface } from '@/components/ui/glass-surface';
import { tokens } from '@/constants/tokens';
import type { InterviewItem, InterviewSelection } from '@/lib/mobile-interview';

/**
 * Which account the consumer meant, chosen by the consumer.
 *
 * The engine reaches this pane when more than one report item plausibly matches what was
 * described. It deliberately does not guess: picking for someone would attach a denial to an
 * account they never mentioned, and a denial is the predicate for the strongest classification in
 * the system. So the candidates come down and a person selects among them.
 *
 * Only keys the engine offered can be sent. The submit button is inert until at least one is
 * chosen, because an empty selection is not an answer.
 */
export function ItemMatchSelector({
  selection,
  items,
  busy,
  onSelect,
}: {
  selection: InterviewSelection;
  items: InterviewItem[];
  busy: boolean;
  onSelect: (itemKeys: string[]) => void;
}) {
  const { t } = useI18n();
  const [chosen, setChosen] = useState<string[]>([]);

  const labelFor = (itemKey: string) => items.find((item) => item.itemKey === itemKey)?.label ?? itemKey;
  const toggle = (itemKey: string) =>
    setChosen((current) =>
      current.includes(itemKey) ? current.filter((k) => k !== itemKey) : [...current, itemKey]
    );

  const ready = chosen.length > 0 && !busy;

  return (
    <GlassSurface radius={22} glow>
      <View className="gap-3 p-4">
        <View className="gap-1">
          <Text className="font-display text-[17px] text-parchment">{t('interview.selectionTitle')}</Text>
          {/* Zoey's own explanation of why she is asking. */}
          <Text className="font-sans text-[12.5px] leading-[18px] text-parchment/70">{selection.prompt}</Text>
        </View>

        <View className="gap-1.5">
          {selection.itemKeys.map((itemKey) => {
            const selected = chosen.includes(itemKey);
            return (
              <Pressable
                key={itemKey}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: selected, disabled: busy }}
                accessibilityLabel={labelFor(itemKey)}
                onPress={busy ? undefined : () => toggle(itemKey)}
                className="flex-row items-center gap-2.5 rounded-[14px] border px-3 py-3 active:opacity-80"
                style={{
                  borderColor: selected ? tokens.violet400 : 'rgba(255,255,255,0.10)',
                  backgroundColor: selected ? 'rgba(168,85,247,0.14)' : 'transparent',
                }}
              >
                <View
                  className="h-4 w-4 rounded-[5px] border"
                  style={{
                    borderColor: selected ? tokens.violet400 : 'rgba(255,255,255,0.28)',
                    backgroundColor: selected ? tokens.violet400 : 'transparent',
                  }}
                />
                <Text className="flex-1 font-sans text-[13px] text-parchment/90">{labelFor(itemKey)}</Text>
              </Pressable>
            );
          })}
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('interview.selectionAction')}
          accessibilityState={{ disabled: !ready, busy }}
          onPress={ready ? () => onSelect(chosen) : undefined}
          className="mt-1 flex-row items-center justify-center gap-2 rounded-full py-3.5 active:opacity-85"
          style={{ backgroundColor: ready ? tokens.violet500 : 'rgba(168,85,247,0.22)' }}
        >
          {busy ? <ActivityIndicator size="small" color={tokens.parchment} /> : null}
          <Text
            className="font-sans-semibold text-[13px] tracking-[0.06em]"
            style={{ color: ready || busy ? tokens.parchment : 'rgba(244,239,255,0.45)' }}
          >
            {t('interview.selectionAction')}
          </Text>
        </Pressable>
      </View>
    </GlassSurface>
  );
}
