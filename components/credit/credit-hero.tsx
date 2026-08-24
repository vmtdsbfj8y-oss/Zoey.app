import { Image } from 'expo-image';
import { useI18n } from '@/lib/i18n/context';
import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import { Pressable, Text, View, useWindowDimensions } from 'react-native';

import { CosmicBubbles, Starfield } from '@/components/documents/galaxy-layers';
import { BUREAU_ORDER, type BureauKey } from '@/components/credit/bureau-tabs';
import { tokens } from '@/constants/tokens';
import type { BureauScore } from '@/lib/account-api';

/**
 * The credit hero. One score, dominant.
 *
 * ==============================  WHY ONE AND NOT THREE  ==============================
 *
 * The first version put all three bureaus in a strip of equal columns. It was honest and it was
 * flat: three 26pt numbers side by side give a reader nothing to look at first, so the eye lands
 * nowhere and the screen reads as a table. The score is the product -- it should be the largest
 * thing on the page by a wide margin, with the other two bureaus a tap away rather than competing
 * for the same glance.
 *
 * Selecting a bureau changes which real number is dominant. Nothing is blended, and the two
 * unselected bureaus still show their own values in the selector, so nothing is hidden either.
 *
 * ==============================  A DIFFERENT ZOEY FROM THE OTHER SCREENS  ==============================
 *
 * This card used `zoey-hero.png`, which is a background-removed cutout of the SAME illustration
 * the welcome screen shows full-bleed and the Documents hero stands on its platform. Three product
 * areas, one pose, in an app whose whole premise is that Zoey is present and working -- it read as
 * a repeated poster rather than as a character, and repetition is what makes an app feel templated.
 *
 * The portrait is the same character in the same style, framed shoulders-up: calmer, closer, and
 * unmistakably a different composition. She sits low and right at reduced opacity, turned toward
 * the number, sized well under it. The score is the product; she is the intelligence around it, and
 * the framing has to say which is which.
 *
 * ==============================  NO TREND, EVER  ==============================
 *
 * No arrow, no delta, no chart. One report is one point, and a rising indicator is exactly what a
 * client hopes to see, which is what would make inventing one so effective and so wrong.
 */

/** The portrait is square; the full-body cutout the other screens use is not. */
const PORTRAIT_RATIO = 1;

