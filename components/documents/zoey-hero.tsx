import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect } from 'react';
import { Pressable, Text, View, useWindowDimensions } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { AnalysisSteps } from '@/components/documents/analysis-steps';
import {
  CosmicBubbles,
  HoloPlatform,
  OrbitalRings,
  PulseGlow,
  Starfield,
} from '@/components/documents/galaxy-layers';
import { UploadZone } from '@/components/documents/upload-zone';
import { CARD_RADIUS, GlassSurface } from '@/components/ui/glass-surface';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { tokens } from '@/constants/tokens';
import type { AnalysisPhase } from '@/lib/analysis-source';
import { useDocuments } from '@/lib/documents-store';

/** Source art is 940x1672; keeping the box on that ratio means `contain` adds no letterbox. */
const ART_RATIO = 940 / 1672;

/**
 * Hero geometry, derived from the card width so it scales across devices rather
 * than breaking on a small iPhone.
 *
 * Height is capped: the concept keeps the top of the document list visible
 * under the hero, and an unbounded hero on a tall phone would push it off
 * screen entirely.
 */
function useHeroLayout() {
  const { width } = useWindowDimensions();
  const cardW = width - 32; // screen padding is px-4 either side
  const heroH = Math.round(Math.min(Math.max(cardW * 1.08, 330), 420));

  const figureH = Math.round(heroH * 0.78);
  const figureW = Math.round(figureH * ART_RATIO);

  const gutter = 12;
  const innerGap = 10;

  /**
   * Both columns are measured off one budget so the gap between them is a
   * constant 10px on every device. Sizing them as independent fractions of the
   * card left only 3px of clearance on a 375pt phone -- the panels touched.
   */
  const available = cardW - gutter * 2 - innerGap;
  const colW = Math.round(available * 0.55);
  const panelW = available - colW;

  return {
    cardW,
    heroH,
    figureH,
    figureW,
    /**
     * Zoey sits right of centre. At 0.56 the left column ran ~28px across her
     * face; 0.62 leaves the type clear of everything but the outer edge of her
     * hair, which is what the concept does.
     */
    figureCenterX: cardW * 0.62,
    figureBottom: Math.round(heroH * 0.11),
    colW,
    panelW,
    gutter,
  };
}

/* -------------------------------------------------------------------------- */
/* Scene                                                                       */
/* -------------------------------------------------------------------------- */

/**
 * The galactic environment: stars, bubbles, rings, platform and Zoey herself,
 * filling the whole card. Everything else in the hero floats ON TOP of this as
 * translucent glass -- that overlay is what keeps the composition compact
 * instead of a tall vertical stack.
 */
