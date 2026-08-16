import { View, type ViewProps } from 'react-native';
import Svg, { Defs, Ellipse, RadialGradient, Stop } from 'react-native-svg';

import { CARD_RADIUS, GlassSurface } from '@/components/ui/glass-surface';
import { tokens } from '@/constants/tokens';

/**
 * Base surface -- frosted glass, lit from within.
 *
 *  1. a violet radial glow bleeding out past the card's bounds
 *  2. frosted glass: blurred backdrop + violet wash, so the ambient orbs
 *     read faintly through the card instead of being covered by it
 *  3. a lighter top border catching the light
 *
 * The glow sits in an absolutely-positioned wrapper inset *negatively*, so it
 * extends beyond the card. It never takes touches.
 */
export function Card({
  className,
  glowId,
  children,
  ...rest
}: ViewProps & { glowId: string }) {
  return (
    <View {...rest}>
      <View pointerEvents="none" className="absolute -inset-5">
        <Svg width="100%" height="100%">
          <Defs>
            <RadialGradient id={glowId} cx="50%" cy="50%" r="50%">
              <Stop offset="0" stopColor={tokens.violet500} stopOpacity={0.12} />
              <Stop offset="0.6" stopColor={tokens.violet500} stopOpacity={0.04} />

              <Stop offset="1" stopColor={tokens.violet500} stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Ellipse cx="50%" cy="50%" rx="50%" ry="50%" fill={`url(#${glowId})`} />
        </Svg>
      </View>

      <GlassSurface radius={CARD_RADIUS}>
        <View className={`p-4 ${className ?? ''}`}>{children}</View>
      </GlassSurface>
    </View>
  );
}
