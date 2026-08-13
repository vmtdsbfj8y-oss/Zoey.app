import { BlurView } from 'expo-blur';
import { StyleSheet, View, type ViewProps } from 'react-native';

export const CARD_RADIUS = 24;

/**
 * Frosted-glass surface: translucent rather than a solid panel, so the ambient
 * orbs read faintly through it.
 *
 * Layers, bottom to top:
 *   1. BlurView -- blurs whatever sits behind (the backdrop gradient + orbs)
 *   2. a low-opacity violet wash, so the glass is tinted rather than grey
 *   3. content
 *
 * `overflow: hidden` is required: without it the blur ignores the corner
 * radius and paints a square behind the rounded border.
 *
 * The top border is deliberately lighter than the other three -- a single
 * highlight edge catching the light from above, which is what stops the card
 * looking like a flat cutout.
 */
export function GlassSurface({
  radius = CARD_RADIUS,
  intensity = 34,
  tintOpacity = 0.1,
  style,
  children,
  ...rest
}: ViewProps & {
  radius?: number;
  intensity?: number;
  tintOpacity?: number;
}) {
  return (
    <View
      style={[
        {
          borderRadius: radius,
          overflow: 'hidden',
          borderWidth: 1,
          borderColor: 'rgba(168,85,247,0.20)',
          borderTopColor: 'rgba(244,239,255,0.28)',
        },
        style,
      ]}
      {...rest}>
      <BlurView intensity={intensity} tint="dark" style={StyleSheet.absoluteFill} />
      <View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, { backgroundColor: `rgba(168,85,247,${tintOpacity})` }]}
      />
      {children}
    </View>
  );
}

/** Same glass, sized and tinted for small controls (pills, icon chips). */
/** Same glass, sized and tinted for small controls (pills, icon chips). */
export function GlassPill({
  radius = 999,
  intensity = 26,
  tintOpacity = 0.08,
  style,
  children,
  ...rest
}: ViewProps & { radius?: number; intensity?: number; tintOpacity?: number }) {
  return (
    <View
      style={[
        {
          borderRadius: radius,
          overflow: 'hidden',
          borderWidth: 1,
          borderColor: 'rgba(168,85,247,0.22)',
          borderTopColor: 'rgba(244,239,255,0.30)',
        },
        style,
      ]}
      {...rest}>
      <BlurView intensity={intensity} tint="dark" style={StyleSheet.absoluteFill} />
      <View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, { backgroundColor: `rgba(168,85,247,${tintOpacity})` }]}
      />
      {children}
    </View>
  );
}