function CosmicStage({ live }: { live: boolean }) {
  const { cardW, heroH, figureH, figureW, figureCenterX, figureBottom } = useHeroLayout();
  const float = useSharedValue(0);
  const still = useReducedMotion();

  useEffect(() => {
    if (!live || still) return;
    float.value = withRepeat(
      withTiming(1, { duration: 5000, easing: Easing.inOut(Easing.quad) }),
      -1,
      true
    );
  }, [float, live, still]);

  const floatStyle = useAnimatedStyle(() => ({ transform: [{ translateY: -float.value * 5 }] }));

  const platformW = figureW * 1.5;

  return (
    <View pointerEvents="none" style={{ position: 'absolute', width: cardW, height: heroH }}>
      <Starfield />
      <CosmicBubbles />

      {/* rings + bloom centred on her torso */}
      <View
        style={{
          position: 'absolute',
          left: figureCenterX - figureW / 2,
          bottom: figureBottom,
          width: figureW,
          height: figureH,
          alignItems: 'center',
          justifyContent: 'center',
        }}>
        <PulseGlow size={figureH * 0.95} id="zoeyHeroGlow" spin={live} />
        <OrbitalRings size={figureH * 1.05} spin={live} />
      </View>

      {/* platform at her feet, behind her */}
      <View
        style={{
          position: 'absolute',
          left: figureCenterX - platformW / 2,
          bottom: figureBottom - platformW * 0.1,
        }}>
        <HoloPlatform width={platformW} />
      </View>

      <Animated.View
        style={[
          { position: 'absolute', left: figureCenterX - figureW / 2, bottom: figureBottom },
          floatStyle,
        ]}>
        <Image
          source={require('@/assets/images/zoey-hero.png')}
          style={{ width: figureW, height: figureH }}
          contentFit="contain"
          // Static art -- decode once, so polling re-renders never re-decode a
          // 940x1672 image.
          cachePolicy="memory-disk"
          transition={240}
        />
      </Animated.View>

      {/*
        Readability scrim. The left column and the lower panels sit over the
        scene, and without this the star field competes with the type. Angled so
        it darkens the left and bottom while leaving her face untouched.
      */}
      <LinearGradient
        colors={['rgba(7,3,15,0.82)', 'rgba(7,3,15,0.25)', 'rgba(7,3,15,0)']}
        locations={[0, 0.45, 1]}
        start={{ x: 0, y: 0.35 }}
        end={{ x: 0.95, y: 0.1 }}
        style={{ position: 'absolute', inset: 0 }}
      />
      <LinearGradient
        colors={['rgba(7,3,15,0)', 'rgba(7,3,15,0.55)', 'rgba(7,3,15,0.9)']}
        locations={[0, 0.6, 1]}
        start={{ x: 0.5, y: 0.45 }}
        end={{ x: 0.5, y: 1 }}
        style={{ position: 'absolute', inset: 0 }}
      />
    </View>
  );
}

/** The card shell: near-black glass with a violet rim and outer bloom. */
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
        borderColor: 'rgba(168,85,247,0.32)',
        borderTopColor: 'rgba(233,213,255,0.4)',
        backgroundColor: '#08040F',
        shadowColor: tokens.violet500,
        shadowOpacity: 0.4,
        shadowRadius: 20,
        shadowOffset: { width: 0, height: 0 },
      }}>
      {children}
    </View>
  );
}

function Pill({ label, dot }: { label: string; dot: string }) {
  return (
    <GlassSurface radius={999} intensity={18} tintOpacity={0.1} style={{ alignSelf: 'flex-start' }}>
      <View className="flex-row items-center gap-1.5 px-2.5 py-1">
        <View className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: dot }} />
        <Text className="font-sans-semibold text-[9px] uppercase tracking-wider text-parchment">
          {label}
        </Text>
      </View>
    </GlassSurface>
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

/** Compact ANALYSIS PROGRESS panel: percentage, bar, and the live operations. */
function ProgressPanel({
  progress,
  recent,
  width,
}: {
  progress: number;
  recent: { id: string; label: string; active: boolean }[];
  width: number;
}) {
  return (
    <GlassSurface radius={16} intensity={16} tintOpacity={0.07} glow style={{ width }}>
      <View className="px-2.5 pb-2.5 pt-2">
        <View className="flex-row items-center gap-1.5">
          <IconSymbol name="sparkles" size={11} color={tokens.violet300} />
          <Text className="font-sans-semibold text-[9px] uppercase tracking-wider text-parchment/85">
            Analysis Progress
          </Text>
        </View>

        <View className="mt-0.5 flex-row items-baseline">
          <Text className="font-display text-[30px] leading-[36px]" style={{ color: tokens.violet300 }}>
            {Math.round(progress * 100)}
          </Text>
          <Text className="font-display text-[15px] leading-[36px]" style={{ color: tokens.violet300 }}>
            %
          </Text>
        </View>

        <View className="mt-1">
          <ProgressBar progress={progress} />
        </View>

        <View className="mt-2 gap-0.5">
          {recent.map((r) => (
            <Text
              key={r.id}
              numberOfLines={1}
              className="font-sans text-[9.5px] leading-[13px]"
              style={{ color: r.active ? tokens.violet300 : 'rgba(244,239,255,0.45)' }}>
              {r.label}
            </Text>
          ))}
        </View>
      </View>
    </GlassSurface>
  );
}

