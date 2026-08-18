import { useRouter } from 'expo-router';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GlassRow } from '@/components/more/glass-row';
import { ScreenBackground } from '@/components/ui/screen-background';
import { getEngineScores } from '@/lib/mobile-api';
import { useAsync } from '@/hooks/use-async';
import { getSubscription, listGoals, subscriptionLabel } from '@/lib/account-api';
import { useMembership } from '@/lib/membership-context';

/**
 * Account / control centre.
 *
 * Each row shows a real status pulled from the API, or no status at all. None
 * of them invents a value: an unreachable API leaves the chips off rather than
 * showing a stale or made-up state, and the row still navigates.
 */
export default function MoreScreen() {
  const router = useRouter();
  const { isPremium, membership } = useMembership();

  const subscription = useAsync(() => getSubscription(), []);
  const goals = useAsync(() => listGoals(), []);
  const scores = useAsync(() => getEngineScores(), []);

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
              icon="creditcard.fill"
              title="Zoey Membership"
              description={
                isPremium
                  ? 'Your Zoey Member benefits and billing'
                  : 'Unlock monitoring, Zoey AI, tracking and alerts'
              }
              status={membership.label}
              statusTone={isPremium ? 'good' : 'muted'}
              onPress={() => router.push('/membership')}
            />
            {/*
              Credit Services: findable but understated, per the product model.
              It is never gated on membership.
            */}
            <Text className="mb-1 mt-2 font-sans-semibold text-[11px] uppercase tracking-wider text-parchment/45">
              Services
            </Text>
            <GlassRow
              icon="doc.text.fill"
              title="Credit Services"
              description="Need help with information on your credit reports?"
              onPress={() => router.push('/credit-services')}
            />
            {/* Their own signed copy. No membership gate -- it is their record. */}
            <GlassRow
              icon="doc.text.fill"
              title="Signed acknowledgment"
              description="View the acknowledgment you signed"
              onPress={() => router.push('/signed-acknowledgment')}
            />
            {/*
              Documents left the bottom bar to make room for Credit Score. The
              SCREEN is unchanged and still lives at /documents -- this is its
              entry point now, and it is also where the Run Zoey button lands.
              Nothing about its own membership gating moved here.
            */}
            <GlassRow
              icon="folder.fill"
              title="Documents"
              description={
                isPremium
                  ? 'Uploads, processing status and generated letters'
                  : 'Uploads, intake status and Start Zoey'
              }
              status={null}
              statusTone="muted"
              onPress={() => router.push('/documents')}
            />

            <Text className="mb-1 mt-3 font-sans-semibold text-[11px] uppercase tracking-wider text-parchment/45">
              Account
            </Text>
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
              description={
                isPremium
                  ? "What you're working toward on your financial journey"
                  : 'Set targets and track progress — Zoey Member'
              }
              status={isPremium ? goalStatus : '🔒 Zoey Member'}
              statusTone={isPremium && activeGoals ? 'neutral' : 'muted'}
              onPress={() => router.push(isPremium ? '/goals' : '/membership')}
            />
            <GlassRow
              icon="chart.bar.fill"
              title="Credit Score"
              description={
                isPremium
                  ? 'Scores from your analyzed reports, by bureau'
                  : 'Monitoring and score history — Zoey Member'
              }
              status={isPremium ? scoreStatus : '🔒 Zoey Member'}
              statusTone={isPremium && latestCount ? 'neutral' : 'muted'}
              onPress={() => router.push(isPremium ? '/credit-score' : '/membership')}
            />
          </View>
        </ScrollView>
      </SafeAreaView>
    </ScreenBackground>
  );
}
