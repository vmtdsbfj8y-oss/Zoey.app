import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Pressable, Text, View, useWindowDimensions } from 'react-native';

import { CosmicBubbles, PulseGlow, Starfield } from '@/components/documents/galaxy-layers';
import { GlassSurface } from '@/components/ui/glass-surface';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { tokens } from '@/constants/tokens';
import { BUREAU_ORDER, type BureauKey } from '@/components/credit/bureau-tabs';
import type { BureauScore } from '@/lib/account-api';

/**
 * The dashboard's credit hero -- Zoey, and the three numbers that matter.
 *
 * ==============================  WHY THIS IS THE TOP OF THE SCREEN  ==============================
 *
 * Documents Received led the dashboard, which is right exactly until intake is done -- after that
 * it is a finished checklist occupying the position a client opens the app to look at. Credit is
 * what they came for. Documents keeps its place as a smaller module below.
 *
 * ==============================  THREE NUMBERS, NEVER ONE  ==============================
 *
 * No combined score, no average, no "your score". The bureaus use different models on different
 * data and a single blended figure would be a number that exists nowhere -- not on any report, not
 * at any bureau, not in any lender's decision. Three columns, side by side, each with its own
 * value or its own honest blank.
 */

const ART_RATIO = 940 / 1672;

export function CreditHero({
  scores,
  reportReceivedAt,
  loading,
}: {
  scores: BureauScore[];
  reportReceivedAt: string | null;
  loading: boolean;
}) {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const cardW = width - 32;
  const heroH = Math.round(Math.min(Math.max(cardW * 0.86, 280), 340));
  const figureH = Math.round(heroH * 0.72);
  const figureW = Math.round(figureH * ART_RATIO);

  const byBureau = new Map(scores.map((row) => [row.bureau as BureauKey, row]));
  const anyScore = scores.length > 0;

  return (
    <GlassSurface radius={26} glow style={{ overflow: 'hidden' }}>
      <View style={{ height: heroH }}>
        {/* The same cosmic environment as the Documents hero, so the app reads as one place. */}
        <View className="absolute inset-0">
          <LinearGradient
            colors={['rgba(126,34,206,0.30)', 'rgba(21,11,41,0.10)', 'transparent']}
            start={{ x: 0.1, y: 0 }}
            end={{ x: 0.9, y: 1 }}
            style={{ position: 'absolute', inset: 0 }}
          />
          <Starfield />
          <CosmicBubbles />
        </View>

        {/* Zoey, right of centre, behind the glass panels rather than beside them. */}
        <View
          pointerEvents="none"
          className="absolute items-center justify-center"
          style={{ left: cardW * 0.60 - figureW / 2, bottom: -Math.round(heroH * 0.04), width: figureW, height: figureH }}>
          <View className="absolute" style={{ opacity: 0.5 }}>
            <PulseGlow size={Math.round(figureH * 0.9)} id="creditHeroGlow" spin={false} />
          </View>
          <Image
            source={require('@/assets/images/zoey-hero.png')}
            style={{ width: figureW, height: figureH }}
            contentFit="contain"
            transition={220}
          />
        </View>

        {/*
          A scrim under the type column only.
          The bubbles are part of the scene and should keep drifting across the card -- but at 375pt
          one of them passes straight through "CREDIT OVERVIEW" and the word stops being readable.
          A soft left-to-transparent wash restores contrast where the words are without flattening
          the scene anywhere else.
        */}
        <LinearGradient
          pointerEvents="none"
          colors={['rgba(11,6,21,0.72)', 'rgba(11,6,21,0.28)', 'transparent']}
          start={{ x: 0, y: 0 }}
          end={{ x: 0.86, y: 0 }}
          style={{ position: 'absolute', left: 0, right: 0, top: 0, height: Math.round(heroH * 0.46) }}
        />

        <View className="flex-1 justify-between p-4">
          <View style={{ maxWidth: cardW * 0.60 }}>
            <Text className="font-sans text-[11px] uppercase tracking-[1.6px] text-parchment/45">Zoey · Credit overview</Text>
            <Text className="mt-1 font-display text-[23px] leading-[27px] text-parchment">
              {anyScore ? 'Your three bureau scores' : 'Your credit, once your report is in'}
            </Text>
            {reportReceivedAt ? (
              <Text className="mt-1 font-sans text-[11.5px] text-parchment/50">
                From your report · {new Date(reportReceivedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
              </Text>
            ) : null}
          </View>

          {/*
            Three columns, always. A bureau with no score keeps its column and says so -- dropping
            it would read as "Zoey only checks two bureaus".
          */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="View credit scores"
            onPress={() => router.push('/(tabs)/credit-score')}
            className="active:opacity-85">
            <GlassSurface radius={18} base="rgba(20,10,40,0.62)" intensity={16}>
              <View className="flex-row items-stretch p-3">
                {BUREAU_ORDER.map((bureau, index) => {
                  const row = byBureau.get(bureau);
                  return (
                    <View
                      key={bureau}
                      className="flex-1 items-center"
                      style={index > 0 ? { borderLeftWidth: 1, borderLeftColor: 'rgba(168,85,247,0.16)' } : undefined}>
                      <Text className="font-sans text-[10.5px] uppercase tracking-wider text-parchment/45">
                        {bureau === 'TransUnion' ? 'TransUnion' : bureau}
                      </Text>
                      {loading ? (
                        <Text className="mt-1 font-display text-[26px] leading-[30px] text-parchment/25">···</Text>
                      ) : row ? (
                        <Text className="mt-0.5 font-display text-[26px] leading-[34px]" style={{ color: tokens.violet300 }}>
                          {row.score}
                        </Text>
                      ) : (
                        // Words, never a dash or a zero: unavailable and low must not look alike.
                        <Text className="mt-2 font-sans text-[11px] leading-[14px] text-parchment/35">Not on{'\n'}report</Text>
                      )}
                    </View>
                  );
                })}
              </View>
              <View className="flex-row items-center justify-center gap-1 pb-2.5">
                <Text className="font-sans-medium text-[11.5px]" style={{ color: tokens.violet400 }}>
                  View credit scores
                </Text>
                <IconSymbol name="chevron.right" size={11} color={tokens.violet400} />
              </View>
            </GlassSurface>
          </Pressable>
        </View>
      </View>
    </GlassSurface>
  );
}
