import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, Text, View } from 'react-native';
import { useI18n } from '@/lib/i18n/context';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { ZoeyAvatar } from '@/components/ui/zoey-avatar';
import { tokens } from '@/constants/tokens';
import { UNAVAILABLE_METRICS_KEY, type CreditFacts, type ReportFactor } from '@/lib/credit-facts';
import { clientStateCopy } from '@/lib/client-state-copy';

/**
 * The credit sections.
 *
 * ==============================  WHY SO FEW BOXES  ==============================
 *
 * The previous pass gave every section its own bordered purple card, and the result read as an
 * admin console: rectangles stacked on rectangles, each with a tiny uppercase label above it, all
 * the same colour and all the same weight. Nothing was more important than anything else.
 *
 * Here, a section is a title and its content on open dark space. A surface appears only where it
 * does work -- grouping rows that belong together, or carrying an action. Purple is an accent on
 * numbers and controls, not the fill of the interface.
 *
 * ==============================  TYPE CARRIES THE HIERARCHY  ==============================
 *
 * Section titles are 20pt in near-white, not 11pt uppercase in 45% violet. Body text has a 15pt
 * floor. The old micro-labels were legible on a desk and invisible in a hand.
 */

/** A section title. Sentence case, real size, no rectangle around it. */
export function SectionTitle({ children, action }: { children: React.ReactNode; action?: { label: string; onPress: () => void } }) {
  return (
    <View className="mt-3 flex-row items-end justify-between px-1">
      <Text className="font-display text-[22px] leading-[27px] text-parchment">{children}</Text>
      {action ? (
        <Pressable accessibilityRole="button" onPress={action.onPress} className="active:opacity-70">
          <Text className="font-sans-medium text-[14px]" style={{ color: tokens.violet400 }}>
            {action.label}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

/**
 * A surface used only where rows need grouping. Softer and rounder than the old card.
 *
 * The hairline is what makes it read as glass rather than as a slightly-lighter rectangle: on a
 * near-black page a 3.5% fill alone has almost no edge, so the panel dissolved into the backdrop.
 */
function Panel({ children }: { children: React.ReactNode }) {
  return (
    <View
      style={{
        backgroundColor: 'rgba(138,106,214,0.055)',
        borderRadius: 26,
        borderWidth: 1,
        borderColor: 'rgba(198,166,255,0.15)',
      }}
      className="mt-1.5 overflow-hidden">
      {children}
    </View>
  );
}

function Row({
  label,
  value,
  icon,
  last,
}: {
  label: string;
  value: string;
  icon?: string;
  last?: boolean;
}) {
  return (
    <View
      className="flex-row items-center justify-between px-5 py-4"
      style={last ? undefined : { borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.055)' }}>
      <View className="flex-1 flex-row items-center gap-3">
        {icon ? <IconSymbol name={icon as never} size={17} color={tokens.violet400} /> : null}
        <Text className="font-sans text-[16px] text-parchment/85">{label}</Text>
      </View>
      <Text className="font-display text-[20px] text-parchment">{value}</Text>
    </View>
  );
}

/**
 * Credit health as three rows a person can act on, not a grid of database counts.
 *
 * Four small numerals in a 2x2 was the clearest symptom of the admin-panel problem: it presented
 * "Needs attention" and "Ready to dispute" as peers of "Accounts reviewed", which they are in the
 * payload and are not to a reader.
 */
export function CreditHealthSection({ facts }: { facts: CreditFacts }) {
  const { t } = useI18n();
  const available = facts.facts.filter((fact) => fact.availability === 'AVAILABLE' && fact.value !== null);

  if (available.length === 0) {
    return (
      <Panel>
        <View className="px-5 py-5">
          <Text className="font-sans text-[15px] leading-[21px] text-parchment/55">
            {facts.facts[0]?.note ?? t('facts.availableAfter')}
          </Text>
        </View>
      </Panel>
    );
  }

  return (
    <Panel>
      {available.map((fact, index) => (
        <Row key={fact.label} label={fact.label} value={String(fact.value)} last={index === available.length - 1} />
      ))}
    </Panel>
  );
}

/**
 * What is on the report, in the report's own words.
 *
 * Phrased as what the document says, never as what a scoring model concluded. The footnote is one
 * sentence rather than the paragraph the previous version carried under every card.
 */
export function ReportFactorsSection({ factors }: { factors: ReportFactor[] }) {
  const { t } = useI18n();
  if (factors.length === 0) {
    return (
      <Panel>
        <View className="px-5 py-5">
          <Text className="font-sans text-[15px] leading-[21px] text-parchment/55">
            {t('modules.findingsPending')}
          </Text>
        </View>
      </Panel>
    );
  }

  return (
    <>
      <Panel>
        {factors.map((factor, index) => (
          <Row
            key={factor.key}
            icon={factor.icon}
            label={factor.label}
            value={String(factor.count)}
            last={index === factors.length - 1}
          />
        ))}
      </Panel>
      <Text className="mt-2.5 px-1 font-sans text-[13px] leading-[18px] text-parchment/40">
        {t('modules.reportNotReasons')}
      </Text>
    </>
  );
}

/**
 * Zoey's read on the case, given room to matter.
 *
 * A notification-sized strip was the wrong shape for the one thing on the screen that speaks. The
 * headline and detail are the ENGINE's own resolved state -- nothing is composed here and no model
 * is called, because a sentence written on the phone would be this app's opinion in her voice.
 */
export function ZoeyInsightSection({
  headline,
  detail,
  actionRequired,
  action,
  state,
}: {
  headline: string;
  detail: string;
  actionRequired: boolean;
  action?: { label: string; onPress: () => void };
  /**
   * The engine's client-state name, when this insight came from one.
   *
   * Present: the copy is translated from the state and the `headline`/`detail` props are the
   * fallback for a state this build does not know. Absent: the props are already local copy.
   */
  state?: string;
}) {
  const { t } = useI18n();
  const localized = clientStateCopy(state ? { state, headline, detail } : null, t);
  const shownHeadline = localized?.headline ?? headline;
  const shownDetail = localized?.detail ?? detail;
  return (
    <View
      className="mt-3 overflow-hidden"
      style={{
        borderRadius: 28,
        backgroundColor: actionRequired ? 'rgba(168,85,247,0.09)' : 'rgba(138,106,214,0.050)',
        borderWidth: 1,
        borderColor: actionRequired ? 'rgba(201,155,255,0.28)' : 'rgba(198,166,255,0.15)',
      }}>
      <View className="px-[18px] pb-4 pt-4">
        <View className="flex-row items-center gap-3">
          <ZoeyAvatar size={40} />
          <Text className="font-sans-medium text-[15px]" style={{ color: tokens.textSecondary }}>
            {t('score.zoeyInsight')}
          </Text>
        </View>

        <Text className="mt-3 font-display text-[23px] leading-[28px] text-parchment">{shownHeadline}</Text>
        <Text className="mt-2 font-sans text-[15px] leading-[21px]" style={{ color: tokens.textBody }}>
          {shownDetail}
        </Text>

        {/*
          A full-width row rather than the pill it used to be.

          The pill sat at 40% width against a 23pt headline and read as a footnote to the sentence
          above it. This is the one thing on the card a person is meant to DO, so it spans the card
          and ends in a direction: the arrow is what makes it read as a way out of the card rather
          than as a labelled box. Height is 48 -- the 44pt floor with margin, not at it.
        */}
        {action ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={action.label}
            onPress={action.onPress}
            className="mt-3 flex-row items-center justify-between overflow-hidden px-[18px] active:opacity-85"
            style={{
              height: 48,
              borderRadius: 14,
              borderWidth: 1,
              borderColor: 'rgba(193,143,255,0.38)',
            }}>
            <LinearGradient
              pointerEvents="none"
              /* The reference CTA is NOT a violet button -- it is the same dark glass as the card
                 with a lit edge. A 52%-alpha violet fill made it the brightest object on the
                 screen, ahead of the score. */
              colors={['rgba(74,36,134,0.30)', 'rgba(40,18,80,0.22)', 'rgba(18,8,38,0.18)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{ position: 'absolute', inset: 0 }}
            />
            {/* Light pooling under the right end, where the streak lands. */}
            <LinearGradient
              pointerEvents="none"
              colors={['transparent', 'rgba(170,110,245,0.16)']}
              start={{ x: 0.35, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={{ position: 'absolute', inset: 0 }}
            />
            {/*
              A beam running into the arrow. It is the row's only light and it points, which is why
              it is a gradient rather than a glow -- a symmetric halo here would sit third in a
              hierarchy that already has the score first and Zoey second, and compete with both.
            */}
            <LinearGradient
              pointerEvents="none"
              colors={['transparent', 'rgba(220,190,255,0.22)', 'rgba(250,244,255,0.98)']}
              locations={[0, 0.62, 1]}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={{ position: 'absolute', left: '30%', right: 56, top: 23.5, height: 1 }}
            />
            {/*
              The endpoint. In the reference the rule does not simply stop -- it lands on a hot
              point that blooms, which is what makes it read as energy arriving at the arrow rather
              than as a hairline rule that ran out of room.
            */}
            <View
              pointerEvents="none"
              style={{
                position: 'absolute',
                right: 54,
                top: 20.5,
                width: 7,
                height: 7,
                borderRadius: 4,
                backgroundColor: '#FBF7FF',
                shadowColor: '#D8B4FF',
                shadowOpacity: 0.95,
                shadowRadius: 7,
                shadowOffset: { width: 0, height: 0 },
              }}
            />
            <Text className="font-sans-semibold text-[16px] text-parchment">{action.label}</Text>
            <IconSymbol name="arrow.right" size={19} color={tokens.parchment} />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

/** The work in progress, compact. Counts only, all from the engine. */
export function CreditWorkSection({
  round,
  readyForReview,
  lettersPrepared,
  onView,
}: {
  round: number;
  readyForReview: number | null;
  lettersPrepared: number;
  onView?: () => void;
}) {
  const { t } = useI18n();
  const lines: [string, string][] = [];
  if (readyForReview !== null && readyForReview > 0) lines.push([t('modules.readyForReview'), String(readyForReview)]);
  if (lettersPrepared > 0) lines.push([t('modules.lettersPrepared'), String(lettersPrepared)]);
  if (round > 0) lines.push([t('modules.round'), String(round)]);

  return (
    <Panel>
      {lines.length > 0 ? (
        lines.map(([label, value], index) => (
          <Row key={label} label={label} value={value} last={index === lines.length - 1 && !onView} />
        ))
      ) : (
        <View className="px-5 py-5">
          <Text className="font-sans text-[15px] leading-[21px] text-parchment/55">
            {t('modules.nothingInProgress')}
          </Text>
        </View>
      )}
      {onView ? (
        <Pressable accessibilityRole="button" onPress={onView} className="px-5 py-4 active:opacity-70">
          <Text className="font-sans-medium text-[15px]" style={{ color: tokens.violet400 }}>
            {t('modules.viewDisputes')}
          </Text>
        </Pressable>
      ) : null}
    </Panel>
  );
}

/**
 * Documents, once intake is done: a single line.
 *
 * It was the headline of the dashboard, which is right until it is finished. A completed checklist
 * is a fact worth confirming and nothing more.
 */
export function DocumentsLine({ received, total, onPress }: { received: number; total: number; onPress?: () => void }) {
  const { t } = useI18n();
  const complete = total > 0 && received >= total;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('documents.title')}
      onPress={onPress}
      disabled={!onPress}
      className="mt-3 flex-row items-center justify-between px-1 py-3 active:opacity-70">
      <Text className="font-sans text-[16px] text-parchment/70">{t('documents.title')}</Text>
      <View className="flex-row items-center gap-2">
        <Text className="font-sans-medium text-[15px] text-parchment/85">
          {total > 0
            ? t('modules.documentsComplete', { values: { received, total } })
            : t('modules.documentsNoneYet')}
        </Text>
        {complete ? <IconSymbol name="checkmark.circle.fill" size={17} color={tokens.signalReceived} /> : null}
      </View>
    </Pressable>
  );
}

/**
 * Score history, or its honest absence.
 *
 * One snapshot is one point. A rising chart is exactly what a client wants to see, which is what
 * would make drawing a fake one so effective. The component takes a list, so real snapshots plug
 * in later without a redesign.
 */
export function ScoreHistorySection({ entries }: { entries: { score: number; capturedAt: number }[] }) {
  const { t } = useI18n();
  if (entries.length < 2) {
    return (
      <Panel>
        <View className="px-5 py-6">
          <Text className="font-sans text-[15px] leading-[21px] text-parchment/55">
            {t('modules.scoreHistoryPending')}
          </Text>
        </View>
      </Panel>
    );
  }

  const scores = entries.map((entry) => entry.score);
  const min = Math.min(...scores);
  const span = Math.max(Math.max(...scores) - min, 1);

  return (
    <Panel>
      <View className="px-5 py-5">
        <View className="flex-row items-end gap-2" style={{ height: 92 }}>
          {entries.map((entry) => (
            <View key={`${entry.capturedAt}-${entry.score}`} className="flex-1 items-center justify-end">
              <Text className="mb-1.5 font-sans-medium text-[12px] text-parchment/60">{entry.score}</Text>
              <View
                className="w-full"
                style={{ height: 20 + ((entry.score - min) / span) * 52, backgroundColor: tokens.violet500, borderRadius: 8, opacity: 0.9 }}
              />
            </View>
          ))}
        </View>
      </View>
    </Panel>
  );
}

/**
 * What Zoey does not measure yet, said once.
 *
 * Kept because omitting it silently lets a client assume utilization and payment history were
 * checked and found fine -- and "we have not measured this" and "this is not a problem" are the two
 * readings of a blank, only one of which is true. Reduced to one quiet line of text; it was a
 * bordered card competing with the sections that carry real numbers.
 */
export function NotTrackedLine() {
  const { t } = useI18n();
  return (
    <Text className="mt-6 px-1 font-sans text-[13px] leading-[19px] text-parchment/35">
      {t(UNAVAILABLE_METRICS_KEY)}
    </Text>
  );
}
