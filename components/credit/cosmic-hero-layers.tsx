import Svg, {
  Circle,
  G,
  Defs,
  Ellipse,
  LinearGradient,
  Path,
  RadialGradient,
  Stop,
} from 'react-native-svg';

import { tokens } from '@/constants/tokens';

/**
 * The drawn layers of the credit hero: the chamber the score sits in, the path that ties the
 * selected bureau to it, and the sky behind both.
 *
 * ==============================  WHY THESE ARE SVG AND THE TEXT IS NOT  ==============================
 *
 * Everything here is geometry -- a chamfered outline, a bezier, a moon. React Native can only fake
 * those with stacked Views and rounded corners, and the fake shows: an octagon built from rotated
 * squares has seams at every joint, and a curve built from bordered circles cannot taper. SVG draws
 * them once, exactly, at any size.
 *
 * The score itself is deliberately NOT drawn here. `Svg.Text` does not participate in RN's font
 * scaling, line breaking or accessibility tree, so the numerals and every label stay real `<Text>`
 * positioned over these layers. That is also what keeps the Spanish strings wrapping normally.
 *
 * ==============================  IDS ARE A SHARED NAMESPACE  ==============================
 *
 * SVG gradient ids are global to the document, not scoped to the component that declares them. Two
 * mounted heroes with the same id silently share one gradient, so every id below is derived from a
 * required `id` prop rather than hardcoded.
 */

/** Geometry of the chamfered panel, shared by the outline and its lit top edge. */
function octagon(w: number, h: number, c: number): string {
  return [
    `M ${c} 0`,
    `L ${w - c} 0`,
    `L ${w} ${c}`,
    `L ${w} ${h - c}`,
    `L ${w - c} ${h}`,
    `L ${c} ${h}`,
    `L 0 ${h - c}`,
    `L 0 ${c}`,
    'Z',
  ].join(' ');
}

/**
 * The score chamber -- a dimensional glass cell, not a rounded card.
 *
 * Depth comes from four things that a single border cannot produce on its own: a fill that is
 * lighter where the light falls, a rim that brightens across the top-left arc and falls into shadow
 * at the bottom-right, a bloom pooled behind where the numerals sit, and two specular points on the
 * vertices the light would actually catch.
 */
export function ScoreChamber({
  width,
  height,
  id,
  chamfer,
}: {
  width: number;
  height: number;
  /** Unique per mounted chamber -- gradient ids are global. */
  id: string;
  chamfer?: number;
}) {
  const c = chamfer ?? Math.round(Math.min(width, height) * 0.148);
  const outline = octagon(width, height, c);
  /*
   * The reference has a SECOND outline inset about 10pt inside the first, drawn far dimmer. It is
   * what gives the panel its thickness -- not a wide band, which is what the previous version used
   * and which read as a grey frame. Bright rim, faint echo, dark air between them.
   */
  const inset = Math.max(6, Math.round(Math.min(width, height) * 0.068));
  const innerPath = octagon(width - inset * 2, height - inset * 2, Math.max(4, c - inset));

  /* The top flare: a hot point on the upper run with a wide horizontal bleed either side of it. */
  const flareX = width * 0.42;
  /* The lower-left vertex, where the orbital path leaves the glass. */
  const vx = c * 0.42;
  const vy = height - c * 0.42;

  return (
    <Svg width={width} height={height} pointerEvents="none">
      <Defs>
        {/* Interior: nearly black, and thin enough that the painted star field reads through it. */}
        <LinearGradient id={`${id}fill`} x1="0.2" y1="0" x2="0.8" y2="1">
          <Stop offset="0" stopColor="#150A2A" stopOpacity={0.42} />
          <Stop offset="0.5" stopColor="#0A0518" stopOpacity={0.50} />
          <Stop offset="1" stopColor="#06030F" stopOpacity={0.62} />
        </LinearGradient>
        {/* The rim. White only where the light lands, violet around the rest of the run. */}
        <LinearGradient id={`${id}rim`} x1="0.15" y1="0" x2="0.85" y2="1">
          <Stop offset="0" stopColor="#FFFFFF" stopOpacity={0.92} />
          <Stop offset="0.18" stopColor="#DCC3FF" stopOpacity={0.78} />
          <Stop offset="0.55" stopColor="#A971F5" stopOpacity={0.62} />
          <Stop offset="1" stopColor="#7B49CF" stopOpacity={0.50} />
        </LinearGradient>
        {/* A soft violet halo carried just outside the rim so the edge glows rather than cuts. */}
        <LinearGradient id={`${id}halo`} x1="0.15" y1="0" x2="0.85" y2="1">
          <Stop offset="0" stopColor="#E9D6FF" stopOpacity={0.30} />
          <Stop offset="1" stopColor="#8B5CF6" stopOpacity={0.16} />
        </LinearGradient>
        {/* Bloom pooled behind the numerals. */}
        <RadialGradient id={`${id}bloom`} cx="50%" cy="56%" r="58%">
          <Stop offset="0" stopColor="#C79BFF" stopOpacity={0.34} />
          <Stop offset="0.55" stopColor={tokens.violet500} stopOpacity={0.15} />
          <Stop offset="1" stopColor={tokens.violet500} stopOpacity={0} />
        </RadialGradient>
        {/* Both flares share one profile: hot centre, fast falloff. */}
        <RadialGradient id={`${id}flare`} cx="50%" cy="50%" r="50%">
          <Stop offset="0" stopColor="#FFFFFF" stopOpacity={0.95} />
          <Stop offset="0.25" stopColor="#E3CCFF" stopOpacity={0.55} />
          <Stop offset="1" stopColor="#A971F5" stopOpacity={0} />
        </RadialGradient>
      </Defs>

      <Path d={outline} fill={`url(#${id}fill)`} />
      <Ellipse cx={width * 0.5} cy={height * 0.56} rx={width * 0.40} ry={height * 0.34} fill={`url(#${id}bloom)`} />

      {/* halo, then the faint inner echo, then the bright rim on top */}
      <Path d={outline} fill="none" stroke={`url(#${id}halo)`} strokeWidth={5} />
      <G x={inset} y={inset}>
        <Path d={innerPath} fill="none" stroke="#C9A6FF" strokeWidth={0.75} strokeOpacity={0.20} />
      </G>
      <Path d={outline} fill="none" stroke={`url(#${id}rim)`} strokeWidth={1.7} />

      {/*
        THE TOP FLARE.
        In the reference this is the brightest thing on the panel: a point on the top run with light
        bleeding sideways along the edge, far wider than it is tall. Drawn as a flattened ellipse so
        the bleed stays on the rim instead of spilling into the interior.
      */}
      <Ellipse cx={flareX} cy={0} rx={width * 0.30} ry={3.2} fill={`url(#${id}flare)`} opacity={0.75} />
      <Ellipse cx={flareX} cy={0} rx={width * 0.10} ry={2.0} fill="#FFFFFF" opacity={0.55} />
      <Circle cx={flareX} cy={0} r={2.2} fill="#FFFFFF" opacity={0.95} />

      {/* The lower-left vertex, where the orbit leaves. Same treatment, smaller. */}
      <Ellipse cx={vx} cy={vy} rx={width * 0.10} ry={2.6} fill={`url(#${id}flare)`} opacity={0.70} />
      <Circle cx={vx} cy={vy} r={2.0} fill="#FFFFFF" opacity={0.92} />
    </Svg>
  );
}

