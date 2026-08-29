import { useMemo, useState } from 'react';
import { useI18n } from '@/lib/i18n/context';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BureauTabs, BUREAU_ORDER, type BureauKey } from '@/components/credit/bureau-tabs';
import {
  CreditHealthSection,
  NotTrackedLine,
  ReportFactorsSection,
  ScoreHistorySection,
  SectionTitle,
  ZoeyInsightSection,
} from '@/components/credit/credit-modules';
import { ScoreGauge } from '@/components/credit/score-gauge';
import { ErrorState, LoadingState } from '@/components/more/states';
import { PremiumLockCard } from '@/components/premium/premium-lock';
import { ScreenBackground } from '@/components/ui/screen-background';
import { useAsync } from '@/hooks/use-async';
import { useMobileOverview } from '@/hooks/use-mobile-overview';
import { useMobileResults } from '@/hooks/use-mobile-results';
import { buildCreditFacts, reportFactors, zoeyInsight } from '@/lib/credit-facts';
import { useMembership } from '@/lib/membership-context';
import { getEngineScores } from '@/lib/mobile-api';

/**
 * Credit Score -- one bureau at a time, with room to breathe.
 *
 * The bureaus are separate readings on separate data, so the screen shows one and never blends
 * them. All three tabs stay visible including bureaus with no score: hiding those would say Zoey
 * checks fewer bureaus than she does, when the truth is the report printed nothing.
 *
 * Every number is the engine's. Nothing here computes a change, a percentage, a trend or a
 * scoring reason -- see `lib/credit-facts.ts` for what is deliberately absent and why it is named.
 */
export default function CreditScoreScreen() {
  const { t } = useI18n();
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
  const factors = useMemo(() => reportFactors(results), [results]);
  const insight = zoeyInsight(facts);

  const byBureau = useMemo(() => new Map((data?.latest ?? []).map((row) => [row.bureau as BureauKey, row])), [data]);
  const available = useMemo(
    () => Object.fromEntries(BUREAU_ORDER.map((bureau) => [bureau, byBureau.has(bureau)])) as Record<BureauKey, boolean>,
    [byBureau]
  );

  const firstWithScore = BUREAU_ORDER.find((bureau) => available[bureau]) ?? 'TransUnion';
  const [selected, setSelected] = useState<BureauKey | null>(null);
  const active = selected ?? firstWithScore;
  const row = byBureau.get(active) ?? null;
  const history = (data?.history ?? []).find((entry) => entry.bureau === active)?.entries ?? [];

  return (
    <ScreenBackground idPrefix="score" floor>
      <SafeAreaView edges={['top']} className="flex-1">
        <View className="px-5 pb-2 pt-2">
          <Text className="font-display text-[26px] text-parchment">{t('score.title')}</Text>
        </View>

        <ScrollView showsVerticalScrollIndicator={false}>
          <View className="px-4 pb-36">
            {membershipLoading ? null : !isPremium ? (
              <PremiumLockCard
                icon="chart.bar.fill"
                title={t('score.title')}
                blurb={t('score.blurb')}
                bullets={[
                  'TransUnion, Experian and Equifax side by side',
                  'Change tracked against your own earlier reports',
                  'Updated each time Zoey analyzes a new report',
                ]}
              />
            ) : (
              <>
                {loading ? <LoadingState label={t('score.checking')} /> : null}
                {!loading && error ? <ErrorState message={error} onRetry={retry} /> : null}

                {!loading && !error && data ? (
                  <>
                    <View className="mt-1">
                      <BureauTabs selected={active} available={available} onSelect={setSelected} />
                    </View>

                    {/* One score, large, on open space. No card around it. */}
                    <View className="items-center pb-2 pt-7">
                      <ScoreGauge score={row?.score ?? null} model={row?.model ?? null} />
                      <Text className="mt-4 font-sans-medium text-[18px] text-parchment">{active}</Text>
                      {row ? (
                        <Text className="mt-1 font-sans text-[14px] text-parchment/45">
                          From your report ·{' '}
                          {new Date(row.reportReceivedAt ?? row.capturedAt).toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </Text>
                      ) : null}
                    </View>

                    <SectionTitle>{t('home.creditHealth')}</SectionTitle>
                    <CreditHealthSection facts={facts} />

                    <SectionTitle>{t('home.whatsOnReport')}</SectionTitle>
                    <ReportFactorsSection factors={factors} />

                    <SectionTitle>{t('score.zoeyInsight')}</SectionTitle>
                    <ZoeyInsightSection {...insight} />

                    <SectionTitle>{t('score.history')}</SectionTitle>
                    <ScoreHistorySection entries={history} />

                    <SectionTitle>{t('score.reportDetails')}</SectionTitle>
                    <ReportDetails
                      model={row?.model ?? null}
                      reportReceivedAt={row?.reportReceivedAt ?? null}
                      sourceFormat={overview?.report.sourceFormat ?? null}
                      bureausWithScores={BUREAU_ORDER.filter((bureau) => available[bureau]).length}
                    />

                    <NotTrackedLine />
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

/** Where the number came from. Honest about the common case: most reports name no model. */
function ReportDetails({
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
  const { t } = useI18n();
  const rows: [string, string][] = [
    ['Scoring model', model ?? 'Not named on your report'],
    [
      'Report received',
      reportReceivedAt
        ? new Date(reportReceivedAt).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })
        : 'Not available',
    ],
    [
      t('score.formatLabel'),
      sourceFormat === 'IDENTITYIQ_HTML'
        ? t('score.formatIdentityIq')
        : sourceFormat === 'PDF'
          ? 'PDF' /* A file format, not copy. */
          : t('common.unavailable'),
    ],
    ['Bureaus with a score', `${bureausWithScores} of 3`],
  ];

  return (
    <View style={{ backgroundColor: 'rgba(138,106,214,0.045)', borderRadius: 26, borderWidth: 1, borderColor: 'rgba(198,166,255,0.13)' }} className="mt-3 overflow-hidden">
      {rows.map(([label, value], index) => (
        <View
          key={label}
          className="flex-row items-center justify-between px-5 py-4"
          style={index === rows.length - 1 ? undefined : { borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.055)' }}>
          <Text className="font-sans text-[15px] text-parchment/55">{label}</Text>
          <Text className="max-w-[56%] text-right font-sans-medium text-[15px] text-parchment/85">{value}</Text>
        </View>
      ))}
    </View>
  );
}
