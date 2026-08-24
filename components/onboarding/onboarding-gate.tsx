import { useCallback, useEffect, useState } from 'react';
import { useI18n } from '@/lib/i18n/context';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ConsentFlow } from '@/components/onboarding/consent-flow';
import { ScreenBackground } from '@/components/ui/screen-background';
import { tokens } from '@/constants/tokens';
import { getOnboardingState, type OnboardingStep } from '@/lib/mobile-onboarding';

/**
 * Shows the consent flow to a client who still owes consent, and gets out of the way otherwise.
 *
 * ==========================  WHY IT ASKS THE SERVER  ==========================
 *
 * The step is read from the engine every time this mounts. Nothing about a consumer's progress is
 * kept on the device, so an app closed halfway through reopens at the step that is genuinely
 * outstanding, and a client who signed long ago never sees any of it.
 *
 * ==========================  WHY IT FAILS OPEN  ==========================
 *
 * If the state cannot be read, the app renders normally rather than trapping someone behind a
 * screen that cannot load. Consent is enforced by the ENGINE -- uploads, Run Zoey and every
 * downstream stage check it server-side -- so a failed read here costs a prompt, not a control.
 */
export function OnboardingGate({ children, onComplete }: { children: React.ReactNode; onComplete: () => void }) {
  const { t } = useI18n();
  const [step, setStep] = useState<OnboardingStep | null>(null);
  const [loading, setLoading] = useState(true);

  const read = useCallback(async () => {
    const state = await getOnboardingState();
    setStep(state?.step ?? null);
    setLoading(false);
  }, []);

  useEffect(() => {
    read();
  }, [read]);

  const finish = useCallback(() => {
    setStep('COMPLETE');
    // Let the dashboard re-read too, so it shows the file rather than a stale empty one.
    onComplete();
  }, [onComplete]);

  if (loading) {
    return (
      <ScreenBackground idPrefix="onboard">
        <SafeAreaView edges={['top']} className="flex-1 items-center justify-center">
          <ActivityIndicator color={tokens.violet400} />
        </SafeAreaView>
      </ScreenBackground>
    );
  }

  // Complete, or unreadable: the app behaves exactly as it did before this gate existed.
  if (step === null || step === 'COMPLETE') return <>{children}</>;

  return (
    <ScreenBackground idPrefix="onboard">
      <SafeAreaView edges={['top']} className="flex-1">
        <View className="px-4 pb-2 pt-1">
          <Text className="font-display text-[22px] text-parchment">{t('onboarding.beforeWeStart')}</Text>
          <Text className="mt-1 font-sans text-[12.5px] leading-[18px] text-parchment/60">
            A few things to read and confirm before Credit Services can begin.
          </Text>
        </View>
        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <View className="gap-3 px-4 pb-32">
            <ConsentFlow onComplete={finish} />
          </View>
        </ScrollView>
      </SafeAreaView>
    </ScreenBackground>
  );
}
