import { LinearGradient } from 'expo-linear-gradient';
import { Text, View } from 'react-native';

import { GradientRing } from '@/components/ui/gradient-ring';
import { tokens } from '@/constants/tokens';
import { disputeRound } from '@/lib/placeholder-data';

export function DisputeRoundsCard() {
  const { round, status, completed, total } = disputeRound;

  return (
    // The one filled gradient surface on Home -- violet -> magenta, matching
    // the FAB and the active tab.
    <LinearGradient
      colors={[tokens.violet600, tokens.magenta600]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      className="overflow-hidden rounded-card"
      style={{ borderRadius: 10 }}>
      <View className="flex-row items-center justify-between gap-3 p-4">
        <View className="flex-1">
          <Text className="font-sans text-[11px] uppercase tracking-wide text-parchment/70">
            Dispute Rounds
          </Text>
          <Text className="mt-1 font-sans-semibold text-[15px] text-parchment" numberOfLines={1}>
            Round {round} {status}
          </Text>
          <Text className="mt-0.5 font-sans text-[12px] text-parchment/70">
            {completed} of {total} items completed
          </Text>
        </View>

        <View className="items-center justify-center">
          <GradientRing
            size={62}
            strokeWidth={6}
            progress={completed / total}
            trackColor="rgba(244,239,255,0.25)"
            gradientId="disputeRing"
          />
          <View className="absolute">
            <Text className="font-display text-[14px] text-parchment">
              {completed}/{total}
            </Text>
          </View>
        </View>
      </View>
    </LinearGradient>
  );
}
