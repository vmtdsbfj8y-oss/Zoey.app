import { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DisputeFilterTabs } from '@/components/disputes/dispute-filter-tabs';
import { DisputeRow } from '@/components/disputes/dispute-row';
import { RoundProgressCard } from '@/components/disputes/round-progress-card';
import { ScreenBackground } from '@/components/ui/screen-background';
import { disputeItems, type DisputeFilter } from '@/lib/disputes-data';

const BUCKET: Record<DisputeFilter, string> = {
  'In Progress': 'in-progress',
  Completed: 'completed',
  Deleted: 'deleted',
};

export default function DisputesScreen() {
  const [filter, setFilter] = useState<DisputeFilter>('In Progress');

  const visible = disputeItems.filter((d) => d.bucket === BUCKET[filter]);

  return (
    <ScreenBackground idPrefix="disp">
      <SafeAreaView edges={['top']} className="flex-1">
        <View className="px-4 pb-4 pt-1">
          <Text className="font-display text-[22px] text-parchment">Disputes</Text>
        </View>

        <ScrollView showsVerticalScrollIndicator={false}>
          <View className="gap-4 px-4 pb-32">
            <DisputeFilterTabs active={filter} onChange={setFilter} />

            {/* The round summary belongs to the active round, so it only makes
                sense above the in-progress list. */}
            {filter === 'In Progress' ? <RoundProgressCard /> : null}

            <View className="gap-3">
              {visible.length > 0 ? (
                visible.map((item) => <DisputeRow key={item.id} item={item} />)
              ) : (
                <View className="items-center rounded-card border border-ink-700 bg-ink-900/60 px-4 py-8">
                  <Text className="font-sans text-[14px] text-parchment/60">
                    Nothing {filter.toLowerCase()} yet
                  </Text>
                  <Text className="mt-1 text-center font-sans text-[12px] text-parchment/40">
                    Items move here as Zoey works through your rounds
                  </Text>
                </View>
              )}
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </ScreenBackground>
  );
}
