import { useState } from 'react';
import { useI18n } from '@/lib/i18n/context';
import { Pressable, Text, View } from 'react-native';

import { GlassSurface } from '@/components/ui/glass-surface';
import { tokens } from '@/constants/tokens';
import type { MobileAccountResult, MobileResults } from '@/lib/mobile-results';

/**
 * The Disputes tab as a case command centre.
 *
 * ==============================  WHAT WAS WRONG  ==============================
 *
 * Everything the engine knew was rendered as one flat feed of near-identical full-height cards:
 * prepared disputes, evidence holds, preserved accounts and the whole thirteen-account report
 * review, in no particular order, each repeating "More information is needed before this can move
 * forward." A client had to read fifteen cards to learn what was happening, and the cards led with
 * ACCOUNT, COLLECTION and INSTALLMENT rather than the name of the creditor.
 *
 * The information was right. The presentation made a paid product look like engine output.
 *
 * ==============================  THE RULE  ==============================
 *
 * Every target appears in exactly ONE section, chosen from its canonical outcome. A row cannot be
 * an active dispute and an evidence hold at once, and the section header carries the meaning so the
 * cards underneath do not each have to repeat it in orange.
 */

/** One target belongs to exactly one of these. Derived from the engine's outcome, never guessed. */
type Section = 'ACTIVE' | 'INQUIRY' | 'EVIDENCE' | 'PRESERVE' | 'REVIEWED';

function sectionFor(account: MobileAccountResult): Section {
  if (account.outcome === 'NEEDS_EVIDENCE' || account.outcome === 'NEEDS_YOUR_CONFIRMATION') return 'EVIDENCE';
  if (account.outcome === 'PRESERVE_ACCOUNT') return 'PRESERVE';
  if (account.outcome === 'DELETION_FOCUSED' || account.outcome === 'DISPUTE_READY') {
    // The inquiry lane is a dispute, but not about an account, and reads better on its own.
    return account.target === 'Inquiry dispute' ? 'INQUIRY' : 'ACTIVE';
  }
  return 'REVIEWED';
}

/** Compact numbers for the current round. Chips, not cards -- they are a glance, not a read. */
function Metric({ value, label }: { value: number; label: string }) {
  return (
    <View className="min-w-[74px]">
      <Text className="font-display text-[20px] text-parchment">{value}</Text>
      <Text className="font-sans text-[10.5px] leading-[14px] text-parchment/50">{label}</Text>
    </View>
  );
}

export function CurrentRoundHero({ results }: { results: MobileResults }) {
  const { t } = useI18n();
  const grouped = results.accounts.map(sectionFor);
  /*
   * COUNTS A PERSON CAN CHECK BY COUNTING THE CARDS.
   *
   * "Total targets" said 2 while four documents were prepared, because it counted deletion
   * disputes and inquiries and quietly excluded the two reporting corrections -- which are real
   * current-round disputes with real letters. A number nobody can reconcile with what is on screen
   * is worse than no number.
   *
   * Each metric now maps to exactly one visible section, and the total is their sum. Needs-evidence
   * is deliberately NOT in it: that work is held, not being pursued this round, and folding it in
   * would inflate the count with items that have no document behind them.
   */
  const deletionDisputes = grouped.filter((s) => s === 'ACTIVE').length;
  const reportingCorrections = grouped.filter((s) => s === 'PRESERVE').length;
  const inquiryDisputes = grouped.filter((s) => s === 'INQUIRY').length;
  const activeActions = deletionDisputes + reportingCorrections + inquiryDisputes;
  const held = results.clientState?.documentsHeld ?? 0;

  return (
    <GlassSurface radius={22} glow={results.clientState?.clientActionRequired === true}>
      <View className="gap-3 p-4">
        <Text className="font-sans text-[10.5px] uppercase tracking-[0.14em] text-parchment/45">{t('results.currentRound')}</Text>

        <View className="flex-row flex-wrap gap-x-5 gap-y-3">
          <Metric value={deletionDisputes} label={t('results.deletionDisputes')} />
          <Metric value={reportingCorrections} label={t('results.reportingCorrections')} />
          <Metric value={inquiryDisputes} label={t('results.inquiryDisputes')} />
          <Metric value={activeActions} label={t('results.activeDisputeActions')} />
        </View>

        {/*
          Documents are counted separately from actions on purpose: one action may produce more
          than one document, so equating them would eventually be a lie in one direction or the
          other. Both come from canonical data -- the packet's own letters, and the engine's held
          count -- never inferred from the sections above.
        */}
        <View className="flex-row flex-wrap gap-x-5 gap-y-2 border-t border-white/8 pt-3">
          <Metric value={results.disputes.letters.length} label={t('results.preparedDocuments')} />
          <Metric value={held} label={t('results.documentsHeld')} />
        </View>

        {/* The single canonical state. Nothing else on the screen states a page-level status. */}
        {results.clientState ? (
          <View className="gap-0.5 border-t border-white/8 pt-3">
            <Text
              className="font-sans-semibold text-[13.5px]"
              style={{ color: results.clientState.clientActionRequired ? tokens.violet300 : tokens.parchment }}
            >
              {results.clientState.headline}
            </Text>
            <Text className="font-sans text-[12px] leading-[17px] text-parchment/60">{results.clientState.detail}</Text>
          </View>
        ) : null}
      </View>
    </GlassSurface>
  );
}

