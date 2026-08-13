import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';

import { tokens } from '@/constants/tokens';

/**
 * Circular progress arc with a violet -> magenta gradient stroke.
 *
 * A gradient stroke isn't expressible in CSS-for-RN, so this is SVG: two
 * concentric circles (track + progress) whose dash arrays are computed from
 * the circumference.
 *
 * `sweep` is the arc's total degrees. 360 gives a closed ring (Dispute
 * Rounds); less than 360 opens a gap centered at the bottom, which is the
 * speedometer look of the main gauge.
 */
export function GradientRing({
  size,
  strokeWidth,
  progress,
  sweep = 360,
  trackColor = tokens.ink700,
  gradientId = 'ringGradient',
}: {
  size: number;
  strokeWidth: number;
  /** 0..1 */
  progress: number;
  sweep?: number;
  trackColor?: string;
  /** Must be unique per mounted ring -- SVG defs share an id namespace. */
  gradientId?: string;
}) {
  const r = (size - strokeWidth) / 2;
  const c = size / 2;
  const circumference = 2 * Math.PI * r;

  const gap = 360 - sweep;
  const arc = circumference * (sweep / 360);
  const clamped = Math.max(0, Math.min(1, progress));

  // Start the arc past the bottom gap, then run clockwise.
  const rotation = 90 + gap / 2;

  return (
    <Svg width={size} height={size}>
      <Defs>
        <LinearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={tokens.violet500} />
          <Stop offset="1" stopColor={tokens.magenta500} />
        </LinearGradient>
      </Defs>

      <Circle
        cx={c}
        cy={c}
        r={r}
        stroke={trackColor}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        fill="none"
        strokeDasharray={`${arc} ${circumference}`}
        transform={`rotate(${rotation} ${c} ${c})`}
      />
      <Circle
        cx={c}
        cy={c}
        r={r}
        stroke={`url(#${gradientId})`}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        fill="none"
        strokeDasharray={`${arc * clamped} ${circumference}`}
        transform={`rotate(${rotation} ${c} ${c})`}
      />
    </Svg>
  );
}
