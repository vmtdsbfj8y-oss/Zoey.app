import { Text, View } from 'react-native';

import { GlassSurface } from '@/components/ui/glass-surface';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { ZoeyAvatar } from '@/components/ui/zoey-avatar';
import { tokens } from '@/constants/tokens';
import { UNAVAILABLE_METRICS, type CreditFact, type CreditFacts } from '@/lib/credit-facts';

/**
 * The modules both credit screens are built from.
 *
 * Every number rendered here arrives from the engine. Nothing is computed, averaged, trended or
 * inferred on the device -- see `lib/credit-facts.ts` for why availability is modelled rather than
 * defaulted.
 */

export function SectionHeading({ children, icon }: { children: React.ReactNode; icon?: string }) {
  return (
    <View className="mt-1 flex-row items-center gap-2 px-1">
      {icon ? <IconSymbol name={icon as never} size={13} color={tokens.violet400} /> : null}
      <Text className="font-sans text-[11px] uppercase tracking-[1.4px] text-parchment/45">{children}</Text>
    </View>
  );
}

/** One metric. A null value renders its own sentence, never a zero. */
function FactTile({ fact }: { fact: CreditFact }) {
  const available = fact.availability === 'AVAILABLE' && fact.value !== null;
  return (
    <View className="flex-1 px-1 py-2.5">
      {available ? (
        <Text className="font-display text-[24px] leading-[28px]" style={{ color: tokens.violet300 }}>
          {fact.value}
        </Text>
      ) : (
        <Text className="font-sans-medium text-[13px] leading-[28px] text-parchment/30">—</Text>
      )}
      <Text className="mt-0.5 font-sans text-[11px] leading-[14px] text-parchment/50">{fact.label}</Text>
    </View>
  );
}

/**
 * The account picture, from the engine's own counts.
 *
 * When nothing has been analysed the whole card says so once, rather than showing four dashes and
 * leaving a client to decide whether that means zero.
 */
export function CreditHealthCard({ facts }: { facts: CreditFacts }) {
  const anyAvailable = facts.facts.some((fact) => fact.availability === 'AVAILABLE' && fact.value !== null);

  return (
    <GlassSurface radius={22}>
      <View className="p-4">
        <Text className="font-sans-semibold text-[14px] text-parchment">Credit health</Text>

        {anyAvailable ? (
          <>
            <View className="mt-2 flex-row">
              {facts.facts.slice(0, 2).map((fact) => (
                <FactTile key={fact.label} fact={fact} />
              ))}
            </View>
            <View className="flex-row">
              {facts.facts.slice(2).map((fact) => (
                <FactTile key={fact.label} fact={fact} />
              ))}
            </View>
            <Text className="mt-1 font-sans text-[11.5px] leading-[16px] text-parchment/45">
              Counted from the accounts on your report, as Zoey read them.
            </Text>
          </>
        ) : (
          <Text className="mt-1.5 font-sans text-[12.5px] leading-[18px] text-parchment/55">
            {facts.facts[0]?.note ?? 'Available once Zoey has analyzed your report.'}
          </Text>
        )}
      </View>
    </GlassSurface>
  );
}

/**
 * What is affecting the report, in the engine's own outcome vocabulary.
 *
 * These are REPORT AND PROFILE FACTORS -- what Zoey found on the accounts and what she intends to
 * do about each. They are deliberately not framed as scoring reasons: a bureau's model assigns its
 * own factors, this app cannot see them, and presenting "4 accounts with problems" as the reason a
 * score is 547 would be an invention dressed as an explanation.
 */
export function AffectingCard({ facts }: { facts: CreditFacts }) {
  return (
    <GlassSurface radius={22}>
      <View className="p-4">
        <Text className="font-sans-semibold text-[14px] text-parchment">What&apos;s on your report</Text>

        {facts.outcomeCounts.length > 0 ? (
          <>
            <View className="mt-2.5 gap-2">
              {facts.outcomeCounts.map((entry) => (
                <View key={entry.outcome} className="flex-row items-center justify-between">
                  <View className="flex-1 flex-row items-center gap-2">
                    <View className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: tokens.violet400 }} />
                    <Text className="font-sans text-[13px] text-parchment/75">{entry.label}</Text>
                  </View>
                  <Text className="font-display text-[16px] text-parchment">{entry.count}</Text>
                </View>
              ))}
            </View>
            <Text className="mt-2.5 font-sans text-[11.5px] leading-[16px] text-parchment/45">
              What Zoey found on your accounts and what she plans for each. These are facts from your
              report — not the reasons a bureau gave for your score.
            </Text>
          </>
        ) : (
          <Text className="mt-1.5 font-sans text-[12.5px] leading-[18px] text-parchment/55">
            Account-level detail appears here once Zoey has finished reading your report.
          </Text>
        )}
      </View>
    </GlassSurface>
  );
}

/**
 * Zoey's line about the case, and it is the ENGINE'S line.
 *
 * Nothing is composed here and no model is called. A sentence written on the phone would be this
 * app's opinion wearing her name; the engine's own resolved state is the one tied to what the case
 * actually holds, and it is the only thing that should be able to speak for her.
 */
