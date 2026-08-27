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

  /* The lower-left vertex, where the orbital path passes through the glass. */
  const vx = c * 0.42;
  const vy = height - c * 0.42;

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
          <Stop offset="0" stopColor="#1A0D33" stopOpacity={0.12} />
          <Stop offset="0.5" stopColor="#0C0620" stopOpacity={0.17} />
          <Stop offset="1" stopColor="#070312" stopOpacity={0.24} />
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
        {/* Violet corner bloom -- the purple pooled where the artwork lights a vertex. */}
        <RadialGradient id={`${id}corner`} cx="50%" cy="50%" r="50%">
          <Stop offset="0" stopColor="#E0B8FF" stopOpacity={0.5} />
          <Stop offset="0.5" stopColor="#B87DFF" stopOpacity={0.22} />
          <Stop offset="1" stopColor="#8B5CF6" stopOpacity={0} />
        </RadialGradient>
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
        The glass edge catching the scene's light: a soft streak along the top run with a small
        glint, and violet blooms pooled at the top-left and lower-left corners -- the two vertices
        the artwork lights. This is the GLASS's own highlight; the travelling line is OrbitalPath's.
      */}
      <Ellipse cx={width * 0.33} cy={0} rx={width * 0.26} ry={2.6} fill={`url(#${id}flare)`} opacity={0.65} />
      <Ellipse cx={width * 0.33} cy={0} rx={width * 0.08} ry={1.6} fill="#FFFFFF" opacity={0.5} />
      <Circle cx={width * 0.33} cy={0} r={1.6} fill="#FFFFFF" opacity={0.9} />
      <Circle cx={c * 0.45} cy={c * 0.45} r={7} fill={`url(#${id}corner)`} opacity={0.9} />
      <Circle cx={vx} cy={vy} r={9} fill={`url(#${id}corner)`} opacity={1} />

      {/* The lower-left vertex, where the orbital path passes through the glass. */}
      <Ellipse cx={vx} cy={vy} rx={width * 0.10} ry={2.6} fill={`url(#${id}flare)`} opacity={0.70} />
      <Circle cx={vx} cy={vy} r={2.0} fill="#FFFFFF" opacity={0.92} />
      </G>
    </Svg>
  );
}

/**
 * The celestial line, as the artwork actually draws it.
 *
 * It emerges from behind Zoey on the right, enters the chamber through its right wall, crosses the
 * glass's lower band in a gentle sag -- FADING while it is inside, because it is drawn beneath the
 * glass and the fill dims it -- exits precisely at the lower-left vertex the chamber flares, then
 * swoops down to a luminous orb above the selected bureau with a thin stem dropping into the chip.
 * The endpoint tracks the selection, so the line stays a connector, not an ornament.
 *
 * Render this layer UNDER Zoey and UNDER the chamber: passing behind her and through the glass is
 * what the previous version faked badly by wrapping around the outside of the rim.
 */