/**
 * The path from the score down to whichever bureau is selected.
 *
 * It is a connector, not an ornament: the endpoint tracks the selected cell, so choosing Experian
 * swings the curve to the middle of the selector. That is the whole reason it earns its place --
 * a fixed decorative swoosh under the score would say nothing and still cost the same pixels.
 *
 * The stroke fades in from nothing at the chamber end so it appears to emerge from the light rather
 * than being welded to the panel.
 */
export function OrbitalPath({
  width,
  height,
  from,
  to,
  id,
}: {
  width: number;
  height: number;
  /** Where it leaves the chamber. */
  from: { x: number; y: number };
  /** The node above the selected bureau cell. */
  to: { x: number; y: number };
  id: string;
}) {
  /*
   * Control points pull left before returning right, which is what gives it the slack of an orbit
   * instead of the efficiency of a wire. Both are derived from the endpoints so the shape survives
   * the endpoint moving when a different bureau is selected -- and because the slack scales with the
   * span rather than being a fixed offset, the far cells do not look mechanically stretched.
   */
  const span = to.y - from.y;
  const reach = Math.abs(to.x - from.x);
  const c1 = { x: from.x - Math.max(width * 0.06, 18) - reach * 0.06, y: from.y + span * 0.44 };
  const c2 = { x: from.x + reach * 0.30, y: to.y - span * 0.10 };
  const d = `M ${from.x} ${from.y} C ${c1.x} ${c1.y}, ${c2.x} ${c2.y}, ${to.x} ${to.y}`;

  /*
   * ONE PATH, DRAWN FOUR TIMES.
   *
   * A single 1px stroke is a string, and that is what this was. Light does not have one width: it
   * has a faint wide halo, a brighter mid body and a hot narrow core. Stacking the same geometry at
   * decreasing width and increasing opacity is what turns a line into something luminous, and it
   * costs one extra path per pass rather than a blur filter RN would have to rasterise.
   */
  const passes = [
    { w: 6.0, op: 0.07 },
    { w: 2.8, op: 0.12 },
    { w: 1.4, op: 0.28 },
    { w: 0.7, op: 0.80 },
  ];

  return (
    <Svg width={width} height={height} pointerEvents="none">
      <Defs>
        <LinearGradient id={`${id}line`} x1="0" y1="0" x2="0.4" y2="1">
          <Stop offset="0" stopColor="#C9A6FF" stopOpacity={0} />
          <Stop offset="0.30" stopColor={tokens.violet400} stopOpacity={0.42} />
          <Stop offset="0.74" stopColor="#D9BFFF" stopOpacity={0.62} />
          <Stop offset="1" stopColor="#F2E6FF" stopOpacity={0.82} />
        </LinearGradient>
        <RadialGradient id={`${id}node`} cx="50%" cy="50%" r="50%">
          <Stop offset="0" stopColor="#FFFFFF" stopOpacity={0.85} />
          <Stop offset="0.35" stopColor="#D9B8FF" stopOpacity={0.38} />
          <Stop offset="1" stopColor={tokens.violet500} stopOpacity={0} />
        </RadialGradient>
      </Defs>

      {passes.map((p, i) => (
        <Path
          key={i}
          d={d}
          fill="none"
          stroke={`url(#${id}line)`}
          strokeWidth={p.w}
          strokeOpacity={p.op}
          strokeLinecap="round"
        />
      ))}

      {/* the drop onto the selected cell, same treatment at smaller scale */}
      <Path d={`M ${to.x} ${to.y} L ${to.x} ${to.y + 14}`} stroke="#E9D8FF" strokeWidth={2.4} strokeOpacity={0.09} strokeLinecap="round" />
      <Path d={`M ${to.x} ${to.y} L ${to.x} ${to.y + 14}`} stroke="#F6ECFF" strokeWidth={0.7} strokeOpacity={0.55} strokeLinecap="round" />

      {/* Nodes: a wide soft bloom, a mid ring, then a hot core. */}
      <Circle cx={to.x} cy={to.y} r={13} fill={`url(#${id}node)`} />
      <Circle cx={to.x} cy={to.y} r={4.4} fill="#E7D4FF" opacity={0.34} />
      <Circle cx={to.x} cy={to.y} r={2.3} fill="#FFFFFF" opacity={0.92} />
      <Circle cx={to.x} cy={to.y + 14} r={7} fill={`url(#${id}node)`} />
      <Circle cx={to.x} cy={to.y + 14} r={1.9} fill="#FBF7FF" opacity={0.92} />
    </Svg>
  );
}