/** The glowing capsule across the bottom of the hero. */
function StatusCapsule({ title, subtitle, width }: { title: string; subtitle: string; width: number }) {
  return (
    <GlassSurface radius={999} intensity={20} tintOpacity={0.12} glow style={{ width }}>
      <View className="items-center px-3 py-2">
        <Text className="font-sans-semibold text-[11px] tracking-wide text-parchment">{title}</Text>
        <Text className="mt-0.5 font-sans text-[9px] text-parchment/60">{subtitle}</Text>
      </View>
    </GlassSurface>
  );
}

/**
 * Glossy violet glass button. `large` is the activation treatment -- taller,
 * bigger type, tracked out and a stronger bloom, so the primary call to action
 * cannot be mistaken for a caption or a chip.
 */
function PrimaryButton({
  label,
  onPress,
  width,
  large = false,
}: {
  label: string;
  onPress: () => void;
  width: number;
  large?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={{ width }}
      className="active:opacity-85">
      <LinearGradient
        colors={[tokens.violet400, tokens.violet500, tokens.violet600]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          borderRadius: 999,
          paddingVertical: large ? 15 : 11,
          alignItems: 'center',
          borderWidth: 1,
          borderColor: large ? 'rgba(244,239,255,0.65)' : 'rgba(233,213,255,0.45)',
          shadowColor: tokens.violet500,
          shadowOpacity: large ? 0.9 : 0.55,
          shadowRadius: large ? 20 : 12,
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
        <Text
          className="font-sans-semibold text-parchment"
          style={large ? { fontSize: 15, letterSpacing: 1.1 } : { fontSize: 12.5 }}>
          {label}
        </Text>
      </LinearGradient>
    </Pressable>
  );
}

/* -------------------------------------------------------------------------- */
/* States                                                                      */
/* -------------------------------------------------------------------------- */

/**
 * Shared command-centre composition. Running, complete and needs-attention are
 * the SAME layout with different copy and a different bottom slot -- completion
 * must not throw the galactic environment away and drop the client onto a flat
 * confirmation screen.
 */
function CommandCenter({
  pill,
  pillDot,
  title,
  titleColor,
  copy,
  bottom,
  live,
}: {
  pill: string;
  pillDot: string;
  title: string;
  titleColor: string;
  copy: string;
  bottom: React.ReactNode;
  live: boolean;
}) {
  const { stages, stageList, progress } = useDocuments();
  const { cardW, heroH, colW, panelW, gutter } = useHeroLayout();

  // The operations list under the percentage: the active stage plus the two
  // before it, so there is always context. Straight from real stage state.
  const activeIdx = stageList.findIndex((s) => stages[s.id] === 'active');
  const anchor = activeIdx >= 0 ? activeIdx : stageList.length - 1;
  const recent = stageList
    .slice(Math.max(0, anchor - 2), anchor + 1)
    .map((s) => ({ id: s.id, label: s.label, active: stages[s.id] === 'active' }));

  return (
    <HeroCard>
      <CosmicStage live={live} />

      {/* top-left column */}
      <View style={{ position: 'absolute', top: 14, left: gutter, width: colW }}>
        <Pill label={pill} dot={pillDot} />
        <Text className="mt-2 font-display text-[19px] leading-[23px]" style={{ color: titleColor }}>
          {title}
        </Text>
        <Text className="mt-1.5 font-sans text-[10px] leading-[14px] text-parchment/70">{copy}</Text>
      </View>

      {/* live intelligence, floating over her right side and clear of her face */}
      <View style={{ position: 'absolute', top: heroH * 0.44, right: gutter }}>
        <AnalysisSteps stageList={stageList} stages={stages} width={panelW} />
      </View>

      {/* progress panel, lower-left */}
      <View style={{ position: 'absolute', bottom: heroH * 0.17, left: gutter }}>
        <ProgressPanel progress={progress} recent={recent} width={colW} />
      </View>

      {/* bottom slot: capsule while working, CTA when there is an action */}
      <View style={{ position: 'absolute', bottom: 12, left: 0, width: cardW, alignItems: 'center' }}>
        {bottom}
      </View>
    </HeroCard>
  );
}

function RunningState() {
  const { cardW } = useHeroLayout();
  return (
    <CommandCenter
      live
      pill="Zoey AI"
      pillDot={tokens.violet300}
      title="RUNNING ZOEY"
      titleColor={tokens.violet400}
      copy="Your documents have been received. Zoey is now analyzing, understanding, and organizing everything for your case."
      bottom={
        <StatusCapsule
          width={cardW - 24}
          title="ZOEY IS WORKING FOR YOU"
          subtitle="Optimal Security • Maximum Accuracy • 100% Confidential"
        />
      }
    />
  );
}

function CompleteState({ onViewAnalysis }: { onViewAnalysis: () => void }) {
  const { cardW } = useHeroLayout();
  return (
    <CommandCenter
      live={false}
      pill="Analysis Complete"
      pillDot={tokens.signalReceived}
      title="ANALYSIS COMPLETE"
      titleColor={tokens.violet400}
      copy="Zoey finished your case review. Every document was read, cross-checked against the bureaus and organized into your case profile."
      bottom={<PrimaryButton label="View my analysis" onPress={onViewAnalysis} width={cardW - 24} />}
    />
  );
}

function NeedsAttentionState() {
  const { blockedReason, retry } = useDocuments();
  const { cardW } = useHeroLayout();
  return (
    <CommandCenter
      live={false}
      pill="Needs your attention"
      pillDot={tokens.signalPending}
      title="ZOEY NEEDS SOMETHING"
      titleColor={tokens.signalPending}
      copy={
        blockedReason ??
        'Zoey could not finish the analysis. Your uploaded documents are safe and still on file.'
      }
      bottom={<PrimaryButton label="Try again" onPress={retry} width={cardW - 24} />}
    />
  );
}

/** DOCUMENTS_READY -- everything is in, Zoey has not been started. */
function ReadyState() {
  const { runZoey } = useDocuments();
  const { cardW, heroH, colW, gutter } = useHeroLayout();

  return (
    <HeroCard>
      <CosmicStage live={false} />

      <View style={{ position: 'absolute', top: 16, left: gutter, width: colW }}>
        <Pill label="Zoey AI" dot={tokens.violet300} />
        {/* Headline is not "RUN ZOEY" -- the button carries the verb, and two
            competing action labels in one card reads as a mistake. */}
        <Text className="mt-2 font-display text-[20px] leading-[24px]" style={{ color: tokens.violet400 }}>
          ZOEY IS READY
        </Text>
        <Text className="mt-1.5 font-sans text-[10px] leading-[14px] text-parchment/70">
          All required documents are in. Start the analysis and Zoey will read, validate and
          organize everything for your case.
        </Text>
      </View>

      {/* Raised to 0.21 to clear the taller activation button below it. */}
      <View style={{ position: 'absolute', bottom: heroH * 0.21, left: 0, width: cardW, alignItems: 'center' }}>
        <StatusCapsule
          width={cardW - 24}
          title="READY WHEN YOU ARE"
          subtitle="Optimal Security • Maximum Accuracy • 100% Confidential"
        />
      </View>

      <View style={{ position: 'absolute', bottom: 12, left: 0, width: cardW, alignItems: 'center' }}>
        <PrimaryButton label="START ZOEY" onPress={runZoey} width={cardW - 24} large />
      </View>
    </HeroCard>
  );
}

/**
 * The top slot of the Documents screen. Owns nothing but the switch: which of
 * the five lifecycle states is showing. Everything below it is untouched.
 */
export function ZoeyHero({ onViewAnalysis }: { onViewAnalysis: () => void }) {
  const { phase } = useDocuments();

  const state: Record<AnalysisPhase, React.ReactNode> = {
    // Until intake is complete this stays the existing upload experience.
    DOCUMENTS_INCOMPLETE: <UploadZone />,
    DOCUMENTS_READY: <ReadyState />,
    ANALYSIS_RUNNING: <RunningState />,
    ANALYSIS_COMPLETE: <CompleteState onViewAnalysis={onViewAnalysis} />,
    ANALYSIS_FAILED: <NeedsAttentionState />,
  };

  return state[phase];
}
