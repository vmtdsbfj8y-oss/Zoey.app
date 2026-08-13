import { Text, View } from 'react-native';

import { Card } from '@/components/ui/card';
import { GradientRing } from '@/components/ui/gradient-ring';
import { overallProgress } from '@/lib/placeholder-data';

export function ProgressGaugeCard() {
  return (
    <Card>
      <View className="flex-row items-start justify-between gap-3">
        <Text className="font-sans-semibold text-[15px] text-parchment">Your Overall Progress</Text>
        <View className="items-end">
          <Text className="font-sans text-[11px] text-ink-600">Last updated</Text>
          <Text className="font-sans-medium text-[11px] text-parchment">
            {overallProgress.lastUpdated}
          </Text>
        </View>
      </View>

      <View className="mt-4 items-center">
        <View className="items-center justify-center">
          {/* 300deg sweep leaves the gap at the bottom, matching the reference. */}
          <GradientRing
            size={168}
            strokeWidth={14}
            progress={overallProgress.percent / 100}
            sweep={300}
            gradientId="overallGauge"
          />
          <View className="absolute items-center">
            <Text className="font-display text-[34px] leading-[40px] text-parchment">
              {overallProgress.percent}%
            </Text>
          </View>
        </View>

        <Text className="mt-3 font-sans-medium text-[14px] text-violet-400">
          {overallProgress.caption} ✨
        </Text>
      </View>
    </Card>
  );
}
