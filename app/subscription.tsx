import { Linking, Pressable, ScrollView, Text, View } from 'react-native';
import { useI18n } from '@/lib/i18n/context';

import { EmptyState, ErrorState, InfoNote, LoadingState, SectionLabel } from '@/components/more/states';
import { GlassSurface } from '@/components/ui/glass-surface';
import { ScreenBackground } from '@/components/ui/screen-background';
import { tokens } from '@/constants/tokens';
import { useAsync } from '@/hooks/use-async';
import { getSubscription, subscriptionLabel, type Subscription } from '@/lib/account-api';

function money(cents: number, currency: string) {
  const amount = (cents / 100).toFixed(2).replace(/\.00$/, '');
  return currency.toUpperCase() === 'USD' ? `$${amount}` : `${amount} ${currency.toUpperCase()}`;
}

function formatDate(ms: number) {
  return new Date(ms).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View
      className="flex-row items-center justify-between gap-3 px-3.5 py-3"
      style={{ borderTopWidth: 1, borderTopColor: 'rgba(168,85,247,0.14)' }}>
      <Text className="font-sans text-[13px] text-parchment/55">{label}</Text>
      <Text className="font-sans-semibold text-[13px] text-parchment">{value}</Text>
    </View>
  );
}

function PlanCard({ sub }: { sub: Subscription }) {
  const { t } = useI18n();
  const tone =
    sub.status === 'active' || sub.status === 'trialing'
      ? tokens.signalReceived
      : sub.status === 'past_due'
        ? tokens.signalPending
        : 'rgba(244,239,255,0.55)';

  return (
    <GlassSurface radius={20} glow>
      <View className="px-3.5 pb-1 pt-3.5">
        <View className="flex-row items-center justify-between gap-3">
          <Text className="font-display text-[17px] text-parchment">
            {sub.plan?.name ?? 'Your plan'}
          </Text>
          <View
            className="rounded-full px-2.5 py-1"
            style={{
              backgroundColor: 'rgba(168,85,247,0.14)',
              borderWidth: 1,
              borderColor: 'rgba(168,85,247,0.28)',
            }}>
            <Text className="font-sans-semibold text-[10px]" style={{ color: tone }}>
              {subscriptionLabel(sub)}
            </Text>
          </View>
        </View>

        {sub.plan ? (
          <Text className="mb-2 mt-1 font-display text-[26px]" style={{ color: tokens.violet300 }}>
            {money(sub.plan.priceCents, sub.plan.currency)}
            <Text className="font-sans text-[13px] text-parchment/55">
              {' '}
              / {sub.plan.interval}
            </Text>
          </Text>
        ) : null}
      </View>

      {sub.plan?.currentPeriodEnd ? (
        <Row
          label={sub.plan.cancelAtPeriodEnd ? 'Access ends' : 'Next billing date'}
          value={formatDate(sub.plan.currentPeriodEnd)}
        />
      ) : null}
      {sub.provider ? <Row label={t('subscription.billingProvider')} value={sub.provider} /> : null}
    </GlassSurface>
  );
}

export default function SubscriptionScreen() {
  const { t } = useI18n();
  const { data, error, loading, retry } = useAsync(() => getSubscription(), []);

  return (
    <ScreenBackground idPrefix="sub">
      <ScrollView showsVerticalScrollIndicator={false}>
        <View className="gap-3 px-4 pb-16 pt-4">
          {loading ? <LoadingState label={t('subscription.checking')} /> : null}
          {!loading && error ? <ErrorState message={error} onRetry={retry} /> : null}

          {!loading && !error && data ? (
            <>
              {/*
                `not_connected` is not the same as "no subscription". We have not
                asked a billing provider, so we say exactly that rather than
                telling the client something we cannot support either way.
              */}
              {data.status === 'not_connected' ? (
                <>
                  <EmptyState
                    icon="creditcard.fill"
                    title={t('subscription.notConnectedTitle')}
                    body={t('subscription.notConnectedBody')}
                  />
                  <InfoNote>
                    This screen is ready for real data. Once billing is wired up it will show your
                    plan, price, renewal date and a link to manage payment — nothing here is
                    placeholder pricing.
                  </InfoNote>
                </>
              ) : data.status === 'none' ? (
                <EmptyState
                  icon="creditcard.fill"
                  title={t('subscription.noneTitle')}
                  body={t('subscription.noneBody')}
                />
              ) : (
                <>
                  <SectionLabel>{t('subscription.currentPlan')}</SectionLabel>
                  <PlanCard sub={data} />

                  {data.status === 'past_due' ? (
                    <InfoNote>
                      Your last payment didn&apos;t go through. Update your payment method to keep
                      Zoey working on your case.
                    </InfoNote>
                  ) : null}

                  {data.manageUrl ? (
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => Linking.openURL(data.manageUrl!)}
                      className="items-center rounded-full py-3 active:opacity-85"
                      style={{ backgroundColor: tokens.violet500 }}>
                      <Text className="font-sans-semibold text-[13px] text-parchment">
                        {t('subscription.manageBilling')}
                      </Text>
                    </Pressable>
                  ) : (
                    <InfoNote>
                      A billing portal link isn&apos;t available for this plan yet, so payment
                      changes and cancellation need to go through support.
                    </InfoNote>
                  )}
                </>
              )}
            </>
          ) : null}
        </View>
      </ScrollView>
    </ScreenBackground>
  );
}
