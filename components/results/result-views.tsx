import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import { GlassSurface } from '@/components/ui/glass-surface';
import { tokens } from '@/constants/tokens';
import { disputeStatusLabel, type MobileAccountResult, type MobileResults, type ResultsState } from '@/lib/mobile-results';

/**
 * Rendering the engine's results.
 *
 * ==========================  NOTHING IS INVENTED HERE  ==========================
 *
 * Every sentence about an account comes from the projection's `outcomeLabel` / `nextStep`, and
 * every dispute state comes from the engine's own status. When there is nothing, these say so --
 * an empty case renders as an empty case, not as a placeholder card that looks like data.
 *
 * The same components serve members and non-members. Membership decides WHERE they appear, never
 * what they contain; the engine cannot see an entitlement, so results are identical either way.
 */

/** Loading, unreachable, and genuinely empty are three different things and read differently. */
export function ResultsStatus({ state }: { state: ResultsState }) {
  if (state.status === 'LOADING') {
    return (
      <View className="items-center py-8">
        <ActivityIndicator color={tokens.violet400} />
      </View>
    );
  }
  if (state.status === 'UNAVAILABLE') {
    return (
      <GlassSurface radius={22}>
        <View className="p-4">
          <Text className="font-sans-semibold text-[14px] text-parchment">Results unavailable</Text>
          <Text className="mt-1 font-sans text-[12.5px] leading-[18px] text-parchment/60">{state.message}</Text>
        </View>
      </GlassSurface>
    );
  }
  return null;
}

/**
 * The page-level status, and the only headline the screen may show.
 *
 * Rendered from the server's resolved state. Nothing here inspects analysis status, dispute status
 * or packet readiness -- deriving those independently is exactly what let the screen say "nothing
 * else is needed from you" above "waiting on signature".
 */
export function ClientStateHeader({ results }: { results: MobileResults }) {
  const state = results.clientState;
  if (!state) return null;

  const attention = state.clientActionRequired;
  return (
    <GlassSurface radius={22} glow={attention}>
      <View className="gap-1 p-4">
        <Text className="font-display text-[18px]" style={{ color: attention ? tokens.violet300 : tokens.parchment }}>
          {state.headline}
        </Text>
        <Text className="font-sans text-[12.5px] leading-[18px] text-parchment/65">{state.detail}</Text>
        {state.state === 'DOCUMENTS_HELD' && state.documentsHeld > 0 ? (
          <Text className="mt-1 font-sans text-[11.5px] text-parchment/45">
            {state.documentsHeld} dispute document{state.documentsHeld === 1 ? '' : 's'} still being prepared.
          </Text>
        ) : null}
      </View>
    </GlassSurface>
  );
}

export function AnalysisSummaryCard({ results }: { results: MobileResults }) {
  const { summary } = results;

  if (summary.analysisState === 'NOT_STARTED') {
    return (
      <GlassSurface radius={22}>
        <View className="p-4">
          <Text className="font-sans-semibold text-[14px] text-parchment">No analysis results yet</Text>
          <Text className="mt-1 font-sans text-[12.5px] leading-[18px] text-parchment/60">
            Once your documents are in and you start Zoey, what she finds will appear here.
          </Text>
        </View>
      </GlassSurface>
    );
  }

  const needsAttention = summary.analysisState === 'NEEDS_ATTENTION';
  /*
   * A required signature outranks a finished analysis in the headline.
   *
   * The analysis IS complete at this point, and saying so is technically true and practically
   * misleading: the client reads "complete", concludes there is nothing to do, and the round sits
   * unsigned. What is true AND useful is the thing waiting on them.
   */
  /*
   * Deferred to the resolver. This card previously read the dispute status directly and announced
   * "Waiting for your signature" on a packet the server would have refused to sign.
   */
  const awaitingSignature = results.clientState?.state === 'READY_TO_SIGN';

  return (
    <GlassSurface radius={22}>
      <View className="p-4">
        <View className="flex-row items-center justify-between">
          <Text className="font-sans-semibold text-[14px] text-parchment">
            {awaitingSignature
              ? 'Waiting for your signature'
              : needsAttention
                ? 'Needs attention'
                : summary.analysisState === 'IN_PROGRESS'
                  ? 'Zoey is working'
                  : 'Analysis complete'}
          </Text>
          {summary.disputeRound > 0 ? (
            <Text className="font-sans text-[11.5px] text-parchment/45">Round {summary.disputeRound}</Text>
          ) : null}
        </View>

        <View className="mt-3 flex-row flex-wrap gap-x-6 gap-y-2">
          <Stat label="Accounts reviewed" value={summary.accountsReviewed} />
          <Stat label="Problem accounts" value={summary.problemAccounts} />
          <Stat label="Dispute ready" value={summary.disputeReady} />
          <Stat label="Needs attention" value={summary.needsAttention} />
        </View>
      </View>
    </GlassSurface>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <View>
      <Text className="font-display text-[19px] text-parchment">{value}</Text>
      <Text className="font-sans text-[11px] text-parchment/50">{label}</Text>
    </View>
  );
}

