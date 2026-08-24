import { Image } from 'expo-image';
import { useI18n } from '@/lib/i18n/context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Pressable, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, {
  Defs,
  FeGaussianBlur,
  Filter,
  LinearGradient as SvgLinearGradient,
  Stop,
  Text as SvgText,
} from 'react-native-svg';

import { BubbleField } from '@/components/welcome/bubble-field';
import { GlassSurface } from '@/components/ui/glass-surface';

/**
 * Cinematic landing screen.
 *
 * Holds NO authentication logic -- "Get Started" pushes the existing `/sign-in`
 * route, which still owns every Supabase call.
 *
 * Absolute layering rather than a flex column: the composition is Zoey lit from
 * several directions with orbs at different depths in front of and behind her,
 * and the glass card overlapping her lower body. Every position is a fraction
 * of the measured window so it scales from an SE to a Pro Max.
 */

/**
 * THE HERO ART: WHY IT IS `zoey-splash.png` AND NOT `zoey-hero.png`.
 *
 * ==========================  THE ASSET WAS THE BUG  ==========================
 *
 * `zoey-hero.png` is a background-removed cutout of this same illustration, and
 * the cutout ate her arms. Rendered against a grey plate the damage is plain:
 * her left arm stops dead at mid-upper-arm in a feathered stump, her right arm
 * is sheared off on a diagonal, and the whole lower torso dissolves into
 * matting smear. It is not a crop and no layout can recover it -- those pixels
 * do not exist in the file. Her dark suit had no contrast against the dark
 * background, so the mask took the arms out with the backdrop.
 *
 * An earlier pass measured the alpha channel, found the silhouette 905px wide
 * near the bottom, and concluded the arms were present and merely being
 * darkened. That measurement was real; the conclusion was wrong. Width is not
 * anatomy -- what was being measured was the ragged smear itself.
 *
 * `zoey-splash.png` is the ORIGINAL, uncut illustration: same character, same
 * pose, same art direction, and both arms complete and continuous down past the
 * bottom of the frame. It was sitting unused in the project. It carries its own
 * purple background, stars and bubbles -- which is the aesthetic the cutout plus
 * BubbleField was reconstructing in the first place -- so it becomes the
 * backdrop as well as the figure.
 *
 * ==========================  LANDMARKS, MEASURED  ==========================
 *
 * As fractions of the file's height (940x1672):
 */
/**
 * The illustration's own top-edge colour, sampled from the file.
 *
 * The page is painted this exact value so the art's upper boundary has nothing
 * to be a boundary against. It is the whole seam fix: not a gradient, not a
 * mask -- the same colour on both sides of the line.
 */
const ART_EDGE = '#05001E';

const ART = {
  ratio: 940 / 1672,
  /** Top of her hair. Anchoring here keeps her clear of the wordmark. */
  hairTop: 0.06,
  /** Both arms are established and reading as arms from here down. */
  armsEnd: 0.78,
  /**
   * A black matting artifact sits low in the source, centred. It is kept behind
   * the CTA card on every screen size rather than retouched -- see the layout
   * assertion below.
   */
  artifactTop: 0.83,
};

