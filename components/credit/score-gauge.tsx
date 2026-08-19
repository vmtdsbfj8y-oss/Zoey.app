import { Text, View } from 'react-native';
import Svg, { Defs, LinearGradient, Path, Stop, Circle } from 'react-native-svg';

import { tokens } from '@/constants/tokens';

/**
 * The score, as an arc.
 *
 * ==============================  WHAT THE ARC IS AND IS NOT  ==============================
 *
 * It is a position within the range the score's own model uses -- nothing more. It is NOT a
 * judgement, a grade, or a comparison to anyone else, and the sweep carries no colour meaning that
 * would imply one: the same violet-to-magenta runs the length of it whatever the number, because a
 * red arc at 547 would be this app telling a client their credit is bad, which is neither our
 * assessment to make nor a fact the report states.
 *
 * ==============================  WHERE THE RANGE COMES FROM  ==============================
 *
 * The 300-850 bounds are the extraction layer's own documented plausibility range, the same
 * constants the reader uses to decide a three-digit number is a score at all. They are not a guess
 * about which model produced it. When a report names no model -- which is the common case -- the
 * gauge shows the position and says nothing about what scale it belongs to.
 */

/** The reader's own documented bounds. See MIN_SCORE / MAX_SCORE in report-scores.ts. */
export const SCORE_MIN = 300;
export const SCORE_MAX = 850;

function polar(cx: number, cy: number, r: number, degrees: number) {
  const radians = ((degrees - 180) * Math.PI) / 180;
  return { x: cx + r * Math.cos(radians), y: cy + r * Math.sin(radians) };
}

/** An arc from `from` to `to` degrees across a 180-degree sweep. */
function arc(cx: number, cy: number, r: number, from: number, to: number) {
  const start = polar(cx, cy, r, from);
  const end = polar(cx, cy, r, to);
  const large = to - from > 180 ? 1 : 0;
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${large} 1 ${end.x} ${end.y}`;
}

export function ScoreGauge({
  score,
  size = 232,
  model,
}: {
  /** The exact number the report printed. Null renders the unavailable face. */
  score: number | null;
  size?: number;
  model?: string | null;
}) {
  const stroke = 14;
  const cx = size / 2;
  const r = (size - stroke) / 2;

  /*
   * GEOMETRY, DERIVED RATHER THAN GUESSED.
   *
   * The first version centred the arc at `size / 2` and gave the canvas a height of `size * 0.68`,
   * which are two independent guesses that do not describe the same shape. On a 375pt device the
   * result was a semicircle with its apex cropped away: two disconnected stubs at the left and
   * right edges, with the score numeral floating over the gap where the curve should have been.
   *
   * A half-circle needs exactly `r + stroke` of height, and its centre sits `r + stroke / 2` down
   * from the top. Both come from `r`, so they cannot disagree.
   */
  const cy = r + stroke / 2;
  const arcHeight = r + stroke;

  /*
   * The numeral block is absolutely positioned inside the bowl, so it does not add to the
   * container's height -- and at 375pt it overflowed the arc by about 14px and collided with the
   * bureau name underneath. The container reserves that overflow explicitly rather than relying on
   * whatever margin the caller happens to set.
   */
  const captionRoom = 26;

  const clamped = score === null ? null : Math.min(Math.max(score, SCORE_MIN), SCORE_MAX);
  const fraction = clamped === null ? 0 : (clamped - SCORE_MIN) / (SCORE_MAX - SCORE_MIN);
  const sweep = fraction * 180;
  const knob = polar(cx, cy, r, sweep);

  return (
    <View style={{ width: size, height: arcHeight + captionRoom }} className="items-center justify-start">
      <Svg width={size} height={arcHeight} viewBox={`0 0 ${size} ${arcHeight}`}>
        <Defs>
          <LinearGradient id="gaugeFill" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor={tokens.violet500} />
            <Stop offset="0.55" stopColor={tokens.violet400} />
            <Stop offset="1" stopColor={tokens.magenta400} />
          </LinearGradient>
        </Defs>

        {/* The full range, dim. Always drawn, so the arc is read as a position in a span. */}
        <Path d={arc(cx, cy, r, 0, 180)} stroke="rgba(168,85,247,0.16)" strokeWidth={stroke} strokeLinecap="round" fill="none" />

        {/* The score's own portion. Absent when there is no score -- never a zero-width stub. */}
        {clamped !== null ? (
          <>
            <Path d={arc(cx, cy, r, 0, Math.max(sweep, 0.6))} stroke="url(#gaugeFill)" strokeWidth={stroke} strokeLinecap="round" fill="none" />
            <Circle cx={knob.x} cy={knob.y} r={stroke / 2 + 3} fill={tokens.parchment} opacity={0.92} />
            <Circle cx={knob.x} cy={knob.y} r={stroke / 2 - 2} fill={tokens.magenta500} />
          </>
        ) : null}
      </Svg>

      {/*
        The numeral sits INSIDE the arc's bowl, not across its apex. Positioned from the arc's own
        centre so it stays put when `size` changes -- a fixed fraction of `size` drifted over the
        curve as the canvas grew.
      */}
      <View className="absolute inset-x-0 items-center" style={{ top: cy - r * 0.52 }}>
        {clamped !== null ? (
          <>
            <Text className="font-display text-[52px] leading-[62px]" style={{ color: tokens.parchment }}>
              {score}
            </Text>
            {/*
              The scale is named only when the report named it. Printing "FICO" or "VantageScore"
              because a number happens to fall in their span would be inventing the model.
            */}
            <Text className="mt-0.5 font-sans text-[11.5px] text-parchment/45">
              {model ? model : `${SCORE_MIN}–${SCORE_MAX} range`}
            </Text>
          </>
        ) : (
          <>
            <Text className="font-sans-medium text-[19px] text-parchment/45">Unavailable</Text>
            <Text className="mt-1 max-w-[190px] text-center font-sans text-[11.5px] leading-[16px] text-parchment/35">
              This bureau did not print a score on your report.
            </Text>
          </>
        )}
      </View>
    </View>
  );
}
