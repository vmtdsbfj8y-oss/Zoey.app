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
 * Documents -- the premium Zoey experience.
 *
 * This whole screen, including START ZOEY, is a Zoey Member feature. A non-member sees what
 * membership turns on rather than a broken screen.
 *
 * Locking it does not put Credit Services behind the paywall. That case lives at
 * More -> Credit Services, is reachable without a membership, and writes through the SAME
 * `useDocuments()` store and the same engine -- so there is one document record per client either
 * way. The engine itself cannot read an entitlement at all; this is presentation.
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
                <ZoeyHero
                  onViewAnalysis={() => {
                    /*
                     * Straight to Disputes, where the analysis lives -- and where the questionnaire
                     * sits at the top when Zoey is held waiting on an answer. Sending someone to
                     * the dashboard to hunt for the one thing blocking their case is how a hold
                     * becomes a dead end.
                     */
                    router.push('/disputes');
                  }}
                />
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
                      <Text className="font-sans text-[14px] text-ink-600">No documents yet</Text>
                      <Text className="mt-1 font-sans text-[12px] text-ink-600">
                        Your documents and anything Zoey creates will appear here
                      </Text>
                    </View>
                  )}
                </View>
              </>
            ) : (
              <>
                {/* The real card, action locked -- a non-member can see what membership turns on. */}
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
