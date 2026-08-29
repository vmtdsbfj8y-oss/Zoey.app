import { Image } from 'expo-image';
import { useI18n } from '@/lib/i18n/context';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, Text, View, useWindowDimensions } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { SimpleServiceStatus } from '@/components/documents/simple-service-status';
import { UploadZone } from '@/components/documents/upload-zone';
import { CARD_RADIUS } from '@/components/ui/glass-surface';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { tokens } from '@/constants/tokens';
import type { AnalysisPhase, RunState } from '@/lib/documents-store';
import { useDocuments } from '@/lib/documents-store';
import { useMembership } from '@/lib/membership-context';

/**
 * The Run Zoey hero, on the approved reference's single composition.
 *
 * ONE CARD, FIVE SCRIPTS. Every lifecycle state -- ready, running, complete, needs-attention and
 * locked -- renders the SAME reference layout: eyebrow, headline and a sentence down the left,
 * Zoey reading a credit report on the right, one pill across the bottom. Only the words, the
 * button and the small progress readout change. The previous version gave the waiting state the
 * reference design and left the other four on the old command-centre look, so the screen visibly
 * changed skins the moment the engine's real answer arrived -- which read as a glitch, because it
 * was one.
 */

/** Hero geometry, derived from the card width so it scales across devices. */
function useHeroLayout() {
  const { width } = useWindowDimensions();
  const cardW = width - 32; // screen padding is px-4 either side
  /*
   * 1.24, not 1.08. At 1.08 the card was exactly tall enough for the copy and the pill and no
   * more -- so the pill sat flush against wherever the art happened to put the CREDIT REPORT
   * tablet, covering most of it, and the headline's last line had nothing between it and her
   * hair. The extra height is real gap, not decoration: it opens a visible band between the sub
   * text and the button where the tablet actually shows, and pushes the button's top edge below
   * where her hair falls.
   */
  const heroH = Math.round(Math.min(Math.max(cardW * 1.24, 330), 480));
  return { cardW, heroH };
}

/** The card shell: near-black glass with the dashboard's fine violet edge. */
function HeroCard({ children }: { children: React.ReactNode }) {
  const { cardW, heroH } = useHeroLayout();

  return (
    <View
      style={{
        width: cardW,
        height: heroH,
        borderRadius: CARD_RADIUS,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(202,172,255,0.16)',
        borderTopColor: 'rgba(233,213,255,0.24)',
        backgroundColor: '#08040F',
        shadowColor: tokens.violet500,
        shadowOpacity: 0.22,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: 0 },
      }}>
      {children}
    </View>
  );
}

/**
 * The shared composition. `belowSub` is the slot the running state uses for its live progress;
 * `bottom` is the pill band, whatever the state puts in it.
 */
