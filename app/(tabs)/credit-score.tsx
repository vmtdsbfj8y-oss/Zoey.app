import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EmptyState, ErrorState, InfoNote, LoadingState, SectionLabel } from '@/components/more/states';
import { PremiumLockCard } from '@/components/premium/premium-lock';
import { GlassSurface } from '@/components/ui/glass-surface';
import { ScreenBackground } from '@/components/ui/screen-background';
import { tokens } from '@/constants/tokens';
import { getEngineScores } from '@/lib/mobile-api';
import { useAsync } from '@/hooks/use-async';
import { type BureauScore, type Scores } from '@/lib/account-api';
import { useMembership } from '@/lib/membership-context';

const BUREAU_ORDER = ['TransUnion', 'Experian', 'Equifax'] as const;

function formatDate(ms: number) {
  return new Date(ms).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * One bureau's card.
 *
 * Change is computed only against a previous reading FROM THE SAME BUREAU. A
 * delta across bureaus, or across scoring models, would be meaningless -- the
 * numbers are not on the same scale.
 */
function BureauCard({ latest, history }: { latest: BureauScore; history: Scores['history'][number] | undefined }) {
  const entries = history?.entries ?? [];
  const previous = entries.length > 1 ? entries[entries.length - 2] : undefined;
  const delta = previous ? latest.score - previous.score : undefined;

  const deltaColor =
    delta === undefined
      ? undefined
      : delta > 0
        ? tokens.signalReceived
        : delta < 0
          ? tokens.signalPending
          : 'rgba(244,239,255,0.5)';

  return (
    <GlassSurface radius={20} glow>
      <View className="p-3.5">
        <View className="flex-row items-center justify-between">
          <Text className="font-sans-semibold text-[14px] text-parchment">{latest.bureau}</Text>
          {latest.model ? (
            <View
              className="rounded-full px-2 py-0.5"
              style={{ backgroundColor: 'rgba(168,85,247,0.16)' }}>
              <Text className="font-sans text-[10px]" style={{ color: tokens.violet300 }}>
                {latest.model}
              </Text>
            </View>
          ) : null}
        </View>

        <View className="mt-1 flex-row items-baseline gap-2">
          <Text className="font-display text-[34px] leading-[40px]" style={{ color: tokens.violet300 }}>
            {latest.score}
          </Text>
          {delta !== undefined ? (
            <Text className="font-sans-semibold text-[13px]" style={{ color: deltaColor }}>
              {delta > 0 ? '+' : ''}
              {delta} pts
            </Text>
          ) : null}
        </View>

        <Text className="mt-0.5 font-sans text-[11.5px] text-parchment/45">
          From your report · {formatDate(latest.capturedAt)}
        </Text>

        {entries.length > 1 ? (
          <View className="mt-3">
            <Text className="mb-1 font-sans text-[11px] uppercase tracking-wide text-parchment/40">
              History
            </Text>
            {entries
              .slice()
              .reverse()
              .slice(0, 5)
              .map((e) => (
                <View
                  key={`${e.capturedAt}-${e.score}`}
                  className="flex-row items-center justify-between py-1">
                  <Text className="font-sans text-[12px] text-parchment/55">
                    {formatDate(e.capturedAt)}
                  </Text>
                  <Text className="font-mono text-[12px] text-parchment/80">{e.score}</Text>
                </View>
              ))}
          </View>
        ) : (
          <Text className="mt-2 font-sans text-[11.5px] text-parchment/40">
            History will build as you upload newer reports.
          </Text>
        )}
      </View>
    </GlassSurface>
  );
}

/**
 * Credit Score, now a bottom tab rather than a row inside More.
 *
 * THE ENTITLEMENT RULE IS UNCHANGED. More used to send a free client to
 * /membership instead of here; a tab cannot redirect on arrival without the
 * screen flashing first, so the same rule is expressed the way Documents
 * already expresses it -- the feature stays visible and named, and the data
 * behind it stays locked. No score is fetched for a free client: `useAsync`
 * runs, but the locked branch is chosen before any of it is rendered, and the
 * request is skipped entirely.
 *
 * A tab is also a screen in its own right now, so it owns its header and its
 * top safe area -- the root Stack no longer supplies either.
 */
export default function CreditScoreScreen() {
  const { isPremium, loading: membershipLoading } = useMembership();
  const { data, error, loading, retry } = useAsync(
    () => (isPremium ? getEngineScores() : Promise.resolve(undefined)),
    [isPremium]
  );

  const ordered = data?.latest
    .slice()
    .sort((a, b) => BUREAU_ORDER.indexOf(a.bureau) - BUREAU_ORDER.indexOf(b.bureau));

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
            ordered && ordered.length > 0 ? (
              <>
                <SectionLabel>By bureau</SectionLabel>
                {ordered.map((s) => (
                  <BureauCard
                    key={s.bureau}
                    latest={s}
                    history={data.history.find((h) => h.bureau === s.bureau)}
                  />
                ))}
                <InfoNote>
                  These scores come from the reports you uploaded, not from a live bureau
                  connection. Each bureau is shown on its own — they use different models and
                  aren&apos;t averaged together.
                </InfoNote>
              </>
            ) : (
              <>
                <EmptyState
                  icon="chart.bar.fill"
                  title="No credit score available yet"
                  body="Zoey shows scores read from your credit report. Upload a supported report and run the analysis, and your scores will appear here by bureau."
                />
                <InfoNote>
                  {data.extractionAvailable
                    ? 'No scores were found in the reports analyzed so far.'
                    : "Reading scores out of uploaded reports isn't switched on yet, so Zoey has no score to show. She won't estimate one."}
                </InfoNote>
              </>
            )
          ) : null}
            </>
          )}
        </View>
      </ScrollView>
      </SafeAreaView>
    </ScreenBackground>
  );
}
