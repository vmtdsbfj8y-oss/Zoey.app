import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DocumentRow } from '@/components/documents/document-row';
import { FilterPills, type Filter } from '@/components/documents/filter-pills';
import { ZoeyHero } from '@/components/documents/zoey-hero';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { ScreenBackground } from '@/components/ui/screen-background';
import { tokens } from '@/constants/tokens';
import { useDocuments } from '@/lib/documents-store';

export default function DocumentsScreen() {
  const [filter, setFilter] = useState<Filter>('All');
  const router = useRouter();
  const { slots, markUploaded } = useDocuments();

  const visible = slots.filter((d) => {
    if (filter === 'Uploaded') return d.state === 'uploaded';
    if (filter === 'Generated') return d.kind === 'generated';
    return true;
  });

  return (
    <ScreenBackground idPrefix="docs">
      <SafeAreaView edges={['top']} className="flex-1">
        {/* header */}
        <View className="flex-row items-center justify-between px-4 pb-3 pt-1">
          <Text className="font-display text-[20px] text-parchment">Documents</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Upload a document"
            onPress={() => router.push('/upload')}
            className="active:opacity-70"
          >
            <IconSymbol name="icloud.and.arrow.up" size={22} color={tokens.violet400} />
          </Pressable>
        </View>

        <ScrollView showsVerticalScrollIndicator={false}>
          <View className="gap-3 px-4 pb-32">
            {/* Upload box until intake is complete, then Zoey takes the slot. */}
            <ZoeyHero onViewAnalysis={() => router.push('/')} />
            <FilterPills active={filter} onChange={setFilter} />

            <View className="gap-2">
              {visible.length > 0 ? (
                visible.map((slot) => (
                  <DocumentRow
                    key={slot.id}
                    slot={slot}
                    onUpload={() => markUploaded(slot.id)}
                    onView={() => router.push('/upload')}
                  />
                ))
              ) : (
                <View className="items-center rounded-card border border-ink-700 bg-ink-900 px-4 py-8">
                  <Text className="font-sans text-[14px] text-ink-600">
                    No generated documents yet
                  </Text>
                  <Text className="mt-1 font-sans text-[12px] text-ink-600">
                    Dispute letters Zoey creates will appear here
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
