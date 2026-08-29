import { useState } from 'react';
import { useI18n } from '@/lib/i18n/context';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenBackground } from '@/components/ui/screen-background';
import { useMembership } from '@/lib/membership-context';
import { useMobileResults } from '@/hooks/use-mobile-results';
import { ResultsStatus } from '@/components/results/result-views';
import { ClientActionCard, CurrentRoundHero, DisputeSections } from '@/components/results/case-command-center';
import { InquiryQuestionnaire } from '@/components/results/inquiry-questionnaire';
import { DisputeSignature } from '@/components/results/dispute-signature';
import { PremiumLockCard } from '@/components/premium/premium-lock';
import { FreeDisputeStatus } from '@/components/disputes/free-dispute-status';

/**
 * THE REAL SOURCE IS NOW CONNECTED.
 *
 * This screen used to map over a hardcoded `disputeItems` array that was permanently empty, which
 * is how "No active disputes yet" came to render underneath a list of genuinely prepared disputes.
 * The array, its filter and the placeholder empty state are gone; every section on this screen now
 * comes from the canonical current-round projection, and the only empty state left is the one that
 * fires when that projection genuinely has nothing in it.
 */
export default function DisputesScreen() {
  const { t } = useI18n();
  const { isPremium, loading: membershipLoading } = useMembership();
  const { state, refresh } = useMobileResults();
  // Review & Sign opens the canonical signature section rather than it always occupying the top.
  const [signatureOpen, setSignatureOpen] = useState(false);

  return (
    <ScreenBackground idPrefix="disp" floor>
      <SafeAreaView edges={['top']} className="flex-1">
        <View className="px-4 pb-4 pt-1">
          <Text className="font-display text-[22px] text-parchment">{t('disputes.title')}</Text>
        </View>

        <ScrollView showsVerticalScrollIndicator={false}>
          <View className="gap-4 px-4 pb-40">
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
                  title={t('disputes.liveTracking')}
                  blurb={t('disputes.liveTrackingBlurb')}
                  bullets={[
                    'Round timeline with sent, delivered and response dates',
                    'Real-time status changes and alerts',
                    'Zoey’s explanation of each bureau response',
                    'Full round history',
                  ]}
                />
              </>
            ) : null}

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
                  ONE SCREEN, IN THE ORDER A CLIENT CARES ABOUT.
                  Hero (current round + the single canonical state) → the one thing being asked of
                  them → the signature form only once opened → the sections. Everything below is
                  grouped so a target appears exactly once, and the report review is collapsed.
                */}
                {state.status === 'READY' ? <CurrentRoundHero results={state.results} /> : null}

                {/*
                  `expected` comes from the same resolved state as the headline, so a page saying
                  "Zoey needs a few answers" can never render nothing where the questions belong.
                */}
                <InquiryQuestionnaire
                  expected={state.status === 'READY' && state.results.clientState?.state === 'CLIENT_QUESTIONS_REQUIRED'}
                  onCompleted={() => void refresh()}
                />

                {state.status === 'READY' ? (
                  <ClientActionCard
                    results={state.results}
                    signatureOpen={signatureOpen}
                    onReviewAndSign={() => setSignatureOpen(true)}
                  />
                ) : null}

                {/*
                  The canonical signature section, unchanged -- same hash, attestation, e-sign
                  consent and legal name. It is behind Review & Sign rather than sitting at the top
                  of a long feed, and `expected` still comes from the resolved state so a page
                  claiming a signature is required can never render nothing in its place.
                */}
                {signatureOpen || state.status !== 'READY' || state.results.clientState?.signatureAvailable !== true ? (
                  <DisputeSignature
                    expected={state.status === 'READY' && state.results.clientState?.signatureAvailable === true}
                    onSigned={() => {
                      setSignatureOpen(false);
                      void refresh();
                    }}
                  />
                ) : null}

                <ResultsStatus state={state} />
                {state.status === 'READY' ? <DisputeSections results={state.results} /> : null}
              </>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </ScreenBackground>
  );
}
