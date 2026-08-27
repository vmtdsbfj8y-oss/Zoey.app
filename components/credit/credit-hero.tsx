import { Image } from 'expo-image';
import { useI18n } from '@/lib/i18n/context';
import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import { Pressable, Text, View, useWindowDimensions } from 'react-native';

import { RadialGlow } from '@/components/ui/radial-glow';
import { OrbitalPath, ScoreChamber } from '@/components/credit/cosmic-hero-layers';
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

/** `zoey-hero-mock.png`, lifted from the approved mockup, is 938x1400. */
const MOCK_ART_RATIO = 938 / 1400;

/** Inset for the copy block. */
const PAD = 18;
/**
 * The chamber's inset, re-measured off the reference's border column: the glass starts 30px into a
 * 787px card, i.e. 0.038 of the card -- 14pt at 373pt. The old 11 was part of why the chamber read
 * left-heavy against the artwork.
 */
const CHAMBER_PAD = 14;

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
  /*
   * 1.06. An earlier pass moved this to 1.1667 on a card-bottom measurement that had silently
   * failed -- the detector returned its own scan boundary. Reading the mockup's border column
   * directly puts the hero card at 182..1014px, i.e. 392pt against this card's 373.2pt width.
   */
  const heroH = Math.round(Math.min(Math.max(cardW * 1.06, 380), 470));

  const byBureau = new Map(scores.map((row) => [row.bureau as BureauKey, row]));
  const firstWithScore = BUREAU_ORDER.find((bureau) => byBureau.has(bureau)) ?? 'TransUnion';
  const [selected, setSelected] = useState<BureauKey | null>(null);
  const active = selected ?? firstWithScore;
  const row = byBureau.get(active) ?? null;

  /* ----- geometry, all derived from the card so it holds at 402pt and at 440pt ----- */

  const chamber = {
    x: CHAMBER_PAD,
    y: Math.round(heroH * 0.13),
    /* 0.51, from the mockup's chamber outline: 402px across a 787px card. 0.52 plus the smaller
       inset was what pushed the panel wide and left of the artwork. */
    w: Math.round(cardW * 0.51),
    h: Math.round(cardW * 0.397),
  };
  const chamfer = Math.round(Math.min(chamber.w, chamber.h) * 0.148);

  const selectorH = Math.round(cardW * 0.17);
  /*
   * heroH - 13 - selectorH, kept because it is what actually measures right.
   * Deriving this from the mockup's border column instead (bar at 0.8486 of the card, 0.1465 tall)
   * pushed it 16pt down and took "selector text top" from -0.5pt to +9.0pt against the artwork.
   * When a derived fraction and a direct measurement of the rendered result disagree, the direct
   * measurement wins -- the derivation is only as good as the edge detection behind it.
   */
  const selectorY = heroH - 13 - selectorH;
  /*
   * THE SELECTOR IS MEASURED, NOT ASSUMED.
   *
   * Reading the approved reference: the bar starts 14.25pt inside the card and runs 339pt, and its
   * cells are NOT equal thirds. The bureau centres sit at 94.75 / 211.25 / 314.25pt, so the gaps are
   * 116.5 and 103.0 -- the selected cell is about 1.29x an unselected one, which is what gives the
   * chip room to sit inside without crowding its label.
   */
  const selectorLeft = Math.round(cardW * 0.0381);
  const selectorW = Math.round(cardW * 0.9064);
  /** Flex weights reproducing the reference's 133 / 103 / 103 split. */
  const SELECTED_FLEX = 1.291;
  const activeIndex = Math.max(BUREAU_ORDER.indexOf(active), 0);
  /*
   * Cell geometry follows the same weights, so the orbital node lands on the selected cell whichever
   * one it is. Every cell before the active one is unselected, so their combined width is simply
   * `activeIndex` units -- no accumulation needed.
   */
  const totalFlex = SELECTED_FLEX + (BUREAU_ORDER.length - 1);
  const unitW = selectorW / totalFlex;
  const activeCellCentre = activeIndex * unitW + (unitW * SELECTED_FLEX) / 2;

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
  /*
   * PLACED BY HER FACE, FROM THE ASSET'S OWN MEASUREMENTS.
   *
   * The reference puts her face 124.4pt wide with its centre at (279.0, 272.9) on a 402pt screen.
   * `zoey-dashboard.png` carries her face at 0.4043 of its width, centred at (0.5106, 0.2919) of
   * its own box, so the render width and both offsets follow from those two facts rather than from
   * a multiplier that happened to look right.
   */
  /*
   * SIZED BY HER EARRINGS, WHICH ARE MEASURABLE.
   *
   * This was 0.8227, chosen off a face-width landmark that turned out to be measuring a skin-tone
   * bounding box -- it reported a match while she rendered 23% oversized, crowding the planet and
   * covering the galaxy arm the mockup shows past her shoulder. The cyan hoops are unambiguous
   * (nothing else in the frame is that colour), and their centre-to-centre separation is 81.5pt in
   * the mockup against 100.9pt here, a ratio of 0.812. This is that ratio applied. Her art is
   * scaled uniformly -- proportions, face and earrings are untouched.
   */
  /*
   * ZOEY IS NOW THE MOCKUP'S OWN ZOEY.
   *
   * `zoey-dashboard.png` was cut from the splash artwork -- a different illustration of the same
   * character: thicker twisted hair roll, higher bun, heavier brows, warmer skin. No amount of
   * scaling reconciles two different renders. `zoey-hero-mock.png` is lifted from the approved
   * mockup itself with the same alpha-only cutout used before, so the face, hair, brows, lighting,
   * hoops and the Z on her suit are the artwork's.
   *
   * Placement is measured, not tuned: in the mockup her crop starts 0.4514 across the card and
   * runs 0.5817 of its width, starting 0.0584 down the card and running 0.7424 of its height.
   */
  const figureW = Math.round(cardW * 0.5817);
  const figureH = Math.round(figureW / MOCK_ART_RATIO);
  const figureTop = Math.round(heroH * 0.0119);
  const figureLeft = Math.round(cardW * 0.4514);

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
  const scoreSize = Math.round(cardW * 0.2545);

  /*
   * THE CHAMBER LABEL FITS ITS OWN WORDS.
   *
   * "CREDIT SCORE" is 12 characters; "PUNTAJE DE CRÉDITO" is 18. At the tracking English wants, the
   * Spanish label is wider than the chamber and wrapped to two lines. Shrinking the type for
   * everyone to suit the longest translation would be paying for Spanish in English, and shortening
   * the Spanish to fit would be printing an abbreviation that is not what the label says.
   *
   * So the tracking gives way first, then the size, and only as far as each has to. English is
   * untouched at both widths because it never reaches the threshold -- the numbers below leave it
   * roughly 45pt of slack at 402pt.
   */
  const scoreLabel = t('score.title');
  const labelRoom = chamber.w - 26;
  /* Uppercase advance for this face, measured off the rendered label rather than assumed. */
  const labelAdvance = (size: number, track: number) => scoreLabel.length * (size * 0.62 + track);
  let labelSize = 9.8;
  let labelTrack = 3.7;
  if (labelAdvance(labelSize, labelTrack) > labelRoom) {
    labelTrack = Math.max(1.4, labelRoom / scoreLabel.length - labelSize * 0.62);
    if (labelAdvance(labelSize, labelTrack) > labelRoom) {
      labelSize = Math.max(8.5, (labelRoom / scoreLabel.length - labelTrack) / 0.62);
    }
  }

  return (
    <View
      style={{
        height: heroH,
        borderRadius: 30,
        overflow: 'hidden',
        /* The card's own glass edge: one fine violet reflection, as the reference draws it.
           Without it the hero's boundary was only where the artwork stopped. */
        borderWidth: 1,
        borderColor: 'rgba(202,172,255,0.16)',
      }}>
      {/*
        THE SKY IS A PAINTED ASSET, NOT DRAWN PRIMITIVES.
        This was a three-stop gradient plus a handful of SVG nodes: one ellipse for a nebula, a
        circle with two darker circles on it for a moon, one stroked arc. Those describe the scene
        correctly and render it as flat fills and thin outlines -- the card read as a purple panel
        with decoration on it rather than as depth behind the glass. `hero-cosmos.png` is the same
        scene actually painted: layered nebula masses, ~1450 stars on a power-law brightness curve,
        lit planets with terminators, and dust. It carries NO score, bureau, date or control -- it is
        environment only, so nothing dynamic is frozen into an image.
        See tools/cosmos/build.mjs.
      */}
      <Image
        source={require('@/assets/images/hero-cosmos.png')}
        style={{ position: 'absolute', inset: 0 }}
        contentFit="cover"
        pointerEvents="none"
        transition={0}
      />

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
        <RadialGlow size={Math.round(cardW * 0.72)} id="heroZoeyRim" color={tokens.violet500} opacity={0.34} />
      </View>

      {/*
        A second, cooler light: the cyan cast her hoops throw. Small, faint, and high -- around her
        head and shoulder line -- so she is wrapped by two temperatures the way the reference paints
        her, instead of sitting in one flat violet pool.
      */}
      <View
        pointerEvents="none"
        className="absolute"
        style={{
          right: Math.round(cardW * 0.16) - Math.round(cardW * 0.19),
          top: Math.round(heroH * 0.30) - Math.round(cardW * 0.19),
          width: Math.round(cardW * 0.38),
          height: Math.round(cardW * 0.38),
        }}>
        <RadialGlow size={Math.round(cardW * 0.38)} id="heroZoeyCool" color="#67D6F0" opacity={0.10} />
      </View>

      {/*
        Clipped at the selector rather than merely faded near it: her art continues below this box,
        and the controls a person taps have to win every collision with it.
      */}
      <View
        pointerEvents="none"
        className="absolute overflow-hidden"
        style={{
          left: figureLeft,
          top: figureTop,
          width: figureW,
          height: selectorY - figureTop,
        }}>
        <Image
          source={require('@/assets/images/zoey-hero-mock.png')}
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
        /* Lighter than it was: the chamber is real glass now, and a 62% scrim behind it was
           re-flattening the artwork the glass is supposed to show. The copy stays readable on the
           40% floor; verified against the rendered result, not assumed. */
        colors={['rgba(8,4,15,0.40)', 'rgba(8,4,15,0.12)', 'transparent']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.62, y: 0 }}
        style={{ position: 'absolute', inset: 0 }}
      />

      <Text
        className="absolute font-sans text-[15.5px]"
        style={{ left: PAD + 2, top: 20, color: tokens.textSecondary }}>
        {t('score.creditOverview')}
      </Text>

      {/* ----- the product ----- */}
      <View
        className="absolute"
        style={{ left: chamber.x, top: chamber.y, width: chamber.w, height: chamber.h }}>
        <ScoreChamber width={chamber.w} height={chamber.h} chamfer={chamfer} id="heroChamber" />
        <View
          className="absolute inset-0 items-center"
          /*
           * OPTICALLY CENTRED, BY DIRECTION.
           *
           * The asymmetric 20/8 padding sat the numeral visibly right of the chamber's middle.
           * Equal padding alone would not fix it either: letterSpacing is applied after EVERY
           * glyph including the last, so at -9 the text box under-reports the ink by 9pt and the
           * centring math places the ink right of where it looks centred. The extra right padding
           * absorbs exactly that phantom advance.
           */
          style={{ paddingTop: 14, paddingLeft: 11, paddingRight: 20 }}>
          {loading ? (
            <Text
              className="font-display"
              style={{ color: 'rgba(244,239,255,0.22)', fontSize: scoreSize * 0.5, letterSpacing: 6 }}>
              ···
            </Text>
          ) : row ? (
            <>
              <Text
                numberOfLines={1}
                adjustsFontSizeToFit
                className="font-sans-semibold"
                style={{
                  /* The reference label is quieter than the numeral by a wide margin. */
                  color: 'rgba(212,194,242,0.60)',
                  fontSize: labelSize,
                  letterSpacing: labelTrack,
                  textTransform: 'uppercase',
                }}>
                {scoreLabel}
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
                /* SemiBold, not Bold: the reference numerals carry visibly thinner stems and open
                   gaps between digits; Bold at negative tracking welded them into one slab. */
                className="font-display-semibold"
                style={{
                  /*
                   * Negative, and deliberately so. The label needed padding to clear the chamber's
                   * top rim, but the numeral is already measured to within 2pt of the reference --
                   * so it pulls back exactly what the label pushed down, and only the label moves.
                   */
                  marginTop: -17,
                  fontSize: scoreSize,
                  color: '#F7F1FF',
                  /*
                   * -5.5 at SemiBold. The reference runs 138.6pt wide at a 67.4pt cap (ratio
                   * 2.06); SemiBold digits sit closer to that than Bold's did, so the tracking
                   * gives back most of the -9 the heavier face needed.
                   */
                  letterSpacing: -5.5,
                  /*
                   * 9, and restrained. The reference numeral glows a soft lavender at its edges;
                   * at 14/0.70 the app's numeral read blown-out white, a full step hotter than
                   * the artwork. (A shadow wider than ~26 also clips square on the Text frame.)
                   */
                  textShadowColor: 'rgba(199,148,255,0.55)',
                  textShadowOffset: { width: 0, height: 0 },
                  textShadowRadius: 9,
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

      {/*
        The celestial line, OVER the chamber: in the artwork the streak crests the glass itself --
        one continuous shooting star from the sky, across the chamber's crown, down its left rim
        and onto the selected bureau. Drawing it under the rim was reading as two separate
        decorations.
      */}
      <View className="absolute inset-0" pointerEvents="none">
        <OrbitalPath
          width={cardW}
          height={heroH}
          id="heroOrbit"
          chamber={{ ...chamber, c: chamfer }}
          to={{ x: Math.round(selectorLeft + activeCellCentre), y: selectorY - 14 }}
        />
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
          left: selectorLeft,
          top: selectorY,
          width: selectorW,
          height: selectorH,
          borderRadius: 18,
          /* Dark NEUTRAL glass, not a purple rectangle: the tint is near-black with the cosmos
             reading through it, and the stroke is a whisper. The violet belongs to the selected
             capsule, not to the bar. */
          backgroundColor: 'rgba(10,7,18,0.30)',
          borderWidth: 1,
          borderColor: 'rgba(198,166,255,0.13)',
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
              style={{ flex: isActive ? SELECTED_FLEX : 1 }}
              className="items-center justify-center active:opacity-90">
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
                    /* A THIN illuminated capsule, not an opaque button: delicate edge, faint
                       violet depth, and the light under it does the selecting. */
                    borderWidth: 1,
                    borderColor: 'rgba(214,180,255,0.30)',
                    borderTopColor: 'rgba(243,232,255,0.42)',
                  }}>
                  <LinearGradient
                    colors={['rgba(168,85,247,0.16)', 'rgba(126,34,206,0.09)', 'rgba(20,10,40,0.10)']}
                    start={{ x: 0.5, y: 0 }}
                    end={{ x: 0.5, y: 1 }}
                    style={{ position: 'absolute', inset: 0 }}
                  />
                  {/* the controlled glow pooling up from the underline */}
                  <LinearGradient
                    colors={['transparent', 'rgba(199,148,255,0.20)']}
                    start={{ x: 0.5, y: 0.35 }}
                    end={{ x: 0.5, y: 1 }}
                    style={{ position: 'absolute', inset: 0 }}
                  />
                </View>
              ) : null}

              <Text
                className="font-sans-medium text-[13px]"
                style={{
                  /*
                   * SIZE AND TRACKING TOGETHER, BECAUSE THE MOCKUP'S LABEL IS CONDENSED.
                   * Its cap measures 8.0pt across a 59.4pt word; Poppins at that cap runs 65.5pt.
                   * Sizing up alone overshot the width landmark by 6pt, so the extra is tracked
                   * back out. Matching one of the two and calling it done is what left the label a
                   * point short in the first place.
                   */
                  fontSize: 13,
                  letterSpacing: -0.6,
                  color: isActive ? tokens.textPrimary : tokens.textMuted,
                }}>
                {bureau}
              </Text>
              <Text
                className="mt-1 font-display-semibold"
                style={{
                  /* The reference enlarges the SELECTED score as well as brightening it: its cap
                     measures 13pt against 11pt for the other two. */
                  fontSize: isActive ? 20 : 17,
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
                    /* Riding the chip's lower edge, as the reference draws it: the chip's border
                       sits 5 in from the cell, and the bar's bloom straddles that line. */
                    bottom: 4.5,
                    width: Math.round(unitW * 0.684),
                    height: 4,
                    borderRadius: 2,
                    backgroundColor: '#CE8BFF',
                    shadowColor: '#C77DFF',
                    shadowOpacity: 1,
                    shadowRadius: 7,
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
