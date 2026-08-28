import { useLocalSearchParams, useRouter } from 'expo-router';
import { useI18n } from '@/lib/i18n/context';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ZoeyHero, ZoeyRunLockedCard } from '@/components/documents/zoey-hero';
import { ZoeyHeader } from '@/components/home/zoey-header';
import { InterviewEntryCard } from '@/components/interview/interview-entry-card';
import { PremiumLockCard } from '@/components/premium/premium-lock';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { ScreenBackground } from '@/components/ui/screen-background';
import { tokens } from '@/constants/tokens';
import { documentDetailFor, documentNameFor } from '@/lib/document-copy';
import { useDocuments } from '@/lib/documents-store';
import { normalizeSlotId } from '@/lib/slot-id';
import { useMembership } from '@/lib/membership-context';

/**
 * Run Zoey -- the premium Zoey experience, on the approved reference's layout.
 *
 * Hero (the run lifecycle), then "Choose your report", then the documents as clear glass rows in
 * the dashboard's own material language. Every row is still the real upload affordance -- the
 * reference's clean panel replaces the old filtered list, not the functionality behind it.
 *
 * Locking it does not put Credit Services behind the paywall. That case lives at
 * More -> Credit Services, is reachable without a membership, and writes through the SAME
 * `useDocuments()` store and the same engine -- so there is one document record per client either
 * way. The engine itself cannot read an entitlement at all; this is presentation.
 */

/** Section heading in the dashboard's own voice: sentence case, real size, no box. */
function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <Text className="mt-4 px-1 font-display text-[21px] leading-[26px] text-parchment">
      {children}
    </Text>
  );
}

/**
 * The clear glass panel the dashboard's sections use: thin violet hairline, near-transparent
 * fill, a fine reflective top edge.
 */
function GlassPanel({ children }: { children: React.ReactNode }) {
  return (
    <View
      className="mt-2.5 overflow-hidden"
      style={{
        borderRadius: 26,
        backgroundColor: 'rgba(138,106,214,0.045)',
        borderWidth: 1,
        borderColor: 'rgba(198,166,255,0.13)',
      }}>
      {children}
    </View>
  );
}