function ReferenceHero({
  eyebrow,
  headline,
  sub,
  belowSub,
  bottom,
}: {
  eyebrow: string;
  headline: string;
  sub: string;
  belowSub?: React.ReactNode;
  bottom: React.ReactNode;
}) {
  const { cardW, heroH } = useHeroLayout();

  return (
    <HeroCard>
      {/*
        The approved artwork fills the WHOLE card -- Zoey, her report, and its own complete
        star field. No matting, no left fade: the text sits directly on the art's sky exactly
        as the reference lays it. Only a soft band at the bottom keeps the pill legible.
      */}
      <View pointerEvents="none" style={{ position: 'absolute', width: cardW, height: heroH }}>
        <Image
          source={require('@/assets/images/zoey-reading.png')}
          style={{ width: cardW, height: heroH }}
          contentFit="cover"
          cachePolicy="memory-disk"
          transition={240}
        />
        <LinearGradient
          colors={['rgba(8,4,15,0)', 'rgba(8,4,15,0.8)']}
          start={{ x: 0.5, y: 0.78 }}
          end={{ x: 0.5, y: 1 }}
          style={{ position: 'absolute', inset: 0 }}
        />
      </View>

      {/*
        THE COPY COLUMN, ACTUALLY CLEAR OF HER HAIR THIS TIME.
        Narrowing the CONTAINER did nothing on its own: "review your" was already narrower than
        the old 0.56 column, so a tighter box never touched where its wrap actually broke -- the
        text was reaching her hair because the GLYPHS were that wide at 27px, not because the box
        gave them room to be. The headline drops to 24px (still the clear largest text on the
        card) for real clearance on every line, on every state, not just the ones checked by eye.
      */}
      <View style={{ position: 'absolute', top: Math.round(heroH * 0.09), left: 18, width: cardW * 0.5 }}>
        <Text
          className="font-sans-semibold text-[11px] uppercase"
          style={{ color: tokens.violet300, letterSpacing: 3.2 }}>
          {eyebrow}
        </Text>
        <Text className="mt-2.5 font-display text-[24px] leading-[29px] text-parchment">
          {headline}
        </Text>
        {/*
          CAPPED, NOT JUST SHORT. The copy for each state is written to fit two lines, but a
          translation running long -- or a future edit -- must never be free to grow a third line
          down into the art below: that is exactly how "Analysis complete"'s sentence ended up
          printed across the CREDIT REPORT tablet in Zoey's hands. `numberOfLines` is the actual
          guarantee; short copy is what keeps it from ever having to truncate.
        */}
        <Text
          numberOfLines={2}
          className="mt-2.5 font-sans text-[13px] leading-[19px]"
          style={{ color: 'rgba(228,218,255,0.72)', width: cardW * 0.5 }}>
          {sub}
        </Text>
        {belowSub ? <View className="mt-3">{belowSub}</View> : null}
      </View>

      <View style={{ position: 'absolute', bottom: 16, left: 0, width: cardW, alignItems: 'center' }}>
        {bottom}
      </View>
    </HeroCard>
  );
}

/** Gradient progress fill -- width driven by real stage state, never a timer. */
function ProgressBar({ progress }: { progress: number }) {
  const w = useSharedValue(progress);

  useEffect(() => {
    w.value = withTiming(progress, { duration: 700, easing: Easing.out(Easing.cubic) });
  }, [progress, w]);

  const style = useAnimatedStyle(() => ({
    width: `${Math.max(0, Math.min(1, w.value)) * 100}%`,
  }));

  return (
    <View
      className="w-full overflow-hidden"
      style={{ height: 6, borderRadius: 3, backgroundColor: 'rgba(12,5,26,0.85)' }}>
      <Animated.View style={[{ height: '100%', borderRadius: 3 }, style]}>
        <LinearGradient
          colors={[tokens.violet600, tokens.violet500, tokens.violet300]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{ flex: 1, borderRadius: 3 }}
        />
      </Animated.View>
    </View>
  );
}

/**
 * The live readout while Zoey works: percentage, bar, and the active stage -- straight from the
 * engine's reported stage, never a clock. This is the premium tracking layer, kept, just in the
 * reference's quieter voice.
 */
function ProgressInline() {
  const { progress, stages, stageList } = useDocuments();
  const active = stageList.find((s) => stages[s.id] === 'active');

  return (
    <View style={{ width: '92%' }}>
      <Text className="font-display text-[22px]" style={{ color: tokens.violet300 }}>
        {Math.round(progress * 100)}%
      </Text>
      <View className="mt-1.5">
        <ProgressBar progress={progress} />
      </View>
      {active ? (
        <Text
          numberOfLines={1}
          className="mt-1.5 font-sans text-[11px]"
          style={{ color: 'rgba(228,218,255,0.6)' }}>
          {active.label}
        </Text>
      ) : null}
    </View>
  );
}

/**
 * Glossy lavender pill with deep-violet type -- the approved artwork's primary button, shared by
 * every state so the whole lifecycle keeps one button language.
 */
