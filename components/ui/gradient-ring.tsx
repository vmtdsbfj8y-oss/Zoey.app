import Svg, { Circle, Defs, FeGaussianBlur, Filter, LinearGradient, Stop } from 'react-native-svg';

import { tokens } from '@/constants/tokens';

/**
 * Circular progress arc with a violet -> magenta gradient stroke and an outer
 * bloom.
 *
 * The bloom is a genuine Gaussian-blurred copy of the progress arc drawn
 * behind the sharp one, so the light actually bleeds outward instead of just
 * being a second translucent stroke.
 *
 * The SVG canvas is padded beyond `size` because a blur drawn at the very
 * edge of the viewport gets clipped -- `pad` gives the bloom room to fall off.
 * The padding is symmetric, so anything centred over this component stays
 * centred.
 *
 * `sweep` is the arc's total degrees. 360 closes the ring; less opens a gap
 * centred at the bottom, which is the speedometer look of the main gauge.
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
  /** Must be unique per mounted ring -- SVG ids share a namespace. */
  gradientId?: string;
}) {
  const pad = strokeWidth * 2.5;
  const canvas = size + pad * 2;

  const r = (size - strokeWidth) / 2;
  const c = canvas / 2;
  const circumference = 2 * Math.PI * r;

  const gap = 360 - sweep;
  const arc = circumference * (sweep / 360);
  const clamped = Math.max(0, Math.min(1, progress));

  // Start the arc past the bottom gap, then run clockwise.
  const rotation = 90 + gap / 2;
  const blurId = `${gradientId}Blur`;

  return (
    <Svg width={canvas} height={canvas}>
      <Defs>
        <LinearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={tokens.violet500} />
          <Stop offset="1" stopColor={tokens.magenta500} />
        </LinearGradient>
        <Filter id={blurId} x="-50%" y="-50%" width="200%" height="200%">
          <FeGaussianBlur stdDeviation={strokeWidth * 0.7} />
        </Filter>
      </Defs>

      {/* track */}
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

      {/* bloom: blurred copy of the progress arc, drawn first so it sits behind */}
      <Circle
        cx={c}
        cy={c}
        r={r}
        stroke={`url(#${gradientId})`}
        strokeWidth={strokeWidth * 1.3}
        strokeLinecap="round"
        fill="none"
        opacity={0.85}
        filter={`url(#${blurId})`}
        strokeDasharray={`${arc * clamped} ${circumference}`}
        transform={`rotate(${rotation} ${c} ${c})`}
      />

      {/* sharp arc */}
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
