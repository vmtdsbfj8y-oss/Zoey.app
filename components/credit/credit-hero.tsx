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

/** `zoey-hero.png` is 940x1672. Every derived box below assumes that aspect. */
const HERO_ART_RATIO = 940 / 1672;

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
  const heroH = Math.round(Math.min(Math.max(cardW * 1.06, 380), 470));

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
    h: Math.round(cardW * 0.397),
  };
  const chamfer = Math.round(Math.min(chamber.w, chamber.h) * 0.135);

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
  /*
   * SIZED BY HER FACE, NOT BY HER BOX.
   *
   * The portrait asset framed her head-and-shoulders, so filling the card with it made her face the
   * largest object in the composition -- which is the one thing the hero must not do, because the
   * score is the product. `zoey-hero.png` is the same character framed wider, head through upper
   * torso, so at the SAME face size far more of her figure is on screen.
   *
   * The multipliers come from measuring the approved reference: her face is 0.333 of the card
   * width, and her face is 0.406 of this asset's own width, which fixes the render width at
   * 0.82 x cardW. Everything else follows from the asset's 0.5622 aspect.
   */
  const figureW = Math.round(cardW * 0.82);
  const figureH = Math.round(figureW / HERO_ART_RATIO);
  const figureTop = -Math.round(cardW * 0.012);
  const figureRight = -Math.round(cardW * 0.108);

  /*
   * The copy beside her is capped rather than centred. Spanish runs roughly 20% longer than English,
   * and an uncapped date line grew straight into her shoulder at 402pt.
   */
  const copyMaxW = Math.round(cardW * 0.52);

  /*
   * 0.243, not larger. At 0.262 the numeral exceeded the chamber's inner width, `adjustsFontSizeToFit`
   * took over and collapsed it to a fraction of its size in the corner -- the guard firing is a
   * layout bug, not a safety net you can lean on.
   */
  const scoreSize = Math.round(cardW * 0.243);

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
          /* Anchored on her FACE, not her box -- the box is a tall portrait now, so centring on it
             would hang the halo around her waist. */
          right: Math.round(cardW * 0.292) - Math.round(cardW * 0.36),
          top: Math.round(heroH * 0.466) - Math.round(cardW * 0.36),
          width: Math.round(cardW * 0.72),
          height: Math.round(cardW * 0.72),
        }}>
        <RadialGlow size={Math.round(cardW * 0.72)} id="heroZoeyRim" color={tokens.violet500} opacity={0.30} />
      </View>

      {/*
        Clipped at the selector rather than merely faded near it: her art continues below this box,
        and the controls a person taps have to win every collision with it.
      */}
      <View
        pointerEvents="none"
        className="absolute overflow-hidden"
        style={{
          right: figureRight,
          top: figureTop,
          width: figureW,
          height: selectorY - figureTop,
        }}>
        <Image
          source={require('@/assets/images/zoey-hero.png')}
          style={{ width: figureW, height: figureH }}
          contentFit="contain"
          transition={220}
        />
        {/*
          She has to leave the scene, not stop. The fade runs over the lower third of the visible
          band so she is gone before the selector's top edge rather than being sliced by it.
        */}
        <LinearGradient
          colors={['transparent', 'rgba(10,5,20,0.55)', 'rgba(10,5,20,0.96)']}
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            height: Math.round((selectorY - figureTop) * 0.34),
          }}
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
        className="absolute font-sans-medium text-[16px]"
        style={{ left: PAD + 2, top: 20, color: tokens.textSecondary }}>
        {t('score.creditOverview')}
      </Text>

      {/* ----- the product ----- */}
      <View
        className="absolute"
        style={{ left: chamber.x, top: chamber.y, width: chamber.w, height: chamber.h }}>
        <ScoreChamber width={chamber.w} height={chamber.h} chamfer={chamfer} id="heroChamber" />
        <View
          className="absolute inset-0 items-center px-2"
          style={{ paddingTop: Math.round(chamber.h * 0.075) }}>
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
                  letterSpacing: 4.2,
                  textTransform: 'uppercase',
                }}>
                {t('score.title')}
              </Text>
              {/*
                `adjustsFontSizeToFit` WITHOUT an explicit `lineHeight`.
                Those two together are the bug that emptied this chamber: when iOS shrinks the glyph
                it keeps the line box at the height you declared, so the numeral drops to the bottom
                of a box three times its size and reads as missing. Letting RN derive the leading is
                what makes the guard safe to keep.
              */}
              <Text
                adjustsFontSizeToFit
                numberOfLines={1}
                className="font-display"
                style={{
                  marginTop: Math.round(chamber.h * 0.085),
                  fontSize: scoreSize,
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
              className="text-center font-sans-medium text-[19px]"
              style={{ paddingHorizontal: 6, color: tokens.textSecondary }}>
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
              <Text numberOfLines={2} className="mt-1 font-sans text-[12.5px]" style={{ color: tokens.textSecondary }}>
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
          <Text className="font-sans text-[13.5px] leading-[19px]" style={{ color: tokens.textSecondary }}>
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
                style={{ color: isActive ? tokens.textPrimary : tokens.textMuted }}>
                {bureau}
              </Text>
              <Text
                className="mt-1 font-display text-[19px]"
                style={{
                  color: entry
                    ? isActive
                      ? tokens.textPrimary
                      : tokens.textSecondary
                    : tokens.textFaint,
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