/**
 * The sky inside the card: a moon at the upper right, a nebula bleeding in from the right edge, and
 * two orbital arcs wide enough to read as arcs rather than as scratches.
 *
 * All of it sits behind Zoey and under the text gradient, so nothing here has to survive being read
 * on top of -- which is what lets it be this faint.
 */
export function HeroSky({ width, height, id }: { width: number; height: number; id: string }) {
  const moonR = Math.round(width * 0.065);
  const moonX = width * 0.945;
  const moonY = height * 0.135;

  return (
    <Svg width={width} height={height} pointerEvents="none">
      <Defs>
        <RadialGradient id={`${id}moon`} cx="32%" cy="28%" r="78%">
          <Stop offset="0" stopColor="#CBB6E8" stopOpacity={0.42} />
          <Stop offset="0.6" stopColor="#6B4E9E" stopOpacity={0.20} />
          <Stop offset="1" stopColor="#1A0E33" stopOpacity={0.10} />
        </RadialGradient>
        <RadialGradient id={`${id}nebula`} cx="50%" cy="50%" r="50%">
          <Stop offset="0" stopColor="#F0A8FF" stopOpacity={0.42} />
          <Stop offset="0.5" stopColor={tokens.violet500} stopOpacity={0.20} />
          <Stop offset="1" stopColor={tokens.violet600} stopOpacity={0} />
        </RadialGradient>
      </Defs>

      {/* Nebula, bleeding in from the right edge and tilted so it reads as depth, not a stripe. */}
      <Ellipse
        cx={width * 1.02}
        cy={height * 0.56}
        rx={width * 0.17}
        ry={height * 0.42}
        fill={`url(#${id}nebula)`}
        transform={`rotate(-24 ${width * 1.02} ${height * 0.56})`}
      />

      <Circle cx={moonX} cy={moonY} r={moonR} fill={`url(#${id}moon)`} />
      <Circle cx={moonX} cy={moonY} r={moonR} fill="none" stroke="#D6C4F0" strokeWidth={0.5} strokeOpacity={0.18} />
      <Circle cx={moonX - moonR * 0.3} cy={moonY - moonR * 0.18} r={moonR * 0.2} fill="#1A0E33" opacity={0.16} />
      <Circle cx={moonX + moonR * 0.28} cy={moonY + moonR * 0.34} r={moonR * 0.13} fill="#1A0E33" opacity={0.13} />

      {/*
        ONE arc, and it stays in the corner it belongs to.
        There were two, drawn wide enough to sweep the whole card -- across the copy and across
        Zoey. At that scale an "orbital path" stops reading as depth and starts reading as a
        scratch on the glass. This one only ever shows near the moon.
      */}
      <Ellipse
        cx={width * 0.86}
        cy={height * 0.10}
        rx={width * 0.34}
        ry={height * 0.20}
        fill="none"
        stroke={tokens.violet400}
        strokeWidth={0.7}
        strokeOpacity={0.16}
        transform={`rotate(-18 ${width * 0.86} ${height * 0.10})`}
      />
    </Svg>
  );
}
