import { useState } from 'react';
import { LayoutChangeEvent, Pressable, Text, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Path, Stop } from 'react-native-svg';

import { Card } from '@/components/ui/card';
import { tokens } from '@/constants/tokens';
import { bureaus, creditScores, type Bureau } from '@/lib/placeholder-data';

const CHART_HEIGHT = 92;

/** Builds the polyline path plus the y positions of each point. */
function buildPath(points: number[], width: number, height: number) {
  if (points.length < 2 || width <= 0) return { d: '', coords: [] as { x: number; y: number }[] };

  const min = Math.min(...points);
  const max = Math.max(...points);
  const span = max - min || 1;
  const pad = 8; // keep the stroke off the top/bottom edges

  const coords = points.map((p, i) => ({
    x: (i / (points.length - 1)) * width,
    y: pad + (1 - (p - min) / span) * (height - pad * 2),
  }));

  const d = coords.map((c, i) => `${i === 0 ? 'M' : 'L'}${c.x.toFixed(2)},${c.y.toFixed(2)}`).join(' ');
  return { d, coords };
}

export function CreditScoreCard() {
  const [active, setActive] = useState<Bureau>('Equifax');
  const [chartWidth, setChartWidth] = useState(0);

  const data = creditScores[active];
  const { d, coords } = buildPath(data.points, chartWidth, CHART_HEIGHT);

  const axis = [Math.max(...data.points), Math.round((Math.max(...data.points) + Math.min(...data.points)) / 2), Math.min(...data.points)];

  return (
    <Card>
      <Text className="font-sans-semibold text-[15px] text-parchment">Credit Score Overview</Text>

      {/* bureau tabs */}
      <View className="mt-3 flex-row rounded-full bg-ink-800 p-1">
        {bureaus.map((b) => {
          const on = b === active;
          return (
            <Pressable
              key={b}
              onPress={() => setActive(b)}
              className={`flex-1 items-center rounded-full py-1.5 ${on ? 'bg-violet-500' : ''}`}>
              <Text
                className={`font-sans-medium text-[12px] ${on ? 'text-parchment' : 'text-ink-600'}`}
                numberOfLines={1}>
                {b}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View className="mt-3 flex-row items-end gap-2">
        <Text className="font-display text-[28px] leading-[32px] text-parchment">{data.score}</Text>
        <Text className="pb-1 font-sans-medium text-[14px] text-signal-received">
          +{data.delta} pts
        </Text>
      </View>
      <Text className="mt-0.5 font-sans text-[12px] text-ink-600">{data.updated}</Text>

      {/* chart */}
      <View className="mt-3 flex-row gap-2">
        <View className="justify-between py-1">
          {axis.map((v) => (
            <Text key={v} className="font-mono text-[10px] text-ink-600">
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
                  <LinearGradient id="scoreLine" x1="0" y1="0" x2="1" y2="0">
                    <Stop offset="0" stopColor={tokens.violet500} />
                    <Stop offset="1" stopColor={tokens.magenta500} />
                  </LinearGradient>
                </Defs>
                <Path d={d} stroke="url(#scoreLine)" strokeWidth={2} fill="none" />
                {coords.map((c, i) => (
                  <Circle
                    key={i}
                    cx={c.x}
                    cy={c.y}
                    r={i === coords.length - 1 ? 4 : 2.5}
                    fill={i === coords.length - 1 ? tokens.magenta400 : tokens.violet400}
                  />
                ))}
              </Svg>
            ) : null}
          </View>

          <View className="mt-1 flex-row justify-between">
            {data.labels.map((l) => (
              <Text key={l} className="font-mono text-[10px] text-ink-600">
                {l}
              </Text>
            ))}
          </View>
        </View>
      </View>
    </Card>
  );
}
