import { useEffect, useState } from 'react';
import { useI18n } from '@/lib/i18n/context';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GlassSurface } from '@/components/ui/glass-surface';
import { ScreenBackground } from '@/components/ui/screen-background';
import { tokens } from '@/constants/tokens';
import { getOnboardingState, type SignedCopy } from '@/lib/mobile-onboarding';

/**
 * The consumer's retained copy of what they signed.
 *
 * ==========================  IT IS FETCHED, NOT REMEMBERED  ==========================
 *
 * Read from the server every time. A copy cached on the device would drift from the record and
 * would vanish with the app; this survives relaunch and reinstall because it was never stored here.
 * The body shown is the retained one -- the document as signed, not a fresh render of the current
 * template, which could differ from what they actually agreed to.
 *
 * The API returns only customer-facing fields. There is no owner id, client id, signer identity or
 * storage key in the payload, so there is nothing here to accidentally display.
 */
export default function SignedAcknowledgmentScreen() {
  const { t } = useI18n();
  const [copy, setCopy] = useState<SignedCopy | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const state = await getOnboardingState();
      if (cancelled) return;
      setCopy(state?.signedCopy ?? null);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <ScreenBackground idPrefix="signed">
      <SafeAreaView edges={['top']} className="flex-1">
        <View className="px-4 pb-3 pt-1">
          <Text className="font-display text-[22px] text-parchment">{t('ack.title')}</Text>
        </View>

        <ScrollView showsVerticalScrollIndicator={false}>
          <View className="gap-3 px-4 pb-32">
            {loading ? (
              <View className="items-center py-10">
                <ActivityIndicator color={tokens.violet400} />
              </View>
            ) : !copy ? (
              <GlassSurface radius={22}>
                <View className="p-4">
                  <Text className="font-sans text-[13px] leading-[19px] text-parchment/70">
                    {t('ack.none')}
                  </Text>
                </View>
              </GlassSurface>
            ) : (
              <>
                <GlassSurface radius={22}>
                  <View className="gap-1.5 p-4">
                    <Row label={t('ack.signedBy')} value={copy.signatureName} />
                    <Row label={t('ack.signedAt')} value={new Date(copy.signedAt).toLocaleString()} />
                    <Row label={t('ack.version')} value={copy.version} />
                    <Row label={t('ack.providedBy')} value={copy.legalName} />
                    <Row label={t('ack.companySigner')} value={`${copy.organizationSignerName}, ${copy.organizationSignerTitle}`} />
                    <Row label={t('ack.businessAddress')} value={copy.principalBusinessAddress} />
                    {/* So a consumer can verify the copy they hold is the one on file. */}
                    <Row label={t('ack.documentHash')} value={copy.documentHash} mono />
                  </View>
                </GlassSurface>

                <Document title={t('ack.acknowledgment')} body={copy.body} />
                {copy.cancellationFormsBody ? (
                  <Document title={t('ack.cancellationForms')} body={copy.cancellationFormsBody} />
                ) : null}
              </>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </ScreenBackground>
  );
}

function Row({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  if (!value) return null;
  return (
    <View className="flex-row items-start justify-between gap-3">
      <Text className="font-sans text-[12px] text-parchment/50">{label}</Text>
      <Text
        className={`flex-1 text-right text-[12.5px] text-parchment/90 ${mono ? 'font-mono' : 'font-sans-medium'}`}
        numberOfLines={mono ? 2 : undefined}>
        {value}
      </Text>
    </View>
  );
}

function Document({ title, body }: { title: string; body: string }) {
  return (
    <GlassSurface radius={22}>
      <View className="p-4">
        <Text className="font-sans-semibold text-[13px] text-parchment">{title}</Text>
        {/* Rendered verbatim. Never re-wrapped, summarised or re-generated. */}
        <Text className="mt-2 font-sans text-[12px] leading-[18px] text-parchment/80">{body}</Text>
      </View>
    </GlassSurface>
  );
}
