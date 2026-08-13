import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CreditScoreCard } from '@/components/home/credit-score-card';
import { DisputeRoundsCard } from '@/components/home/dispute-rounds-card';
import { ProgressGaugeCard } from '@/components/home/progress-gauge-card';
import { ZoeyHeader } from '@/components/home/zoey-header';
import { ScreenBackground } from '@/components/ui/screen-background';

export default function DashboardScreen() {
  return (
    <ScreenBackground idPrefix="dash">
      {/* Only the top edge -- the tab bar already handles the home indicator. */}
      <SafeAreaView edges={['top']} className="flex-1">
        <ZoeyHeader />
        <ScrollView showsVerticalScrollIndicator={false}>
          <View className="gap-5 px-4 pb-32">
            <ProgressGaugeCard />
            <CreditScoreCard />
            <DisputeRoundsCard />
          </View>
        </ScrollView>
      </SafeAreaView>
    </ScreenBackground>
  );
}
