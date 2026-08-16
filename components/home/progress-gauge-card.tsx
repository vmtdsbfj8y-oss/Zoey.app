import { Text, View } from 'react-native';

import { Card } from '@/components/ui/card';
import { GradientRing } from '@/components/ui/gradient-ring';
import { overallProgress } from '@/lib/placeholder-data';

export function ProgressGaugeCard() {
  return (
    <Card glowId="glowGauge">
      <View className="flex-row items-start justify-between gap-3">
        <Text className="font-display text-[15px] text-parchment">Your Overall Progress</Text>
        <View className="items-end">
          <Text className="font-sans text-[11px] text-parchment/55">Last updated</Text>
          <Text className="font-sans-semibold text-[11px] text-parchment/90">
            {overallProgress.lastUpdated}
          </Text>
        </View>
      </View>

      <View className="mt-3 items-center">
        <View className="items-center justify-center">
          {/*
            240deg, not 300 -- the reference is a horseshoe with a wide gap at
            the bottom, and the near-closed ring was the main thing making this
            read as a dial rather than a progress arc.
          */}
          <GradientRing
            size={158}
            strokeWidth={13}
            progress={overallProgress.percent / 100}
            sweep={240}
            gradientId="overallGauge"
          />
          {/* Baseline-aligned: a big number with a smaller unit, not one run of type. */}
          <View className="absolute flex-row items-baseline">
            <Text className="font-display text-[44px] leading-[50px] text-parchment">
              {overallProgress.percent}
            </Text>
            <Text className="font-display text-[26px] leading-[50px] text-parchment">%</Text>
          </View>
        </View>

        {/*
          Pulled up into the arc's open gap. The ring's SVG canvas is padded on
          all four sides to give the bloom room, and a 240deg sweep leaves ~58px
          of that padding empty below the caps -- without this the caption
          floats away from the gauge.
        */}
        <Text
          className="font-sans-semibold text-[15px] text-parchment"
          style={{ marginTop: -48 }}>
          {overallProgress.caption} ✨
        </Text>
      </View>
    </Card>
  );
}
