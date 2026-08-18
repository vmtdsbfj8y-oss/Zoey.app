import { Text, View } from 'react-native';

import { UnlockCta } from '@/components/premium/premium-lock';
import { GlassSurface } from '@/components/ui/glass-surface';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { tokens } from '@/constants/tokens';
import { useDocuments } from '@/lib/documents-store';

/**
 * The running/complete state a FREE client sees.
 *
 * The cinematic Run Zoey presentation -- the animated stage, orbital rings,
 * live percentage and stage-by-stage panel -- is part of the premium software
 * experience, so a free client does not get it. They get the plain milestone
 * list instead.
 *
 * This does NOT reduce the service: the same analysis runs, the same dispute is
 * prepared, and the milestones come from the same server state. Only the
 * presentation differs, which is exactly what membership pays for.
 */
export function SimpleServiceStatus() {
  const { milestones, currentMilestone } = useDocuments();

  // Server milestones are authoritative; before the first poll lands there is
  // nothing truthful to show beyond "submitted".
  const rows = milestones.length
    ? milestones
    : [{ id: 'documents-received', label: 'Documents Received', state: 'current' as const }];

  return (
    <View style={{ gap: 12 }}>
      <GlassSurface radius={22} glow>
        <View className="p-4">
          <Text className="font-sans text-[11px] uppercase tracking-wider text-parchment/45">
            Credit Services
          </Text>
          <Text
            className="mt-0.5 font-sans-semibold text-[16px]"
            style={{ color: tokens.violet300 }}>
            {currentMilestone ?? 'In review'}
          </Text>

          <View className="mt-3.5 gap-2.5">
            {rows.map((m) => (
              <View key={m.id} className="flex-row items-center gap-2.5">
                <IconSymbol
                  name={m.state === 'done' ? 'checkmark.circle.fill' : 'checkmark.circle'}
                  size={17}
                  color={
                    m.state === 'done'
                      ? tokens.signalReceived
                      : m.state === 'current'
                        ? tokens.violet300
                        : 'rgba(244,239,255,0.25)'
                  }
                />
                <Text
                  className="flex-1 font-sans text-[13.5px]"
                  style={{
                    color:
                      m.state === 'done'
                        ? tokens.parchment
                        : m.state === 'current'
                          ? tokens.violet300
                          : 'rgba(244,239,255,0.4)',
                  }}>
                  {m.label}
                </Text>
              </View>
            ))}
          </View>

          <Text className="mt-3.5 font-sans text-[11.5px] leading-[16px] text-parchment/45">
            Zoey will let you know when there is an update.
          </Text>
        </View>
      </GlassSurface>

      <GlassSurface radius={22} glow>
        <View className="p-4">
          <Text className="font-sans-semibold text-[14px] text-parchment">
            Watch Zoey work in real time
          </Text>
          <Text className="mt-1 font-sans text-[12px] leading-[17px] text-parchment/55">
            Zoey Members see the live analysis, the round-by-round timeline, delivery tracking and
            Zoey&apos;s explanation of every response.
          </Text>
          <View className="mt-3.5">
            <UnlockCta compact />
          </View>
        </View>
      </GlassSurface>
    </View>
  );
}
