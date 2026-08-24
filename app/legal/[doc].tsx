import { Stack, useLocalSearchParams } from 'expo-router';
import { Alert, Linking, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GlassSurface } from '@/components/ui/glass-surface';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { ScreenBackground } from '@/components/ui/screen-background';
import { useI18n } from '@/lib/i18n/context';
import { tokens } from '@/constants/tokens';
import {
  assertPinnacleHttpsUrl,
  legalDocument,
  supportMailto,
  SUPPORT_URL_IS_LIVE,
  type LegalDocumentId,
  type LegalSection,
} from '@/lib/legal';

/**
 * One legal document, rendered verbatim from the registry.
 *
 * The text is never re-wrapped, summarised or passed through a model on its way to the screen. A
 * legal document that gets paraphrased in the render layer is a different document from the one
 * whose version the consumer accepted, and the version identifier would be quietly lying.
 *
 * Sections awaiting a lawyer's judgement print their note rather than hiding it. A blank space where
 * the liability terms should be is the honest representation of a draft that does not have them yet.
 */

async function openSupportMail(email: string, documentTitle: string) {
  const url = supportMailto(`Zoey — ${documentTitle}`);
  const canOpen = await Linking.canOpenURL(url).catch(() => false);
  if (!canOpen) {
    Alert.alert('Email Pinnacle support', `No email app is set up on this device. You can reach support at ${email}.`);
    return;
  }
  await Linking.openURL(url).catch(() => {
    Alert.alert('Email Pinnacle support', `Zoey could not open your email app. You can reach support at ${email}.`);
  });
}

/**
 * Opens the public copy of a document on the Pinnacle site.
 *
 * `assertPinnacleHttpsUrl` throws on anything that is not an HTTPS URL on the Pinnacle host, so a
 * mistyped or injected destination fails here rather than launching a browser at it. Gated on
 * `SUPPORT_URL_IS_LIVE` as well, so if the site ever regresses the links disappear everywhere at
 * once rather than one screen at a time.
 */
async function openPublicPage(url: string) {
  try {
    const safe = assertPinnacleHttpsUrl(url);
    if (!(await Linking.canOpenURL(safe))) return;
    await Linking.openURL(safe);
  } catch {
    /* Refused or unopenable. The in-app copy is already on screen, so there is nothing to recover. */
  }
}

