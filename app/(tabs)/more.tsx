import { useRouter } from 'expo-router';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GlassRow } from '@/components/more/glass-row';
import { ScreenBackground } from '@/components/ui/screen-background';
import { useAsync } from '@/hooks/use-async';
import { getScores, getSubscription, listGoals, subscriptionLabel } from '@/lib/account-api';

/**
 * Account / control centre.
 *
 * Each row shows a real status pulled from the API, or no status at all. None
 * of them invents a value: an unreachable API leaves the chips off rather than
 * showing a stale or made-up state, and the row still navigates.
 */
export default function MoreScreen() {
  const router = useRouter();

  const subscription = useAsync(() => getSubscription(), []);
  const goals = useAsync(() => listGoals(), []);
  const scores = useAsync(() => getScores(), []);

  const activeGoals = goals.data?.filter((g) => g.status === 'active').length;
  const goalStatus =
    goals.loading || goals.error || activeGoals === undefined
      ? null
      : activeGoals === 0
        ? 'None set'
        : `${activeGoals} active`;

  const latestCount = scores.data?.latest.length;
  const scoreStatus =
    scores.loading || scores.error || latestCount === undefined
      ? null
      : latestCount === 0
        ? 'None yet'
        : `${latestCount} on file`;

  const subStatus = subscription.loading || subscription.error
    ? null
    : subscriptionLabel(subscription.data);

  return (
    <ScreenBackground idPrefix="more">
      <SafeAreaView edges={['top']} className="flex-1">
        <View className="px-4 pb-4 pt-1">
          <Text className="font-display text-[22px] text-parchment">More</Text>
        </View>

        <ScrollView showsVerticalScrollIndicator={false}>
          <View className="gap-3 px-4 pb-32">
            <GlassRow
              icon="gearshape"
              title="Settings"
              description="Profile, contact details, notifications and privacy"
              onPress={() => router.push('/settings')}
            />
            <GlassRow
              icon="creditcard.fill"
              title="Subscription"
              description="Your plan, billing and payment method"
              status={subStatus}
              statusTone={
                subscription.data?.status === 'active' || subscription.data?.status === 'trialing'
                  ? 'good'
                  : subscription.data?.status === 'past_due'
                    ? 'warn'
                    : 'muted'
              }
              onPress={() => router.push('/subscription')}
            />
            <GlassRow
              icon="target"
              title="Goals"
              description="What you're working toward on your credit journey"
              status={goalStatus}
              statusTone={activeGoals ? 'neutral' : 'muted'}
              onPress={() => router.push('/goals')}
            />
            <GlassRow
              icon="chart.bar.fill"
              title="Credit Score"
              description="Scores from your analyzed reports, by bureau"
              status={scoreStatus}
              statusTone={latestCount ? 'neutral' : 'muted'}
              onPress={() => router.push('/credit-score')}
            />
          </View>
        </ScrollView>
      </SafeAreaView>
    </ScreenBackground>
  );
}