/** The one thing the client is being asked to do, if anything. Absent when nothing is required. */
export function ClientActionCard({
  results,
  onReviewAndSign,
  signatureOpen,
}: {
  results: MobileResults;
  onReviewAndSign: () => void;
  signatureOpen: boolean;
}) {
  const { t } = useI18n();
  const state = results.clientState;
  if (!state?.signatureAvailable || signatureOpen) return null;

  return (
    <GlassSurface radius={22} glow>
      <View className="gap-2 p-4">
        <Text className="font-display text-[17px] text-parchment">{t('results.disputesReady')}</Text>
        <Text className="font-sans text-[12.5px] leading-[18px] text-parchment/60">
          {t('results.disputesReadyBody')}
        </Text>
        <Text className="font-sans text-[11.5px] text-parchment/45">
          Prepared documents ({results.disputes.letters.length})
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('results.a11yReviewSign')}
          onPress={onReviewAndSign}
          className="mt-1 items-center rounded-full py-3.5 active:opacity-85"
          style={{ backgroundColor: tokens.violet500 }}
        >
          <Text className="font-sans-semibold text-[13px] tracking-[0.06em] text-parchment">{t('results.reviewAndSign')}</Text>
        </Pressable>
      </View>
    </GlassSurface>
  );
}

const STATUS_TONE: Record<string, string> = {
  'Dispute prepared': tokens.violet300,
  'Waiting for supporting information': tokens.parchment,
  'Waiting on your answer': tokens.signalPending,
};

/**
 * One target, compactly.
 *
 * Creditor first, always -- it is the only thing that tells someone which of their accounts this
 * is. Target and current step are the engine's two axes, shown as a pill rather than a paragraph.
 */
function TargetCard({ account }: { account: MobileAccountResult }) {
  const { t } = useI18n();
  const bureaus = account.bureaus.filter(Boolean);
  const status = account.currentStep ?? null;

  return (
    <GlassSurface radius={18}>
      <View className="gap-1.5 p-3.5">
        <View className="flex-row items-center justify-between gap-3">
          <Text className="flex-1 font-sans-semibold text-[14px] text-parchment" numberOfLines={1}>
            {account.creditor}
          </Text>
          {/* Last four only. The full number is never projected to the device at all. */}
          {account.accountMask ? (
            <Text className="font-mono text-[11.5px] text-parchment/45">{account.accountMask}</Text>
          ) : null}
        </View>

        {bureaus.length > 0 ? (
          <View className="flex-row flex-wrap gap-1.5">
            {bureaus.map((bureau) => (
              <View key={bureau} className="rounded-full border border-white/12 px-2 py-0.5">
                <Text className="font-sans text-[10px] uppercase tracking-wider text-parchment/55">{bureau}</Text>
              </View>
            ))}
          </View>
        ) : null}

        {account.target ? (
          <Text className="font-sans text-[12px] text-parchment/70">
            {t('results.target')} <Text className="text-parchment/90">{account.target}</Text>
          </Text>
        ) : null}

        {status ? (
          <Text className="font-sans text-[12px]" style={{ color: STATUS_TONE[status] ?? tokens.parchment }}>
            {status}
          </Text>
        ) : null}
      </View>
    </GlassSurface>
  );
}