export function ZoeyInsightCard({
  headline,
  detail,
  actionRequired,
}: {
  headline: string;
  detail: string;
  actionRequired: boolean;
}) {
  return (
    <GlassSurface radius={22} glow={actionRequired}>
      <View className="flex-row gap-3 p-4">
        <ZoeyAvatar size={38} />
        <View className="flex-1">
          <Text className="font-sans text-[10.5px] uppercase tracking-[1.4px] text-parchment/40">Zoey · Next move</Text>
          <Text
            className="mt-1 font-sans-semibold text-[14px] leading-[19px]"
            style={{ color: actionRequired ? tokens.violet300 : tokens.parchment }}>
            {headline}
          </Text>
          <Text className="mt-1 font-sans text-[12.5px] leading-[18px] text-parchment/60">{detail}</Text>
        </View>
      </View>
    </GlassSurface>
  );
}

/** Dispute progress, from the engine's round number and state. */
export function DisputeProgressCard({ round, state }: { round: number; state: string }) {
  const label: Record<string, string> = {
    NONE: 'No disputes prepared yet',
    PREPARING: 'Zoey is preparing your disputes',
    AWAITING_YOUR_SIGNATURE: 'Waiting for your signature',
    SENT: 'Sent to the bureaus',
    RESPONSE_RECEIVED: 'A response has come back',
  };

  return (
    <GlassSurface radius={22}>
      <View className="flex-row items-center justify-between p-4">
        <View className="flex-1">
          <Text className="font-sans-semibold text-[14px] text-parchment">Dispute progress</Text>
          <Text className="mt-1 font-sans text-[12.5px] leading-[18px] text-parchment/60">
            {label[state] ?? 'No disputes prepared yet'}
          </Text>
        </View>
        {round > 0 ? (
          <View className="items-center rounded-2xl px-3 py-2" style={{ backgroundColor: 'rgba(168,85,247,0.16)' }}>
            <Text className="font-display text-[20px]" style={{ color: tokens.violet300 }}>
              {round}
            </Text>
            <Text className="font-sans text-[10px] text-parchment/45">Round</Text>
          </View>
        ) : null}
      </View>
    </GlassSurface>
  );
}

/**
 * What Zoey does NOT know yet, said out loud.
 *
 * Omitting these silently would let a client assume utilization and payment history were checked
 * and found fine. Naming them is the difference between "we have not measured this" and "this is
 * not a problem", which are the two readings of an absent metric and only one of them is true.
 */
export function NotYetTrackedCard() {
  return (
    <GlassSurface radius={22}>
      <View className="p-4">
        <Text className="font-sans-semibold text-[14px] text-parchment">Not tracked yet</Text>
        <Text className="mt-1 font-sans text-[12.5px] leading-[18px] text-parchment/55">
          Zoey reads these from your report but does not measure them yet. She will not estimate
          them, so they stay blank until she can read them properly.
        </Text>
        <View className="mt-2.5 flex-row flex-wrap gap-1.5">
          {UNAVAILABLE_METRICS.map((metric) => (
            <View
              key={metric}
              className="rounded-full px-2.5 py-1"
              style={{ backgroundColor: 'rgba(168,85,247,0.10)', borderWidth: 1, borderColor: 'rgba(168,85,247,0.16)' }}>
              <Text className="font-sans text-[11px] text-parchment/45">{metric}</Text>
            </View>
          ))}
        </View>
      </View>
    </GlassSurface>
  );
}

/**
 * Score history, or the honest absence of it.
 *
 * One snapshot is not a trend. Drawing a line through a single point -- or worse, inventing a
 * second point to have something to draw -- would be the most convincing lie this screen could
 * tell, because a rising chart is exactly what a client wants to see.
 *
 * The component takes a list, so real snapshots plug into it later without a redesign.
 */
export function ScoreHistoryCard({ entries }: { entries: { score: number; capturedAt: number }[] }) {
  if (entries.length < 2) {
    return (
      <GlassSurface radius={22}>
        <View className="p-4">
          <Text className="font-sans-semibold text-[14px] text-parchment">Score history</Text>
          <Text className="mt-1 font-sans text-[12.5px] leading-[18px] text-parchment/55">
            Your score history will build as Zoey receives newer credit updates. She will not draw a
            trend from a single report.
          </Text>
        </View>
      </GlassSurface>
    );
  }

  const scores = entries.map((entry) => entry.score);
  const min = Math.min(...scores);
  const max = Math.max(...scores);
  const span = Math.max(max - min, 1);

  return (
    <GlassSurface radius={22}>
      <View className="p-4">
        <Text className="font-sans-semibold text-[14px] text-parchment">Score history</Text>
        <View className="mt-3 flex-row items-end gap-1.5" style={{ height: 72 }}>
          {entries.map((entry) => (
            <View key={`${entry.capturedAt}-${entry.score}`} className="flex-1 items-center justify-end">
              <View
                className="w-full rounded-t-md"
                style={{
                  height: 18 + ((entry.score - min) / span) * 46,
                  backgroundColor: tokens.violet500,
                  opacity: 0.85,
                }}
              />
              <Text className="mt-1 font-mono text-[9.5px] text-parchment/45">{entry.score}</Text>
            </View>
          ))}
        </View>
        <Text className="mt-2 font-sans text-[11px] text-parchment/40">
          Each bar is a score Zoey read from one of your reports.
        </Text>
      </View>
    </GlassSurface>
  );
}
