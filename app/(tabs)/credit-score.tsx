import { useMemo, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BureauTabs, BUREAU_ORDER, type BureauKey } from '@/components/credit/bureau-tabs';
import {
  AffectingCard,
  CreditHealthCard,
  DisputeProgressCard,
  NotYetTrackedCard,
  ScoreHistoryCard,
  SectionHeading,
  ZoeyInsightCard,
} from '@/components/credit/credit-modules';
import { ScoreGauge } from '@/components/credit/score-gauge';
import { ErrorState, LoadingState } from '@/components/more/states';
import { PremiumLockCard } from '@/components/premium/premium-lock';
import { GlassSurface } from '@/components/ui/glass-surface';
import { ScreenBackground } from '@/components/ui/screen-background';
import { useAsync } from '@/hooks/use-async';
import { useMobileOverview } from '@/hooks/use-mobile-overview';
import { useMobileResults } from '@/hooks/use-mobile-results';
import { buildCreditFacts, zoeyInsight } from '@/lib/credit-facts';
import { useMembership } from '@/lib/membership-context';
import { getEngineScores } from '@/lib/mobile-api';

/**
 * Credit Score -- the premium bureau-by-bureau view.
 *
 * ==============================  ONE BUREAU AT A TIME  ==============================
 *
 * Three stacked cards gave equal weight to three numbers and made none of them legible. A selector
 * with one large score is the honest shape for this data: the bureaus are genuinely separate
 * readings on separate data, so the screen shows one at a time and never combines them.
 *
 * All three tabs are always present, including bureaus with no score. Hiding those would say Zoey
 * checks fewer bureaus than she does; showing them says the report printed nothing, which is a fact
 * the client owns.
 *
 * ==============================  EVERY NUMBER IS THE ENGINE'S  ==============================
 *
 * The score, the report date, the account counts, Zoey's line -- all read from canonical payloads.
 * Nothing here computes a change, a percentage, a trend or a scoring reason. See
 * `lib/credit-facts.ts` for what is deliberately absent and why it is named rather than hidden.
 */