function PrimaryButton({
  label,
  onPress,
  width,
  large = false,
  disabled = false,
  busy = false,
  arrow = false,
}: {
  label: string;
  onPress: () => void;
  width: number;
  large?: boolean;
  /** Locked, not hidden -- the client can see the action they are working toward. */
  disabled?: boolean;
  /** Work is in flight. Shows a spinner and refuses the press. */
  busy?: boolean;
  /** The travelling arrow of the reference's RUN ZOEY pill. */
  arrow?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      onPress={disabled || busy ? undefined : onPress}
      style={{ width, opacity: disabled ? 0.45 : busy ? 0.8 : 1 }}
      className="active:opacity-85">
      <LinearGradient
        colors={['#D9C2FF', '#BE97FD', '#A879F6']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          borderRadius: 999,
          paddingVertical: large ? 16 : 11,
          alignItems: 'center',
          borderWidth: 1,
          borderColor: large ? 'rgba(244,239,255,0.55)' : 'rgba(233,213,255,0.4)',
          shadowColor: tokens.violet500,
          shadowOpacity: large ? 0.65 : 0.4,
          shadowRadius: large ? 18 : 12,
          shadowOffset: { width: 0, height: 0 },
        }}>
        {/* top-edge gloss, same language as the glass panels */}
        <LinearGradient
          pointerEvents="none"
          colors={['rgba(255,255,255,0.35)', 'rgba(255,255,255,0)']}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '55%',
            borderTopLeftRadius: 999,
            borderTopRightRadius: 999,
          }}
        />
        <View className="flex-row items-center justify-center gap-2.5">
          {busy ? <ActivityIndicator size="small" color="#31135E" /> : null}
          <Text
            className="font-sans-semibold"
            style={[
              { color: '#31135E' },
              large ? { fontSize: 15.5, letterSpacing: 2.2 } : { fontSize: 12.5 },
            ]}>
            {label}
          </Text>
          {arrow && !busy ? <IconSymbol name="arrow.right" size={17} color="#31135E" /> : null}
        </View>
      </LinearGradient>
    </Pressable>
  );
}

/* -------------------------------------------------------------------------- */
/* States                                                                      */
/* -------------------------------------------------------------------------- */

/** One label per state. The tap is acknowledged before the server answers. */
const RUN_LABEL: Record<RunState, string> = {
  idle: 'RUN ZOEY',
  starting: 'STARTING ZOEY…',
  working: 'ZOEY IS WORKING',
  attention: 'NEEDS ATTENTION',
  failed: 'TRY AGAIN',
};

/**
 * Waiting to be started -- and "documents still missing" is the same card with the engine's real
 * reason in the subtitle, so the client always sees what they are working toward.
 */
function ActivationState() {
  const { t } = useI18n();
  const { runZoey, requiredComplete, readiness, runState } = useDocuments();
  const { cardW } = useHeroLayout();

  return (
    <ReferenceHero
      eyebrow={t('runzoey.eyebrow')}
      headline={t('runzoey.headline')}
      sub={requiredComplete ? t('runzoey.sub') : (readiness.reason ?? t('runzoey.sub'))}
      bottom={
        <PrimaryButton
          label={RUN_LABEL[runState]}
          onPress={runZoey}
          width={cardW - 36}
          large
          arrow
          disabled={!requiredComplete && runState === 'idle'}
          busy={runState === 'starting' || runState === 'working'}
        />
      }
    />
  );
}

function RunningState() {
  const { t } = useI18n();
  const { cardW } = useHeroLayout();
  return (
    <ReferenceHero
      eyebrow={t('runzoey.eyebrow')}
      headline={t('runzoey.runningHeadline')}
      sub={t('runzoey.runningSub')}
      belowSub={<ProgressInline />}
      bottom={
        <PrimaryButton label={RUN_LABEL.working} onPress={() => {}} width={cardW - 36} large busy />
      }
    />
  );
}

