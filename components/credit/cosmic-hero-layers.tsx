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
   * The reference has a SECOND outline inset just inside the first, drawn far dimmer. It is what
   * gives the glass its thickness -- a whisper, not a band. Anything heavier and the panel reads
   * as a bordered polygon, which is exactly the failure this pass removes.
   */
  const inset = Math.max(4, Math.round(Math.min(width, height) * 0.042));
  const innerPath = octagon(width - inset * 2, height - inset * 2, Math.max(4, c - inset));

  /* Where the shooting star peaks on the upper run. */
  const flareX = width * 0.40;
  /* The lower-left vertex, where the orbital path leaves the glass. */
  const vx = c * 0.42;
  const vy = height - c * 0.42;

  /* Sparkle positions along the streak's tail -- fixed, so the glass never twinkles randomly. */
  const sparks = [
    { x: flareX - width * 0.205, y: -3.5, r: 0.9, o: 0.55 },
    { x: flareX - width * 0.13, y: 2.8, r: 0.7, o: 0.45 },
    { x: flareX - width * 0.062, y: -2.2, r: 1.1, o: 0.7 },
    { x: flareX + width * 0.05, y: 2.2, r: 0.8, o: 0.6 },
    { x: flareX + width * 0.11, y: -3.0, r: 0.65, o: 0.5 },
  ];

  /*
   * The streak's bloom rises ABOVE the top edge, and an SVG clips at its own bounds -- so the
   * canvas is bled outward and the geometry drawn inside an offset group. Without this the
   * shooting star renders as its own bottom half.
   */
  const B = 14;

  return (
    <Svg
      width={width + B * 2}
      height={height + B * 2}
      style={{ position: 'absolute', left: -B, top: -B }}
      pointerEvents="none">
      <Defs>
        {/*
          Interior: CLEAR glass, not a plate. The tint exists so the numerals have a floor under
          them, and it stays thin enough that the painted stars and nebula read straight through.
        */}
        <LinearGradient id={`${id}fill`} x1="0.2" y1="0" x2="0.8" y2="1">
          <Stop offset="0" stopColor="#1A0D33" stopOpacity={0.16} />
          <Stop offset="0.5" stopColor="#0C0620" stopOpacity={0.22} />
          <Stop offset="1" stopColor="#070312" stopOpacity={0.30} />
        </LinearGradient>
        {/* A faint internal sheen falling from the top-left, the way light crosses real glass. */}
        <LinearGradient id={`${id}sheen`} x1="0" y1="0" x2="0.7" y2="1">
          <Stop offset="0" stopColor="#F6EEFF" stopOpacity={0.05} />
          <Stop offset="0.4" stopColor="#D9C4FF" stopOpacity={0.018} />
          <Stop offset="1" stopColor="#FFFFFF" stopOpacity={0} />
        </LinearGradient>
        {/* The rim: one THIN violet-white edge. White where the light lands, violet elsewhere. */}
        <LinearGradient id={`${id}rim`} x1="0.15" y1="0" x2="0.85" y2="1">
          <Stop offset="0" stopColor="#FFFFFF" stopOpacity={0.88} />
          <Stop offset="0.18" stopColor="#DCC3FF" stopOpacity={0.66} />
          <Stop offset="0.55" stopColor="#A971F5" stopOpacity={0.50} />
          <Stop offset="1" stopColor="#7B49CF" stopOpacity={0.42} />
        </LinearGradient>
        {/* A soft violet bloom just outside the rim so the edge glows rather than cuts. */}
        <LinearGradient id={`${id}halo`} x1="0.15" y1="0" x2="0.85" y2="1">
          <Stop offset="0" stopColor="#E9D6FF" stopOpacity={0.16} />
          <Stop offset="1" stopColor="#8B5CF6" stopOpacity={0.09} />
        </LinearGradient>
        {/* Bloom pooled behind the numerals. */}
        <RadialGradient id={`${id}bloom`} cx="50%" cy="56%" r="58%">
          {/* Tight and violet. At 0.30 the pool read as a grey oval INSIDE clear glass. */}
          <Stop offset="0" stopColor="#C79BFF" stopOpacity={0.18} />
          <Stop offset="0.55" stopColor={tokens.violet500} stopOpacity={0.08} />
          <Stop offset="1" stopColor={tokens.violet500} stopOpacity={0} />
        </RadialGradient>
        {/* Flares share one profile: hot centre, fast falloff. */}
        <RadialGradient id={`${id}flare`} cx="50%" cy="50%" r="50%">
          <Stop offset="0" stopColor="#FFFFFF" stopOpacity={0.95} />
          <Stop offset="0.25" stopColor="#E3CCFF" stopOpacity={0.55} />
          <Stop offset="1" stopColor="#A971F5" stopOpacity={0} />
        </RadialGradient>
        {/* The shooting star's tail: nothing, then violet, then a white-hot head. */}
        <LinearGradient id={`${id}tail`} x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor="#C9A6FF" stopOpacity={0} />
          <Stop offset="0.55" stopColor="#D9BCFF" stopOpacity={0.5} />
          <Stop offset="1" stopColor="#FFFFFF" stopOpacity={0.95} />
        </LinearGradient>
      </Defs>

      <G x={B} y={B}>
      <Path d={outline} fill={`url(#${id}fill)`} />
      <Path d={outline} fill={`url(#${id}sheen)`} />
      <Ellipse cx={width * 0.5} cy={height * 0.56} rx={width * 0.40} ry={height * 0.34} fill={`url(#${id}bloom)`} />

      {/* bloom, then the faint inner reflective edge, then ONE thin bright rim */}
      <Path d={outline} fill="none" stroke={`url(#${id}halo)`} strokeWidth={3} />
      <G x={inset} y={inset}>
        <Path d={innerPath} fill="none" stroke="#E4D2FF" strokeWidth={0.6} strokeOpacity={0.16} />
      </G>
      <Path d={outline} fill="none" stroke={`url(#${id}rim)`} strokeWidth={1.1} />

      {/* delicate corner reflections on the vertices real light would catch */}
      <Circle cx={width - c * 0.5} cy={c * 0.5} r={1.1} fill="#F3E9FF" opacity={0.5} />
      <Circle cx={width} cy={height - c} r={1.0} fill="#E4D2FF" opacity={0.38} />
      <Circle cx={c} cy={height} r={1.0} fill="#E4D2FF" opacity={0.34} />

      {/*
        THE SHOOTING STAR.
        The bright feature on the upper edge is not a border highlight: it is a streak of energy
        crossing the glass -- a long tapered violet tail, sparkles trailing it, and a white-hot
        head that flares where it lands on the rim. Drawn as stacked strokes because light has no
        single width: wide faint halo, mid bloom, hot core.
      */}
      <G>
        <Path
          d={`M ${flareX - width * 0.26} 0 L ${flareX} 0`}
          stroke={`url(#${id}tail)`}
          strokeWidth={5}
          strokeOpacity={0.16}
          strokeLinecap="round"
        />
        <Path
          d={`M ${flareX - width * 0.26} 0 L ${flareX} 0`}
          stroke={`url(#${id}tail)`}
          strokeWidth={2.2}
          strokeOpacity={0.45}
          strokeLinecap="round"
        />
        <Path
          d={`M ${flareX - width * 0.22} 0 L ${flareX} 0`}
          stroke={`url(#${id}tail)`}
          strokeWidth={0.9}
          strokeOpacity={0.95}
          strokeLinecap="round"
        />
        {/* the head: bloom, a four-point glint, and the hot core */}
        <Ellipse cx={flareX} cy={0} rx={width * 0.115} ry={5} fill={`url(#${id}flare)`} opacity={0.85} />
        <Path
          d={`M ${flareX - 9} 0 L ${flareX} -2 L ${flareX + 9} 0 L ${flareX} 2 Z`}
          fill="#FFFFFF"
          opacity={0.85}
        />
        <Path
          d={`M ${flareX} -8 L ${flareX + 1.6} 0 L ${flareX} 8 L ${flareX - 1.6} 0 Z`}
          fill="#FFFFFF"
          opacity={0.8}
        />
        <Circle cx={flareX} cy={0} r={2.4} fill="#FFFFFF" opacity={0.98} />
        {/* sparkles shed along the tail */}
        {sparks.map((s, i) => (
          <Circle key={i} cx={s.x} cy={s.y} r={s.r} fill="#F3E9FF" opacity={s.o} />
        ))}
        {/* the streak's reflection, caught faintly on the glass under the edge */}
        <Path
          d={`M ${flareX - width * 0.16} 5 L ${flareX} 4`}
          stroke="#E9DAFF"
          strokeWidth={0.8}
          strokeOpacity={0.2}
          strokeLinecap="round"
        />
      </G>

      {/* The lower-left vertex, where the orbit leaves. Same light, smaller. */}
      <Ellipse cx={vx} cy={vy} rx={width * 0.10} ry={2.6} fill={`url(#${id}flare)`} opacity={0.70} />
      <Circle cx={vx} cy={vy} r={2.0} fill="#FFFFFF" opacity={0.92} />
      </G>
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
    { w: 7.0, op: 0.08 },
    { w: 3.0, op: 0.13 },
    { w: 1.5, op: 0.30 },
    { w: 0.8, op: 0.85 },
  ];

  /*
   * Light particles riding the trajectory. Evaluated on the SAME cubic the strokes draw, offset a
   * point or two off the line so they read as sparks shed by the light rather than as beads
   * threaded on it. Fixed ts -- the path must never twinkle.
   */
  const cubic = (t: number) => {
    const u = 1 - t;
    return {
      x: u * u * u * from.x + 3 * u * u * t * c1.x + 3 * u * t * t * c2.x + t * t * t * to.x,
      y: u * u * u * from.y + 3 * u * u * t * c1.y + 3 * u * t * t * c2.y + t * t * t * to.y,
    };
  };
  const particles = [
    { t: 0.30, dx: 2.5, dy: -1.5, r: 0.8, o: 0.35 },
    { t: 0.46, dx: -2.0, dy: 2.0, r: 1.0, o: 0.45 },
    { t: 0.60, dx: 3.0, dy: 1.0, r: 0.7, o: 0.4 },
    { t: 0.74, dx: -1.5, dy: -2.5, r: 1.1, o: 0.55 },
    { t: 0.86, dx: 2.0, dy: -1.0, r: 0.9, o: 0.6 },
    { t: 0.94, dx: -2.5, dy: 1.5, r: 1.2, o: 0.7 },
  ].map((p) => {
    const pt = cubic(p.t);
    return { x: pt.x + p.dx, y: pt.y + p.dy, r: p.r, o: p.o };
  });

  return (
    <Svg width={width} height={height} pointerEvents="none">
      <Defs>
        <LinearGradient id={`${id}line`} x1="0" y1="0" x2="0.4" y2="1">
          <Stop offset="0" stopColor="#C9A6FF" stopOpacity={0} />
          <Stop offset="0.30" stopColor={tokens.violet400} stopOpacity={0.45} />
          <Stop offset="0.74" stopColor="#D9BFFF" stopOpacity={0.66} />
          <Stop offset="1" stopColor="#F2E6FF" stopOpacity={0.9} />
        </LinearGradient>
        <RadialGradient id={`${id}node`} cx="50%" cy="50%" r="50%">
          <Stop offset="0" stopColor="#FFFFFF" stopOpacity={0.9} />
          <Stop offset="0.3" stopColor="#D9B8FF" stopOpacity={0.4} />
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

      {/* sparks shed along the trajectory */}
      {particles.map((p, i) => (
        <Circle key={i} cx={p.x} cy={p.y} r={p.r} fill="#EFE2FF" opacity={p.o} />
      ))}

      {/*
        THE ENDPOINT IS A STAR, NOT A DOT.
        The light finishes as a brilliant point above the selected cell: white-hot core, purple
        halo, and a four-point flare -- the horizontal arms long, the vertical short -- with a thin
        reflection dropping into the glass of the selector below it.
      */}
      <Circle cx={to.x} cy={to.y} r={15} fill={`url(#${id}node)`} />
      {/* the reflection into the selected card */}
      <Path d={`M ${to.x} ${to.y + 3} L ${to.x} ${to.y + 17}`} stroke="#E9D8FF" strokeWidth={2.6} strokeOpacity={0.12} strokeLinecap="round" />
      <Path d={`M ${to.x} ${to.y + 3} L ${to.x} ${to.y + 15}`} stroke="#F6ECFF" strokeWidth={0.8} strokeOpacity={0.4} strokeLinecap="round" />
      {/* four-point flare */}
      <Path d={`M ${to.x - 11} ${to.y} L ${to.x} ${to.y - 1.9} L ${to.x + 11} ${to.y} L ${to.x} ${to.y + 1.9} Z`} fill="#FFFFFF" opacity={0.88} />
      <Path d={`M ${to.x} ${to.y - 7.5} L ${to.x + 1.7} ${to.y} L ${to.x} ${to.y + 7.5} L ${to.x - 1.7} ${to.y} Z`} fill="#FFFFFF" opacity={0.82} />
      <Circle cx={to.x} cy={to.y} r={2.4} fill="#FFFFFF" opacity={0.98} />
      {/* faint particles around the landing */}
      <Circle cx={to.x - 7} cy={to.y - 5} r={0.8} fill="#EFE2FF" opacity={0.5} />
      <Circle cx={to.x + 6} cy={to.y + 4} r={0.7} fill="#EFE2FF" opacity={0.45} />
      <Circle cx={to.x + 9} cy={to.y - 3} r={0.6} fill="#EFE2FF" opacity={0.4} />
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