export default function CreditScoreScreen() {
  const { isPremium, loading: membershipLoading } = useMembership();
  const { data, error, loading, retry } = useAsync(
    () => (isPremium ? getEngineScores() : Promise.resolve(undefined)),
    [isPremium]
  );
  const { state: overviewState } = useMobileOverview();
  const { state: resultsState } = useMobileResults();

  const overview = 'state' in overviewState && overviewState.state === 'LINKED' ? overviewState.overview : null;
  const results = 'status' in resultsState && resultsState.status === 'READY' ? resultsState.results : null;
  const facts = useMemo(() => buildCreditFacts({ overview, results }), [overview, results]);
  const insight = zoeyInsight(facts);

  const byBureau = useMemo(() => new Map((data?.latest ?? []).map((row) => [row.bureau as BureauKey, row])), [data]);
  const available = useMemo(
    () => Object.fromEntries(BUREAU_ORDER.map((bureau) => [bureau, byBureau.has(bureau)])) as Record<BureauKey, boolean>,
    [byBureau]
  );

  /*
   * Opens on the first bureau that actually has a score, so the screen does not greet a client with
   * "Unavailable" when two of their three bureaus reported one.
   */
  const firstWithScore = BUREAU_ORDER.find((bureau) => available[bureau]) ?? 'TransUnion';
  const [selected, setSelected] = useState<BureauKey | null>(null);
  const active = selected ?? firstWithScore;
  const row = byBureau.get(active) ?? null;

  const history = (data?.history ?? []).find((entry) => entry.bureau === active)?.entries ?? [];

  return (
    <ScreenBackground idPrefix="score">
      <SafeAreaView edges={['top']} className="flex-1">
        <View className="px-4 pb-3 pt-1">
          <Text className="font-display text-[22px] text-parchment">Credit Score</Text>
        </View>

        <ScrollView showsVerticalScrollIndicator={false}>
          <View className="gap-3 px-4 pb-32 pt-1">
            {membershipLoading ? null : !isPremium ? (
              <PremiumLockCard
                icon="chart.bar.fill"
                title="Credit Score"
                blurb="Scores from your analyzed reports, by bureau"
                bullets={[
                  'TransUnion, Experian and Equifax side by side',
                  'Change tracked against your own earlier reports',
                  'Updated each time Zoey analyzes a new report',
                ]}
              />
            ) : (
              <>
                {loading ? <LoadingState label="Checking your reports…" /> : null}
                {!loading && error ? <ErrorState message={error} onRetry={retry} /> : null}

                {!loading && !error && data ? (
                  <>
                    <BureauTabs selected={active} available={available} onSelect={setSelected} />

                    {/* The selected bureau, large. One number, its own scale, nothing blended. */}
                    <GlassSurface radius={26} glow={Boolean(row)}>
                      <View className="items-center px-4 pb-4 pt-5">
                        <ScoreGauge score={row?.score ?? null} model={row?.model ?? null} />
                        <Text className="mt-3 font-sans-semibold text-[14px] text-parchment">{active}</Text>
                        {row ? (
                          <Text className="mt-0.5 font-sans text-[11.5px] text-parchment/45">
                            From your report ·{' '}
                            {new Date(row.reportReceivedAt ?? row.capturedAt).toLocaleDateString(undefined, {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })}
                          </Text>
                        ) : null}
                      </View>
                    </GlassSurface>

                    <Text className="px-1 font-sans text-[11.5px] leading-[16px] text-parchment/40">
                      Each bureau scores its own data with its own model. Zoey shows them separately
                      and never averages them.
                    </Text>

                    <SectionHeading icon="chart.bar.fill">Credit health</SectionHeading>
                    <CreditHealthCard facts={facts} />

                    <SectionHeading icon="doc.text">What&apos;s affecting your credit</SectionHeading>
                    <AffectingCard facts={facts} />

                    <SectionHeading icon="sparkles">Zoey insight</SectionHeading>
                    <ZoeyInsightCard {...insight} />

                    <SectionHeading icon="chart.line.uptrend.xyaxis">Score history</SectionHeading>
                    <ScoreHistoryCard entries={history} />

                    <SectionHeading icon="doc.text">Report details</SectionHeading>
                    <ReportDetailsCard
                      model={row?.model ?? null}
                      reportReceivedAt={row?.reportReceivedAt ?? null}
                      sourceFormat={overview?.report.sourceFormat ?? null}
                      bureausWithScores={BUREAU_ORDER.filter((bureau) => available[bureau]).length}
                    />

                    <NotYetTrackedCard />

                    {facts.disputeRound > 0 || overview ? (
                      <DisputeProgressCard round={facts.disputeRound} state={overview?.disputes.state ?? 'NONE'} />
                    ) : null}
                  </>
                ) : null}
              </>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </ScreenBackground>
  );
}

/**
 * Where the number came from.
 *
 * The model line is honest about the common case: most reports do not name their scoring model,
 * and saying so is better than leaving a blank that invites a guess.
 */
function ReportDetailsCard({
  model,
  reportReceivedAt,
  sourceFormat,
  bureausWithScores,
}: {
  model: string | null;
  reportReceivedAt: number | null;
  sourceFormat: string | null;
  bureausWithScores: number;
}) {
  const rows: [string, string][] = [
    ['Scoring model', model ?? 'Not named on your report'],
    [
      'Report received',
      reportReceivedAt
        ? new Date(reportReceivedAt).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })
        : 'Not available',
    ],
    ['Report format', sourceFormat === 'IDENTITYIQ_HTML' ? 'IdentityIQ export' : sourceFormat === 'PDF' ? 'PDF' : 'Not available'],
    ['Bureaus with a score', `${bureausWithScores} of 3`],
  ];

  return (
    <GlassSurface radius={22}>
      <View className="p-4">
        {rows.map(([label, value], index) => (
          <View
            key={label}
            className="flex-row items-center justify-between py-2"
            style={index > 0 ? { borderTopWidth: 1, borderTopColor: 'rgba(168,85,247,0.10)' } : undefined}>
            <Text className="font-sans text-[12.5px] text-parchment/55">{label}</Text>
            <Text className="max-w-[58%] text-right font-sans-medium text-[12.5px] text-parchment/85">{value}</Text>
          </View>
        ))}
      </View>
    </GlassSurface>
  );
}
