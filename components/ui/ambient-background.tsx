import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';
import { View } from 'react-native';

import { tokens } from '@/constants/tokens';

/**
 * Floating blurred orbs behind everything.
 *
 * Each orb is a circle filled with a radial gradient that fades to fully
 * transparent, which reads as a soft blurred light without paying for a
 * Gaussian filter on a full-screen surface.
 *
 * The SVG uses a fixed viewBox with `slice`, so the composition scales to any
 * device and the orbs are clipped at the viewport edge -- combined with the
 * `overflow-hidden` wrapper, nothing can overflow horizontally.
 *
 * `pointerEvents="none"` on the wrapper is what keeps this from eating taps.
 *
 * `idPrefix` is required because tab screens stay mounted at the same time --
 * two instances emitting the same gradient ids would collide in the shared
 * SVG id namespace.
 */

/**
 * Violet only, and faint. Magenta orbs are what tinted the whole page hot pink,
 * and at the old opacities the backdrop lifted far enough that the cards had
 * nothing darker to sit against. These are barely-there atmosphere.
 */
const ORBS = [
  { cx: 54, cy: 170, r: 150, color: tokens.violet500, o: 0.13 },
  { cx: 350, cy: 340, r: 170, color: tokens.violet500, o: 0.1 },
  { cx: 30, cy: 560, r: 155, color: tokens.violet600, o: 0.1 },
  { cx: 330, cy: 720, r: 165, color: tokens.violet500, o: 0.09 },
];

export function AmbientBackground({ idPrefix }: { idPrefix: string }) {
  return (
    <View pointerEvents="none" className="absolute inset-0 overflow-hidden">
      <Svg width="100%" height="100%" viewBox="0 0 390 844" preserveAspectRatio="xMidYMid slice">
        <Defs>
          {ORBS.map((orb, i) => (
            <RadialGradient key={i} id={`${idPrefix}orb${i}`} cx="50%" cy="50%" r="50%">
              <Stop offset="0" stopColor={orb.color} stopOpacity={orb.o} />
              <Stop offset="0.6" stopColor={orb.color} stopOpacity={orb.o * 0.3} />
              <Stop offset="1" stopColor={orb.color} stopOpacity={0} />
            </RadialGradient>
          ))}
        </Defs>

        {ORBS.map((orb, i) => (
          <Circle key={i} cx={orb.cx} cy={orb.cy} r={orb.r} fill={`url(#${idPrefix}orb${i})`} />
        ))}
      </Svg>
    </View>
  );
}
