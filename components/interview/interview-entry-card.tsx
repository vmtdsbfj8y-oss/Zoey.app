import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { useI18n } from '@/lib/i18n/context';
import { Pressable, Text, View } from 'react-native';

import { GlassSurface } from '@/components/ui/glass-surface';
import { tokens } from '@/constants/tokens';
import { getInterview, type InterviewState } from '@/lib/mobile-interview';

/**
 * The way in to the identity review, on the screen Run Zoey already lands on.
 *
 * ==============================  WHY IT LIVES HERE  ==============================
 *
 * Run Zoey is where a person goes when they want Zoey to do something about their report, so the
 * review is offered there rather than behind another tab. The orb still routes to this screen and
 * the Zoey hero still runs the engine -- this card is additive, and removing it would leave every
 * existing path exactly as it was.
 *
 * ==============================  WHEN IT HIDES  ==============================
 *
 * Two failures look alike and are not. A view that loads and says UNAVAILABLE means the feature is
 * off for this consumer, so the card hides rather than advertising a dead end. A transport or
 * session failure means we could not ask -- the card stays, and the modal it opens is where the
 * real error and the retry live, so there is exactly one place that explains a failure.
 *
 * It re-reads on focus, so returning from the review shows the state that was just reached instead
 * of the one this card fetched on mount.
 */
export function InterviewEntryCard({ onOpen }: { onOpen: () => void }) {
  const { t } = useI18n();
  const [state, setState] = useState<InterviewState>({ status: 'LOADING' });

  useFocusEffect(
    useCallback(() => {
      let active = true;
      void (async () => {
        const next = await getInterview();
        if (active) setState(next);
      })();
      return () => {
        active = false;
      };
    }, [])
  );

  // Don't flash a card in and out while the first read is in flight.
  if (state.status === 'LOADING') return null;

  // Feature genuinely off for this consumer: offer nothing rather than a door to nowhere.
  if (state.status === 'READY' && state.view.state === 'UNAVAILABLE') return null;

  const sessionState = state.status === 'READY' ? state.view.state : null;
  const resuming = sessionState === 'OPEN' || sessionState === 'AWAITING_CONFIRMATION';
  const finished = sessionState === 'COMPLETED' || sessionState === 'SPECIALIST_REVIEW';

  const action = resuming ? t('interview.entryResume') : t('interview.entryAction');
  const body = finished ? t('interview.doneBody') : t('interview.entryBody');

  return (
    <GlassSurface radius={22} glow={resuming}>
      <View className="gap-2 p-4">
        <Text className="font-display text-[16px] text-parchment">
          {finished ? t('interview.doneTitle') : t('interview.entryTitle')}
        </Text>
        <Text className="font-sans text-[12.5px] leading-[18px] text-parchment/60">{body}</Text>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('interview.a11yStart')}
          onPress={onOpen}
          className="mt-1 flex-row items-center justify-center rounded-full py-3 active:opacity-85"
          style={{
            backgroundColor: resuming ? tokens.violet500 : 'transparent',
            borderWidth: resuming ? 0 : 1,
            borderColor: 'rgba(255,255,255,0.15)',
          }}
        >
          <Text
            className="font-sans-semibold text-[12.5px] tracking-[0.06em]"
            style={{ color: resuming ? tokens.parchment : tokens.violet300 }}
          >
            {finished ? t('interview.title') : action}
          </Text>
        </Pressable>
      </View>
    </GlassSurface>
  );
}
