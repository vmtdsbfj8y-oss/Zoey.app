import { Text, View } from 'react-native';
import { useI18n } from '@/lib/i18n/context';

import { GlassSurface } from '@/components/ui/glass-surface';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { tokens } from '@/constants/tokens';

/**
 * Mailing information — INFORMATIONAL ONLY.
 *
 * ## Why there is no purchase action here
 *
 * Dispute delivery is handled by the OWNER-side "Approve Delivery" workflow and
 * its existing mailing integration. This screen must not become a second way to
 * send mail: two independent paths to dispatch a client's dispute packet is how
 * packets get sent twice, or get sent without owner approval.
 *
 * An earlier revision of this component had a "Purchase Mailing" button that
 * quoted nothing and did nothing. That was a duplicate of an existing workflow
 * and has been removed. If client-paid postage is added later, it must call the
 * SAME integration the owner dashboard already uses — see the audit notes.
 *
 * Wording: certified delivery is Pinnacle's chosen method for tracking and
 * proof of receipt. It is not described as legally required, because it is not.
 */
export function CertifiedMailingCard() {
  const { t } = useI18n();
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
            <IconSymbol name="paperplane.fill" size={18} color={tokens.violet300} />
          </View>
          <View className="flex-1">
            <Text className="font-sans-semibold text-[15px] text-parchment">
              {t('mailing.title')}
            </Text>
            <Text className="mt-0.5 font-sans text-[12px] text-parchment/55">
              {t('mailing.body')}
            </Text>
          </View>
        </View>

        <View className="mt-3 gap-1.5">
          <Row label={t('mailing.postage')} value="Paid separately to the mailing provider" />
        </View>

        <Text className="mt-3 font-sans text-[11.5px] leading-[16px] text-parchment/50">
          Your dispute is sent for you once it has been reviewed and approved — you do not need to
          print or mail anything yourself. Pinnacle does not charge a service fee on postage.
        </Text>
      </View>
    </GlassSurface>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row items-start justify-between gap-3">
      <Text className="font-sans text-[12.5px] text-parchment/55">{label}</Text>
      <Text className="flex-1 text-right font-sans-medium text-[12.5px] text-parchment">
        {value}
      </Text>
    </View>
  );
}
