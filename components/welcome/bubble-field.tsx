import { useEffect } from 'react';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Defs, Ellipse, RadialGradient, Stop } from 'react-native-svg';

/**
 * Floating glass orbs.
 *
 * Each orb is five stacked passes, which is what makes it read as lit glass
 * rather than a flat dark sphere:
 *
 *   1. an outer halo bleeding past the edge -- the orb emits light into the scene
 *   2. the translucent body, brighter at the upper-left where the key light hits
 *   3. a bright violet/pink rim, strongest along the lower-right (light wrapping
 *      around the far side, which is what sells a sphere)
 *   4. a specular highlight
 *   5. a small secondary glint
 *
 * `depth` (0 = far, 1 = near) drives opacity, rim strength and highlight size
 * together, so distant orbs read as hazy and near ones as crisp. Varying them
 * independently is what made the previous field look like identical stamps.
 */

type Orb = { x: number; y: number; r: number; depth: number; hue: 'violet' | 'magenta' | 'blue' };

/** Behind Zoey. */
const BACK: Orb[] = [
  { x: 0.135, y: 0.315, r: 0.055, depth: 0.75, hue: 'violet' },
  { x: 0.055, y: 0.45, r: 0.03, depth: 0.35, hue: 'blue' },
  { x: 0.8, y: 0.15, r: 0.04, depth: 0.6, hue: 'violet' },
  { x: 0.905, y: 0.235, r: 0.058, depth: 0.85, hue: 'magenta' },
  { x: 0.945, y: 0.35, r: 0.028, depth: 0.3, hue: 'violet' },
  { x: 0.67, y: 0.09, r: 0.024, depth: 0.28, hue: 'blue' },
  { x: 0.205, y: 0.17, r: 0.022, depth: 0.25, hue: 'violet' },
  { x: 0.865, y: 0.45, r: 0.027, depth: 0.4, hue: 'violet' },
  { x: 0.3, y: 0.235, r: 0.017, depth: 0.2, hue: 'magenta' },
];

/** In front of Zoey -- these overlap her silhouette. */
const FRONT: Orb[] = [
  { x: 0.105, y: 0.6, r: 0.082, depth: 1, hue: 'magenta' },
  { x: 0.895, y: 0.515, r: 0.05, depth: 0.8, hue: 'violet' },
  { x: 0.255, y: 0.53, r: 0.024, depth: 0.45, hue: 'violet' },
  { x: 0.735, y: 0.615, r: 0.02, depth: 0.35, hue: 'blue' },
];

const HUES = {
  violet: { core: '#E6CCFF', mid: '#A855F7', deep: '#5B21B6', rim: '#E9D5FF' },
  magenta: { core: '#FFD9F5', mid: '#D946EF', deep: '#86198F', rim: '#FBCFE8' },
  blue: { core: '#D6DBFF', mid: '#7C82F5', deep: '#3730A3', rim: '#C7D2FE' },
} as const;

