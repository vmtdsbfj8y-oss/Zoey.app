import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Defs, Ellipse, RadialGradient, Stop } from 'react-native-svg';

import { tokens } from '@/constants/tokens';

/**
 * Background atmosphere for the Zoey hero.
 *
 * Performance budget: every loop here is a single transform or opacity on one
 * wrapper View, driven by Reanimated on the UI thread, so none of them touch
 * the JS thread per frame. The stars and bubbles are static SVG inside moving
 * wrappers rather than dozens of individually animated nodes -- that is the
 * difference between this being free and dropping frames on a mid-range phone.
 *
 * Every loop is gated on `useReducedMotion()`. With the OS setting on, the
 * scene renders fully but holds still.
 */

/** Fixed layout -- deterministic, so the sky does not reshuffle on re-render. */
const STARS_FAR = [
  [18, 30], [62, 14], [104, 52], [148, 22], [196, 44], [232, 12], [278, 38],
  [312, 20], [348, 56], [44, 88], [126, 96], [208, 78], [292, 104], [356, 86],
  [8, 126], [88, 140], [170, 118], [250, 146], [330, 128], [40, 190], [150, 210],
  [270, 186], [340, 220], [96, 250], [210, 262], [316, 288], [24, 300],
] as const;

const STARS_NEAR = [
  [36, 46], [118, 28], [186, 66], [264, 24], [340, 44], [70, 112], [154, 152],
  [238, 100], [314, 158], [12, 168], [200, 230], [290, 320], [64, 336],
] as const;

function StarLayer({
  stars,
  r,
  opacity,
}: {
  stars: readonly (readonly [number, number])[];
  r: number;
  opacity: number;
}) {
  return (
    <Svg width="100%" height="100%" viewBox="0 0 366 360" preserveAspectRatio="xMidYMid slice">
      {stars.map(([cx, cy], i) => (
        <Circle
          key={i}
          cx={cx}
          cy={cy}
          r={r}
          fill="#FFFFFF"
          // Varied brightness so the field has depth rather than reading as a
          // regular grid of identical dots.
          opacity={opacity * (0.4 + ((i * 37) % 60) / 100)}
        />
      ))}
    </Svg>
  );
}

/** Two parallax star layers drifting at different speeds. */
export function Starfield() {
  const far = useSharedValue(0);
  const near = useSharedValue(0);
  const still = useReducedMotion();

  useEffect(() => {
    if (still) return;
    far.value = withRepeat(withTiming(1, { duration: 30000, easing: Easing.linear }), -1, true);
    near.value = withRepeat(withTiming(1, { duration: 19000, easing: Easing.linear }), -1, true);
  }, [far, near, still]);

  const farStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: far.value * -12 }, { translateY: far.value * 7 }],
  }));
  const nearStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: near.value * 18 }, { translateY: near.value * -9 }],
  }));

  return (
    <View pointerEvents="none" style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
      <Animated.View style={[{ position: 'absolute', inset: -30 }, farStyle]}>
        <StarLayer stars={STARS_FAR} r={0.9} opacity={0.55} />
      </Animated.View>
      <Animated.View style={[{ position: 'absolute', inset: -30 }, nearStyle]}>
        <StarLayer stars={STARS_NEAR} r={1.5} opacity={0.8} />
      </Animated.View>
    </View>
  );
}

/**
 * Floating translucent purple spheres -- the cosmic bubbles from the concept.
 *
 * Two drift groups rather than one per bubble: the bubbles inside a group share
 * a transform, which is invisible at this scale and costs a fifth as much.
 */
const BUBBLES_A = [
  { cx: 46, cy: 58, r: 13 },
  { cx: 318, cy: 96, r: 17 },
  { cx: 268, cy: 34, r: 9 },
] as const;

const BUBBLES_B = [
  { cx: 336, cy: 196, r: 12 },
  { cx: 30, cy: 168, r: 8 },
  { cx: 122, cy: 40, r: 7 },
] as const;

function BubbleLayer({ bubbles, id }: { bubbles: readonly { cx: number; cy: number; r: number }[]; id: string }) {
  return (
    <Svg width="100%" height="100%" viewBox="0 0 366 360" preserveAspectRatio="xMidYMid slice">
      <Defs>
        {/* Off-centre highlight so each sphere reads as lit from upper-left. */}
        <RadialGradient id={`${id}fill`} cx="35%" cy="30%" r="70%">
          <Stop offset="0" stopColor="#E9D5FF" stopOpacity={0.5} />
          <Stop offset="0.45" stopColor={tokens.violet500} stopOpacity={0.3} />
          <Stop offset="1" stopColor={tokens.violet600} stopOpacity={0.1} />
        </RadialGradient>
      </Defs>
      {bubbles.map((b, i) => (
        <Circle
          key={i}
          cx={b.cx}
          cy={b.cy}
          r={b.r}
          fill={`url(#${id}fill)`}
          stroke={tokens.violet300}
          strokeWidth={0.6}
          strokeOpacity={0.4}
        />
      ))}
    </Svg>
  );
}