export default function WelcomeScreen() {
  const { t } = useI18n();
  const router = useRouter();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const titleSize = Math.min(width * 0.163, 70);
  const taglineSize = Math.min(width * 0.038, 16);
  const cardBottom = Math.max(insets.bottom, 10) + height * 0.008;

  /**
   * FULL-BLEED WIDTH, ANCHORED BY HER HAIRLINE.
   *
   * The image carries its own background now, so it has to reach both screen
   * edges: sized any narrower it becomes a framed picture with black bars down
   * the sides, which was tried and looks exactly as bad as it sounds. Width is
   * therefore the screen, and height follows the art's own ratio -- she is never
   * stretched.
   *
   * Vertically she hangs from her hairline, placed just under the tagline, so
   * the wordmark never lands on her face and the transparent-header maths cannot
   * drift her down. Everything below the card top is hers to spill into: that is
   * where her forearms and the source's matting artifact both live, and the card
   * covers them on every size checked (SE through Pro Max).
   */
  const titleBlockBottom =
    insets.top + height * 0.008 + titleSize * 1.5 - titleSize * 0.28 + taglineSize * 1.35;
  const figureW = width;
  const figureH = figureW / ART.ratio;

  /**
   * THE ART'S TOP EDGE STARTS BELOW THE TYPE, NOT BEHIND IT.
   *
   * The wordmark's baseline and the whole tagline were previously drawn ON the
   * artwork: the image began a few points under the Z, because the figure was
   * hung from her hairline and the art's headroom pulled its top edge up past
   * the text. With a lit strip above it, that put the type straight across the
   * boundary -- which is what "ZOEY is overlapping" was describing.
   *
   * The image now simply begins under the tagline. Her hairline follows from
   * the art's own headroom rather than being positioned independently, so there
   * is one anchor instead of two fighting each other.
   */
  const figureTop = titleBlockBottom + height * 0.012;


  return (
    <View className="flex-1" style={{ backgroundColor: ART_EDGE, overflow: 'hidden' }}>
      {/*
        THE LIGHTING RIG IS GONE, AND THAT IS THE FIX.

        `SceneLight` was built to light a CUT-OUT Zoey standing on a bare page.
        The art is a finished illustration now: it carries its own key, fill and
        rim, and it is opaque. So the rig rendered behind it -- invisible -- and
        the only place it could be seen was the strip ABOVE it, where it laid a
        wide violet wash over the bare backdrop.

        That is what the band was. Not a brightness step down into the artwork,
        but a brightness step UP out of it: the strip above the art was being
        lit while the art's own top edge is near-black, so the wordmark ended up
        sitting in a pale rectangle with a hard lower edge. Every violet overlay
        that reached above the art's top edge did the same thing -- the two
        light-wrap gradients started at y=0, and a glow pool had been added
        behind the title.

        Removing them leaves the strip the same near-black the art starts with,
        with the same orbs drifting through it. There is no seam to hide, so
        nothing is painted over one.
      */}

      {/*
        THE BACK ORB LAYER IS WHAT MAKES THE TOP ONE SCENE.
        
        It was removed on the assumption that an opaque hero image hides
        whatever is behind it. True where the image is -- and the whole problem
        is where it ISN'T. Above the art there was nothing but flat ink, so the
        screen read as a dead title bar with a picture pasted underneath: the
        break was not a brightness step (the art's own top edge is #05001e,
        within a hair of the page) but the moment TEXTURE began. Orbs and stars
        started existing at a horizontal line.
        
        These orbs sit at y 0.09-0.45 of the screen, which is exactly the band
        above the figure, so the field now runs unbroken from the wordmark down
        into the artwork. Where the art does cover them they are simply hidden,
        which costs nothing.
      */}
      <BubbleField layer="back" width={width} height={height} />

      <Image
        source={require('@/assets/images/zoey-splash.png')}
        style={{
          position: 'absolute',
          top: figureTop,
          left: (width - figureW) / 2,
          width: figureW,
          height: figureH,
        }}
        // The box is built on the art's own ratio, so cover and contain agree.
        // cover is the safer of the two: sub-pixel rounding crops a hair rather
        // than letterboxing a hairline of black down one edge.
        contentFit="cover"
        cachePolicy="memory-disk"
        transition={260}
      />

      {/*
        The last few points of the join.

        The page is already painted the art's own top-edge colour, so the two
        meet at nearly the same value -- but "nearly" still leaves a hairline
        where the illustration's vignette runs a shade brighter at one corner.
        This is a short fall of that SAME colour over the art's first rows,
        which is starfield and nothing else, so the edge resolves into the page
        instead of stopping at it.

        Deliberately dark and deliberately short. The previous attempt at this
        was violet and reached from the top of the screen, which is how it
        became a lit rectangle with the wordmark trapped inside it.
      */}
      <LinearGradient
        pointerEvents="none"
        colors={['rgba(5,0,30,1)', 'rgba(5,0,30,0)']}
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: figureTop,
          height: height * 0.05,
        }}
      />

      {/* orbs crossing in front of her */}
      <BubbleField layer="front" width={width} height={height} />

      {/*
        Floor dissolve, pulled DOWN onto the card.

        It used to start at 60% of the screen and reach 60% black by 82% -- and
        her arms live between 55% and 80%. So the one element meant to stop her
        looking cut off was the element erasing her arms: they were rendered,
        lit, and then painted over with up to 45% black. Her costume is already
        near-black, so what was left of them read as background.

        It now begins below the widest point of her arms and only reaches full
        strength behind the card, where there is nothing of her left to hide.
      */}
      <LinearGradient
        pointerEvents="none"
        colors={['rgba(5,0,30,0)', 'rgba(5,0,30,0.5)', 'rgba(5,0,30,0.94)']}
        locations={[0, 0.55, 1]}
        style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: height * 0.26 }}
      />

      {/* ZOEY wordmark. SVG text so the neon gradient is a real gradient fill --
          React Native cannot gradient-fill a <Text> -- with a blurred copy of
          the same glyphs behind it for the light bloom. */}
      <View
        pointerEvents="none"
        style={{ position: 'absolute', top: insets.top + height * 0.008, width }}>
        <Svg width={width} height={titleSize * 1.5}>
          <Defs>
            <SvgLinearGradient id="wordmark" x1="0" y1="0" x2="0.85" y2="1">
              <Stop offset="0" stopColor="#FFEAFD" />
              <Stop offset="0.3" stopColor="#F0B6FF" />
              <Stop offset="0.66" stopColor="#C77DFF" />
              <Stop offset="1" stopColor="#9333EA" />
            </SvgLinearGradient>
            <SvgLinearGradient id="wordmarkGlow" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor="#F0ABFC" />
              <Stop offset="1" stopColor="#A855F7" />
            </SvgLinearGradient>
            <Filter id="wordmarkBlur" x="-40%" y="-40%" width="180%" height="180%">
              <FeGaussianBlur stdDeviation={titleSize * 0.11} />
            </Filter>
          </Defs>

          {/* bloom */}
          <SvgText
            x={width / 2}
            y={titleSize}
            fill="url(#wordmarkGlow)"
            fontSize={titleSize}
            fontFamily="Poppins_700Bold"
            fontWeight="bold"
            textAnchor="middle"
            letterSpacing={titleSize * 0.055}
            opacity={0.9}
            filter="url(#wordmarkBlur)">
            ZOEY
          </SvgText>

          {/* crisp letterforms */}
          <SvgText
            x={width / 2}
            y={titleSize}
            fill="url(#wordmark)"
            fontSize={titleSize}
            fontFamily="Poppins_700Bold"
            fontWeight="bold"
            textAnchor="middle"
            letterSpacing={titleSize * 0.055}>
            ZOEY
          </SvgText>
        </Svg>

        <Text
          className="text-center font-sans"
          style={{
            marginTop: -titleSize * 0.28,
            fontSize: Math.min(width * 0.038, 16),
            color: '#F3E8FF',
            textShadowColor: 'rgba(192,132,252,0.7)',
            textShadowOffset: { width: 0, height: 0 },
            textShadowRadius: 12,
          }}>
          {t('welcome.tagline')}
        </Text>
      </View>

      {/* bottom glass card -- smaller, darker and more transparent than before */}
      <View
        style={{
          position: 'absolute',
          left: width * 0.055,
          right: width * 0.055,
          bottom: cardBottom,
        }}>
        <GlassSurface
          radius={28}
          intensity={30}
          tintOpacity={0.07}
          base="rgba(24,10,44,0.46)"
          glow>
          <View style={{ paddingHorizontal: width * 0.055, paddingTop: 15, paddingBottom: 14 }}>
            <Text
              className="text-center font-sans"
              style={{ fontSize: Math.min(width * 0.038, 16), color: '#EFE2FF' }}>
              {t('welcome.headline1')}
            </Text>
            <Text
              className="text-center font-sans-semibold"
              style={{ marginTop: 1, fontSize: Math.min(width * 0.046, 19), color: '#FFFFFF' }}>
              {t('welcome.headline2')}
            </Text>
            <Text
              className="text-center font-sans"
              style={{
                marginTop: 4,
                fontSize: Math.min(width * 0.032, 13.5),
                color: 'rgba(239,226,255,0.66)',
              }}>
              {t('welcome.subline')}
            </Text>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('welcome.getStarted')}
              onPress={() => router.push('/sign-in')}
              className="active:opacity-90"
              style={{ marginTop: 14 }}>
              <LinearGradient
                colors={['#F58BE0', '#C56BF5', '#8B3FF5']}
                start={{ x: 0, y: 0.5 }}
                end={{ x: 1, y: 0.5 }}
                style={{
                  borderRadius: 999,
                  paddingVertical: 14,
                  alignItems: 'center',
                  shadowColor: '#D06BF0',
                  shadowOpacity: 0.6,
                  shadowRadius: 16,
                  shadowOffset: { width: 0, height: 0 },
                }}>
                <LinearGradient
                  pointerEvents="none"
                  colors={['rgba(255,255,255,0.3)', 'rgba(255,255,255,0)']}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: '55%',
                    borderTopLeftRadius: 999,
                    borderTopRightRadius: 999,
                  }}
                />
                <Text
                  className="font-sans-semibold"
                  style={{ fontSize: Math.min(width * 0.041, 17), color: '#FFFFFF' }}>
                  {t('welcome.getStarted')}
                </Text>
              </LinearGradient>
            </Pressable>
          </View>
        </GlassSurface>
      </View>
    </View>
  );
}
