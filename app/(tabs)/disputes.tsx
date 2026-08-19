import { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DisputeFilterTabs } from '@/components/disputes/dispute-filter-tabs';
import { DisputeRow } from '@/components/disputes/dispute-row';
import { EmptyState } from '@/components/more/states';
import { ScreenBackground } from '@/components/ui/screen-background';
import { type DisputeFilter, type DisputeItem } from '@/lib/disputes-data';
import { useMembership } from '@/lib/membership-context';
import { useMobileResults } from '@/hooks/use-mobile-results';
import { AccountResultRow, AnalysisSummaryCard, DisputeStateCard, ResultsStatus } from '@/components/results/result-views';
import { InquiryQuestionnaire } from '@/components/results/inquiry-questionnaire';
import { DisputeSignature } from '@/components/results/dispute-signature';
import { PremiumLockCard } from '@/components/premium/premium-lock';
import { FreeDisputeStatus } from '@/components/disputes/free-dispute-status';

const BUCKET: Record<DisputeFilter, string> = {
  'In Progress': 'in-progress',
  Completed: 'completed',
  Deleted: 'deleted',
};

/**
 * NO DISPUTE RECORD IS CONNECTED TO THIS APP.
 *
 * This screen used to map over `disputeItems` from `lib/disputes-data.ts`:
 * four invented derogatories against LVNV Funding, Capital One, Citi Bank and
 * Med One, with invented bureaus and dates, above an invented "Round 2 -- 3 of
 * 7 completed". The file's own header said "Placeholder state only -- no API
 * yet", and it was rendering to every member.
 *
 * There is no dispute endpoint in this app, so the honest list is an empty one.
 * The filter tabs stay -- they are UI vocabulary, not data -- and the row and
 * round components stay, now driven by props, ready for the real source.
 */
const disputeItems: DisputeItem[] = [];

export default function DisputesScreen() {
  const [filter, setFilter] = useState<DisputeFilter>('In Progress');
  const { isPremium, loading: membershipLoading } = useMembership();
  const { state, refresh } = useMobileResults();

  const visible = disputeItems.filter((d) => d.bucket === BUCKET[filter]);

  return (
    <ScreenBackground idPrefix="disp">
      <SafeAreaView edges={['top']} className="flex-1">
        <View className="px-4 pb-4 pt-1">
          <Text className="font-display text-[22px] text-parchment">Disputes</Text>
        </View>

        <ScrollView showsVerticalScrollIndicator={false}>
          <View className="gap-4 px-4 pb-32">
            {/*
              FREE clients see the plain milestone state of their Credit
              Service -- the service itself is never withheld. What is gated is
              the premium software layer around it: the round timeline, live
              tracking, dates and Zoey's explanations.
            */}
            {!membershipLoading && !isPremium ? (
              <>
                <FreeDisputeStatus />
                <PremiumLockCard
                  icon="exclamationmark.triangle.fill"
                  title="Live dispute tracking"
                  blurb="Follow every round as it moves"
                  bullets={[
                    'Round timeline with sent, delivered and response dates',
                    'Real-time status changes and alerts',
                    'Zoey’s explanation of each bureau response',
                    'Full round history',
                  ]}
                />
              </>
            ) : null}

            {membershipLoading || !isPremium ? null : (
              <DisputeFilterTabs active={filter} onChange={setFilter} />
            )}

            {/*
              The round summary belongs to a real active round. There is no
              source for one, so it is not rendered -- rather than rendered with
              a number nobody can stand behind.
            */}

            {/*
              THE REAL RESULTS. Summary, dispute state, and one row per account the engine actually
              decided about -- all straight from /api/mobile/results. An empty case renders as an
              empty case; nothing is filled in to make the screen look populated.
            */}
            {membershipLoading || !isPremium ? null : (
              <>
                {/*
                  FIRST, ABOVE EVERYTHING. When Zoey is held waiting on the client, the thing that
                  unblocks it is the only thing on this screen worth reading -- and it renders
                  nothing at all when there is no open request, so it costs an untroubled client
                  nothing. `refresh` runs on completion because the hold clearing changes the
                  results underneath it.
                */}
                <InquiryQuestionnaire onCompleted={() => void refresh()} />
                {/*
                  Directly after the questionnaire, and above the results, because a required
                  signature is the one thing standing between a finished analysis and any progress.
                  Renders nothing unless the engine says a packet is waiting, so the two blocking
                  states never compete for the same space -- the questionnaire clears first, the
                  packet is prepared, and this appears in its place.
                */}
                <DisputeSignature onSigned={() => void refresh()} />
                <ResultsStatus state={state} />
                {state.status === 'READY' ? (
                  <>
                    <AnalysisSummaryCard results={state.results} />
                    <DisputeStateCard results={state.results} />
                    {state.results.accounts.map((account, index) => (
                      <AccountResultRow key={`${account.creditor}-${index}`} account={account} />
                    ))}
                  </>
                ) : null}
              </>
            )}

            <View className={isPremium ? 'gap-3' : 'hidden'}>
              {visible.length > 0 ? (
                visible.map((item) => <DisputeRow key={item.id} item={item} />)
              ) : (
                <EmptyState
                  icon="exclamationmark.triangle.fill"
                  title={
                    filter === 'In Progress'
                      ? 'No active disputes yet'
                      : `Nothing ${filter.toLowerCase()} yet`
                  }
                  body={
                    filter === 'In Progress'
                      ? 'Once Zoey has analyzed your report and a round is prepared, every item will be tracked here.'
                      : 'Items move here as Zoey works through your rounds.'
                  }
                />
              )}
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </ScreenBackground>
  );
}
