import Svg, {
  Circle,
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
  const c = chamfer ?? Math.round(Math.min(width, height) * 0.1);
  const outline = octagon(width, height, c);

  return (
    <Svg width={width} height={height} pointerEvents="none">
      <Defs>
        <LinearGradient id={`${id}fill`} x1="0" y1="0" x2="0.9" y2="1">
          <Stop offset="0" stopColor="#C9A3FF" stopOpacity={0.26} />
          <Stop offset="0.45" stopColor="#2A1655" stopOpacity={0.50} />
          <Stop offset="1" stopColor="#0E0620" stopOpacity={0.66} />
        </LinearGradient>
        <LinearGradient id={`${id}rim`} x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#F2E7FF" stopOpacity={0.92} />
          <Stop offset="0.5" stopColor={tokens.violet400} stopOpacity={0.62} />
          <Stop offset="1" stopColor={tokens.violet500} stopOpacity={0.40} />
        </LinearGradient>
        {/* The strongest light on the screen. The hierarchy is score, then Zoey, then Run Zoey. */}
        <RadialGradient id={`${id}bloom`} cx="50%" cy="52%" r="52%">
          <Stop offset="0" stopColor="#C79BFF" stopOpacity={0.30} />
          <Stop offset="0.55" stopColor={tokens.violet500} stopOpacity={0.13} />
          <Stop offset="1" stopColor={tokens.violet500} stopOpacity={0} />
        </RadialGradient>
      </Defs>

      <Path d={outline} fill={`url(#${id}fill)`} />
      <Ellipse
        cx={width / 2}
        cy={height * 0.54}
        rx={width * 0.42}
        ry={height * 0.34}
        fill={`url(#${id}bloom)`}
      />
      <Path d={outline} fill="none" stroke={`url(#${id}rim)`} strokeWidth={1} />

      {/*
        A rim alone reads as an outline. The specular points are what make it read as a solid edge
        catching light -- one on the top run, one on the vertex the orbital path leaves from.
      */}
      <Circle cx={width * 0.42} cy={0} r={2.2} fill="#F6ECFF" opacity={0.95} />
      <Circle cx={width * 0.42} cy={0} r={5} fill="#C79BFF" opacity={0.28} />
      <Circle cx={c * 0.5} cy={height - c * 0.5} r={2.6} fill="#F6ECFF" opacity={0.9} />
      <Circle cx={c * 0.5} cy={height - c * 0.5} r={7} fill="#C79BFF" opacity={0.22} />
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
   * the endpoint moving when a different bureau is selected.
   */
  const span = to.y - from.y;
  const c1 = { x: from.x - Math.max(width * 0.06, 18), y: from.y + span * 0.42 };
  const c2 = { x: from.x - Math.max(width * 0.01, 4), y: to.y - span * 0.06 };
  const d = `M ${from.x} ${from.y} C ${c1.x} ${c1.y}, ${c2.x} ${c2.y}, ${to.x} ${to.y}`;

  return (
    <Svg width={width} height={height} pointerEvents="none">
      <Defs>
        <LinearGradient id={`${id}line`} x1="0" y1="0" x2="0.4" y2="1">
          <Stop offset="0" stopColor="#E6D2FF" stopOpacity={0} />
          <Stop offset="0.35" stopColor={tokens.violet400} stopOpacity={0.48} />
          <Stop offset="1" stopColor="#E6D2FF" stopOpacity={0.78} />
        </LinearGradient>
      </Defs>

      <Path d={d} fill="none" stroke={`url(#${id}line)`} strokeWidth={1} strokeLinecap="round" />

      {/* The node, and the short drop that lands it on the selected cell. */}
      <Path
        d={`M ${to.x} ${to.y} L ${to.x} ${to.y + 14}`}
        stroke="#E6D2FF"
        strokeWidth={1}
        strokeOpacity={0.5}
        strokeLinecap="round"
      />
      <Circle cx={to.x} cy={to.y} r={8} fill="#C79BFF" opacity={0.22} />
      <Circle cx={to.x} cy={to.y} r={3.4} fill="#F6ECFF" opacity={0.96} />
      <Circle cx={to.x} cy={to.y + 14} r={2} fill="#E6D2FF" opacity={0.7} />
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

      {/* Arcs. Drawn wide and mostly off-card so only their shallow part crosses the scene. */}
      <Ellipse
        cx={width * 0.24}
        cy={height * 0.06}
        rx={width * 0.78}
        ry={height * 0.30}
        fill="none"
        stroke={tokens.violet400}
        strokeWidth={0.7}
        strokeOpacity={0.16}
        transform={`rotate(-9 ${width * 0.24} ${height * 0.06})`}
      />
      <Ellipse
        cx={width * 0.1}
        cy={height * 0.42}
        rx={width * 0.62}
        ry={height * 0.44}
        fill="none"
        stroke={tokens.violet300}
        strokeWidth={0.5}
        strokeOpacity={0.10}
        transform={`rotate(14 ${width * 0.1} ${height * 0.42})`}
      />
    </Svg>
  );
}
