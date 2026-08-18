import { useEffect } from 'react';
import { Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';

import { GlassSurface } from '@/components/ui/glass-surface';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { tokens } from '@/constants/tokens';
import type { StageState } from '@/lib/mobile-documents';

const DOT = 15;

/** How many rows the panel shows at once. */
const WINDOW = 4;

/** Rotating arc -- the only per-step animation, and only on the active step. */
function ActiveSpinner() {
  const angle = useSharedValue(0);
  const still = useReducedMotion();

  useEffect(() => {
    if (still) return;
    angle.value = withRepeat(withTiming(1, { duration: 1200, easing: Easing.linear }), -1, false);
  }, [angle, still]);

  const style = useAnimatedStyle(() => ({ transform: [{ rotate: `${angle.value * 360}deg` }] }));
  const r = DOT / 2 - 1.3;

  return (
    <Animated.View style={style}>
      <Svg width={DOT} height={DOT}>
        <Circle cx={DOT / 2} cy={DOT / 2} r={r} stroke={tokens.violet500} strokeWidth={1.8} fill="none" opacity={0.25} />
        <Circle
          cx={DOT / 2}
          cy={DOT / 2}
          r={r}
          stroke={tokens.violet300}
          strokeWidth={1.8}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${2 * Math.PI * r * 0.3} ${2 * Math.PI * r}`}
        />
      </Svg>
    </Animated.View>
  );
}

function StageMarker({ state }: { state: StageState }) {
  if (state === 'done') {
    return <IconSymbol name="checkmark.circle.fill" size={DOT} color={tokens.signalReceived} />;
  }
  if (state === 'failed') {
    return <IconSymbol name="exclamationmark.triangle.fill" size={DOT} color={tokens.signalPending} />;
  }
  if (state === 'active') return <ActiveSpinner />;

  const r = DOT / 2 - 1.3;
  return (
    <Svg width={DOT} height={DOT}>
      <Circle cx={DOT / 2} cy={DOT / 2} r={r} stroke={tokens.violet400} strokeWidth={1.3} fill="none" opacity={0.3} strokeDasharray="2 2.5" />
    </Svg>
  );
}

/**
 * The "LIVE INTELLIGENCE" panel.
 *
 * Shows a moving WINDOW of stages rather than all eight. Eight full-width rows
 * is a checklist, not a command centre -- it dominated the hero and pushed the
 * document list off screen. The window follows the active stage and keeps one
 * completed row visible above it for context, so there is always a sense of
 * progression without the panel ever growing.
 *
 * Both the list and the labels come from the server, so adding or renaming a
 * pipeline stage needs no app release.
 */
export function AnalysisSteps({
  stageList,
  stages,
  width,
}: {
  stageList: { id: string; label: string }[];
  stages: Record<string, StageState>;
  width: number;
}) {
  const total = stageList.length;
  const activeIdx = stageList.findIndex((s) => stages[s.id] === 'active');
  const failedIdx = stageList.findIndex((s) => stages[s.id] === 'failed');
  const doneCount = stageList.filter((s) => stages[s.id] === 'done').length;

  // Anchor on whatever is happening now; fall back to the end when finished.
  const focus = failedIdx >= 0 ? failedIdx : activeIdx >= 0 ? activeIdx : total - 1;
  // One completed row above the focus for context, clamped to the list bounds.
  const start = Math.max(0, Math.min(focus - 1, total - WINDOW));
  const visible = stageList.slice(start, start + WINDOW);

  return (
    <GlassSurface radius={16} intensity={16} tintOpacity={0.07} glow style={{ width }}>
      <View className="flex-row items-center justify-between gap-1 px-2.5 pb-1.5 pt-2.5">
        <View className="flex-row items-center gap-1.5">
          <View className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: tokens.signalReceived }} />
          <Text className="font-sans-semibold text-[9px] uppercase tracking-wide text-parchment/85">
            Live Intel
          </Text>
        </View>
        <Text className="font-mono text-[9px] text-parchment/45">
          {doneCount}/{total}
        </Text>
      </View>

      {visible.map((stage, i) => {
        const state = stages[stage.id] ?? 'pending';
        return (
          <View
            key={stage.id}
            className="flex-row items-center gap-2 px-2.5 py-1.5"
            style={i > 0 ? { borderTopWidth: 1, borderTopColor: 'rgba(168,85,247,0.14)' } : undefined}>
            <StageMarker state={state} />
            <Text
              className="flex-1 font-sans text-[10px] leading-[13px]"
              style={{
                color:
                  state === 'active'
                    ? tokens.violet300
                    : state === 'done'
                      ? 'rgba(244,239,255,0.9)'
                      : 'rgba(244,239,255,0.4)',
              }}
              numberOfLines={2}>
              {stage.label}
            </Text>
          </View>
        );
      })}
    </GlassSurface>
  );
}
