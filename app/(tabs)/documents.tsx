import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DocumentRow } from '@/components/documents/document-row';
import { FilterPills, type Filter } from '@/components/documents/filter-pills';
import { ZoeyHero, ZoeyRunLockedCard } from '@/components/documents/zoey-hero';
import { PremiumLockCard } from '@/components/premium/premium-lock';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { ScreenBackground } from '@/components/ui/screen-background';
import { tokens } from '@/constants/tokens';
import { useDocuments } from '@/lib/documents-store';
import { useMembership } from '@/lib/membership-context';

/**
 * Documents.
 *
 * The full document experience is a Zoey Member feature. A free client sees the
 * locked Run Zoey card and a lock panel here, NOT a broken or empty screen.
 *
 * Locking this tab does not block basic Credit Services: the required intake
 * lives inside More → Services → Credit Services and writes through the SAME
 * `useDocuments()` store and the same API, so there is exactly one document
 * record per client either way.
 */
export default function DocumentsScreen() {
  const [filter, setFilter] = useState<Filter>('All');
  const router = useRouter();
  const { slots, uploadSlot, uploadState } = useDocuments();
  const { isPremium, loading: membershipLoading } = useMembership();

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
          {isPremium ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Upload a document"
              onPress={() => router.push('/upload')}
              className="active:opacity-70">
              <IconSymbol name="icloud.and.arrow.up" size={22} color={tokens.violet400} />
            </Pressable>
          ) : null}
        </View>

        <ScrollView showsVerticalScrollIndicator={false}>
          <View className="gap-3 px-4 pb-32">
            {membershipLoading ? null : isPremium ? (
              <>
                <ZoeyHero onViewAnalysis={() => router.push('/')} />
                <FilterPills active={filter} onChange={setFilter} />

                <View className="gap-2">
                  {visible.length > 0 ? (
                    visible.map((slot) => (
                      <DocumentRow
                        key={slot.id}
                        slot={slot}
                        upload={uploadState[slot.id]}
                        onUpload={() => uploadSlot(slot.id)}
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
              </>
            ) : (
              <>
                {/* The real card, action locked -- so a free client can see
                    exactly what membership turns on. */}
                <ZoeyRunLockedCard />
                <PremiumLockCard
                  icon="doc.text.fill"
                  title="Documents"
                  blurb="Manage, track and organize everything in one place"
                  bullets={[
                    'Upload, replace and review every document',
                    'Live processing status as Zoey reads them',
                    'Dispute letters and generated documents',
                  ]}
                />
              </>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </ScreenBackground>
  );
}