export function CreditHero({
  scores,
  reportReceivedAt,
  loading,
  onViewAll,
}: {
  scores: BureauScore[];
  reportReceivedAt: string | null;
  loading: boolean;
  onViewAll?: () => void;
}) {
  const { t } = useI18n();
  const { width } = useWindowDimensions();
  const cardW = width - 32;
  const heroH = Math.round(Math.min(Math.max(cardW * 1.02, 350), 430));

  const byBureau = new Map(scores.map((row) => [row.bureau as BureauKey, row]));
  const firstWithScore = BUREAU_ORDER.find((bureau) => byBureau.has(bureau)) ?? 'TransUnion';
  const [selected, setSelected] = useState<BureauKey | null>(null);
  const active = selected ?? firstWithScore;
  const row = byBureau.get(active) ?? null;

  /*
   * Deliberately smaller than the numeral above her. At parity she competed with it, which is the
   * one thing this composition must not do.
   */
  const figureH = Math.round(heroH * 0.46);
  const figureW = Math.round(figureH * PORTRAIT_RATIO);

  return (
    <View style={{ height: heroH, borderRadius: 34, overflow: 'hidden' }}>
      {/* Deep space, not a purple panel. The card's presence comes from light, not from a border. */}
      <LinearGradient
        colors={['#1A0B33', '#120722', '#08040F']}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={{ position: 'absolute', inset: 0 }}
      />
      <View className="absolute inset-0 opacity-70">
        <Starfield />
        <CosmicBubbles />
      </View>

      {/*
        Zoey, low and right, dimmed. Present, not competing.

        Held fully inside the card: pushing her past the right edge cropped her face vertically at
        375pt, which reads as a mistake rather than as a composition. She is a figure standing in
        the scene, so the frame has to contain her.
      */}
      <View
        pointerEvents="none"
        className="absolute"
        style={{
          right: 2,
          /*
            Sitting on the card's floor put her face directly over the Equifax tab and its score
            became unreadable. She stops above the selector row: the controls a person taps have to
            win every collision with decoration, however good the decoration looks.
          */
          bottom: Math.round(heroH * 0.17),
          width: figureW,
          height: figureH,
          opacity: 0.58,
        }}>
        <Image
          source={require('@/assets/images/zoey-avatar.png')}
          style={{ width: figureW, height: figureH }}
          contentFit="contain"
          transition={220}
        />
        {/*
          The portrait ends at a hard shoulder line. Without this she reads as a sticker pasted on
          the card; fading her base into the backdrop lets her emerge from the scene instead.
        */}
        <LinearGradient
          colors={['transparent', 'rgba(10,5,20,0.60)', 'rgba(10,5,20,0.92)']}
          style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: Math.round(figureH * 0.30) }}
        />
      </View>
      {/* Keeps the numerals readable where they cross her. */}
      <LinearGradient
        pointerEvents="none"
        colors={['rgba(8,4,15,0.80)', 'rgba(8,4,15,0.30)', 'transparent']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.82, y: 0 }}
        style={{ position: 'absolute', inset: 0 }}
      />

      <View className="flex-1 justify-between px-5 pb-4 pt-5">
        <Text className="font-sans-medium text-[16px] text-parchment/60">{t('score.creditOverview')}</Text>

        {/*
          The product.

          Centred within the space Zoey does NOT occupy, rather than within the whole card. Centring
          across the full width put the bureau name and the report date underneath her -- the numeral
          survived because it is large and bright, and the two lines that give it meaning did not.
        */}
        <View className="items-center" style={{ paddingRight: Math.round(figureW * 0.62) }}>
          {loading ? (
            <View className="items-center justify-center" style={{ height: 132, width: 220 }}>
              <LinearGradient
                pointerEvents="none"
                colors={['transparent', 'rgba(139,72,255,0.16)', 'transparent']}
                start={{ x: 0, y: 0.5 }}
                end={{ x: 1, y: 0.5 }}
                style={{ position: 'absolute', width: 220, height: 116, borderRadius: 58 }}
              />
              <Text
                className="font-display text-[62px] leading-[70px]"
                style={{ color: 'rgba(244,239,255,0.20)', letterSpacing: 5 }}>
                ···
              </Text>
            </View>
          ) : row ? (
            <>
              {/*
                A quiet halo, fine tracking and tabular numerals give the score the polish of a
                premium financial instrument without turning it into neon signage. The glow belongs
                to the number only; evidence and controls remain crisp and literal.
              */}
              <View className="items-center justify-center" style={{ minHeight: 132, width: 220 }}>
                <LinearGradient
                  pointerEvents="none"
                  colors={['transparent', 'rgba(139,72,255,0.18)', 'rgba(209,172,255,0.10)', 'transparent']}
                  locations={[0, 0.34, 0.68, 1]}
                  start={{ x: 0, y: 0.5 }}
                  end={{ x: 1, y: 0.5 }}
                  style={{ position: 'absolute', width: 220, height: 116, borderRadius: 58 }}
                />
                <Text
                  className="font-sans-semibold text-[10px]"
                  style={{
                    color: 'rgba(221,196,255,0.68)',
                    letterSpacing: 3.2,
                    textTransform: 'uppercase',
                  }}>
                  {t('score.title')}
                </Text>
                <Text
                  className="font-display text-[68px] leading-[76px]"
                  style={{
                    color: '#F7F0FF',
                    fontVariant: ['tabular-nums'],
                    letterSpacing: -3,
                    textShadowColor: 'rgba(183,112,255,0.32)',
                    textShadowOffset: { width: 0, height: 4 },
                    textShadowRadius: 18,
                  }}>
                  {row.score}
                </Text>
                <LinearGradient
                  pointerEvents="none"
                  colors={['transparent', 'rgba(211,176,255,0.62)', 'transparent']}
                  start={{ x: 0, y: 0.5 }}
                  end={{ x: 1, y: 0.5 }}
                  style={{ width: 112, height: 1 }}
                />
              </View>
              <Text className="font-sans-medium text-[17px] text-parchment/70">{active}</Text>
              {reportReceivedAt ? (
                <Text className="mt-1 font-sans text-[13px] text-parchment/40">
                  From your report ·{' '}
                  {new Date(reportReceivedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                </Text>
              ) : null}
            </>
          ) : (
            <>
              <Text className="font-sans-medium text-[26px] text-parchment/45">{t('score.noScoreYet')}</Text>
              <Text className="mt-2 max-w-[260px] text-center font-sans text-[14px] leading-[20px] text-parchment/40">
                {scores.length > 0
                  ? `${active} did not print a score on your report. Zoey will not estimate one.`
                  : 'Once your credit report is in, Zoey reads every score it prints.'}
              </Text>
            </>
          )}
        </View>

        {/*
          The selector carries each bureau's own number, so choosing one is never a guess and the
          two that are not dominant are still visible.
        */}
        <View className="flex-row gap-2">
          {BUREAU_ORDER.map((bureau) => {
            const entry = byBureau.get(bureau);
            const isActive = bureau === active;
            return (
              <Pressable
                key={bureau}
                accessibilityRole="tab"
                accessibilityState={{ selected: isActive }}
                accessibilityLabel={entry ? `${bureau}, score ${entry.score}` : `${bureau}, no score on your report`}
                onPress={() => setSelected(bureau)}
                onLongPress={onViewAll}
                className="flex-1 items-center rounded-2xl py-2.5 active:opacity-80"
                style={{
                  backgroundColor: isActive ? 'rgba(168,85,247,0.24)' : 'rgba(244,239,255,0.05)',
                  borderWidth: 1,
                  borderColor: isActive ? 'rgba(201,155,255,0.45)' : 'transparent',
                }}>
                <Text
                  className="font-sans-medium text-[12.5px]"
                  style={{ color: isActive ? tokens.violet300 : 'rgba(244,239,255,0.5)' }}>
                  {bureau}
                </Text>
                <Text
                  className="mt-0.5 font-display text-[17px]"
                  style={{ color: entry ? (isActive ? tokens.parchment : 'rgba(244,239,255,0.75)') : 'rgba(244,239,255,0.25)' }}>
                  {entry ? entry.score : '—'}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
}
