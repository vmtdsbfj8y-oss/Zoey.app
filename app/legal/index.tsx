import { router } from 'expo-router';
import { Alert, Linking, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SectionLabel } from '@/components/more/states';
import { useI18n } from '@/lib/i18n/context';
import { GlassSurface } from '@/components/ui/glass-surface';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { ScreenBackground } from '@/components/ui/screen-background';
import { tokens } from '@/constants/tokens';
import {
  LEGAL_DOCUMENTS,
  PUBLIC_URLS,
  SUPPORT_EMAIL,
  SUPPORT_URL_IS_LIVE,
  assertPinnacleHttpsUrl,
  counselReviewItems,
  supportMailto,
  type LegalDocument,
} from '@/lib/legal';

/**
 * Legal & Privacy.
 *
 * Reachable WITHOUT a session, on purpose. Someone deciding whether to hand Zoey a photograph of
 * their Social Security card should be able to read the privacy policy first, and someone who has
 * deleted their account should still be able to read what happened to their data. Gating the
 * privacy policy behind the sign-in it describes is a small absurdity that is very common.
 *
 * Every row here opens a document with real content. There is no "coming soon" row and no external
 * link that does not resolve, because a dead link in a legal menu is worse than an absent one -- it
 * implies a document exists somewhere.
 */

function DocumentRow({ doc, first }: { doc: LegalDocument; first: boolean }) {
  const { t } = useI18n();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={doc.title}
      accessibilityHint={doc.summary}
      onPress={() => router.push(`/legal/${doc.id}`)}
      className="flex-row items-center gap-3 px-3.5 py-3 active:opacity-70"
      style={first ? undefined : { borderTopWidth: 1, borderTopColor: 'rgba(168,85,247,0.14)' }}>
      <View className="flex-1">
        <Text className="font-sans-medium text-[14px] text-parchment">{doc.title}</Text>
        <Text className="mt-0.5 font-sans text-[11.5px] leading-[16px] text-parchment/45">
          {doc.summary}
        </Text>
      </View>
      {doc.status === 'DRAFT_PENDING_COUNSEL' ? (
        <View className="rounded-full px-2 py-0.5" style={{ backgroundColor: 'rgba(244,239,255,0.08)' }}>
          <Text className="font-sans text-[10px] text-parchment/50">{t('legal.draftBadge')}</Text>
        </View>
      ) : null}
      <IconSymbol name="chevron.right" size={15} color="rgba(244,239,255,0.35)" />
    </Pressable>
  );
}

