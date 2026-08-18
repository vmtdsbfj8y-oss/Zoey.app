import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { RadialGlow } from '@/components/ui/radial-glow';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { ZoeyMark } from '@/components/ui/zoey-mark';
import { tokens } from '@/constants/tokens';

const BUTTON = 60;
const HALO = 128;

/**
 * RUN ZOEY -- the primary action, and the only control in the app built to look
 * like one.
 *
 * ==========================  WHAT CHANGED, AND WHY  ==========================
 *
 * The old button was a thin ring of light on near-clear glass: a neon circle.
 * It read as decoration sitting in the bar rather than as the thing you press.
 * Depth is what fixes that, and depth here is built from four stacked layers
 * rather than from a brighter glow:
 *
 *   1. a breathing violet halo, OUTSIDE the clipped button so it bleeds freely
 *   2. dark blur, so the backdrop and orbs stay visible through the glass
 *   3. a top-lit purple/black gradient wash -- light from above, the way a
 *      physical dome catches a room
 *   4. an inner glow pooled at the bottom, which is what makes the surface read
 *      as convex instead of as a flat sticker
 *
 * The rim does the rest: a violet edge that lightens to near-white across the
 * top arc, which is the specular highlight a glass dome actually has. It is a
 * border rather than a drawn ring, so it hugs the shape at any size.
 *
 * Brightness was never the problem. Every point of white haze added to the fill
 * is a point of contrast stolen from the halo behind it, so the fill stays dark
 * and the light comes from the mark and the rim.
 *
 * ==========================  IT GATES NOTHING ITSELF  ==========================
 *
 * Pressing it always opens the Run Zoey experience. Whether that experience
 * runs or shows the locked card is decided there, by `useMembership()`, from the
 * server's answer. This button has no entitlement logic and cannot acquire any:
 * the lock hint below is read from the same context and is presentation only.
 */
export function TabFab({
  onPress,
  locked,
}: {
  onPress?: () => void;
  /** Presentation only. Never gates the press -- the destination decides. */
  locked?: boolean;
}) {
  const pulse = useSharedValue(0);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (reduceMotion) return;
    // -1 repeats forever; `true` reverses each cycle, so it eases in and out
    // rather than snapping back to the start.
    pulse.value = withRepeat(
      withTiming(1, { duration: 2800, easing: Easing.inOut(Easing.quad) }),
      -1,
      true
    );
  }, [pulse, reduceMotion]);

  const haloStyle = useAnimatedStyle(() => ({
    opacity: 0.52 + pulse.value * 0.34,
    transform: [{ scale: 0.92 + pulse.value * 0.12 }],
  }));

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={locked ? 'Run Zoey, Zoey Member feature' : 'Run Zoey'}
      accessibilityHint="Opens the Run Zoey analysis experience"
      onPress={onPress}
      className="flex-1 items-center justify-center active:opacity-90">
      <View className="items-center justify-center" style={{ marginTop: -26 }}>
        <Animated.View
          pointerEvents="none"
          style={[{ position: 'absolute', width: HALO, height: HALO }, haloStyle]}
          className="items-center justify-center">
          <RadialGlow size={HALO} id="fabHalo" color={tokens.violet500} opacity={0.62} />
        </Animated.View>

        <View
          style={{
            width: BUTTON,
            height: BUTTON,
            borderRadius: BUTTON / 2,
            alignItems: 'center',
            justifyContent: 'center',
            // Cast onto the bar itself, so the button sits ABOVE the surface
            // rather than being inlaid into it.
            shadowColor: tokens.violet500,
            shadowOpacity: 0.55,
            shadowRadius: 16,
            shadowOffset: { width: 0, height: 6 },
            elevation: 10,
          }}>
          <View
            style={{
              width: BUTTON,
              height: BUTTON,
              borderRadius: BUTTON / 2,
              overflow: 'hidden',
              borderWidth: 1,
              borderColor: 'rgba(168,85,247,0.42)',
              // The specular edge: the top arc catches the light, the bottom
              // stays in shadow. Two borders is all RN needs to imply a dome.
              borderTopColor: 'rgba(244,239,255,0.55)',
              borderBottomColor: 'rgba(126,34,206,0.30)',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
            <BlurView intensity={18} tint="dark" style={StyleSheet.absoluteFill} />

            {/* Purple/black wash, lit from the top. */}
            <LinearGradient
              pointerEvents="none"
              colors={[
                'rgba(168,85,247,0.34)',
                'rgba(88,28,135,0.26)',
                'rgba(7,3,15,0.55)',
              ]}
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 1 }}
              style={StyleSheet.absoluteFill}
            />

            {/* Inner glow pooled low -- the convex read. Oversized and pushed
                below centre so only its upper falloff shows inside the circle. */}
            <View
              pointerEvents="none"
              style={{
                position: 'absolute',
                width: BUTTON * 1.5,
                height: BUTTON * 1.5,
                borderRadius: BUTTON * 0.75,
                bottom: -BUTTON * 0.86,
                backgroundColor: tokens.violet500,
                opacity: 0.4,
              }}
            />

            {/* Glass sheen across the upper third. */}
            <LinearGradient
              pointerEvents="none"
              colors={['rgba(244,239,255,0.20)', 'rgba(244,239,255,0.03)', 'transparent']}
              start={{ x: 0.15, y: 0 }}
              end={{ x: 0.7, y: 0.62 }}
              style={{ position: 'absolute', top: 0, left: 0, right: 0, height: BUTTON * 0.6 }}
            />

            {/* 30 + its bloom padding lands inside 60, so the button's
                overflow:hidden does not clip the mark's outer halo. */}
            <ZoeyMark size={30} id="fabZoeyMark" />
          </View>

          {locked ? (
            /* Honest, not obstructive: it says the destination is a member
               feature. The press still goes through, and the Run Zoey screen
               shows what membership turns on. */
            <View
              pointerEvents="none"
              style={{
                position: 'absolute',
                right: -1,
                bottom: -1,
                width: 19,
                height: 19,
                borderRadius: 10,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#1A0E33',
                borderWidth: 1,
                borderColor: 'rgba(168,85,247,0.55)',
              }}>
              <IconSymbol name="lock.fill" size={10} color={tokens.violet300} />
            </View>
          ) : null}
        </View>

        <Text
          className="font-sans-medium"
          style={{
            marginTop: 4,
            fontSize: 10,
            letterSpacing: 0.2,
            color: 'rgba(244,239,255,0.72)',
          }}>
          Run Zoey
        </Text>
      </View>
    </Pressable>
  );
}
