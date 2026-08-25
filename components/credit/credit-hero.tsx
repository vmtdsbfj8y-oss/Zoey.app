import { Image } from 'expo-image';
import { useI18n } from '@/lib/i18n/context';
import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import { Pressable, Text, View, useWindowDimensions } from 'react-native';

import { CosmicBubbles, Starfield } from '@/components/documents/galaxy-layers';
import { RadialGlow } from '@/components/ui/radial-glow';
import { HeroSky, OrbitalPath, ScoreChamber } from '@/components/credit/cosmic-hero-layers';
import { BUREAU_ORDER, type BureauKey } from '@/components/credit/bureau-tabs';
import { tokens } from '@/constants/tokens';
import type { BureauScore } from '@/lib/account-api';

/**
 * The credit hero. One score, dominant, in a lit chamber, with Zoey standing in the scene.
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
 * ==============================  THE GLOW HIERARCHY IS A RULE, NOT A MOOD  ==============================
 *
 * Three things on this screen emit light and they are ranked: the score is brightest, Zoey's rim is
 * second, Run Zoey in the tab bar is third. Every glow added to any of them has to be checked
 * against the other two, because the moment a decorative light matches the score's the eye stops
 * knowing where to land and the whole composition flattens -- which is exactly what a screen full of
 * equal neon does.
 *
 * ==============================  THE ORBITAL PATH EARNS ITS PIXELS  ==============================
 *
 * The curve under the chamber is a connector, not a swoosh. Its endpoint tracks the SELECTED cell,
 * so it visibly re-aims when a different bureau is chosen. A fixed decorative arc would cost the
 * same and say nothing.
 *
 * ==============================  NO TREND, EVER  ==============================
 *
 * No arrow, no delta, no chart. One report is one point, and a rising indicator is exactly what a
 * client hopes to see, which is what would make inventing one so effective and so wrong.
 */

/** The portrait source is square; every derived box below assumes that. */
const PORTRAIT_RATIO = 1;