function PanelRow({
  icon,
  label,
  value,
  valueColor,
  busy,
  onPress,
  last,
  highlighted,
}: {
  icon: string;
  label: string;
  value: string;
  valueColor?: string;
  busy?: boolean;
  onPress?: () => void;
  last?: boolean;
  /**
   * Briefly ringed because the consumer arrived here asking for THIS document.
   *
   * Restrained and temporary, in the panel's own material rather than a new one: it says "this is
   * the row you picked" and must never read as a second status.
   */
  highlighted?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      disabled={!onPress || busy}
      className="flex-row items-center gap-3 px-5 py-4 active:opacity-70"
      style={{
        ...(last ? {} : { borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.055)' }),
        ...(highlighted ? { backgroundColor: 'rgba(168,85,247,0.16)' } : {}),
      }}>
      <IconSymbol name={icon as never} size={18} color={tokens.violet400} />
      <Text className="flex-1 font-sans text-[15.5px] text-parchment/90" numberOfLines={1}>
        {label}
      </Text>
      {busy ? (
        <ActivityIndicator size="small" color={tokens.violet400} />
      ) : (
        <Text
          className="font-sans-medium text-[13.5px]"
          style={{ color: valueColor ?? 'rgba(228,218,255,0.6)' }}
          numberOfLines={1}>
          {value}
        </Text>
      )}
      <IconSymbol name="chevron.right" size={13} color="rgba(228,218,255,0.4)" />
    </Pressable>
  );
}

/** One of the two report-source chips: outlined glass, exactly the selector's material. */
function ReportChip({
  icon,
  iconLit,
  title,
  subtitle,
  selected,
  busy,
  onPress,
}: {
  icon: string;
  /** Fills the icon puck violet, the reference's "connected" treatment. */
  iconLit?: boolean;
  title: string;
  subtitle: string;
  selected?: boolean;
  busy?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${subtitle}`}
      onPress={busy ? undefined : onPress}
      className="flex-1 active:opacity-80"
      style={{
        borderRadius: 20,
        borderWidth: 1,
        borderColor: selected ? 'rgba(214,180,255,0.5)' : 'rgba(198,166,255,0.14)',
        backgroundColor: selected ? 'rgba(150,110,230,0.07)' : 'rgba(138,106,214,0.035)',
      }}>
      <View className="flex-row items-center gap-3 px-3.5 py-3.5">
        <View
          className="items-center justify-center"
          style={{
            width: 34,
            height: 34,
            borderRadius: 17,
            backgroundColor: iconLit ? 'rgba(178,132,255,0.9)' : 'rgba(150,110,230,0.12)',
          }}>
          {busy ? (
            <ActivityIndicator size="small" color={iconLit ? '#2E1065' : tokens.violet300} />
          ) : (
            <IconSymbol name={icon as never} size={16} color={iconLit ? '#2E1065' : tokens.violet300} />
          )}
        </View>
        <View className="flex-1">
          <Text
            className="font-sans-semibold text-[13.5px] text-parchment"
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.85}>
            {title}
          </Text>
          <Text
            className="mt-0.5 font-sans text-[12px]"
            style={{ color: 'rgba(228,218,255,0.55)' }}
            numberOfLines={1}>
            {subtitle}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

/** The engine's slot id for a client-uploaded credit report. */
const REPORT_SLOT_ID = 'IDENTITYIQ_CREDIT_REPORT';

export default function DocumentsScreen() {
  const { t } = useI18n();
  const router = useRouter();
  const { slots, report, uploadSlot, uploadState } = useDocuments();
  const { isPremium, loading: membershipLoading } = useMembership();

  /*
   * The upload chip targets the checklist's own report slot when the engine asks for one, and the
   * canonical report type otherwise -- a report refresh is legitimate at any time, and the slot id
   * IS the engine's document type.
   */
  const reportSlot = slots.find((slot) => slot.id.includes('CREDIT_REPORT'));
  const reportSlotId = reportSlot?.id ?? REPORT_SLOT_ID;
  const reportUpload = uploadState[reportSlotId];
  const reportUploadBusy = reportUpload?.kind === 'uploading' || reportUpload?.kind === 'preparing';

  const connectedSubtitle = report?.accepted
    ? t('runzoey.ready')
    : report?.received
      ? t('runzoey.inReview')
      : t('runzoey.notConnected');

  const uploadSubtitle =
    reportUpload?.kind === 'failed' || reportUpload?.kind === 'rejected'
      ? reportUpload.message
      : reportUploadBusy
        ? t('runzoey.uploading')
        : t('runzoey.chooseFile');

  /*
   * ==============================  ARRIVING FOR ONE DOCUMENT  ==============================
   *
   * The identity review names a document and sends the engine's slot id here. Landing at the top
   * of a generic list and leaving somebody to find that row is what made the handoff incomplete,
   * so the row is scrolled to and briefly ringed.
   *
   * Everything about this is optional and self-clearing. No parameter is ordinary navigation; a
   * parameter naming a slot this panel does not have is ignored rather than error, because a stale
   * deep link must not be able to break the screen.
   */
  const { documentType } = useLocalSearchParams<{ documentType?: string }>();
  const scrollRef = useRef<ScrollView>(null);
  const rowTops = useRef<Record<string, number>>({});
  const listTop = useRef(0);
  const [focusedSlotId, setFocusedSlotId] = useState<string | null>(null);
  /** Outlives the route parameter, so the scroll can be corrected as rows report their layout. */
  const [pendingFocus, setPendingFocus] = useState<string | null>(null);
  const [layoutTick, setLayoutTick] = useState(0);

  const requested = normalizeSlotId(documentType);
  /*
   * The ID, not the row object. `slots` is rebuilt from the overview on each render, so
   * `slots.find(...)` returns a NEW object every time; depending on that object re-ran the adopt
   * effect on every render and the scroll never got a chance to land. A string is stable.
   */
  const targetId = requested ? slots.find((slot) => normalizeSlotId(slot.id) === requested)?.id ?? null : null;

  const noteRowTop = useCallback((slotId: string, y: number) => {
    rowTops.current[slotId] = y;
    setLayoutTick((tick) => tick + 1);
  }, []);

  // Adopted once per id: clearing the parameter is not instantaneous, and re-adopting in the
  // meantime is what restarted the whole sequence on every render.
  const adopted = useRef<string | null>(null);

  useEffect(() => {
    if (!targetId || adopted.current === targetId) return;
    adopted.current = targetId;
    setPendingFocus(targetId);
    setFocusedSlotId(targetId);
    router.setParams({ documentType: undefined });
  }, [targetId, router]);

  useEffect(() => {
    if (!pendingFocus) return;
    const top = rowTops.current[pendingFocus];
    // Nothing to aim at yet; `layoutTick` re-runs this as measurements arrive.
    if (top === undefined) return;
    scrollRef.current?.scrollTo({ y: Math.max(0, listTop.current + top - 24), animated: true });
  }, [pendingFocus, layoutTick]);

  // Stop correcting once the list has settled, so ordinary scrolling is never fought.
  useEffect(() => {
    if (!pendingFocus) return;
    const settle = setTimeout(() => setPendingFocus(null), 2800);
    return () => clearTimeout(settle);
  }, [pendingFocus]);

  // The ring is a pointer, not a status: it goes away on its own.
  useEffect(() => {
    if (!focusedSlotId) return;
    const clear = setTimeout(() => setFocusedSlotId(null), 3200);
    return () => clearTimeout(clear);
  }, [focusedSlotId]);

  return (
    <ScreenBackground idPrefix="docs">
      <SafeAreaView edges={[]} className="flex-1">
        {/* The dashboard's own header, then the screen's name in its title voice. */}
        <ZoeyHeader />
        <View className="flex-row items-center justify-between px-4 pb-2">
          <Text className="font-display text-[24px] text-parchment">{t('tabfab.runZoey')}</Text>
        </View>

        <ScrollView ref={scrollRef} showsVerticalScrollIndicator={false}>
          <View className="px-4 pb-44">
            {membershipLoading ? null : isPremium ? (
              <>
                <ZoeyHero onViewAnalysis={() => router.push('/disputes')} />

                {/*
                  The identity review. Offered here because this is where Run Zoey lands, and it is
                  NOT inside a membership gate: the engine applies no premium gate to the interview,
                  so neither does the app.
                */}
                <View className="mt-3">
                  <InterviewEntryCard onOpen={() => router.push('/interview')} />
                </View>

                <SectionHeading>{t('runzoey.chooseReport')}</SectionHeading>
                <View className="mt-2.5 flex-row gap-2.5">
                  <ReportChip
                    icon="checkmark"
                    iconLit={Boolean(report?.accepted)}
                    title={t('runzoey.connectedReport')}
                    subtitle={connectedSubtitle}
                    selected={Boolean(report?.accepted)}
                    onPress={() => router.push('/(tabs)/credit-score')}
                  />
                  <ReportChip
                    icon="icloud.and.arrow.up"
                    title={t('runzoey.uploadPdf')}
                    subtitle={uploadSubtitle}
                    busy={reportUploadBusy}
                    onPress={() => void uploadSlot(reportSlotId)}
                  />
                </View>
                {/* Brand names -- the string is identical in every locale by design. */}
                <Text
                  className="mt-2.5 px-1 font-sans text-[12.5px]"
                  style={{ color: 'rgba(228,218,255,0.45)' }}>
                  {t('runzoey.bureaus')}
                </Text>

                <SectionHeading>{t('runzoey.yourDocuments')}</SectionHeading>
                <View
                  /*
                   * The panel's own position matters as much as each row's: the hero and the entry
                   * card above it settle late, which moves this list down after the rows have
                   * already reported. Ticking here recomputes the scroll instead of aiming at a
                   * stale offset.
                   */
                  onLayout={(event) => {
                    listTop.current = event.nativeEvent.layout.y;
                    setLayoutTick((tick) => tick + 1);
                  }}>
                <GlassPanel>
                  {slots.map((slot) => {
                    const upload = uploadState[slot.id];
                    const busy = upload?.kind === 'uploading' || upload?.kind === 'preparing';
                    const failed = upload?.kind === 'failed' || upload?.kind === 'rejected';
                    /*
                     * Name and status line come from the engine's id and status ENUM, not from the
                     * English prose it also sends, so the panel follows the reader's language. Both
                     * fall back to the engine's own words for anything this build has not seen.
                     */
                    return (
                      <View
                        key={slot.id}
                        onLayout={(event) => noteRowTop(slot.id, event.nativeEvent.layout.y)}>
                        <PanelRow
                          icon={slot.state === 'uploaded' ? 'doc.text.fill' : 'doc.text'}
                          label={documentNameFor(slot, t)}
                          value={failed ? upload.message : documentDetailFor(slot, t)}
                          valueColor={
                            failed
                              ? tokens.signalPending
                              : slot.state === 'uploaded'
                                ? tokens.violet300
                                : undefined
                          }
                          busy={busy}
                          highlighted={focusedSlotId === slot.id}
                          onPress={() => void uploadSlot(slot.id)}
                        />
                      </View>
                    );
                  })}
                  <PanelRow
                    icon="clock"
                    label={t('runzoey.analysisHistory')}
                    value={t('runzoey.viewResults')}
                    onPress={() => router.push('/disputes')}
                    last
                  />
                </GlassPanel>
                </View>

                {/* the reference's quiet closing line, with the claim the app already stands behind */}
                <View className="mt-5 flex-row items-center justify-center gap-1.5 px-6">
                  <IconSymbol name="lock.fill" size={11} color="rgba(228,218,255,0.5)" />
                  <Text
                    className="text-center font-sans text-[12px]"
                    style={{ color: 'rgba(228,218,255,0.5)' }}>
                    {t('hero.privateStorage')}
                  </Text>
                </View>
              </>
            ) : (
              <View className="gap-3">
                {/* The real card, action locked -- a non-member can see what membership turns on. */}
                <ZoeyRunLockedCard />
                {/* Free for every linked client, so it sits outside the paywall here too. */}
                <InterviewEntryCard onOpen={() => router.push('/interview')} />
                <PremiumLockCard
                  icon="doc.text.fill"
                  title={t('documents.title')}
                  blurb={t('documents.blurb')}
                  bullets={[
                    t('documents.lockBullet1'),
                    t('documents.lockBullet2'),
                    t('documents.lockBullet3'),
                  ]}
                />
              </View>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </ScreenBackground>
  );
}
