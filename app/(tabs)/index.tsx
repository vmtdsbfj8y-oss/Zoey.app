import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CreditScoreCard } from '@/components/home/credit-score-card';
import { DisputeRoundsCard } from '@/components/home/dispute-rounds-card';
import { ProgressGaugeCard } from '@/components/home/progress-gauge-card';
import { ZoeyHeader } from '@/components/home/zoey-header';
import { ScreenBackground } from '@/components/ui/screen-background';
import { ConnectAccountScreen } from '@/components/link/connect-account';
import { MembershipUpsellCard, PremiumLockCard, UnlockCta } from '@/components/premium/premium-lock';
import { tokens } from '@/constants/tokens';
import { useMobileOverview } from '@/hooks/use-mobile-overview';
import { useMembership } from '@/lib/membership-context';

export default function DashboardScreen() {
  const { isPremium, loading } = useMembership();
  const { state, refresh } = useMobileOverview();

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

  return (
    <ScreenBackground idPrefix="dash">
      {/* Only the top edge -- the tab bar already handles the home indicator. */}
      <SafeAreaView edges={['top']} className="flex-1">
        <ZoeyHeader />
        <ScrollView showsVerticalScrollIndicator={false}>
          <View className="gap-5 px-4 pb-32">
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
                  Zoey couldn&apos;t load your account
                </Text>
                <Text className="font-sans text-[12.5px] leading-[18px] text-parchment/55">
                  {state.message}
                </Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Try again"
                  onPress={refresh}
                  className="mt-1 self-start rounded-full px-4 py-2 active:opacity-85"
                  style={{ backgroundColor: tokens.violet500 }}>
                  <Text className="font-sans-semibold text-[12px] text-parchment">Try again</Text>
                </Pressable>
              </View>
            ) : null}

            {loading ? null : isPremium ? (
              <>
                <ProgressGaugeCard />
                <CreditScoreCard />
                <DisputeRoundsCard />
              </>
            ) : (
              <>
                {/* Preview, not a blank screen: a free client can see what the
                    full dashboard is before deciding to unlock it. */}
                <MembershipUpsellCard />
                <PremiumLockCard
                  icon="chart.bar.fill"
                  title="Financial monitoring"
                  blurb="Scores tracked across all three bureaus"
                  bullets={[
                    'Score changes as each new report is analyzed',
                    'Per-bureau history and trends',
                    'Alerts when something moves',
                  ]}
                />
                <PremiumLockCard
                  icon="chart.line.uptrend.xyaxis"
                  title="Financial insights"
                  blurb="What’s helping and what’s holding you back"
                  bullets={[
                    'Utilization and account-level detail',
                    'Zoey’s explanation of every change',
                  ]}
                />
                <PremiumLockCard
                  icon="exclamationmark.triangle.fill"
                  title="Dispute rounds"
                  blurb="Live progress through every round"
                />
                <UnlockCta />
              </>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </ScreenBackground>
  );
}