/** Inset from the card edge. The chamber, the copy and the selector all share it, so they line up. */
const PAD = 18;

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
  const { t, formatDate } = useI18n();
  const { width } = useWindowDimensions();
  const cardW = width - 32;
  const heroH = Math.round(Math.min(Math.max(cardW * 0.94, 338), 412));

  const byBureau = new Map(scores.map((row) => [row.bureau as BureauKey, row]));
  const firstWithScore = BUREAU_ORDER.find((bureau) => byBureau.has(bureau)) ?? 'TransUnion';
  const [selected, setSelected] = useState<BureauKey | null>(null);
  const active = selected ?? firstWithScore;
  const row = byBureau.get(active) ?? null;

  /* ----- geometry, all derived from the card so it holds at 402pt and at 440pt ----- */

  const chamber = {
    x: PAD,
    y: Math.round(heroH * 0.13),
    w: Math.round(cardW * 0.52),
    h: Math.round(cardW * 0.375),
  };
  const chamfer = Math.round(Math.min(chamber.w, chamber.h) * 0.105);

  const selectorH = Math.round(cardW * 0.17);
  const selectorY = heroH - 8 - selectorH;
  const selectorW = cardW - PAD * 2;
  const cellW = selectorW / BUREAU_ORDER.length;
  const activeIndex = Math.max(BUREAU_ORDER.indexOf(active), 0);

  /*
   * Zoey. Larger and closer than she was -- she reads as present in the scene rather than as a
   * watermark -- but her box still STOPS above the selector, because the controls a person taps have
   * to win every collision with art, however good the art is.
   */
  const figureH = Math.round(heroH * 0.60);
  const figureW = Math.round(figureH * PORTRAIT_RATIO);
  const figureTop = Math.round(heroH * 0.19);
  /*
   * The overhang is measured, not guessed. Her opaque pixels span 0.108-0.861 of the square, so a
   * 0.14 overhang lands her hair exactly on the card's right edge -- any more clips it, any less
   * leaves a gap she is supposed to fill.
   */
  const figureRight = -Math.round(figureW * 0.14);

  /*
   * The copy beside her is capped rather than centred. Spanish runs roughly 20% longer than English,
   * and an uncapped date line grew straight into her shoulder at 402pt.
   */
  const copyMaxW = Math.round(cardW * 0.52);

  const scoreSize = Math.round(cardW * 0.23);

  return (
    <View style={{ height: heroH, borderRadius: 30, overflow: 'hidden' }}>
      {/* Deep space, not a purple panel. The card's presence comes from light, not from a border. */}
      <LinearGradient
        colors={['#1A0B33', '#120722', '#08040F']}
        start={{ x: 0.25, y: 0 }}
        end={{ x: 0.85, y: 1 }}
        style={{ position: 'absolute', inset: 0 }}
      />
      <View className="absolute inset-0">
        <HeroSky width={cardW} height={heroH} id="heroSky" />
      </View>
      <View className="absolute inset-0 opacity-70">
        <Starfield />
        <CosmicBubbles />
      </View>

      {/*
        Zoey's rim light -- second in the hierarchy, so it is deliberately dimmer and wider than the
        chamber's bloom. It sits BEHIND her, which is what turns a flat cutout into a figure lit from
        the scene rather than pasted onto it.
      */}
      <View
        pointerEvents="none"
        className="absolute items-center justify-center"
        style={{
          right: -Math.round(figureW * 0.28),
          top: figureTop - Math.round(figureH * 0.04),
          width: Math.round(figureW * 1.25),
          height: Math.round(figureW * 1.25),
        }}>
        <RadialGlow size={Math.round(figureW * 1.25)} id="heroZoeyRim" color={tokens.violet500} opacity={0.30} />
      </View>

      <View
        pointerEvents="none"
        className="absolute"
        style={{
          right: figureRight,
          top: figureTop,
          width: figureW,
          height: figureH,
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
          colors={['transparent', 'rgba(10,5,20,0.55)', 'rgba(10,5,20,0.95)']}
          style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: Math.round(figureH * 0.28) }}
        />
      </View>

      {/*
        A scrim over the left half only. The old version dimmed the whole card to protect the
        numerals and took Zoey down with it; the chamber now carries its own fill, so this only has
        to keep the bureau name and date legible on open space.
      */}
      <LinearGradient
        pointerEvents="none"
        colors={['rgba(8,4,15,0.62)', 'rgba(8,4,15,0.18)', 'transparent']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.62, y: 0 }}
        style={{ position: 'absolute', inset: 0 }}
      />

      {/* The connector, under the chamber so the chamber's rim stays unbroken where they meet. */}
      <View className="absolute inset-0" pointerEvents="none">
        <OrbitalPath
          width={cardW}
          height={heroH}
          id="heroOrbit"
          from={{ x: chamber.x + chamfer * 0.5, y: chamber.y + chamber.h - chamfer * 0.5 }}
          to={{ x: Math.round(PAD + cellW * (activeIndex + 0.5)), y: selectorY - 14 }}
        />
      </View>

      <Text
        className="absolute font-sans-medium text-[16px] text-parchment/60"
        style={{ left: PAD + 2, top: 20 }}>
        {t('score.creditOverview')}
      </Text>

      {/* ----- the product ----- */}
      <View
        className="absolute"
        style={{ left: chamber.x, top: chamber.y, width: chamber.w, height: chamber.h }}>
        <ScoreChamber width={chamber.w} height={chamber.h} chamfer={chamfer} id="heroChamber" />
        <View className="absolute inset-0 items-center justify-center px-2">
          {loading ? (
            <Text
              className="font-display"
              style={{ color: 'rgba(244,239,255,0.22)', fontSize: scoreSize * 0.5, letterSpacing: 6 }}>
              ···
            </Text>
          ) : row ? (
            <>
              <Text
                className="font-sans-semibold text-[10.5px]"
                style={{
                  color: 'rgba(226,205,255,0.78)',
                  letterSpacing: 3.4,
                  textTransform: 'uppercase',
                }}>
                {t('score.title')}
              </Text>
              {/*
                `adjustsFontSizeToFit` is the guard, not the design. At 402pt a three-digit score
                clears the chamber with room; it is here so a wider numeral face or a larger text
                size setting shrinks the number instead of clipping it.
              */}
              <Text
                adjustsFontSizeToFit
                numberOfLines={1}
                className="font-display"
                style={{
                  marginTop: 2,
                  fontSize: scoreSize,
                  lineHeight: Math.round(scoreSize * 1.12),
                  color: '#FBF7FF',
                  fontVariant: ['tabular-nums'],
                  letterSpacing: -2,
                  textShadowColor: 'rgba(196,140,255,0.62)',
                  textShadowOffset: { width: 0, height: 0 },
                  textShadowRadius: 26,
                }}>
                {row.score}
              </Text>
            </>
          ) : (
            <Text
              className="text-center font-sans-medium text-[19px] text-parchment/50"
              style={{ paddingHorizontal: 6 }}>
              {t('score.noScoreYet')}
            </Text>
          )}
        </View>
      </View>

      {/* ----- what the number is, and where it came from ----- */}
      <View
        className="absolute"
        style={{ left: PAD + 2, top: chamber.y + chamber.h + Math.round(heroH * 0.055), width: copyMaxW }}>
        {loading ? null : row ? (
          <>
            <Text className="font-sans-medium text-[20px]" style={{ color: 'rgba(244,239,255,0.92)' }}>
              {active}
            </Text>
            {reportReceivedAt ? (
              <Text numberOfLines={2} className="mt-1 font-sans text-[12.5px] text-parchment/45">
                {t('score.fromReport', {
                  values: {
                    date: formatDate(new Date(reportReceivedAt), {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    }),
                  },
                })}
              </Text>
            ) : null}
          </>
        ) : (
          <Text className="font-sans text-[13.5px] leading-[19px] text-parchment/45">
            {scores.length > 0
              ? t('score.bureauNoPrint', { values: { bureau: active } })
              : t('score.awaitingReport')}
          </Text>
        )}
      </View>

      {/* ----- one unified glass selector ----- */}
      <View
        className="absolute flex-row overflow-hidden"
        style={{
          left: PAD,
          top: selectorY,
          width: selectorW,
          height: selectorH,
          borderRadius: 18,
          backgroundColor: 'rgba(255,255,255,0.030)',
          borderWidth: 1,
          borderColor: 'rgba(200,170,255,0.12)',
        }}>
        {BUREAU_ORDER.map((bureau, index) => {
          const entry = byBureau.get(bureau);
          const isActive = bureau === active;
          /*
           * A divider only between two UNSELECTED cells. Next to the selected chip its own lit edge
           * is already the boundary, and drawing both put two parallel lines 5pt apart.
           */
          const divider = index > 0 && !isActive && BUREAU_ORDER[index - 1] !== active;

          return (
            <Pressable
              key={bureau}
              accessibilityRole="tab"
              accessibilityState={{ selected: isActive }}
              accessibilityLabel={
                entry
                  ? t('score.a11yBureauScore', { values: { bureau, score: entry.score } })
                  : t('score.a11yBureauNoScore', { values: { bureau } })
              }
              onPress={() => setSelected(bureau)}
              onLongPress={onViewAll}
              className="flex-1 items-center justify-center active:opacity-90">
              {divider ? (
                <View
                  pointerEvents="none"
                  style={{
                    position: 'absolute',
                    left: 0,
                    top: selectorH * 0.2,
                    bottom: selectorH * 0.2,
                    width: 1,
                    backgroundColor: 'rgba(244,239,255,0.13)',
                  }}
                />
              ) : null}

              {/*
                The selected cell: violet DEPTH rather than a violet fill. The gradient is lit from
                the top and the rim brightens with it, which is what separates a raised chip from a
                coloured rectangle -- and it stays restrained enough that the score above it is still
                unambiguously the brightest thing in the card.
              */}
              {isActive ? (
                <View
                  pointerEvents="none"
                  style={{
                    position: 'absolute',
                    left: 5,
                    right: 5,
                    top: 5,
                    bottom: 5,
                    borderRadius: 13,
                    overflow: 'hidden',
                    borderWidth: 1,
                    borderColor: 'rgba(201,155,255,0.42)',
                    borderTopColor: 'rgba(230,210,255,0.62)',
                  }}>
                  <LinearGradient
                    colors={['rgba(168,85,247,0.26)', 'rgba(126,34,206,0.16)', 'rgba(20,10,40,0.20)']}
                    start={{ x: 0.5, y: 0 }}
                    end={{ x: 0.5, y: 1 }}
                    style={{ position: 'absolute', inset: 0 }}
                  />
                </View>
              ) : null}

              <Text
                className="font-sans-medium text-[13px]"
                style={{ color: isActive ? tokens.parchment : 'rgba(244,239,255,0.48)' }}>
                {bureau}
              </Text>
              <Text
                className="mt-1 font-display text-[19px]"
                style={{
                  color: entry
                    ? isActive
                      ? tokens.parchment
                      : 'rgba(244,239,255,0.72)'
                    : 'rgba(244,239,255,0.25)',
                }}>
                {entry ? entry.score : '—'}
              </Text>

              {/* The small illuminated indicator, sitting on the chip's lower edge. */}
              {isActive ? (
                <View
                  pointerEvents="none"
                  style={{
                    position: 'absolute',
                    bottom: 4,
                    width: Math.round(cellW * 0.54),
                    height: 3.5,
                    borderRadius: 2,
                    backgroundColor: '#C99BFF',
                    shadowColor: '#C99BFF',
                    shadowOpacity: 0.9,
                    shadowRadius: 6,
                    shadowOffset: { width: 0, height: 0 },
                  }}
                />
              ) : null}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
