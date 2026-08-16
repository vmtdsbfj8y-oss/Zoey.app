import { BlurView } from 'expo-blur';
import { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { RadialGlow } from '@/components/ui/radial-glow';
import { ZoeyMark } from '@/components/ui/zoey-mark';
import { tokens } from '@/constants/tokens';

const BUTTON = 52;
const HALO = 112;

/**
 * Center tab-bar button: Zoey's mark on clear glass. Rendered as a tab bar
 * button so it sits in the true center of the 4-tab row. It never navigates to
 * its own tab -- the layout intercepts the press and opens the chat modal.
 *
 * Deliberately NOT the filled violet disc used elsewhere. The glass is close to
 * transparent -- a much lighter wash than the opaque `glassBase` the cards use,
 * and a low blur intensity -- because every point of white haze over it is a
 * point of contrast stolen from the violet halo behind. The light comes from
 * `ZoeyMark`, not from the surface.
 *
 * The halo breathes: a slow opacity and scale cycle on the outer glow. It lives
 * outside the button's `overflow: hidden`, so it is free to bleed into the bar.
 */
export function TabFab({ onPress }: { onPress?: () => void }) {
  const pulse = useSharedValue(0);

  useEffect(() => {
    // -1 repeats forever; `true` reverses each cycle, so it eases in and out
    // rather than snapping back to the start.
    pulse.value = withRepeat(
      withTiming(1, { duration: 2600, easing: Easing.inOut(Easing.quad) }),
      -1,
      true
    );
  }, [pulse]);

  const haloStyle = useAnimatedStyle(() => ({
    opacity: 0.6 + pulse.value * 0.4,
    transform: [{ scale: 0.9 + pulse.value * 0.14 }],
  }));

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Chat with Zoey"
      onPress={onPress}
      className="flex-1 items-center justify-center active:opacity-80">
      <View className="items-center justify-center" style={{ marginTop: -24 }}>
        <Animated.View
          pointerEvents="none"
          style={[{ position: 'absolute', width: HALO, height: HALO }, haloStyle]}
          className="items-center justify-center">
          <RadialGlow size={HALO} id="fabHalo" color={tokens.violet500} opacity={0.6} />
        </Animated.View>

        <View
          style={{
            width: BUTTON,
            height: BUTTON,
            borderRadius: BUTTON / 2,
            overflow: 'hidden',
            borderWidth: 1,
            borderColor: 'rgba(168,85,247,0.30)',
            borderTopColor: 'rgba(244,239,255,0.26)',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
          <BlurView intensity={12} tint="dark" style={StyleSheet.absoluteFill} />
          {/* Barely-there white haze -- just enough to catch the edge. */}
          <View
            pointerEvents="none"
            style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(244,239,255,0.035)' }]}
          />
          <View
            pointerEvents="none"
            style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(168,85,247,0.10)' }]}
          />
          {/* 30 + its bloom padding lands at 48, inside the 52 button, so the
              button's overflow:hidden does not clip the ring's outer halo. */}
          <ZoeyMark size={30} id="fabZoeyMark" />
        </View>
      </View>
    </Pressable>
  );
}
