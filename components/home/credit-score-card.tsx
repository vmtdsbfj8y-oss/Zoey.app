import { useState } from 'react';
import { LayoutChangeEvent, Pressable, Text, View } from 'react-native';
import Svg, {
  Circle,
  Defs,
  FeGaussianBlur,
  Filter,
  LinearGradient,
  Path,
  Stop,
} from 'react-native-svg';

import { Card } from '@/components/ui/card';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { tokens } from '@/constants/tokens';
import { bureaus, creditScores, type Bureau } from '@/lib/placeholder-data';

const CHART_HEIGHT = 96;

/**
 * Builds the line path, the closed path for the area fill beneath it, and the
 * y positions of each point.
 *
 * The area path is the line plus a return leg along the bottom edge. It has to
 * be a separate `d` from the stroke: filling the line path directly would let
 * the fill's implicit closing segment cut diagonally back to the first point.
 */
function buildPath(points: number[], width: number, height: number) {
  if (points.length < 2 || width <= 0) {
    return { d: '', area: '', coords: [] as { x: number; y: number }[] };
  }

  const min = Math.min(...points);
  const max = Math.max(...points);
  const span = max - min || 1;
  const pad = 10; // keep the stroke off the top/bottom edges

  const coords = points.map((p, i) => ({
    x: (i / (points.length - 1)) * width,
    y: pad + (1 - (p - min) / span) * (height - pad * 2),
  }));

  const d = coords
    .map((c, i) => `${i === 0 ? 'M' : 'L'}${c.x.toFixed(2)},${c.y.toFixed(2)}`)
    .join(' ');
  const area = `${d} L${width.toFixed(2)},${height} L0,${height} Z`;

  return { d, area, coords };
}

export function CreditScoreCard() {
  const [active, setActive] = useState<Bureau>('Equifax');
  const [chartWidth, setChartWidth] = useState(0);

  const data = creditScores[active];
  const { d, area, coords } = buildPath(data.points, chartWidth, CHART_HEIGHT);

  const high = Math.max(...data.points);
  const low = Math.min(...data.points);
  const axis = [high, Math.round((high + low) / 2), low];

  return (
    <Card glowId="glowCredit">
      <View className="flex-row items-center justify-between gap-3">
        <Text className="font-display text-[15px] text-parchment">Credit Score Overview</Text>
        <IconSymbol name="chart.line.uptrend.xyaxis" size={18} color={tokens.violet400} />
      </View>

      {/*
        Bare row -- no capsule container, no per-pill borders. Only the active
        bureau gets a surface, and it is a soft translucent violet rather than a
        saturated fill, so it reads as a highlight instead of a button.
      */}
      <View className="mt-3 flex-row items-center">
        {bureaus.map((b) => {
          const on = b === active;
          return (
            <Pressable
              key={b}
              accessibilityRole="tab"
              accessibilityState={{ selected: on }}
              onPress={() => setActive(b)}
              className="flex-1 items-center justify-center rounded-full py-2"
              style={on ? { backgroundColor: 'rgba(168,85,247,0.26)' } : undefined}>
              <Text
                className={
                  on
                    ? 'font-sans-semibold text-[13px] text-parchment'
                    : 'font-sans text-[13px] text-parchment/45'
                }
                numberOfLines={1}>
                {b}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View className="mt-4 flex-row items-end gap-2">
        <Text className="font-display text-[30px] leading-[34px] text-parchment">{data.score}</Text>
        <Text className="pb-1 font-sans-semibold text-[14px] text-signal-received">
          +{data.delta} pts
        </Text>
      </View>
      <Text className="mt-0.5 font-sans text-[12px] text-parchment/45">{data.updated}</Text>

      {/* chart */}
      <View className="mt-3 flex-row gap-2">
        <View className="justify-between py-1">
          {axis.map((v) => (
            <Text key={v} className="font-mono text-[9px] text-parchment/35">
              {v}
            </Text>
          ))}
        </View>

        <View className="flex-1">
          <View
            onLayout={(e: LayoutChangeEvent) => setChartWidth(e.nativeEvent.layout.width)}
            style={{ height: CHART_HEIGHT }}>
            {chartWidth > 0 ? (
              <Svg width={chartWidth} height={CHART_HEIGHT}>
                <Defs>
                  {/* Single-hue violet ramp. The old violet->magenta line is
                      what made the trace read as pink. */}
                  <LinearGradient id="scoreLine" x1="0" y1="0" x2="1" y2="0">
                    <Stop offset="0" stopColor={tokens.violet500} />
                    <Stop offset="1" stopColor={tokens.violet300} />
                  </LinearGradient>
                  <LinearGradient id="scoreArea" x1="0" y1="0" x2="0" y2="1">
                    <Stop offset="0" stopColor={tokens.violet500} stopOpacity={0.42} />
                    <Stop offset="1" stopColor={tokens.violet500} stopOpacity={0} />
                  </LinearGradient>
                  <Filter id="scoreLineBlur" x="-50%" y="-50%" width="200%" height="200%">
                    <FeGaussianBlur stdDeviation={3} />
                  </Filter>
                </Defs>

                {/* area fill under the trace, fading out toward the baseline */}
                <Path d={area} fill="url(#scoreArea)" />

                {/* blurred copy beneath the sharp line, so the trace bleeds light */}
                <Path
                  d={d}
                  stroke="url(#scoreLine)"
                  strokeWidth={4}
                  fill="none"
                  opacity={0.7}
                  filter="url(#scoreLineBlur)"
                />
                <Path d={d} stroke="url(#scoreLine)" strokeWidth={2} fill="none" />
                {coords.map((c, i) => (
                  <Circle
                    key={i}
                    cx={c.x}
                    cy={c.y}
                    r={i === coords.length - 1 ? 4 : 3}
                    fill={i === coords.length - 1 ? tokens.violet300 : tokens.violet400}
                  />
                ))}
              </Svg>
            ) : null}
          </View>

          <View className="mt-1 flex-row justify-between">
            {data.labels.map((l) => (
              <Text key={l} className="font-mono text-[9px] text-parchment/35">
                {l}
              </Text>
            ))}
          </View>
        </View>
      </View>
    </Card>
  );
}
