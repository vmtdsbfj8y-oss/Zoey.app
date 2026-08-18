import { Text, View } from 'react-native';

import { GlassSurface } from '@/components/ui/glass-surface';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { tokens } from '@/constants/tokens';
import { useDocuments } from '@/lib/documents-store';

/**
 * The Credit Services state a FREE client sees.
 *
 * Credit Services are NOT a paid feature: intake, review, dispute preparation,
 * sending, the dispute documents and the final result are all included on a
 * free account. What a free client does not get is the premium software layer
 * -- live tracking, per-round timelines, dates, alerts and Zoey's commentary.
 *
 * So this shows plain milestones and nothing more. Each one is derived from
 * real state (the document intake and analysis phase), never invented.
 */

type Milestone = { key: string; label: string; done: boolean; current: boolean };

export function FreeDisputeStatus() {
  const { requiredComplete, phase } = useDocuments();

  const received = requiredComplete;
  const inReview = phase === 'ANALYSIS_RUNNING' || phase === 'ANALYSIS_COMPLETE';
  const prepared = phase === 'ANALYSIS_COMPLETE';

  // Sending and results are owner-side steps with no data source in the app
  // yet, so they stay pending rather than being guessed at.
  const milestones: Milestone[] = [
    { key: 'received', label: 'Documents received', done: received, current: !received },
    { key: 'review', label: 'Credit Services in review', done: inReview, current: received && !inReview },
    { key: 'prepared', label: 'Dispute prepared', done: prepared, current: inReview && !prepared },
    { key: 'sent', label: 'Dispute completed', done: false, current: prepared },
    { key: 'result', label: 'Result available', done: false, current: false },
  ];

  return (
    <GlassSurface radius={22} glow>
      <View className="p-4">
        <Text className="font-sans-semibold text-[15px] text-parchment">Your Credit Service</Text>
        <Text className="mt-0.5 font-sans text-[12px] text-parchment/55">
          Your current status.
        </Text>

        <View className="mt-3.5 gap-2.5">
          {milestones.map((m) => (
            <View key={m.key} className="flex-row items-center gap-2.5">
              <IconSymbol
                name={m.done ? 'checkmark.circle.fill' : 'checkmark.circle'}
                size={17}
                color={
                  m.done
                    ? tokens.signalReceived
                    : m.current
                      ? tokens.violet300
                      : 'rgba(244,239,255,0.25)'
                }
              />
              <Text
                className="flex-1 font-sans text-[13.5px]"
                style={{
                  color: m.done
                    ? tokens.parchment
                    : m.current
                      ? tokens.violet300
                      : 'rgba(244,239,255,0.4)',
                }}>
                {m.label}
              </Text>
            </View>
          ))}
        </View>

        <Text className="mt-3.5 font-sans text-[11.5px] leading-[16px] text-parchment/45">
          Zoey will let you know when your result is ready.
        </Text>
      </View>
    </GlassSurface>
  );
}
