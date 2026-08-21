import { Stack, useLocalSearchParams } from 'expo-router';
import { Alert, Linking, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GlassSurface } from '@/components/ui/glass-surface';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { ScreenBackground } from '@/components/ui/screen-background';
import { tokens } from '@/constants/tokens';
import { legalDocument, supportMailto, type LegalDocumentId, type LegalSection } from '@/lib/legal';

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

function Section({ section, document }: { section: LegalSection; document: { title: string } }) {
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
                  That document could not be found. Go back to Legal &amp; Privacy to see everything
                  available.
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
            Version {document.version} · Effective {document.effective}
          </Text>
        </View>

        <ScrollView showsVerticalScrollIndicator={false}>
          <View className="gap-3 px-4 pb-24 pt-1">
            {document.status === 'DRAFT_PENDING_COUNSEL' ? (
              <GlassSurface radius={20}>
                <View className="flex-row gap-3 p-3.5">
                  <IconSymbol name="info.circle" size={15} color={tokens.signalPending} />
                  <Text className="flex-1 font-sans text-[11.5px] leading-[17px] text-parchment/60">
                    This is a draft. It describes how Zoey actually works today and is being reviewed
                    by an attorney before launch.
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
