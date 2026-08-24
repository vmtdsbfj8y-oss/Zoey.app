import { LinearGradient } from 'expo-linear-gradient';
import { useI18n } from '@/lib/i18n/context';
import { useEffect } from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { ZoeyAvatar } from '@/components/ui/zoey-avatar';
import { tokens } from '@/constants/tokens';
import type { ChatAction } from '@/lib/chat-api';

/**
 * The chat's parts.
 *
 * ==============================  NOT BUBBLES ON BOTH SIDES  ==============================
 *
 * A symmetrical bubble layout is the shape of a conversation between equals, which is the wrong
 * picture: one side is a person and the other is their assistant reading their file. The person's
 * words sit right in a quiet violet capsule; Zoey's answer runs as open text on the page with her
 * mark beside it, the way a reply in a premium product reads. It also stops long answers turning
 * into a purple wall.
 */

/** Zoey's compact presence: her portrait with a soft ring. No second full-body hero. */
export function ZoeyMark({ size = 30 }: { size?: number }) {
  return (
    <View style={{ width: size, height: size }}>
      <ZoeyAvatar size={size} />
    </View>
  );
}

export function UserMessage({ text }: { text: string }) {
  return (
    <View className="mb-5 items-end">
      <View
        className="max-w-[86%] px-4 py-3"
        style={{ backgroundColor: 'rgba(168,85,247,0.20)', borderRadius: 22, borderTopRightRadius: 8 }}>
        <Text className="font-sans text-[16px] leading-[23px] text-parchment">{text}</Text>
      </View>
    </View>
  );
}

/**
 * Zoey's answer: open text, not a card.
 *
 * Actions render as chips underneath and only ever navigate. The engine filters them against a
 * closed list before they get here, so a chip that appears can always do what it says.
 */
export function ZoeyMessage({
  text,
  actions,
  onAction,
}: {
  text: string;
  actions?: ChatAction[];
  onAction?: (action: ChatAction) => void;
}) {
  return (
    <View className="mb-6 flex-row gap-3">
      <ZoeyMark />
      <View className="flex-1 pt-0.5">
        <Text className="font-sans text-[16px] leading-[24px] text-parchment/90">{text}</Text>

        {actions && actions.length > 0 ? (
          <View className="mt-3.5 flex-row flex-wrap gap-2">
            {actions.map((action) => (
              <Pressable
                key={`${action.target}-${action.label}`}
                accessibilityRole="button"
                accessibilityLabel={action.label}
                onPress={() => onAction?.(action)}
                className="flex-row items-center gap-1.5 rounded-full px-4 py-2.5 active:opacity-80"
                style={{ backgroundColor: 'rgba(168,85,247,0.16)', borderWidth: 1, borderColor: 'rgba(201,155,255,0.32)' }}>
                <Text className="font-sans-medium text-[14px]" style={{ color: tokens.violet300 }}>
                  {action.label}
                </Text>
                <IconSymbol name="chevron.right" size={11} color={tokens.violet400} />
              </Pressable>
            ))}
          </View>
        ) : null}
      </View>
    </View>
  );
}

/**
 * Thinking.
 *
 * The caption says only what is true: a model is composing an answer from data already loaded.
 * "Contacting bureaus" or "Recalculating your score" would describe work that is not happening, and
 * a client who believes it will draw conclusions from a number that never moved.
 */
export function ZoeyThinking() {
  const { t } = useI18n();
  const still = useReducedMotion();
  const pulse = useSharedValue(0);

  useEffect(() => {
    if (still) return;
    pulse.value = withRepeat(
      withSequence(withTiming(1, { duration: 620, easing: Easing.out(Easing.quad) }), withTiming(0, { duration: 620 })),
      -1,
      false
    );
  }, [pulse, still]);

  const dot = (delay: number) =>
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useAnimatedStyle(() => {
      const shifted = Math.max(0, Math.min(1, pulse.value - delay));
      return { opacity: 0.3 + shifted * 0.7, transform: [{ scale: 0.85 + shifted * 0.35 }] };
    });

  return (
    <View className="mb-6 flex-row items-center gap-3">
      <ZoeyMark />
      <View className="flex-row items-center gap-2.5">
        <View className="flex-row gap-1.5">
          {[0, 0.12, 0.24].map((delay) => (
            <Animated.View
              key={delay}
              style={[{ width: 6, height: 6, borderRadius: 3, backgroundColor: tokens.violet400 }, dot(delay)]}
            />
          ))}
        </View>
        <Text className="font-sans text-[14px] text-parchment/45">{t('chat.checkingProfile')}</Text>
      </View>
    </View>
  );
}

/**
 * The first screen, personalised from real state.
 *
 * The greeting uses their first name when the engine supplied one and stays neutral when it did
 * not -- a fallback like "Hey there" is fine; inventing a name is not. Suggestions come from the
 * engine, chosen from what this person's file can actually answer, so nothing offered here leads
 * to "I don't have that".
 */
export function ChatOpeningState({
  firstName,
  suggestions,
  onPick,
}: {
  firstName: string | null;
  suggestions: string[];
  onPick: (text: string) => void;
}) {
  return (
    <View className="items-center px-2 pb-4 pt-10">
      {/*
        The glow needs a rounded host. A shadow follows its view's shape, and an unrounded wrapper
        cast a square bloom behind a circular portrait -- which reads as a rendering fault rather
        than as light.
      */}
      <View
        style={{
          borderRadius: 42,
          shadowColor: tokens.violet500,
          shadowOpacity: 0.5,
          shadowRadius: 24,
          shadowOffset: { width: 0, height: 0 },
        }}>
        <ZoeyAvatar size={84} />
      </View>

      <Text className="mt-6 text-center font-display text-[26px] leading-[32px] text-parchment">
        {firstName ? `Hey ${firstName}, what do you` : 'What do you'}
        {'\n'}want to work on?
      </Text>
      <Text className="mt-2.5 max-w-[290px] text-center font-sans text-[15px] leading-[21px] text-parchment/50">
        I answer from your own Zoey records. If something isn&apos;t there, I&apos;ll tell you rather
        than guess.
      </Text>

      <View className="mt-7 w-full gap-2.5">
        {suggestions.map((suggestion) => (
          <Pressable
            key={suggestion}
            accessibilityRole="button"
            accessibilityLabel={suggestion}
            onPress={() => onPick(suggestion)}
            className="overflow-hidden active:opacity-80"
            style={{ borderRadius: 20 }}>
            <LinearGradient
              colors={['rgba(168,85,247,0.16)', 'rgba(168,85,247,0.06)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{ borderWidth: 1, borderColor: 'rgba(201,155,255,0.22)', borderRadius: 20 }}>
              <View className="flex-row items-center justify-between px-4 py-3.5">
                <Text className="flex-1 font-sans text-[15.5px] text-parchment/85">{suggestion}</Text>
                <IconSymbol name="chevron.right" size={13} color={tokens.violet400} />
              </View>
            </LinearGradient>
          </Pressable>
        ))}
      </View>
    </View>
  );
}
