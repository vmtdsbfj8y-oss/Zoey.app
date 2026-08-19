import { Text, View } from 'react-native';

import { Card } from '@/components/ui/card';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { tokens } from '@/constants/tokens';
import { getEngineScores } from '@/lib/mobile-api';
import { useAsync } from '@/hooks/use-async';

/**
 * SCORES ON THE DASHBOARD, FROM THE ONE PLACE SCORES CAN COME FROM.
 *
 * ==========================  WHAT THIS REPLACED  ==========================
 *
 * This card used to render `creditScores` from `lib/placeholder-data.ts`:
 * Equifax 682 (+56), Experian 671 (+43), a six-month history and a line chart
 * drawn through invented points. None of it came from anywhere. Meanwhile the
 * Credit Score tab -- reading the real endpoint -- correctly reported that no
 * score exists yet.
 *
 * So the app told one user two different things in one session, and the
 * fabricated one was the more prominent. A number a client might repeat to a
 * lender, or make a decision on, was made up for layout purposes.
 *
 * ==========================  WHY IT READS THE API RATHER THAN A CONSTANT  ==========================
 *
 * Replacing the fake numbers with a hard-coded "no data" card would fix today
 * and be wrong again the day extraction lands. Both surfaces now read
 * `getEngineScores()`, so they cannot disagree by construction -- the contradiction
 * is removed rather than papered over, and this card starts working on its own
 * the moment a real score is written.
 *
 * `/api/scores` returns only readings extracted from an analyzed report and
 * withholds them entirely from a non-member. Today that is always empty,
 * because the analyzer is a stub that reads no documents. Nothing here
 * estimates, averages or blends a score, and there is no chart: a trend needs
 * at least two real readings and there are none.
 */
const BUREAU_ORDER = ['TransUnion', 'Experian', 'Equifax'] as const;

export function CreditScoreCard() {
  const { data, error, loading } = useAsync(() => getEngineScores(), []);

  /*
   * All three bureaus, always. Listing only the ones with a number makes a report that printed a
   * single score look like Zoey checks a single bureau, and the dashboard is exactly where that
   * misreading would stick.
   */
  const byBureau = new Map((data?.latest ?? []).map((row) => [row.bureau, row] as const));
  const allBureaus = BUREAU_ORDER.map((bureau) => ({ bureau, score: byBureau.get(bureau) ?? null }));
  const hasScores = allBureaus.some((entry) => entry.score !== null);

  return (
    <Card glowId="glowCredit">
      <View className="flex-row items-center justify-between gap-3">
        <Text className="font-display text-[15px] text-parchment">Score Overview</Text>
        <IconSymbol name="chart.line.uptrend.xyaxis" size={18} color={tokens.violet400} />
      </View>

      {loading ? (
        <Text className="mt-4 font-sans text-[13px] text-parchment/45">Checking your reports…</Text>
      ) : hasScores ? (
        <View className="mt-3 gap-2.5">
          {allBureaus.map((entry) => (
            <View key={entry.bureau} className="flex-row items-baseline justify-between">
              <Text className="font-sans text-[13px] text-parchment/70">{entry.bureau}</Text>
              {entry.score ? (
                <View className="flex-row items-baseline gap-1.5">
                  <Text className="font-display text-[22px] leading-[26px] text-parchment">
                    {entry.score.score}
                  </Text>
                  {entry.score.model ? (
                    <Text className="font-sans text-[11px] text-parchment/45">{entry.score.model}</Text>
                  ) : null}
                </View>
              ) : (
                /* Words, never a dash or a zero: "unavailable" and "low" must not look alike. */
                <Text className="font-sans text-[12.5px] text-parchment/40">Unavailable</Text>
              )}
            </View>
          ))}
          <Text className="mt-1 font-sans text-[11.5px] leading-[16px] text-parchment/45">
            Read from your analyzed report. Each bureau is shown on its own — they use different
            models and are never averaged.
          </Text>
        </View>
      ) : (
        <View className="mt-3">
          <Text className="font-display text-[17px] leading-[22px] text-parchment/80">
            No score available yet
          </Text>
          <Text className="mt-1.5 font-sans text-[12.5px] leading-[18px] text-parchment/50">
            {/*
              The reason is genuinely different in each case, and saying the
              wrong one sends someone to do work that will not help. An error is
              not the same as an empty result.
            */}
            {error
              ? 'Zoey could not check your scores just now.'
              : data && !data.extractionAvailable
                ? 'Zoey shows scores read from your credit report. Your report did not print one she could read, and she will not estimate it.'
                : 'Upload a current report and run the analysis. Any score Zoey can read will appear here by bureau.'}
          </Text>
        </View>
      )}
    </Card>
  );
}
