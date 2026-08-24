import { Pressable, ScrollView, Text, View } from 'react-native';
import { useI18n } from '@/lib/i18n/context';

import { CertifiedMailingCard } from '@/components/credit-services/certified-mailing';
import { IntakeRow } from '@/components/credit-services/intake-row';
import { InfoNote, SectionLabel } from '@/components/more/states';
import { GlassSurface } from '@/components/ui/glass-surface';
import { ScreenBackground } from '@/components/ui/screen-background';
import { tokens } from '@/constants/tokens';
import { OnboardingGate } from '@/components/onboarding/onboarding-gate';
import { AnalysisSummaryCard, ResultsStatus } from '@/components/results/result-views';
import { useMobileResults } from '@/hooks/use-mobile-results';
import { useDocuments } from '@/lib/documents-store';

/**
 * Credit Services.
 *
 * Available on a free account -- membership is never checked on this screen.
 * Deliberately understated in tone: professional service wording, no marketing
 * claims, no promises about outcomes.
 *
 * The intake itself lives on the Documents tab; this screen explains the
 * service, its costs and where the client stands, then routes them there.
 */

const STEPS = [
  { title: 'Review and sign', detail: 'Required agreements and disclosures' },
  { title: 'Submit your documents', detail: 'Identity, address and your credit report' },
  { title: 'Review', detail: 'Your information is checked for completeness' },
  { title: 'Dispute prepared', detail: 'Documents are prepared for the bureaus' },
  { title: 'Dispute sent', detail: 'Sent by certified mail with tracking' },
  { title: 'Result available', detail: 'You receive a copy and the response' },
];