const OUTCOME_TONE: Record<MobileAccountResult['outcome'], string> = {
  DELETION_FOCUSED: tokens.violet400,
  PRESERVE_ACCOUNT: tokens.violet400,
  DISPUTE_READY: tokens.violet400,
  NEEDS_EVIDENCE: tokens.signalPending,
  NEEDS_YOUR_CONFIRMATION: tokens.signalPending,
  NO_ACTION: tokens.ink600,
};

export function AccountResultRow({ account, onPress }: { account: MobileAccountResult; onPress?: () => void }) {
  return (
    <Pressable accessibilityRole={onPress ? 'button' : undefined} onPress={onPress} className="active:opacity-80">
      <GlassSurface radius={18}>
        <View className="gap-1 p-3.5">
          <View className="flex-row items-center justify-between gap-3">
            <Text className="flex-1 font-sans-medium text-[14px] text-parchment" numberOfLines={1}>
              {account.creditor}
            </Text>
            {account.accountMask ? (
              <Text className="font-mono text-[11.5px] text-parchment/45">{account.accountMask}</Text>
            ) : null}
          </View>

          {/* The engine's sentence, rendered as given. */}
          <Text className="font-sans text-[12.5px] leading-[18px]" style={{ color: OUTCOME_TONE[account.outcome] }}>
            {account.outcomeLabel}
          </Text>

          {/*
            Target and current step as two separate facts, straight from the engine. A collection
            whose objective is deletion while its present step is validation could previously only
            be described as one or the other, and the step won -- so a validation letter read as
            the whole remedy.
          */}
          {account.target || account.currentStep ? (
            <Text className="font-sans text-[11.5px] text-parchment/55">
              {[account.target ? `Target: ${account.target}` : null, account.currentStep ? `Current step: ${account.currentStep}` : null]
                .filter(Boolean)
                .join(' · ')}
            </Text>
          ) : null}

          <Text className="font-sans text-[11.5px] text-parchment/45">
            {[account.accountType, account.accountStatus, account.bureaus.join(', ')].filter(Boolean).join(' · ')}
          </Text>
        </View>
      </GlassSurface>
    </Pressable>
  );
}

export function DisputeStateCard({ results }: { results: MobileResults }) {
  const { disputes } = results;

  return (
    <GlassSurface radius={22}>
      <View className="p-4">
        <Text className="font-sans-semibold text-[14px] text-parchment">{disputeStatusLabel(disputes)}</Text>

        {disputes.blockers.length > 0 ? (
          <View className="mt-2 gap-1">
            {/* The engine's own client-facing blockers, unedited. */}
            {disputes.blockers.map((blocker) => (
              <Text key={blocker} className="font-sans text-[12.5px] leading-[18px] text-signal-pending">
                {blocker}
              </Text>
            ))}
          </View>
        ) : null}

        {disputes.letters.length > 0 ? (
          <View className="mt-3 gap-1">
            <Text className="font-sans text-[11px] uppercase tracking-wider text-parchment/45">Prepared letters</Text>
            {disputes.letters.map((letter) => (
              <Text key={letter.title} className="font-sans text-[12.5px] text-parchment/80">
                {letter.title}
              </Text>
            ))}
            {/* Prepared is not sent. The app never implies delivery the engine has not reported. */}
            <Text className="mt-1 font-sans text-[11.5px] text-parchment/45">
              {disputes.signedAt ? 'Signed and awaiting your specialist.' : 'Prepared — not yet sent.'}
            </Text>
          </View>
        ) : null}
      </View>
    </GlassSurface>
  );
}