function OrbLayer({ orbs, id, w, h }: { orbs: Orb[]; id: string; w: number; h: number }) {
  return (
    <Svg width={w} height={h}>
      <Defs>
        {orbs.map((orb, i) => {
          const c = HUES[orb.hue];
          return (
            <RadialGradient key={`gb${i}`} id={`${id}b${i}`} cx="34%" cy="28%" r="76%">
              <Stop offset="0" stopColor={c.core} stopOpacity={0.5 * orb.depth + 0.18} />
              <Stop offset="0.38" stopColor={c.mid} stopOpacity={0.42 * orb.depth + 0.14} />
              <Stop offset="0.8" stopColor={c.deep} stopOpacity={0.34 * orb.depth + 0.12} />
              <Stop offset="1" stopColor={c.deep} stopOpacity={0.1} />
            </RadialGradient>
          );
        })}
        {orbs.map((orb, i) => {
          const c = HUES[orb.hue];
          return (
            <RadialGradient key={`gh${i}`} id={`${id}h${i}`} cx="50%" cy="50%" r="50%">
              <Stop offset="0.55" stopColor={c.mid} stopOpacity={0.34 * orb.depth} />
              <Stop offset="0.78" stopColor={c.mid} stopOpacity={0.14 * orb.depth} />
              <Stop offset="1" stopColor={c.mid} stopOpacity={0} />
            </RadialGradient>
          );
        })}
        <RadialGradient id={`${id}spec`} cx="50%" cy="50%" r="50%">
          <Stop offset="0" stopColor="#FFFFFF" stopOpacity={0.9} />
          <Stop offset="1" stopColor="#FFFFFF" stopOpacity={0} />
        </RadialGradient>
      </Defs>

      {/* 1. outer halo -- light thrown into the scene */}
      {orbs.map((orb, i) => (
        <Circle
          key={`h${i}`}
          cx={orb.x * w}
          cy={orb.y * h}
          r={orb.r * w * 1.95}
          fill={`url(#${id}h${i})`}
        />
      ))}

      {/* 2. body */}
      {orbs.map((orb, i) => (
        <Circle
          key={`b${i}`}
          cx={orb.x * w}
          cy={orb.y * h}
          r={orb.r * w}
          fill={`url(#${id}b${i})`}
        />
      ))}

      {/* 3. rim: a full soft edge plus a brighter lower-right arc */}
      {orbs.map((orb, i) => {
        const c = HUES[orb.hue];
        return (
          <Circle
            key={`r${i}`}
            cx={orb.x * w}
            cy={orb.y * h}
            r={orb.r * w}
            fill="none"
            stroke={c.rim}
            strokeWidth={0.6 + orb.depth * 0.9}
            opacity={0.22 + orb.depth * 0.5}
          />
        );
      })}
      {orbs.map((orb, i) => {
        const c = HUES[orb.hue];
        const r = orb.r * w;
        return (
          <Circle
            key={`ra${i}`}
            cx={orb.x * w}
            cy={orb.y * h}
            r={r * 0.94}
            fill="none"
            stroke={c.core}
            strokeWidth={0.8 + orb.depth * 1.1}
            opacity={0.3 + orb.depth * 0.45}
            strokeLinecap="round"
            strokeDasharray={`${2 * Math.PI * r * 0.94 * 0.3} ${2 * Math.PI * r * 0.94}`}
            transform={`rotate(35 ${orb.x * w} ${orb.y * h})`}
          />
        );
      })}

      {/* 4 + 5. specular highlight and glint */}
      {orbs.map((orb, i) => {
        const r = orb.r * w;
        return (
          <Ellipse
            key={`s${i}`}
            cx={orb.x * w - r * 0.36}
            cy={orb.y * h - r * 0.4}
            rx={r * (0.2 + orb.depth * 0.14)}
            ry={r * (0.14 + orb.depth * 0.1)}
            fill={`url(#${id}spec)`}
            opacity={0.3 + orb.depth * 0.55}
            transform={`rotate(-28 ${orb.x * w - r * 0.36} ${orb.y * h - r * 0.4})`}
          />
        );
      })}
      {orbs.map((orb, i) => {
        const r = orb.r * w;
        return (
          <Circle
            key={`g${i}`}
            cx={orb.x * w + r * 0.42}
            cy={orb.y * h + r * 0.34}
            r={r * 0.075}
            fill="#FFFFFF"
            opacity={0.2 + orb.depth * 0.4}
          />
        );
      })}
    </Svg>
  );
}

export function BubbleField({
  layer,
  width,
  height,
}: {
  layer: 'back' | 'front';
  width: number;
  height: number;
}) {
  const drift = useSharedValue(0);
  const still = useReducedMotion();

  useEffect(() => {
    if (still) return;
    drift.value = withRepeat(
      withTiming(1, {
        duration: layer === 'back' ? 12000 : 8500,
        easing: Easing.inOut(Easing.quad),
      }),
      -1,
      true
    );
  }, [drift, layer, still]);

  const style = useAnimatedStyle(() => ({
    transform: [
      { translateY: (layer === 'back' ? -1 : 1) * drift.value * 9 },
      { translateX: (layer === 'back' ? 1 : -1) * drift.value * 5 },
    ],
  }));

  return (
    <Animated.View pointerEvents="none" style={[{ position: 'absolute', width, height }, style]}>
      <OrbLayer orbs={layer === 'back' ? BACK : FRONT} id={layer} w={width} h={height} />
    </Animated.View>
  );
}
