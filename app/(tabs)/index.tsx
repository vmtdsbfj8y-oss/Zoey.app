import { useRouter } from 'expo-router';
import { useI18n } from '@/lib/i18n/context';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CreditHero } from '@/components/credit/credit-hero';
import {
  CreditHealthSection,
  CreditWorkSection,
  DocumentsLine,
  NotTrackedLine,
  ReportFactorsSection,
  SectionTitle,
  ZoeyInsightSection,
} from '@/components/credit/credit-modules';
import { ProgressGaugeCard } from '@/components/home/progress-gauge-card';
import { ZoeyHeader } from '@/components/home/zoey-header';
import { ScreenBackground } from '@/components/ui/screen-background';
import { ConnectAccountScreen } from '@/components/link/connect-account';
import { MembershipUpsellCard, PremiumLockCard, UnlockCta } from '@/components/premium/premium-lock';
import { tokens } from '@/constants/tokens';
import { useMobileOverview } from '@/hooks/use-mobile-overview';
import { useMobileResults } from '@/hooks/use-mobile-results';
import { useAsync } from '@/hooks/use-async';
import { buildCreditFacts, reportFactors, zoeyInsight } from '@/lib/credit-facts';
import { getEngineScores } from '@/lib/mobile-api';
import { useMembership } from '@/lib/membership-context';

export default function DashboardScreen() {
  const { t } = useI18n();
  const { isPremium, loading } = useMembership();
  const { state, refresh } = useMobileOverview();
  const { state: resultsState } = useMobileResults();
  const { data: scoreData, loading: scoresLoading } = useAsync(
    () => (isPremium ? getEngineScores() : Promise.resolve(undefined)),
    [isPremium]
  );

  const overview = 'state' in state && state.state === 'LINKED' ? state.overview : null;
  const results = 'status' in resultsState && resultsState.status === 'READY' ? resultsState.results : null;
  const router = useRouter();
  const facts = buildCreditFacts({ overview, results });
  const factors = reportFactors(results);
  const insight = zoeyInsight(facts);

  /*
   * One action, and only when the engine says there is one. A button offered on a screen with
   * nothing to do is the fastest way to teach a client that Zoey's prompts are decoration.
   */
  const insightAction = insight.actionRequired || (results?.summary.disputeReady ?? 0) > 0
    ? { label: 'Review disputes', onPress: () => router.push('/(tabs)/disputes') }
    : undefined;

  const checklist = overview?.intake.checklist ?? [];
  const documentsTotal = checklist.length;
  const documentsReceived = checklist.filter((item) => item.status !== 'MISSING').length;

  /*
   * DOCUMENTS LEADS ONLY UNTIL INTAKE IS DONE.
   *
   * A completed checklist at the top of the dashboard is a finished task occupying the position a
   * client opens the app to look at. Credit is what they came for. Once nothing is missing,
   * Documents keeps its place further down as a status module rather than the headline.
   */
  const intakeComplete = Boolean(overview && overview.intake.missingCount === 0);

  /*
   * THE ACCOUNT-CONNECTION GATE.
   *
   * A signed-in client whose Supabase account has not been connected to their credit file yet gets
   * the connect screen instead of a dashboard with nothing in it. That is not an error state --
   * every new account is in it until a specialist issues a code.
   *
   * Deliberately gated HERE rather than around the whole app: Settings, Sign out and Delete
   * account must stay reachable for someone who cannot connect, and wrapping the navigator would
   * have trapped them.
   *
   * `refresh()` re-asks after a successful link, so the screen disappears on its own -- no sign-out
   * and no restart.
   */
  if ('state' in state && state.state === 'NOT_LINKED') {
    return <ConnectAccountScreen onLinked={refresh} />;
  }

  const dashboard = (
    <ScreenBackground idPrefix="dash">
      {/* Only the top edge -- the tab bar already handles the home indicator. */}
      <SafeAreaView edges={['top']} className="flex-1">
        <ZoeyHeader />
        <ScrollView showsVerticalScrollIndicator={false}>
          <View className="px-4 pb-36">
            {'status' in state && state.status === 'LOADING' ? (
              <View className="items-center py-6">
                <ActivityIndicator color={tokens.violet400} />
              </View>
            ) : null}

            {/*
              A service problem is said plainly and offered a retry, rather than being rendered as
              an empty dashboard that looks like the client simply has no data.
            */}
            {'state' in state && state.state === 'UNAVAILABLE' ? (
              <View className="gap-2 rounded-card border border-ink-700 bg-ink-900/60 px-4 py-5">
                <Text className="font-sans-semibold text-[14px] text-parchment">
                  {t('home.loadFailed')}
                </Text>
                <Text className="font-sans text-[12.5px] leading-[18px] text-parchment/55">
                  {state.message}
                </Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t('common.retry')}
                  onPress={refresh}
                  className="mt-1 self-start rounded-full px-4 py-2 active:opacity-85"
                  style={{ backgroundColor: tokens.violet500 }}>
                  <Text className="font-sans-semibold text-[12px] text-parchment">{t('common.retry')}</Text>
                </Pressable>
              </View>
            ) : null}

            {loading ? null : isPremium ? (
              <>
                {/* Intake leads only while something is missing. */}
                {intakeComplete ? null : <ProgressGaugeCard />}

                <CreditHero
                  scores={scoreData?.latest ?? []}
                  reportReceivedAt={facts.reportReceivedAt}
                  loading={scoresLoading}
                  onViewAll={() => router.push('/(tabs)/credit-score')}
                />

                <ZoeyInsightSection {...insight} action={insightAction} />

                <SectionTitle>{t('home.creditHealth')}</SectionTitle>
                <CreditHealthSection facts={facts} />

                <SectionTitle>{t('home.whatsOnReport')}</SectionTitle>
                <ReportFactorsSection factors={factors} />

                <SectionTitle>{t('home.yourCreditWork')}</SectionTitle>
                <CreditWorkSection
                  round={facts.disputeRound}
                  readyForReview={results?.summary.disputeReady ?? null}
                  lettersPrepared={results?.disputes.letters.length ?? 0}
                  onView={() => router.push('/(tabs)/disputes')}
                />

                {/* A finished checklist is a fact worth confirming and nothing more. */}
                {intakeComplete ? (
                  <DocumentsLine
                    received={documentsReceived}
                    total={documentsTotal}
                    onPress={() => router.push('/(tabs)/documents')}
                  />
                ) : null}

                <NotTrackedLine />
              </>
            ) : (
              <>
                {/* Preview, not a blank screen: a free client can see what the
                    full dashboard is before deciding to unlock it. */}
                <MembershipUpsellCard />
                <PremiumLockCard
                  icon="chart.bar.fill"
                  title={t('home.financialMonitoring')}
                  blurb={t('home.financialMonitoringBlurb')}
                  bullets={[
                    'Score changes as each new report is analyzed',
                    'Per-bureau history and trends',
                    'Alerts when something moves',
                  ]}
                />
                <PremiumLockCard
                  icon="chart.line.uptrend.xyaxis"
                  title={t('home.financialInsights')}
                  blurb={t('home.financialInsightsBlurb')}
                  bullets={[
                    'Utilization and account-level detail',
                    'Zoey’s explanation of every change',
                  ]}
                />
                <PremiumLockCard
                  icon="exclamationmark.triangle.fill"
                  title={t('home.disputeRounds')}
                  blurb={t('home.disputeRoundsBlurb')}
                />
                <UnlockCta />
              </>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </ScreenBackground>
  );

  return dashboard;
}
