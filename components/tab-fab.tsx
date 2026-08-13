import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, View } from 'react-native';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { RadialGlow } from '@/components/ui/radial-glow';
import { tokens } from '@/constants/tokens';

const BUTTON = 52;
const HALO = 104;

/**
 * Center FAB, rendered as a tab bar button so it sits in the true center of
 * the 4-tab row. It never navigates to its own tab -- the layout intercepts
 * the press and pushes the /upload modal instead.
 *
 * The halo is a radial glow twice the button's diameter, centred behind it,
 * so light radiates out rather than the button being a flat disc.
 */
export function TabFab({ onPress }: { onPress?: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Upload document"
      onPress={onPress}
      className="flex-1 items-center justify-center active:opacity-80">
      <View className="items-center justify-center" style={{ marginTop: -24 }}>
        <View
          pointerEvents="none"
          style={{ position: 'absolute', width: HALO, height: HALO }}
          className="items-center justify-center">
          <RadialGlow size={HALO} id="fabHalo" color={tokens.violet500} opacity={0.55} />
        </View>

        <LinearGradient
          colors={[tokens.violet500, tokens.magenta500]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            width: BUTTON,
            height: BUTTON,
            borderRadius: BUTTON / 2,
            alignItems: 'center',
            justifyContent: 'center',
          }}>
          <IconSymbol name="plus" size={24} color={tokens.parchment} />
        </LinearGradient>
      </View>
    </Pressable>
  );
}
