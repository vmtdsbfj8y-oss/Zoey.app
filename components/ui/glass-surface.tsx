import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View, type ViewProps } from 'react-native';

import { tokens } from '@/constants/tokens';

/**
 * The specular sheen every glass surface carries: a bright band across the top
 * that fades out by ~55% of the height. This is the single detail that makes a
 * translucent panel read as polished glass rather than as a tinted rectangle --
 * real glass catches the light along its upper edge.
 */
function Sheen({ radius }: { radius: number }) {
  return (
    <LinearGradient
      pointerEvents="none"
      colors={['rgba(255,255,255,0.09)', 'rgba(255,255,255,0.025)', 'rgba(255,255,255,0)']}
      locations={[0, 0.4, 1]}
      start={{ x: 0.1, y: 0 }}
      end={{ x: 0.6, y: 1 }}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: '55%',
        borderTopLeftRadius: radius,
        borderTopRightRadius: radius,
      }}
    />
  );
}

export const CARD_RADIUS = 26;

/**
 * Frosted-glass surface: translucent rather than a solid panel, so the ambient
 * orbs read faintly through it.
 *
 * Layers, bottom to top:
 *   1. BlurView -- blurs whatever sits behind (the backdrop gradient + orbs)
 *   2. `base`, a dark purple fill. Required, not optional: the page behind is
 *      near-black, and a blur of near-black is just black, so without its own
 *      fill the card would vanish into the backdrop.
 *   3. a low-opacity violet wash, so the glass is tinted rather than grey
 *   4. content
 *
 * `overflow: hidden` is required: without it the blur ignores the corner
 * radius and paints a square behind the rounded border.
 *
 * The top border is lighter than the other three -- a single highlight edge
 * catching the light from above, which is what stops the card looking like a
 * flat cutout. It is kept subtle; a bright top edge reads as a hard outline
 * rather than a lit surface.
 */
export function GlassSurface({
  radius = CARD_RADIUS,
  intensity = 11,
  tintOpacity = 0.04,
  base = tokens.glassBase,
  glow = false,
  style,
  children,
  ...rest
}: ViewProps & {
  radius?: number;
  intensity?: number;
  tintOpacity?: number;
  base?: string;
  /** Soft violet bloom cast outward from the panel's shape (iOS). */
  glow?: boolean;
}) {
  return (
    <View
      style={[
        glow
          ? {
              shadowColor: tokens.violet500,
              shadowOpacity: 0.35,
              shadowRadius: 14,
              shadowOffset: { width: 0, height: 0 },
            }
          : null,
        {
          borderRadius: radius,
          overflow: 'hidden',
          borderWidth: 1,
          // Carries more weight now that the fill is nearly transparent -- the
          // edge is what makes the card a card.
          borderColor: 'rgba(198,166,255,0.14)',
          borderTopColor: 'rgba(233,213,255,0.22)',
        },
        style,
      ]}
      {...rest}>
      <BlurView intensity={intensity} tint="dark" style={StyleSheet.absoluteFill} />
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: base }]} />
      <View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, { backgroundColor: `rgba(150,110,230,${tintOpacity})` }]}
      />
      <Sheen radius={radius} />
      {children}
    </View>
  );
}

/** Same glass, sized and tinted for small controls (pills, icon chips). */
export function GlassPill({
  radius = 999,
  intensity = 10,
  tintOpacity = 0.05,
  base = 'rgba(46,27,84,0.30)',
  style,
  children,
  ...rest
}: ViewProps & {
  radius?: number;
  intensity?: number;
  tintOpacity?: number;
  base?: string;
}) {
  return (
    <View
      style={[
        {
          borderRadius: radius,
          overflow: 'hidden',
          borderWidth: 1,
          borderColor: 'rgba(198,166,255,0.13)',
          borderTopColor: 'rgba(233,213,255,0.18)',
        },
        style,
      ]}
      {...rest}>
      <BlurView intensity={intensity} tint="dark" style={StyleSheet.absoluteFill} />
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: base }]} />
      <View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, { backgroundColor: `rgba(150,110,230,${tintOpacity})` }]}
      />
      <Sheen radius={radius} />
      {children}
    </View>
  );
}
