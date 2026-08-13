import { LinearGradient } from 'expo-linear-gradient';
import { View, type ViewProps } from 'react-native';
import Svg, { Defs, Ellipse, RadialGradient, Stop } from 'react-native-svg';

import { tokens } from '@/constants/tokens';

/**
 * Base surface -- lit rather than flat.
 *
 * Three layers:
 *  1. a violet radial glow bleeding out past the card's bounds, so the card
 *     looks lit from within rather than pasted onto black
 *  2. a subtle purple gradient fill instead of a single flat colour
 *  3. the hairline border
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
              <Stop offset="0" stopColor={tokens.violet500} stopOpacity={0.22} />
              <Stop offset="0.6" stopColor={tokens.violet500} stopOpacity={0.07} />
              <Stop offset="1" stopColor={tokens.violet500} stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Ellipse cx="50%" cy="50%" rx="50%" ry="50%" fill={`url(#${glowId})`} />
        </Svg>
      </View>

      <LinearGradient
        colors={[tokens.surfaceTop, tokens.surfaceBottom]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ borderRadius: 10, borderWidth: 1, borderColor: tokens.ink700 }}>
        <View className={`p-4 ${className ?? ''}`}>{children}</View>
      </LinearGradient>
    </View>
  );
}
