import { View } from 'react-native';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { RadialGlow } from '@/components/ui/radial-glow';
import { tokens } from '@/constants/tokens';

/**
 * Tab bar icon that lights up when focused: a soft violet halo sits behind the
 * glyph on the active tab only.
 *
 * The focused tab also gets a short lit bar riding the bar's top edge. On a
 * floating glass bar the tint change alone is weak -- the active glyph and the
 * inactive ones are all violet-ish against the same translucent panel -- and
 * the indicator is what makes "you are here" readable at a glance without
 * raising the tab's glow, which has to stay third behind the score and Zoey.
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
        <>
          <View
            pointerEvents="none"
            style={{ position: 'absolute', width: halo, height: halo }}
            className="items-center justify-center">
            <RadialGlow size={halo} id={id} color={tokens.violet500} opacity={0.32} />
          </View>
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              top: -13,
              width: 20,
              height: 3,
              borderRadius: 2,
              backgroundColor: tokens.violet400,
              shadowColor: tokens.violet400,
              shadowOpacity: 0.9,
              shadowRadius: 5,
              shadowOffset: { width: 0, height: 0 },
            }}
          />
        </>
      ) : null}
      <IconSymbol name={name} size={size} color={color} />
    </View>
  );
}
