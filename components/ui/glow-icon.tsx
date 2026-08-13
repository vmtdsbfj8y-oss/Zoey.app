import { View } from 'react-native';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { RadialGlow } from '@/components/ui/radial-glow';
import { tokens } from '@/constants/tokens';

/**
 * Tab bar icon that lights up when focused: a soft violet halo sits behind the
 * glyph on the active tab only.
 */
export function GlowIcon({
  name,
  color,
  focused,
  id,
  size = 22,
}: {
  name: Parameters<typeof IconSymbol>[0]['name'];
  color: string;
  focused: boolean;
  id: string;
  size?: number;
}) {
  const halo = size * 2.2;

  return (
    <View className="items-center justify-center" style={{ width: size, height: size }}>
      {focused ? (
        <View
          pointerEvents="none"
          style={{ position: 'absolute', width: halo, height: halo }}
          className="items-center justify-center">
          <RadialGlow size={halo} id={id} color={tokens.violet500} opacity={0.5} />
        </View>
      ) : null}
      <IconSymbol name={name} size={size} color={color} />
    </View>
  );
}
