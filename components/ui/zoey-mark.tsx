import { Text, View } from 'react-native';
import Svg, {
  Circle,
  Defs,
  FeGaussianBlur,
  Filter,
  LinearGradient,
  RadialGradient,
  Stop,
} from 'react-native-svg';

import { tokens } from '@/constants/tokens';

/**
 * Zoey's mark: a neon ring with the Z glowing inside it.
 *
 * The ring is three concentric strokes rather than one, which is what makes it
 * read as light instead of as a drawn circle:
 *
 *   1. a wide violet halo, heavily blurred -- the purple that bleeds outward
 *   2. a softer white-lavender bloom, tightly blurred -- the hot inner falloff
 *   3. the sharp stroke on top -- lavender-white, deliberately NOT pure white
 *
 * Pure white on stroke 3 is what made this look like a plain circle: with no
 * hue in the core there is nothing for the halo to be a halo *of*. The ramp
 * runs soft-white into violet so the ring is coloured light all the way through.
 *
 * The SVG canvas is padded beyond `size` to give the blurs somewhere to fall
 * off; a blur drawn at the viewport edge gets clipped. Padding is symmetric, so
 * anything centred over this stays centred. Keep `size + pad * 2` inside the
 * bounds of any `overflow: hidden` parent or the outer halo is cut off -- this
 * is why the default `size` is small relative to the button that holds it.
 */
export function ZoeyMark({
  size = 30,
  /** Must be unique per mounted mark -- SVG ids share a namespace. */
  id = 'zoeyMark',
}: {
  size?: number;
  id?: string;
}) {
  const stroke = Math.max(2, size * 0.1);
  const pad = stroke * 3;
  const canvas = size + pad * 2;
  const c = canvas / 2;
  const r = (size - stroke) / 2;

  const haloId = `${id}Halo`;
  const haloBlurId = `${id}HaloBlur`;
  const bloomBlurId = `${id}BloomBlur`;
  const coreId = `${id}Core`;

  const zStyle = {
    color: '#EFE6FF',
    fontSize: size * 0.54,
    lineHeight: size * 0.68,
    textShadowOffset: { width: 0, height: 0 },
  } as const;

  return (
    <View style={{ width: canvas, height: canvas, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={canvas} height={canvas} style={{ position: 'absolute' }}>
        <Defs>
          {/* Sharp stroke: soft white into violet, never #FFF. */}
          <LinearGradient id={id} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor="#F6EEFF" />
            <Stop offset="0.5" stopColor="#DFC9FF" />
            <Stop offset="1" stopColor="#B98CFF" />
          </LinearGradient>

          <LinearGradient id={haloId} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={tokens.violet400} />
            <Stop offset="1" stopColor={tokens.violet500} />
          </LinearGradient>

          <Filter id={haloBlurId} x="-100%" y="-100%" width="300%" height="300%">
            <FeGaussianBlur stdDeviation={stroke * 1.7} />
          </Filter>
          <Filter id={bloomBlurId} x="-100%" y="-100%" width="300%" height="300%">
            <FeGaussianBlur stdDeviation={stroke * 0.75} />
          </Filter>

          {/* violet light pooling inside the ring, behind the letter */}
          <RadialGradient id={coreId} cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor={tokens.violet500} stopOpacity={0.8} />
            <Stop offset="0.55" stopColor={tokens.violet500} stopOpacity={0.34} />
            <Stop offset="1" stopColor={tokens.violet500} stopOpacity={0} />
          </RadialGradient>
        </Defs>

        {/* 1. wide purple halo */}
        <Circle
          cx={c}
          cy={c}
          r={r}
          stroke={`url(#${haloId})`}
          strokeWidth={stroke * 2.8}
          fill="none"
          opacity={0.95}
          filter={`url(#${haloBlurId})`}
        />

        {/* interior pool, over the halo's inward bleed */}
        <Circle cx={c} cy={c} r={r * 0.95} fill={`url(#${coreId})`} />

        {/* 2. tight white-lavender bloom */}
        <Circle
          cx={c}
          cy={c}
          r={r}
          stroke={`url(#${id})`}
          strokeWidth={stroke * 1.6}
          fill="none"
          opacity={0.7}
          filter={`url(#${bloomBlurId})`}
        />

        {/* 3. sharp ring */}
        <Circle cx={c} cy={c} r={r} stroke={`url(#${id})`} strokeWidth={stroke} fill="none" />
      </Svg>

      {/*
        RN allows a single text shadow per Text, so the letter is stacked: two
        violet copies underneath build the purple bloom, and the crisp letter on
        top keeps a tight core. The absolute copies have auto insets, so the
        parent's centring positions them exactly over the flow copy.
      */}
      <View className="items-center justify-center">
        <Text
          className="font-display"
          style={[
            zStyle,
            {
              position: 'absolute',
              textShadowColor: 'rgba(168,85,247,0.95)',
              textShadowRadius: 18,
            },
          ]}>
          Z
        </Text>
        <Text
          className="font-display"
          style={[
            zStyle,
            {
              position: 'absolute',
              textShadowColor: 'rgba(201,155,255,0.9)',
              textShadowRadius: 9,
            },
          ]}>
          Z
        </Text>
        <Text
          className="font-display"
          style={[zStyle, { textShadowColor: 'rgba(246,238,255,0.7)', textShadowRadius: 4 }]}>
          Z
        </Text>
      </View>
    </View>
  );
}