export default function CreditServicesScreen() {
  const { t } = useI18n();
  const { slots, missing, requiredComplete, currentMilestone, phase, runZoey, uploadSlot, uploadState, readiness, runState } =
    useDocuments();
  const { state: resultsState } = useMobileResults();

  /**
   * Only the intake the service actually needs. Read from the SAME
   * `useDocuments()` store the premium Documents tab uses, so a client has one
   * document record regardless of which surface they filled it in from -- no
   * second intake system and no duplicate rows.
   */
  // The engine's checklist IS the intake set, so there is nothing to filter against here. A
  // local list of required ids would be a second opinion on what Zoey needs, and the one that
  // goes stale is always the copy.
  const intakeSlots = slots;

  const submitted = phase !== 'DOCUMENTS_INCOMPLETE' && phase !== 'DOCUMENTS_READY';

  const screen = (
    <ScreenBackground idPrefix="credsvc">
      <ScrollView showsVerticalScrollIndicator={false}>
        <View className="gap-3 px-4 pb-16 pt-4">
          <GlassSurface radius={24} glow>
            <View className="p-4">
              <Text className="font-display text-[19px] text-parchment">{t('hero.creditServices')}</Text>
              <Text className="mt-2 font-sans text-[13px] leading-[19px] text-parchment/70">
                Submit your required information and request assistance with disputing inaccurate
                or negative information on your credit reports.
              </Text>

              <View className="mt-4 gap-1.5">
                <CostRow label={t('services.serviceFee')} value="No additional service fee" />
                <CostRow label={t('services.certifiedMailing')} value="Paid separately to the mailing provider" />
              </View>
            </View>
          </GlassSurface>

          <InfoNote>
            Submitting your information, receiving your dispute documents and receiving your result
            are part of this service.
          </InfoNote>

          <SectionLabel>{t('services.whereYouAre')}</SectionLabel>
          <GlassSurface radius={22} glow>
            <View className="p-4">
              <Text className="font-sans-semibold text-[14px]" style={{ color: tokens.violet300 }}>
                {submitted ? (currentMilestone ?? 'In Review') : requiredComplete ? t('services.documentsReceived') : t('services.documentsNeeded')}
              </Text>
              <Text className="mt-1 font-sans text-[12.5px] leading-[18px] text-parchment/60">
                {submitted
                  ? 'Your information has been submitted. Zoey will let you know when there is an update.'
                  : requiredComplete
                    ? 'Everything we need is here. Submit your information to begin.'
                    : `${missing.length} required document${missing.length === 1 ? '' : 's'} still needed before your service can begin.`}
              </Text>
            </View>
          </GlassSurface>

          {/*
            Required intake, in the service that needs it.

            Plain form rows -- not the premium document vault. Same slot ids,
            same store, same upload API, so anything submitted here is already
            present if this client later becomes a Zoey Member.
          */}
          <SectionLabel>{t('services.requiredDocuments')}</SectionLabel>
          <GlassSurface radius={22} glow>
            <View>
              {intakeSlots.map((slot, i) => (
                <IntakeRow
                  key={slot.id}
                  slot={slot}
                  upload={uploadState[slot.id]}
                        onUpload={() => uploadSlot(slot.id)}
                  isLast={i === intakeSlots.length - 1}
                />
              ))}
            </View>
          </GlassSurface>

          {!submitted ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('services.a11ySubmit')}
              accessibilityState={{ disabled: !requiredComplete || runState === 'starting' || runState === 'working' }}
              onPress={
                requiredComplete && runState !== 'starting' && runState !== 'working'
                  ? () => void runZoey('START')
                  : undefined
              }
              className="items-center rounded-full py-3.5 active:opacity-85"
              style={{
                backgroundColor: requiredComplete ? tokens.violet500 : 'rgba(168,85,247,0.22)',
              }}>
              <Text
                className="font-sans-semibold text-[14px]"
                style={{ color: requiredComplete ? tokens.parchment : 'rgba(244,239,255,0.55)' }}>
                {runState === 'starting'
                  ? 'Starting Zoey…'
                  : runState === 'working'
                    ? 'Zoey is working'
                    : runState === 'attention'
                      ? 'Needs attention'
                      : requiredComplete
                        ? 'Submit for review'
                        : missing.length > 0
                          ? `${missing.length} document${missing.length === 1 ? '' : 's'} remaining`
                          : 'Waiting on review'}
              </Text>
            </Pressable>
          ) : null}

          {/* Why the button is unavailable, in a sentence, rather than a dead control. */}
          {!submitted && !requiredComplete && readiness.reason ? (
            <Text className="px-1 pt-2 font-sans text-[12px] text-parchment/55">{readiness.reason}</Text>
          ) : null}

          {/*
            Basic case status, for a client participating in Credit Services without a membership.
            Same projection the premium screens read -- membership changes where results appear,
            never what they say.
          */}
          <SectionLabel>{t('services.yourCase')}</SectionLabel>
          <ResultsStatus state={resultsState} />
          {resultsState.status === 'READY' ? <AnalysisSummaryCard results={resultsState.results} /> : null}

          <SectionLabel>{t('services.howItWorks')}</SectionLabel>
          <GlassSurface radius={22}>
            <View className="p-1">
              {STEPS.map((s, i) => (
                <View
                  key={s.title}
                  className="flex-row items-start gap-3 px-3 py-2.5"
                  style={i > 0 ? { borderTopWidth: 1, borderTopColor: 'rgba(168,85,247,0.14)' } : undefined}>
                  <View
                    className="mt-0.5 h-5 w-5 items-center justify-center rounded-full"
                    style={{ backgroundColor: 'rgba(168,85,247,0.2)' }}>
                    <Text className="font-sans-semibold text-[10px]" style={{ color: tokens.violet300 }}>
                      {i + 1}
                    </Text>
                  </View>
                  <View className="flex-1">
                    <Text className="font-sans-medium text-[13.5px] text-parchment">{s.title}</Text>
                    <Text className="mt-0.5 font-sans text-[11.5px] text-parchment/45">
                      {s.detail}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </GlassSurface>

          <SectionLabel>{t('services.mailing')}</SectionLabel>
          <CertifiedMailingCard />

          <InfoNote>
            Zoey and Pinnacle help you request an investigation of information you believe is
            inaccurate or incomplete. No outcome, deletion, score change or approval is guaranteed.
          </InfoNote>
        </View>
      </ScrollView>
    </ScreenBackground>
  );

  /*
   * CONSENT LIVES HERE, not on the dashboard.
   *
   * Creating a Zoey account is not a request for Credit Services, so a new signup is not marched
   * through a consumer authorization they never asked for. Opening this screen IS that request,
   * which is where the acknowledgments belong. The step comes from the engine, so somebody who
   * already signed passes straight through.
   */
  return <OnboardingGate onComplete={() => {}}>{screen}</OnboardingGate>;
}

function CostRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row items-start justify-between gap-3">
      <Text className="font-sans text-[12.5px] text-parchment/55">{label}</Text>
      <Text className="flex-1 text-right font-sans-medium text-[12.5px] text-parchment">
        {value}
      </Text>
    </View>
  );
}
