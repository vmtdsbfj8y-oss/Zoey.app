import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CreditScoreCard } from '@/components/home/credit-score-card';
import { DisputeRoundsCard } from '@/components/home/dispute-rounds-card';
import { ProgressGaugeCard } from '@/components/home/progress-gauge-card';
import { ZoeyHeader } from '@/components/home/zoey-header';

export default function DashboardScreen() {
  return (
    // Only the top edge -- the tab bar already handles the home indicator.
    <SafeAreaView edges={['top']} className="flex-1 bg-ink-950">
      <ZoeyHeader />
      <ScrollView showsVerticalScrollIndicator={false}>
        <View className="gap-3 px-4 pb-6">
          <ProgressGaugeCard />
          <CreditScoreCard />
          <DisputeRoundsCard />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