export default function LegalIndexScreen() {
  const { t } = useI18n();
  const pendingReview = counselReviewItems().length;

  return (
    <ScreenBackground idPrefix="legal">
      <SafeAreaView edges={['top']} className="flex-1">
        <View className="px-4 pb-3 pt-1">
          <Text className="font-display text-[22px] text-parchment">{t('legal.title')}</Text>
          <Text className="mt-1 font-sans text-[12.5px] leading-[18px] text-parchment/55">
{t('legal.subtitle')}
          </Text>
        </View>

        <ScrollView showsVerticalScrollIndicator={false}>
          <View className="gap-3 px-4 pb-24">
            <GlassSurface radius={20} glow>
              <View className="p-1">
                {LEGAL_DOCUMENTS.map((doc, i) => (
                  <DocumentRow key={doc.id} doc={doc} first={i === 0} />
                ))}
              </View>
            </GlassSurface>

            {/*
              Reachable without an account, which is the whole reason it sits on this screen rather
              than only inside Contact & Support. Someone who has deleted their account, or who has
              not created one, still needs a way to ask what happened to their data -- and by then
              every in-app channel is gone.
            */}
            <SectionLabel>{t('legal.contact')}</SectionLabel>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Email Pinnacle support at ${SUPPORT_EMAIL}`}
              accessibilityHint={t('legal.a11yEmailHint')}
              onPress={async () => {
                const url = supportMailto('Zoey — Support request');
                const canOpen = await Linking.canOpenURL(url).catch(() => false);
                if (!canOpen) {
                  Alert.alert(
                    'Email Pinnacle support',
                    `No email app is set up on this device. You can reach support at ${SUPPORT_EMAIL}.`
                  );
                  return;
                }
                await Linking.openURL(url).catch(() => {});
              }}
              className="active:opacity-70">
              <GlassSurface radius={20}>
                <View className="flex-row items-center gap-3 p-4">
                  <IconSymbol name="paperplane.fill" size={16} color={tokens.violet300} />
                  <View className="flex-1">
                    <Text className="font-sans-medium text-[13px] text-parchment">
                      {t('legal.supportName')}
                    </Text>
                    <Text
                      className="mt-0.5 font-sans text-[12px] text-violet-300"
                      selectable
                      numberOfLines={1}
                      adjustsFontSizeToFit>
                      {SUPPORT_EMAIL}
                    </Text>
                  </View>
                </View>
              </GlassSurface>
            </Pressable>

            {/*
              The website, offered as an extra rather than as the destination. Everything above is
              readable in the app with no connection at all; this is for sharing a policy with
              somebody who does not have Zoey installed.
            */}
            {SUPPORT_URL_IS_LIVE ? (
              <Pressable
                accessibilityRole="link"
                accessibilityLabel={t('legal.a11yOpenSite')}
                accessibilityHint={t('legal.a11yOpenSiteHint')}
                onPress={async () => {
                  try {
                    const url = assertPinnacleHttpsUrl(PUBLIC_URLS.home);
                    if (await Linking.canOpenURL(url)) await Linking.openURL(url);
                  } catch {
                    /* Nothing to recover: every document is already readable in the app. */
                  }
                }}
                className="active:opacity-70">
                <GlassSurface radius={20}>
                  <View className="flex-row items-center gap-3 p-4">
                    <IconSymbol name="doc.text.fill" size={16} color="rgba(244,239,255,0.6)" />
                    <View className="flex-1">
                      <Text className="font-sans-medium text-[13px] text-parchment">
                        pinnaclecapitalusa.com
                      </Text>
                      <Text className="mt-0.5 font-sans text-[11.5px] text-parchment/45">
                        {t('legal.websiteDetail')}
                      </Text>
                    </View>
                    <IconSymbol name="chevron.right" size={14} color="rgba(244,239,255,0.35)" />
                  </View>
                </GlassSurface>
              </Pressable>
            ) : null}

            <SectionLabel>{t('legal.plainLanguage')}</SectionLabel>
            <GlassSurface radius={20}>
              <View className="p-4">
                <Text className="font-sans text-[12.5px] leading-[19px] text-parchment/70">
                  {t('legal.plainLanguageBody1')}
                </Text>
                <Text className="mt-2.5 font-sans text-[12.5px] leading-[19px] text-parchment/70">
                  {t('legal.plainLanguageBody2')}
                </Text>
              </View>
            </GlassSurface>

            {/*
              Shown rather than hidden. These documents were drafted from how Zoey actually works and
              have not been through an attorney; the reader is better served knowing that than being
              handed a draft with the confidence of a finished policy.
            */}
            {pendingReview > 0 ? (
              <GlassSurface radius={20}>
                <View className="flex-row gap-3 p-4">
                  <IconSymbol name="info.circle" size={16} color={tokens.signalPending} />
                  <View className="flex-1">
                    <Text className="font-sans-medium text-[12.5px] text-parchment/85">
                      {t('legal.draftNoticeTitle')}
                    </Text>
                    <Text className="mt-1 font-sans text-[11.5px] leading-[17px] text-parchment/55">
                      {t('legal.draftNoticeBody')}
                    </Text>
                  </View>
                </View>
              </GlassSurface>
            ) : null}
          </View>
        </ScrollView>
      </SafeAreaView>
    </ScreenBackground>
  );
}
