import { useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, Text, View } from 'react-native';

import { EmptyState, ErrorState, InfoNote, LoadingState, SectionLabel } from '@/components/more/states';
import { GlassSurface } from '@/components/ui/glass-surface';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { ScreenBackground } from '@/components/ui/screen-background';
import { tokens } from '@/constants/tokens';
import { useAsync } from '@/hooks/use-async';
import {
  createGoal,
  deleteGoal,
  getScores,
  goalProgress,
  listGoals,
  updateGoal,
  type Goal,
  type GoalKind,
} from '@/lib/account-api';

/**
 * Goal types offered to the client.
 *
 * Wording is deliberately about targets and progress. Zoey does not promise a
 * score, an approval, a deletion or a funding amount, so no option here is
 * phrased as a guaranteed outcome.
 */
const KINDS: { kind: GoalKind; label: string; blurb: string; unit?: 'score' | 'percent' | 'items'; suggest?: number }[] = [
  { kind: 'target-score', label: 'Reach a target score', blurb: 'Work toward a score you have in mind', unit: 'score', suggest: 700 },
  { kind: 'vehicle', label: 'Prepare for a vehicle', blurb: 'Get your profile ready to apply' },
  { kind: 'home', label: 'Prepare for a home', blurb: 'Work toward a mortgage-ready profile' },
  { kind: 'business-funding', label: 'Prepare for business funding', blurb: 'Build a profile lenders can review' },
  { kind: 'utilization', label: 'Reduce utilization', blurb: 'Bring balances down toward a target', unit: 'percent', suggest: 30 },
  { kind: 'negative-items', label: 'Address negative reporting', blurb: 'Track items you want reviewed', unit: 'items', suggest: 5 },
  { kind: 'positive-history', label: 'Build positive history', blurb: 'Keep good accounts reporting on time' },
  { kind: 'custom', label: 'Something else', blurb: 'Write your own goal' },
];

function unitSuffix(unit: Goal['unit']) {
  return unit === 'percent' ? '%' : unit === 'items' ? ' items' : '';
}