export function CosmicBubbles() {
  const a = useSharedValue(0);
  const b = useSharedValue(0);
  const still = useReducedMotion();

  useEffect(() => {
    if (still) return;
    a.value = withRepeat(
      withTiming(1, { duration: 7000, easing: Easing.inOut(Easing.quad) }),
      -1,
      true
    );
    b.value = withRepeat(
      withTiming(1, { duration: 9500, easing: Easing.inOut(Easing.quad) }),
      -1,
      true
    );
  }, [a, b, still]);

  const aStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: -a.value * 10 }, { translateX: a.value * 5 }],
  }));
  const bStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: b.value * 12 }, { translateX: -b.value * 6 }],
  }));

  return (
    <View pointerEvents="none" style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
      <Animated.View style={[{ position: 'absolute', inset: 0 }, aStyle]}>
        <BubbleLayer bubbles={BUBBLES_A} id="bubA" />
      </Animated.View>
      <Animated.View style={[{ position: 'absolute', inset: 0 }, bStyle]}>
        <BubbleLayer bubbles={BUBBLES_B} id="bubB" />
      </Animated.View>
    </View>
  );
}

/**
 * Orbital rings around Zoey. Three concentric ellipses in ONE rotating wrapper
 * -- rotating each separately would triple the cost for a difference nobody can
 * see at this size.
 */
export function OrbitalRings({ size, spin = true }: { size: number; spin?: boolean }) {
  const angle = useSharedValue(0);
  const still = useReducedMotion();

  useEffect(() => {
    if (!spin || still) return;
    angle.value = withRepeat(withTiming(1, { duration: 26000, easing: Easing.linear }), -1, false);
  }, [angle, spin, still]);

  const style = useAnimatedStyle(() => ({ transform: [{ rotate: `${angle.value * 360}deg` }] }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[{ position: 'absolute', width: size, height: size }, style]}>
      <Svg width={size} height={size} viewBox="0 0 100 100">
        <Ellipse cx="50" cy="50" rx="48" ry="17" stroke={tokens.violet400} strokeWidth="0.6" fill="none" opacity={0.5} />
        <Ellipse cx="50" cy="50" rx="40" ry="34" stroke={tokens.violet500} strokeWidth="0.5" fill="none" opacity={0.32} transform="rotate(58 50 50)" />
        <Ellipse cx="50" cy="50" rx="46" ry="26" stroke={tokens.violet300} strokeWidth="0.45" fill="none" opacity={0.28} transform="rotate(-34 50 50)" />
      </Svg>
    </Animated.View>
  );
}

/**
 * The holographic platform Zoey stands on: concentric light rings on a bloom,
 * breathing slowly. Drawn wide and flat so it reads as a disc seen at a shallow
 * angle rather than as a circle lying on the screen.
 */
export function HoloPlatform({ width }: { width: number }) {
  const height = width * 0.34;
  const pulse = useSharedValue(0);
  const still = useReducedMotion();

  useEffect(() => {
    if (still) return;
    pulse.value = withRepeat(
      withTiming(1, { duration: 3400, easing: Easing.inOut(Easing.quad) }),
      -1,
      true
    );
  }, [pulse, still]);

  const style = useAnimatedStyle(() => ({
    opacity: 0.7 + pulse.value * 0.3,
    transform: [{ scaleX: 0.97 + pulse.value * 0.06 }],
  }));

  return (
    <Animated.View pointerEvents="none" style={[{ width, height }, style]}>
      <Svg width={width} height={height}>
        <Defs>
          <RadialGradient id="holoBloom" cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor="#FFFFFF" stopOpacity={0.55} />
            <Stop offset="0.25" stopColor={tokens.violet300} stopOpacity={0.4} />
            <Stop offset="0.6" stopColor={tokens.violet500} stopOpacity={0.22} />
            <Stop offset="1" stopColor={tokens.violet500} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Ellipse cx={width / 2} cy={height / 2} rx={width / 2} ry={height / 2} fill="url(#holoBloom)" />
        {[0.78, 0.58, 0.4, 0.24].map((k, i) => (
          <Ellipse
            key={k}
            cx={width / 2}
            cy={height / 2}
            rx={(width / 2) * k}
            ry={(height / 2) * k}
            stroke={i % 2 === 0 ? tokens.violet300 : '#FFFFFF'}
            strokeWidth={0.8}
            fill="none"
            opacity={0.28 + i * 0.12}
          />
        ))}
      </Svg>
    </Animated.View>
  );
}

/** Slow breathing bloom behind Zoey's outline. */
export function PulseGlow({ size, id, spin = true }: { size: number; id: string; spin?: boolean }) {
  const pulse = useSharedValue(0);
  const still = useReducedMotion();

  useEffect(() => {
    if (still || !spin) return;
    pulse.value = withRepeat(
      withTiming(1, { duration: 3600, easing: Easing.inOut(Easing.quad) }),
      -1,
      true
    );
  }, [pulse, still, spin]);

  const style = useAnimatedStyle(() => ({
    opacity: 0.55 + pulse.value * 0.35,
    transform: [{ scale: 0.94 + pulse.value * 0.1 }],
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[{ position: 'absolute', width: size, height: size }, style]}>
      <Svg width={size} height={size}>
        <Defs>
          <RadialGradient id={id} cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor={tokens.violet500} stopOpacity={0.5} />
            <Stop offset="0.5" stopColor={tokens.violet600} stopOpacity={0.22} />
            <Stop offset="1" stopColor={tokens.violet600} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Circle cx={size / 2} cy={size / 2} r={size / 2} fill={`url(#${id})`} />
      </Svg>
    </Animated.View>
  );
}
