import { LinearGradient } from 'expo-linear-gradient';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';

import { InfoNote, SectionLabel } from '@/components/more/states';
import { MembershipBadge } from '@/components/premium/premium-lock';
import { GlassSurface } from '@/components/ui/glass-surface';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { ScreenBackground } from '@/components/ui/screen-background';
import { tokens } from '@/constants/tokens';
import { MEMBERSHIP_PRICE } from '@/lib/account-api';
import { useMembership } from '@/lib/membership-context';

/**
 * Zoey Membership.
 *
 * Purchase is NOT connected. The button does not call a store, does not create
 * a session, and cannot change membership -- pressing it says so plainly rather
 * than simulating success, which would put the app into a state the server
 * would immediately contradict.
 */

const INCLUDED: { icon: Parameters<typeof IconSymbol>[0]['name']; title: string; detail: string }[] = [
  { icon: 'sparkles', title: 'Zoey AI', detail: 'Your personal AI financial assistant.' },
  { icon: 'chart.bar.fill', title: 'Monitoring', detail: 'See changes and stay informed.' },
  { icon: 'exclamationmark.triangle.fill', title: 'Dispute Tracking', detail: 'Follow your dispute journey from one place.' },
  { icon: 'bell.fill', title: 'Alerts', detail: 'Know when something important changes.' },
  { icon: 'chart.line.uptrend.xyaxis', title: 'Financial Insights', detail: 'Understand the information affecting your financial profile.' },
  { icon: 'target', title: 'Goals', detail: 'Set goals and track your progress.' },
  { icon: 'house.fill', title: 'Premium Tools', detail: 'The full Zoey dashboard and premium features.' },
];

export default function MembershipScreen() {
  const { isPremium, membership } = useMembership();
  const price = `$${MEMBERSHIP_PRICE.amount}`;

  return (
    <ScreenBackground idPrefix="member">
      <ScrollView showsVerticalScrollIndicator={false}>
        <View className="gap-3 px-4 pb-16 pt-4">
          <View className="flex-row items-center justify-between">
            <Text className="font-sans text-[12px] uppercase tracking-wider text-parchment/45">
              Your membership
            </Text>
            <MembershipBadge />
          </View>

          <GlassSurface radius={26} glow>
            <View className="items-center px-5 pb-5 pt-6">
              <Text className="font-display text-[24px]" style={{ color: tokens.violet300 }}>
                Zoey Membership
              </Text>
              <View className="mt-1 flex-row items-baseline">
                <Text className="font-display text-[38px] text-parchment">{price}</Text>
                <Text className="font-sans text-[15px] text-parchment/60">
                  {' '}
                  / {MEMBERSHIP_PRICE.interval}
                </Text>
              </View>
              <Text className="mt-0.5 font-sans text-[12px] text-parchment/45">
                {MEMBERSHIP_PRICE.weeklyEquivalent} · billed monthly
              </Text>
              <Text className="mt-2 text-center font-sans text-[13px] leading-[19px] text-parchment/65">
                Unlock monitoring, Zoey AI, financial insights, dispute tracking, alerts, goals and
                the full Zoey experience.
              </Text>

              {isPremium ? (
                <View
                  className="mt-5 w-full items-center rounded-full py-3.5"
                  style={{ backgroundColor: 'rgba(61,214,140,0.16)', borderWidth: 1, borderColor: 'rgba(61,214,140,0.4)' }}>
                  <Text className="font-sans-semibold text-[14px]" style={{ color: tokens.signalReceived }}>
                    You’re a Zoey Member
                  </Text>
                </View>
              ) : (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Subscribe with Apple"
                  onPress={() =>
                    Alert.alert(
                      'Subscriptions not connected yet',
                      'Zoey Membership will be sold through Apple. StoreKit is not wired up, so nothing was charged, nothing was subscribed, and your membership has not changed.'
                    )
                  }
                  className="mt-5 w-full active:opacity-90">
                  <LinearGradient
                    colors={['#F58BE0', '#C56BF5', '#8B3FF5']}
                    start={{ x: 0, y: 0.5 }}
                    end={{ x: 1, y: 0.5 }}
                    style={{
                      borderRadius: 999,
                      paddingVertical: 15,
                      alignItems: 'center',
                      shadowColor: '#C77DF5',
                      shadowOpacity: 0.6,
                      shadowRadius: 16,
                      shadowOffset: { width: 0, height: 0 },
                    }}>
                    <Text className="font-sans-semibold text-[16px] text-white">
                      Subscribe with Apple
                    </Text>
                  </LinearGradient>
                </Pressable>
              )}
            </View>
          </GlassSurface>

          {!isPremium ? (
            <>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Restore purchases"
                onPress={() =>
                  Alert.alert(
                    'Restore not connected yet',
                    'Restoring purchases needs StoreKit, which is not wired up yet. Nothing was restored and your membership has not changed.'
                  )
                }
                className="items-center py-1 active:opacity-70">
                <Text className="font-sans text-[12.5px]" style={{ color: tokens.violet300 }}>
                  Restore Purchases
                </Text>
              </Pressable>
              <InfoNote>
                In-app purchase isn’t connected yet, so these buttons can’t charge you or change
                your membership. Nothing here simulates a subscription.
              </InfoNote>
            </>
          ) : null}

          <SectionLabel>What’s included</SectionLabel>
          <GlassSurface radius={22} glow>
            <View className="p-1">
              {INCLUDED.map((f, i) => (
                <View
                  key={f.title}
                  className="flex-row items-center gap-3 px-3 py-2.5"
                  style={i > 0 ? { borderTopWidth: 1, borderTopColor: 'rgba(168,85,247,0.14)' } : undefined}>
                  <IconSymbol name={f.icon} size={17} color={tokens.violet300} />
                  <View className="flex-1">
                    <Text className="font-sans-medium text-[14px] text-parchment">{f.title}</Text>
                    <Text className="mt-0.5 font-sans text-[11.5px] text-parchment/45">
                      {f.detail}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </GlassSurface>

          <InfoNote>
            Membership covers the Zoey software experience — monitoring, tracking, alerts and AI.
            Zoey never guarantees a score, deletion or approval.
          </InfoNote>

          {membership.startedAt ? (
            <Text className="mt-1 text-center font-sans text-[11px] text-parchment/35">
              Member since {new Date(membership.startedAt).toLocaleDateString()}
            </Text>
          ) : null}
        </View>
      </ScrollView>
    </ScreenBackground>
  );
}
