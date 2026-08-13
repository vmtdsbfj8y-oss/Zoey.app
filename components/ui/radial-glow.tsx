import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';

import { tokens } from '@/constants/tokens';

/**
 * A soft circular halo: a radial gradient from `color` at `opacity` in the
 * centre out to fully transparent at the edge.
 *
 * Deliberately a gradient rather than a blurred circle -- it reads the same
 * and costs far less than running a Gaussian filter every frame. Purely
 * decorative, so it never takes touches.
 */
export function RadialGlow({
  size,
  id,
  color = tokens.violet500,
  opacity = 0.45,
}: {
  size: number;
  /** Must be unique per mounted glow -- SVG ids share a namespace. */
  id: string;
  color?: string;
  opacity?: number;
}) {
  return (
    <Svg width={size} height={size} pointerEvents="none">
      <Defs>
        <RadialGradient id={id} cx="50%" cy="50%" r="50%">
          <Stop offset="0" stopColor={color} stopOpacity={opacity} />
          <Stop offset="0.55" stopColor={color} stopOpacity={opacity * 0.35} />
          <Stop offset="1" stopColor={color} stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Circle cx={size / 2} cy={size / 2} r={size / 2} fill={`url(#${id})`} />
    </Svg>
  );
}