export function OrbitalPath({
  width,
  height,
  chamber,
  to,
  id,
}: {
  width: number;
  height: number;
  /** The chamber's box the line passes through. `c` is the chamfer. */
  chamber: { x: number; y: number; w: number; h: number; c: number };
  /** The node above the selected bureau cell. */
  to: { x: number; y: number };
  id: string;
}) {
  const { x, y, w, h, c } = chamber;
  /* The lower-left vertex the line exits through -- the point the chamber itself flares. */
  const vx = x + c * 0.42;
  const vy = y + h - c * 0.42;
  /*
   * The final swoop's control points pull left before returning right -- the slack of an orbit,
   * not the efficiency of a wire -- and derive from the endpoints so the shape survives the
   * endpoint moving when a different bureau is selected.
   */
  const span = to.y - vy;
  const reach = Math.abs(to.x - vx);
  const c1 = { x: vx - Math.max(width * 0.075, 24), y: vy + span * 0.55 };
  const c2 = { x: vx + reach * 0.42, y: to.y - span * 0.06 };
  const d = [
    /* in from behind Zoey, through the chamber's right wall, sagging across the lower band */
    `M ${width} ${y + h * 0.56}`,
    `C ${width * 0.70} ${y + h * 0.90}, ${x + w * 0.52} ${y + h * 0.92}, ${vx} ${vy}`,
    /* the swoop to the selected bureau */
    `C ${c1.x} ${c1.y}, ${c2.x} ${c2.y}, ${to.x} ${to.y}`,
  ].join(' ');

  /* Light has no single width: faint wide halo, brighter body, hot core -- one path, four passes. */
  const passes = [
    { w: 7.0, op: 0.08 },
    { w: 3.0, op: 0.13 },
    { w: 1.5, op: 0.3 },
    { w: 0.8, op: 0.85 },
  ];

  /* Sparks shed along the final swoop, evaluated on the SAME cubic the stroke draws. Fixed ts. */
  const cubic = (t: number) => {
    const u = 1 - t;
    return {
      x: u * u * u * vx + 3 * u * u * t * c1.x + 3 * u * t * t * c2.x + t * t * t * to.x,
      y: u * u * u * vy + 3 * u * u * t * c1.y + 3 * u * t * t * c2.y + t * t * t * to.y,
    };
  };
  const particles = [
    { t: 0.3, dx: 2.5, dy: -1.5, r: 0.8, o: 0.35 },
    { t: 0.5, dx: -2.0, dy: 2.0, r: 1.0, o: 0.45 },
    { t: 0.68, dx: 3.0, dy: 1.0, r: 0.7, o: 0.4 },
    { t: 0.84, dx: -1.5, dy: -2.5, r: 1.1, o: 0.55 },
    { t: 0.93, dx: 2.0, dy: -1.0, r: 0.9, o: 0.6 },
  ].map((p) => {
    const pt = cubic(p.t);
    return { x: pt.x + p.dx, y: pt.y + p.dy, r: p.r, o: p.o };
  });

  return (
    <Svg width={width} height={height} pointerEvents="none">
      <Defs>
        {/*
          The ramp lives in user space, tied to the journey: dim where the line hides behind Zoey,
          modest through the glass, white-hot from the vertex to the orb.
        */}
        <LinearGradient
          id={`${id}line`}
          gradientUnits="userSpaceOnUse"
          x1={width}
          y1={y + h * 0.56}
          x2={vx}
          y2={to.y}>
          <Stop offset="0" stopColor={tokens.violet400} stopOpacity={0.14} />
          <Stop offset="0.3" stopColor="#C9A6FF" stopOpacity={0.5} />
          <Stop offset="0.55" stopColor="#EADAFF" stopOpacity={0.8} />
          <Stop offset="1" stopColor="#F6ECFF" stopOpacity={0.95} />
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

      {/* sparks shed along the swoop */}
      {particles.map((p, i) => (
        <Circle key={i} cx={p.x} cy={p.y} r={p.r} fill="#EFE2FF" opacity={p.o} />
      ))}

      {/*
        THE ORB. The light gathers into a luminous point above the selected cell -- hot core, a
        fine ring, a wide violet halo -- and a thin stem drops from it into the chip's top edge.
      */}
      <Circle cx={to.x} cy={to.y} r={15} fill={`url(#${id}node)`} />
      <Path d={`M ${to.x} ${to.y + 3} L ${to.x} ${to.y + 17}`} stroke="#E9D8FF" strokeWidth={2.6} strokeOpacity={0.14} strokeLinecap="round" />
      <Path d={`M ${to.x} ${to.y + 3} L ${to.x} ${to.y + 16}`} stroke="#F6ECFF" strokeWidth={0.9} strokeOpacity={0.5} strokeLinecap="round" />
      <Circle cx={to.x} cy={to.y + 16} r={1.4} fill="#FBF7FF" opacity={0.75} />
      <Circle cx={to.x} cy={to.y} r={6.5} fill="none" stroke="#F0E4FF" strokeWidth={1} strokeOpacity={0.5} />
      <Circle cx={to.x} cy={to.y} r={3} fill="#FFFFFF" opacity={0.98} />
      {/* faint particles around the landing */}
      <Circle cx={to.x - 7} cy={to.y - 5} r={0.8} fill="#EFE2FF" opacity={0.5} />
      <Circle cx={to.x + 6} cy={to.y + 4} r={0.7} fill="#EFE2FF" opacity={0.45} />
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
