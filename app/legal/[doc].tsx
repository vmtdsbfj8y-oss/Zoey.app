import { Stack, useLocalSearchParams } from 'expo-router';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GlassSurface } from '@/components/ui/glass-surface';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { ScreenBackground } from '@/components/ui/screen-background';
import { tokens } from '@/constants/tokens';
import { legalDocument, type LegalDocumentId, type LegalSection } from '@/lib/legal';

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

function Section({ section }: { section: LegalSection }) {
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
              <Section key={section.heading} section={section} />
            ))}
          </View>
        </ScrollView>
      </SafeAreaView>
    </ScreenBackground>
  );
}