/** Finished -- viewing the work is primary; rerunning is intentionally quieter beneath it. */
function CompleteState({ onViewAnalysis }: { onViewAnalysis: () => void }) {
  const { t } = useI18n();
  const { cardW } = useHeroLayout();
  const { runZoey, runState, requiredComplete } = useDocuments();
  const busy = runState === 'starting' || runState === 'working';
  const rerunLabel =
    runState === 'starting'
      ? t('hero.startingZoey')
      : busy
        ? t('hero.zoeyIsWorking')
        : t('hero.runZoeyAgainQuiet');
  const rerunDisabled = !requiredComplete || busy;

  return (
    <ReferenceHero
      eyebrow={t('runzoey.eyebrow')}
      headline={t('runzoey.completeHeadline')}
      sub={t('hero.completeBody')}
      bottom={
        <View style={{ width: cardW - 36, alignItems: 'center' }}>
          <PrimaryButton
            label={t('hero.viewAnalysis')}
            onPress={onViewAnalysis}
            width={cardW - 36}
            large
            arrow
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={rerunLabel}
            accessibilityState={{ disabled: rerunDisabled, busy }}
            disabled={rerunDisabled}
            onPress={() => void runZoey('RERUN')}
            className="mt-1.5 h-9 flex-row items-center justify-center gap-2 rounded-full active:opacity-70"
            style={{ alignSelf: 'stretch' }}>
            {busy ? <ActivityIndicator size="small" color={tokens.violet300} /> : null}
            <Text
              className="font-sans-medium text-[12.5px]"
              style={{ color: rerunDisabled ? 'rgba(244,239,255,0.4)' : tokens.violet300 }}>
              {rerunLabel}
            </Text>
          </Pressable>
        </View>
      }
    />
  );
}

function NeedsAttentionState() {
  const { t } = useI18n();
  const { blockedReason, retry } = useDocuments();
  const { cardW } = useHeroLayout();
  return (
    <ReferenceHero
      eyebrow={t('runzoey.eyebrow')}
      headline={t('runzoey.attentionHeadline')}
      sub={blockedReason ?? t('runzoey.attentionSub')}
      bottom={<PrimaryButton label={t('common.retry')} onPress={retry} width={cardW - 36} large />}
    />
  );
}

/**
 * Run Zoey, visible but locked. A free client sees the REAL card -- same composition, same art --
 * with the action pointed at membership, so what membership turns on is never a mystery.
 */
export function ZoeyRunLockedCard() {
  const { t } = useI18n();
  const router = useRouter();
  const { cardW } = useHeroLayout();

  return (
    <ReferenceHero
      eyebrow={t('hero.zoeyMember')}
      headline={t('runzoey.headline')}
      sub={t('hero.unlockMembership')}
      bottom={
        <PrimaryButton
          label={t('hero.unlockZoey')}
          onPress={() => router.push('/membership')}
          width={cardW - 36}
          large
          arrow
        />
      }
    />
  );
}

/**
 * The top slot of the Run Zoey screen. Owns nothing but the switch: which of the five lifecycle
 * states is showing. Everything below it is untouched.
 */
export function ZoeyHero({ onViewAnalysis }: { onViewAnalysis: () => void }) {
  const { phase } = useDocuments();
  const { isPremium, loading: membershipLoading } = useMembership();

  /*
    The premium Run Zoey experience -- live percentage and the engine's stage line -- is a Zoey
    Member feature. A free client running the SAME analysis sees the plain milestone view instead.
    The service is identical; only the presentation differs.

    The activation card (Zoey's image + RUN ZOEY) stays for everyone, because submitting for
    review is part of basic Credit Services, not a paid feature.
  */
  const premiumRunExperience = !membershipLoading && isPremium;

  const state: Record<AnalysisPhase, React.ReactNode> = {
    /*
      The Run Zoey card is present in EVERY state. While intake is incomplete the card shows the
      engine's real reason with the button locked, and the upload drop target sits beneath it --
      so the affordance to upload is kept without the hero disappearing.
    */
    DOCUMENTS_INCOMPLETE: (
      <View style={{ gap: 12 }}>
        <ActivationState />
        <UploadZone />
      </View>
    ),
    DOCUMENTS_READY: <ActivationState />,
    ANALYSIS_RUNNING: premiumRunExperience ? <RunningState /> : <SimpleServiceStatus />,
    ANALYSIS_COMPLETE: premiumRunExperience ? (
      <CompleteState onViewAnalysis={onViewAnalysis} />
    ) : (
      <SimpleServiceStatus />
    ),
    ANALYSIS_FAILED: <NeedsAttentionState />,
  };

  return state[phase];
}