function GoalCard({
  goal,
  currentValue,
  onComplete,
  onReopen,
  onDelete,
  onEditTarget,
}: {
  goal: Goal;
  currentValue?: number;
  onComplete: () => void;
  onReopen: () => void;
  onDelete: () => void;
  onEditTarget: () => void;
}) {
  const progress = goalProgress(goal, currentValue);
  const done = goal.status === 'completed';

  return (
    <GlassSurface radius={20} glow>
      <View className="p-3.5">
        <View className="flex-row items-start gap-3">
          <View className="flex-1">
            <Text className="font-sans-semibold text-[15px] text-parchment">{goal.title}</Text>
            {goal.targetValue != null ? (
              <Text className="mt-0.5 font-sans text-[12px] text-parchment/55">
                Target: {goal.targetValue}
                {unitSuffix(goal.unit)}
              </Text>
            ) : null}
            {goal.note ? (
              <Text className="mt-1 font-sans text-[12px] text-parchment/45">{goal.note}</Text>
            ) : null}
          </View>

          {done ? (
            <View className="flex-row items-center gap-1">
              <IconSymbol name="checkmark.circle.fill" size={16} color={tokens.signalReceived} />
              <Text className="font-sans-semibold text-[11px]" style={{ color: tokens.signalReceived }}>
                Complete
              </Text>
            </View>
          ) : null}
        </View>

        {/* Progress only renders when it can be computed from a real reading. */}
        {goal.targetValue != null ? (
          progress != null ? (
            <View className="mt-3">
              <View
                className="w-full overflow-hidden"
                style={{ height: 6, borderRadius: 3, backgroundColor: 'rgba(20,8,42,0.8)' }}>
                <View
                  style={{
                    width: `${progress * 100}%`,
                    height: '100%',
                    borderRadius: 3,
                    backgroundColor: tokens.violet400,
                  }}
                />
              </View>
              <Text className="mt-1.5 font-sans text-[11px] text-parchment/50">
                Now {currentValue}
                {unitSuffix(goal.unit)} · {Math.round(progress * 100)}% of target
              </Text>
            </View>
          ) : (
            <Text className="mt-2.5 font-sans text-[11.5px] text-parchment/40">
              Progress will appear once Zoey has a current reading from an analyzed report.
            </Text>
          )
        ) : null}

        <View className="mt-3 flex-row items-center gap-2">
          {goal.targetValue != null ? (
            <Pressable
              accessibilityRole="button"
              onPress={onEditTarget}
              className="rounded-full border px-3 py-1.5 active:opacity-70"
              style={{ borderColor: 'rgba(168,85,247,0.45)' }}>
              <Text className="font-sans-medium text-[11.5px]" style={{ color: tokens.violet300 }}>
                Edit target
              </Text>
            </Pressable>
          ) : null}

          <Pressable
            accessibilityRole="button"
            onPress={done ? onReopen : onComplete}
            className="rounded-full border px-3 py-1.5 active:opacity-70"
            style={{ borderColor: 'rgba(168,85,247,0.45)' }}>
            <Text className="font-sans-medium text-[11.5px]" style={{ color: tokens.violet300 }}>
              {done ? 'Reopen' : 'Mark complete'}
            </Text>
          </Pressable>

          <View className="flex-1" />

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Delete ${goal.title}`}
            onPress={onDelete}
            className="p-1.5 active:opacity-70">
            <IconSymbol name="trash" size={16} color="rgba(244,239,255,0.4)" />
          </Pressable>
        </View>
      </View>
    </GlassSurface>
  );
}

export default function GoalsScreen() {
  const goals = useAsync(() => listGoals(), []);
  const scores = useAsync(() => getScores(), []);

  const [picking, setPicking] = useState(false);
  const [busy, setBusy] = useState(false);

  /**
   * Current values come only from real extracted scores. Utilization and item
   * counts have no source yet, so those goals show "no reading" rather than a
   * fabricated number.
   */
  const bestScore = scores.data?.latest.length
    ? Math.max(...scores.data.latest.map((s) => s.score))
    : undefined;

  function currentFor(goal: Goal) {
    return goal.unit === 'score' ? bestScore : undefined;
  }

  async function withRefresh(fn: () => Promise<unknown>, failMessage: string) {
    setBusy(true);
    try {
      await fn();
      await goals.retry();
    } catch (err) {
      Alert.alert(failMessage, err instanceof Error ? err.message : 'Please try again.');
    } finally {
      setBusy(false);
    }
  }

  async function addGoal(k: (typeof KINDS)[number]) {
    setPicking(false);
    await withRefresh(
      () =>
        createGoal({
          kind: k.kind,
          title: k.label,
          targetValue: k.unit ? k.suggest : undefined,
        }),
      'Could not create goal'
    );
  }

  function editTarget(goal: Goal) {
    Alert.prompt?.(
      'Update target',
      `Enter a new target${unitSuffix(goal.unit) ? ` (${unitSuffix(goal.unit).trim()})` : ''}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Save',
          onPress: (value?: string) => {
            const n = Number(value);
            if (!value || Number.isNaN(n)) return;
            withRefresh(() => updateGoal(goal.goalId, { targetValue: n }), 'Could not update goal');
          },
        },
      ],
      'plain-text',
      String(goal.targetValue ?? '')
    );
  }

  const active = goals.data?.filter((g) => g.status === 'active') ?? [];
  const finished = goals.data?.filter((g) => g.status !== 'active') ?? [];

  return (
    <ScreenBackground idPrefix="goals">
      <ScrollView showsVerticalScrollIndicator={false}>
        <View className="gap-3 px-4 pb-16 pt-4">
          {goals.loading ? <LoadingState label="Loading your goals…" /> : null}
          {!goals.loading && goals.error ? (
            <ErrorState message={goals.error} onRetry={goals.retry} />
          ) : null}

          {!goals.loading && !goals.error ? (
            <>
              {goals.data && goals.data.length === 0 ? (
                <EmptyState
                  icon="target"
                  title="No goals yet"
                  body="Set what you're working toward and Zoey will track your progress against it as your reports come in."
                  action={{ label: 'Add a goal', onPress: () => setPicking(true) }}
                />
              ) : (
                <>
                  {active.length > 0 ? <SectionLabel>Active</SectionLabel> : null}
                  {active.map((g) => (
                    <GoalCard
                      key={g.goalId}
                      goal={g}
                      currentValue={currentFor(g)}
                      onComplete={() =>
                        withRefresh(
                          () => updateGoal(g.goalId, { status: 'completed' }),
                          'Could not update goal'
                        )
                      }
                      onReopen={() =>
                        withRefresh(
                          () => updateGoal(g.goalId, { status: 'active' }),
                          'Could not update goal'
                        )
                      }
                      onDelete={() =>
                        withRefresh(() => deleteGoal(g.goalId), 'Could not delete goal')
                      }
                      onEditTarget={() => editTarget(g)}
                    />
                  ))}

                  {finished.length > 0 ? <SectionLabel>Completed</SectionLabel> : null}
                  {finished.map((g) => (
                    <GoalCard
                      key={g.goalId}
                      goal={g}
                      currentValue={currentFor(g)}
                      onComplete={() =>
                        withRefresh(
                          () => updateGoal(g.goalId, { status: 'completed' }),
                          'Could not update goal'
                        )
                      }
                      onReopen={() =>
                        withRefresh(
                          () => updateGoal(g.goalId, { status: 'active' }),
                          'Could not update goal'
                        )
                      }
                      onDelete={() =>
                        withRefresh(() => deleteGoal(g.goalId), 'Could not delete goal')
                      }
                      onEditTarget={() => editTarget(g)}
                    />
                  ))}

                  <Pressable
                    accessibilityRole="button"
                    onPress={() => setPicking(true)}
                    className="mt-1 flex-row items-center justify-center gap-2 rounded-full py-3 active:opacity-85"
                    style={{ backgroundColor: tokens.violet500, opacity: busy ? 0.6 : 1 }}>
                    <IconSymbol name="plus.circle.fill" size={16} color={tokens.parchment} />
                    <Text className="font-sans-semibold text-[13px] text-parchment">
                      Add a goal
                    </Text>
                  </Pressable>
                </>
              )}

              {!scores.loading && !scores.data?.latest.length ? (
                <InfoNote>
                  Zoey tracks progress against your analyzed reports. Once a supported report has
                  been read, score-based goals will show how far along you are.
                </InfoNote>
              ) : null}
            </>
          ) : null}
        </View>
      </ScrollView>

      <Modal visible={picking} transparent animationType="slide" onRequestClose={() => setPicking(false)}>
        <Pressable className="flex-1 justify-end" style={{ backgroundColor: 'rgba(4,2,10,0.7)' }} onPress={() => setPicking(false)}>
          <Pressable onPress={(e) => e.stopPropagation()}>
            <View
              className="px-4 pb-10 pt-4"
              style={{
                backgroundColor: '#0B0615',
                borderTopLeftRadius: 24,
                borderTopRightRadius: 24,
                borderTopWidth: 1,
                borderColor: 'rgba(168,85,247,0.3)',
              }}>
              <Text className="mb-1 font-display text-[17px] text-parchment">Choose a goal</Text>
              <Text className="mb-3 font-sans text-[12px] text-parchment/50">
                Zoey tracks progress toward targets — she can&apos;t promise an outcome.
              </Text>
              <ScrollView style={{ maxHeight: 380 }} showsVerticalScrollIndicator={false}>
                <View className="gap-2">
                  {KINDS.map((k) => (
                    <Pressable key={k.kind} onPress={() => addGoal(k)} className="active:opacity-75">
                      <GlassSurface radius={16}>
                        <View className="px-3.5 py-3">
                          <Text className="font-sans-semibold text-[14px] text-parchment">
                            {k.label}
                          </Text>
                          <Text className="mt-0.5 font-sans text-[11.5px] text-parchment/50">
                            {k.blurb}
                          </Text>
                        </View>
                      </GlassSurface>
                    </Pressable>
                  ))}
                </View>
              </ScrollView>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </ScreenBackground>
  );
}