function Section({ section, document }: { section: LegalSection; document: { title: string } }) {
  const { t } = useI18n();
  return (
    <GlassSurface radius={20}>
      <View className="p-4">
        <Text className="font-sans-semibold text-[13.5px] text-parchment">{section.heading}</Text>
        {section.body.map((paragraph, i) => (
          <Text
            key={i}
            className="mt-2 font-sans text-[12.5px] leading-[19px] text-parchment/75">
            {paragraph}
          </Text>
        ))}
        {/*
          The address is a button, not a sentence.

          On a phone, an email written into a paragraph is something you long-press, select without
          quite catching the trailing full stop, copy, and paste into another app. As an action it is
          one tap into a composer with the subject already filled in, which also means an incoming
          message arrives labelled with where it came from.

          `canOpenURL` is checked first because a device with no mail client configured would
          otherwise do nothing at all when tapped -- a dead button on the one screen whose entire job
          is to prove the contact channel is real. When it cannot open, the address is shown so it
          can still be copied by hand.
        */}
        {section.contactEmail ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Email ${section.contactEmail}`}
            accessibilityHint="Opens your email app"
            onPress={() => openSupportMail(section.contactEmail as string, document.title)}
            className="mt-3 flex-row items-center gap-2.5 rounded-2xl px-3.5 py-3 active:opacity-70"
            style={{ backgroundColor: 'rgba(168,85,247,0.14)' }}>
            <IconSymbol name="paperplane.fill" size={14} color={tokens.violet300} />
            <Text
              className="flex-1 font-sans-medium text-[12.5px] text-violet-300"
              selectable
              numberOfLines={1}
              adjustsFontSizeToFit>
              {section.contactEmail}
            </Text>
          </Pressable>
        ) : null}

        {/*
          Offered ALONGSIDE the text above, never instead of it. The document is already rendered on
          this screen from the app's own copy; this is for sending someone the page who does not have
          the app, which is the one thing an in-app document cannot do.
        */}
        {section.publicUrl && SUPPORT_URL_IS_LIVE ? (
          <Pressable
            accessibilityRole="link"
            accessibilityLabel={`View ${document.title} on pinnaclecapitalusa.com`}
            accessibilityHint="Opens the public page in your browser"
            onPress={() => openPublicPage(section.publicUrl as string)}
            className="mt-3 flex-row items-center gap-2 active:opacity-70">
            <Text className="font-sans text-[11.5px] text-violet-300">
              {t('legal.alsoPublished')}
            </Text>
            <IconSymbol name="chevron.right" size={12} color="rgba(196,181,253,0.8)" />
          </Pressable>
        ) : null}

        {section.counselNote ? (
          <View
            className="mt-3 flex-row gap-2.5 rounded-2xl p-3"
            style={{ backgroundColor: 'rgba(244,239,255,0.05)' }}>
            <IconSymbol name="info.circle" size={14} color={tokens.signalPending} />
            <View className="flex-1">
              <Text className="font-sans-medium text-[11px] uppercase tracking-wide text-parchment/55">
                Under legal review
              </Text>
              <Text className="mt-1 font-sans text-[11.5px] leading-[17px] text-parchment/55">
                {section.counselNote}
              </Text>
            </View>
          </View>
        ) : null}
      </View>
    </GlassSurface>
  );
}

export default function LegalDocumentScreen() {
  const { t, locale } = useI18n();
  const { doc } = useLocalSearchParams<{ doc: string }>();
  const document = legalDocument(doc as LegalDocumentId);

  if (!document) {
    return (
      <ScreenBackground idPrefix="legal-doc">
        <SafeAreaView edges={['top']} className="flex-1">
          <Stack.Screen options={{ title: 'Legal' }} />
          <View className="gap-3 px-4 pt-4">
            <GlassSurface radius={20}>
              <View className="p-4">
                <Text className="font-sans text-[13px] leading-[19px] text-parchment/70">
                  {t('legal.notFound')}
                </Text>
              </View>
            </GlassSurface>
          </View>
        </SafeAreaView>
      </ScreenBackground>
    );
  }

  return (
    <ScreenBackground idPrefix="legal-doc">
      <Stack.Screen options={{ title: document.title }} />
      <SafeAreaView edges={['top']} className="flex-1">
        <View className="px-4 pb-2 pt-1">
          <Text className="font-display text-[21px] leading-[27px] text-parchment">
            {document.title}
          </Text>
          <Text className="mt-1 font-sans text-[11px] text-parchment/40">
            {t('legal.versionLine', { values: { version: document.version, effective: document.effective } })}
          </Text>
        </View>

        <ScrollView showsVerticalScrollIndicator={false}>
          <View className="gap-3 px-4 pb-24 pt-1">
            {/*
              The document BODY is still English. Saying so is the only honest option: a Spanish
              reader must not be left to assume they have read a Spanish document, and machine
              translation of a privacy policy or terms is not something to present as final.
              Removed the moment a bilingual attorney signs off on the translated text.
            */}
            {locale !== 'en' ? (
              <GlassSurface radius={20}>
                <View className="flex-row gap-3 p-3.5">
                  <IconSymbol name="info.circle" size={15} color={tokens.signalPending} />
                  <Text className="flex-1 font-sans text-[11.5px] leading-[17px] text-parchment/60">
                    {t('language.documentNote')}
                  </Text>
                </View>
              </GlassSurface>
            ) : null}

            {document.status === 'DRAFT_PENDING_COUNSEL' ? (
              <GlassSurface radius={20}>
                <View className="flex-row gap-3 p-3.5">
                  <IconSymbol name="info.circle" size={15} color={tokens.signalPending} />
                  <Text className="flex-1 font-sans text-[11.5px] leading-[17px] text-parchment/60">
                    {t('legal.documentDraftNotice')}
                  </Text>
                </View>
              </GlassSurface>
            ) : null}

            {document.sections.map((section) => (
              <Section key={section.heading} section={section} document={document} />
            ))}
          </View>
        </ScrollView>
      </SafeAreaView>
    </ScreenBackground>
  );
}