function SectionHeader({ title, count }: { title: string; count: number }) {
  return (
    <View className="flex-row items-baseline justify-between px-1 pt-1">
      <Text className="font-sans text-[10.5px] uppercase tracking-[0.14em] text-parchment/45">{title}</Text>
      <Text className="font-sans text-[11px] text-parchment/35">{count}</Text>
    </View>
  );
}

/**
 * The sections, in the order a client cares about them.
 *
 * The report review is collapsed by default: thirteen analysed accounts are real and useful, and
 * they are not what this tab is for. What Zoey is doing NOW comes first.
 */
export function DisputeSections({ results }: { results: MobileResults }) {
  const { t } = useI18n();
  const [showReview, setShowReview] = useState(false);

  const buckets: Record<Section, MobileAccountResult[]> = { ACTIVE: [], INQUIRY: [], EVIDENCE: [], PRESERVE: [], REVIEWED: [] };
  for (const account of results.accounts) buckets[sectionFor(account)].push(account);

  const summary = results.summary;
  const hasWork =
    buckets.ACTIVE.length + buckets.INQUIRY.length + buckets.EVIDENCE.length + buckets.PRESERVE.length > 0 ||
    results.disputes.letters.length > 0;

  return (
    <View className="gap-3">
      {buckets.ACTIVE.length > 0 ? (
        <>
          <SectionHeader title={t('results.deletionDisputes')} count={buckets.ACTIVE.length} />
          {buckets.ACTIVE.map((a, i) => (
            <TargetCard key={`active-${a.creditor}-${i}`} account={a} />
          ))}
        </>
      ) : null}

      {buckets.INQUIRY.length > 0 ? (
        <>
          <SectionHeader title={t('results.inquiryDisputes')} count={buckets.INQUIRY.length} />
          {buckets.INQUIRY.map((a, i) => (
            <TargetCard key={`inq-${a.creditor}-${i}`} account={a} />
          ))}
        </>
      ) : null}

      {buckets.PRESERVE.length > 0 ? (
        <>
          <SectionHeader title={t('results.correctNegative')} count={buckets.PRESERVE.length} />
          {buckets.PRESERVE.map((a, i) => (
            <TargetCard key={`pres-${a.creditor}-${i}`} account={a} />
          ))}
        </>
      ) : null}

      {buckets.EVIDENCE.length > 0 ? (
        <>
          {/*
            The header carries the meaning, so the cards do not each repeat a warning. Work Zoey and
            Pinnacle are doing is not the same thing as a demand on the client.
          */}
          <SectionHeader title={t('results.needsEvidence')} count={buckets.EVIDENCE.length} />
          {buckets.EVIDENCE.map((a, i) => (
            <TargetCard key={`ev-${a.creditor}-${i}`} account={a} />
          ))}
        </>
      ) : null}

      {/* Report-level analysis, collapsed. Real, and not what this tab is for. */}
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: showReview }}
        onPress={() => setShowReview((v) => !v)}
        className="mt-1 active:opacity-80"
      >
        <GlassSurface radius={18}>
          <View className="flex-row items-center justify-between p-3.5">
            <View className="gap-0.5">
              <Text className="font-sans text-[10.5px] uppercase tracking-[0.14em] text-parchment/45">{t('results.reportReview')}</Text>
              <Text className="font-sans text-[12.5px] text-parchment/75">
                {summary.accountsReviewed} accounts reviewed · {summary.problemAccounts} negative
              </Text>
            </View>
            <Text className="font-sans text-[12px] text-parchment/50">{showReview ? t('results.hide') : t('results.view')}</Text>
          </View>
        </GlassSurface>
      </Pressable>

      {showReview && buckets.REVIEWED.length > 0
        ? buckets.REVIEWED.map((a, i) => <TargetCard key={`rev-${a.creditor}-${i}`} account={a} />)
        : null}

      {/*
        The genuine empty state, and only the genuine one. The old screen rendered "No active
        disputes yet" from a hardcoded local array that was never populated, so it appeared
        underneath prepared disputes.
      */}
      {!hasWork ? (
        <GlassSurface radius={22}>
          <View className="p-4">
            <Text className="font-sans-semibold text-[14px] text-parchment">{t('results.nothingYet')}</Text>
            <Text className="mt-1 font-sans text-[12.5px] leading-[18px] text-parchment/60">
              {t('results.nothingYetBody')}
            </Text>
          </View>
        </GlassSurface>
      ) : null}
    </View>
  );
}
