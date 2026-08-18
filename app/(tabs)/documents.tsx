import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DocumentRow } from '@/components/documents/document-row';
import { FilterPills, type Filter } from '@/components/documents/filter-pills';
import { ZoeyHero } from '@/components/documents/zoey-hero';
import { PremiumLockCard } from '@/components/premium/premium-lock';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { ScreenBackground } from '@/components/ui/screen-background';
import { tokens } from '@/constants/tokens';
import { useDocuments } from '@/lib/documents-store';
import { useMembership } from '@/lib/membership-context';

/**
 * Documents.
 *
 * ==========================  WHAT MEMBERSHIP DOES NOT GATE  ==========================
 *
 * The credit-repair service is free and does not require a Zoey membership. So everything a
 * client needs to PARTICIPATE IN THEIR CASE is here for everyone: the intake checklist, real
 * uploads, and Start Zoey. This screen used to hide all of it behind the paywall, which told a
 * free client their repair case required a subscription -- it does not, and the engine has no way
 * to check membership even if it wanted to.
 *
 * ==========================  WHAT MEMBERSHIP DOES GATE  ==========================
 *
 * Presentation and organisation only: the filter pills, the document manager, and the cinematic
 * run experience (chosen inside ZoeyHero). A free client running the SAME analysis sees the plain
 * milestone view. The service is identical; only the software around it differs.
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
            {/* The case itself -- free for everyone. */}
            <ZoeyHero onViewAnalysis={() => router.push('/')} />

            {/* Organisational filtering is a premium convenience, not part of the service. */}
            {isPremium ? <FilterPills active={filter} onChange={setFilter} /> : null}

            <View className="gap-2">
              {visible.length > 0 ? (
                visible.map((slot) => (
                  <DocumentRow
                    key={slot.id}
                    slot={slot}
                    upload={uploadState[slot.id]}
                    onUpload={() => uploadSlot(slot.id)}
                    onView={isPremium ? () => router.push('/upload') : undefined}
                  />
                ))
              ) : (
                <View className="items-center rounded-card border border-ink-700 bg-ink-900 px-4 py-8">
                  <Text className="font-sans text-[14px] text-ink-600">No documents yet</Text>
                  <Text className="mt-1 font-sans text-[12px] text-ink-600">
                    Your required documents and anything Zoey creates will appear here
                  </Text>
                </View>
              )}
            </View>

            {/*
              Shown BELOW the working case, never instead of it. A free client can see what the
              membership adds without being told their repair service depends on it.
            */}
            {membershipLoading || isPremium ? null : (
              <PremiumLockCard
                icon="doc.text.fill"
                title="Zoey Member extras"
                blurb="Your credit service is free. Membership adds software for managing it."
                bullets={[
                  'Filter and organise every document',
                  'The live Run Zoey command centre',
                  'The full document manager',
                ]}
              />
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </ScreenBackground>
  );
}
