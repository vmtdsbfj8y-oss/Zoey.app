import { LinearGradient } from 'expo-linear-gradient';
import { useI18n } from '@/lib/i18n/context';
import { useRouter } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { GlassSurface } from '@/components/ui/glass-surface';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { tokens } from '@/constants/tokens';
import { MEMBERSHIP_PRICE } from '@/lib/account-api';
import { useMembership } from '@/lib/membership-context';

/**
 * Premium locking UI.
 *
 * The locked state is a PREVIEW, not a blank wall: the feature stays visible
 * and named so a free client can see what Zoey does, with the unlock path one
 * tap away. A hidden feature sells nothing.
 *
 * Nothing here decides entitlement -- everything reads `useMembership()`, which
 * is a cache of the server's decision. There is no client-side override.
 */

const PRICE = `$${MEMBERSHIP_PRICE.amount}/${MEMBERSHIP_PRICE.interval}`;

const UPSELL_FEATURES = [
  'Monitoring',
  'Zoey AI',
  'Financial Insights',
  'Dispute Tracking',
  'Alerts',
  'Goals',
  'Premium Tools',
];

/** The small "🔒 Zoey Member" chip. */
export function MemberBadge({ compact }: { compact?: boolean }) {
  const { t } = useI18n();
  return (
    <View
      className="flex-row items-center gap-1 rounded-full px-2 py-0.5"
      style={{
        backgroundColor: 'rgba(168,85,247,0.18)',
        borderWidth: 1,
        borderColor: 'rgba(168,85,247,0.4)',
      }}>
      <IconSymbol name="lock.fill" size={9} color={tokens.violet300} />
      <Text
        className="font-sans-semibold"
        style={{ fontSize: compact ? 9 : 10, color: tokens.violet300 }}>
        {t('premium.zoeyMember')}
      </Text>
    </View>
  );
}

/** Membership state as a badge -- Free Member or Zoey Member. */
export function MembershipBadge() {
  const { isPremium, membership } = useMembership();
  return (
    <View
      className="rounded-full px-2.5 py-1"
      style={
        isPremium
          ? { backgroundColor: 'rgba(168,85,247,0.85)' }
          : {
              backgroundColor: 'rgba(244,239,255,0.08)',
              borderWidth: 1,
              borderColor: 'rgba(244,239,255,0.16)',
            }
      }>
      <Text
        className="font-sans-semibold text-[10px]"
        style={{ color: isPremium ? '#FFFFFF' : 'rgba(244,239,255,0.6)' }}>
        {membership.label}
      </Text>
    </View>
  );
}

/** Primary unlock call to action. */
export function UnlockCta({ compact }: { compact?: boolean }) {
  const router = useRouter();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Unlock Zoey, ${PRICE}`}
      onPress={() => router.push('/membership')}
      className="active:opacity-90">
      <LinearGradient
        colors={['#F58BE0', '#C56BF5', '#8B3FF5']}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={{
          borderRadius: 999,
          paddingVertical: compact ? 11 : 14,
          alignItems: 'center',
          shadowColor: '#C77DF5',
          shadowOpacity: 0.55,
          shadowRadius: 14,
          shadowOffset: { width: 0, height: 0 },
        }}>
        <Text
          className="font-sans-semibold text-white"
          style={{ fontSize: compact ? 13 : 15 }}>
          Unlock Zoey · {PRICE}
        </Text>
      </LinearGradient>
    </Pressable>
  );
}

/**
 * Locked feature card. Shows what the feature is, why it is worth having, and
 * the unlock path -- styled as part of the app, not as an error.
 */
export function PremiumLockCard({
  icon,
  title,
  blurb,
  bullets,
}: {
  icon: Parameters<typeof IconSymbol>[0]['name'];
  title: string;
  blurb: string;
  bullets?: string[];
}) {
  return (
    <GlassSurface radius={22} glow>
      <View className="p-4">
        <View className="flex-row items-center gap-3">
          <View
            className="h-10 w-10 items-center justify-center rounded-2xl"
            style={{
              backgroundColor: 'rgba(168,85,247,0.18)',
              borderWidth: 1,
              borderColor: 'rgba(168,85,247,0.36)',
            }}>
            <IconSymbol name={icon} size={19} color={tokens.violet300} />
          </View>
          <View className="flex-1">
            <Text className="font-sans-semibold text-[15px] text-parchment">{title}</Text>
            <Text className="mt-0.5 font-sans text-[12px] text-parchment/55">{blurb}</Text>
          </View>
          <MemberBadge />
        </View>

        {bullets?.length ? (
          <View className="mt-3 gap-1.5">
            {bullets.map((b) => (
              <View key={b} className="flex-row items-center gap-2">
                <IconSymbol name="checkmark.circle.fill" size={13} color={tokens.violet400} />
                <Text className="flex-1 font-sans text-[12px] text-parchment/70">{b}</Text>
              </View>
            ))}
          </View>
        ) : null}

        <View className="mt-4">
          <UnlockCta compact />
        </View>
      </View>
    </GlassSurface>
  );
}

/**
 * The headline membership card on the free dashboard.
 *
 * Sells the software experience, not Credit Services -- those are free, and
 * saying otherwise here would misrepresent what the $49.99 buys.
 */
export function MembershipUpsellCard() {
  const { t } = useI18n();
  return (
    <GlassSurface radius={24} glow>
      <View className="p-4">
        <Text className="font-display text-[19px] text-parchment">
          {t('premium.unlockFull')}
        </Text>
        <View className="mt-1 flex-row items-baseline gap-1.5">
          <Text className="font-sans-semibold text-[13px]" style={{ color: tokens.violet300 }}>
            {t('more.membership')}
          </Text>
          <Text className="font-display text-[17px] text-parchment">
            ${MEMBERSHIP_PRICE.amount}
          </Text>
          <Text className="font-sans text-[12px] text-parchment/50">
            /{MEMBERSHIP_PRICE.interval}
          </Text>
        </View>
        <Text className="mt-0.5 font-sans text-[11.5px] text-parchment/45">
          {MEMBERSHIP_PRICE.weeklyEquivalent}
        </Text>

        <View className="mt-3 flex-row flex-wrap gap-1.5">
          {UPSELL_FEATURES.map((f) => (
            <View
              key={f}
              className="rounded-full px-2.5 py-1"
              style={{
                backgroundColor: 'rgba(168,85,247,0.14)',
                borderWidth: 1,
                borderColor: 'rgba(168,85,247,0.28)',
              }}>
              <Text className="font-sans text-[11px] text-parchment/80">{f}</Text>
            </View>
          ))}
        </View>

        <View className="mt-4">
          <UnlockCta />
        </View>
      </View>
    </GlassSurface>
  );
}

/**
 * Gate for a premium area.
 *
 * Members get `children` untouched -- there is deliberately no second version
 * of the app, just this one branch. Free clients get the preview card.
 * While membership is still loading it renders nothing rather than flashing a
 * lock at a paying member.
 */
export function PremiumGate({
  icon,
  title,
  blurb,
  bullets,
  children,
}: {
  icon: Parameters<typeof IconSymbol>[0]['name'];
  title: string;
  blurb: string;
  bullets?: string[];
  children: React.ReactNode;
}) {
  const { isPremium, loading } = useMembership();

  if (loading) return null;
  if (isPremium) return <>{children}</>;

  return <PremiumLockCard icon={icon} title={title} blurb={blurb} bullets={bullets} />;
}
