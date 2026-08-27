import { useLocalSearchParams, useRouter } from 'expo-router';
import { useI18n } from '@/lib/i18n/context';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DocumentRow } from '@/components/documents/document-row';
import { FilterPills, type Filter } from '@/components/documents/filter-pills';
import { ZoeyHero, ZoeyRunLockedCard } from '@/components/documents/zoey-hero';
import { InterviewEntryCard } from '@/components/interview/interview-entry-card';
import { PremiumLockCard } from '@/components/premium/premium-lock';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { ScreenBackground } from '@/components/ui/screen-background';
import { tokens } from '@/constants/tokens';
import { useDocuments } from '@/lib/documents-store';
import { normalizeSlotId } from '@/lib/interview-evidence-actions';
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
  const { t } = useI18n();
  const [filter, setFilter] = useState<Filter>('All');
  const router = useRouter();
  const { slots, uploadSlot, uploadState } = useDocuments();
  const { isPremium, loading: membershipLoading } = useMembership();

  /*
   * ==============================  ARRIVING FOR ONE DOCUMENT  ==============================
   *
   * The identity review names a document and sends the engine's slot id here. Landing at the top
   * of a generic list and leaving somebody to find that row is what made the handoff incomplete,
   * so the row is scrolled to and briefly ringed.
   *
   * Everything about this is optional and self-clearing. No parameter is ordinary navigation; a
   * parameter naming a slot this checklist does not have is ignored rather than error, because a
   * stale deep link must not be able to break the documents screen.
   */
  const { documentType } = useLocalSearchParams<{ documentType?: string }>();
  const scrollRef = useRef<ScrollView>(null);
  const rowTops = useRef<Record<string, number>>({});
  const listTop = useRef(0);
  const [focusedSlotId, setFocusedSlotId] = useState<string | null>(null);
  const [layoutTick, setLayoutTick] = useState(0);

  const requested = normalizeSlotId(documentType);
  const target = requested ? slots.find((slot) => normalizeSlotId(slot.id) === requested) : undefined;

  /*
   * A filter could hide the very row we were asked to show. Whichever filter was left on, an
   * explicit request wins -- otherwise the deep link silently lands on an empty list.
   */
  useEffect(() => {
    if (target) setFilter('All');
  }, [target]);

  const noteRowTop = useCallback((slotId: string, y: number) => {
    rowTops.current[slotId] = y;
    setLayoutTick((tick) => tick + 1);
  }, []);

  useEffect(() => {
    if (!target) return;
    const top = rowTops.current[target.id];
    // Wait for the row to have been laid out; `layoutTick` re-runs this as measurements arrive.
    if (top === undefined) return;

    scrollRef.current?.scrollTo({ y: Math.max(0, listTop.current + top - 24), animated: true });
    setFocusedSlotId(target.id);

    /*
     * Spend the parameter once it has been acted on, so returning to this tab later does not
     * re-scroll and re-ring a document the consumer has moved on from.
     */
    router.setParams({ documentType: undefined });

    const clear = setTimeout(() => setFocusedSlotId(null), 2600);
    return () => clearTimeout(clear);
  }, [target, layoutTick, router]);

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
          <Text className="font-display text-[20px] text-parchment">{t('documents.title')}</Text>
          {isPremium ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('documents.a11yUpload')}
              onPress={() => router.push('/upload')}
              className="active:opacity-70">
              <IconSymbol name="icloud.and.arrow.up" size={22} color={tokens.violet400} />
            </Pressable>
          ) : null}
        </View>

        <ScrollView ref={scrollRef} showsVerticalScrollIndicator={false}>
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
                {/*
                 * The identity review. Offered here because this is where Run Zoey lands, and it
                 * is NOT inside the membership branch below on purpose: the engine applies no
                 * premium gate to the interview, so neither does the app.
                 */}
                <InterviewEntryCard onOpen={() => router.push('/interview')} />
                <FilterPills active={filter} onChange={setFilter} />

                <View className="gap-2" onLayout={(event) => { listTop.current = event.nativeEvent.layout.y; }}>
                  {visible.length > 0 ? (
                    visible.map((slot) => (
                      <View
                        key={slot.id}
                        onLayout={(event) => noteRowTop(slot.id, event.nativeEvent.layout.y)}
                      >
                        <DocumentRow
                          slot={slot}
                          upload={uploadState[slot.id]}
                          onUpload={() => uploadSlot(slot.id)}
                          onView={() => router.push('/upload')}
                          highlighted={focusedSlotId === slot.id}
                        />
                      </View>
                    ))
                  ) : (
                    <View className="items-center rounded-card border border-ink-700 bg-ink-900 px-4 py-8">
                      <Text className="font-sans text-[14px] text-ink-600">{t('documents.emptyTitle')}</Text>
                      <Text className="mt-1 font-sans text-[12px] text-ink-600">
                        {t('documents.emptyBody')}
                      </Text>
                    </View>
                  )}
                </View>
              </>
            ) : (
              <>
                {/* The real card, action locked -- a non-member can see what membership turns on. */}
                <ZoeyRunLockedCard />
                {/* Free for every linked client, so it sits outside the paywall on this screen too. */}
                <InterviewEntryCard onOpen={() => router.push('/interview')} />
                <PremiumLockCard
                  icon="doc.text.fill"
                  title={t('documents.title')}
                  blurb={t('documents.blurb')}
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
