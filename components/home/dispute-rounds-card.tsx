import { LinearGradient } from 'expo-linear-gradient';
import { Text, View } from 'react-native';
import Svg, { Defs, Ellipse, RadialGradient, Stop } from 'react-native-svg';

import { CARD_RADIUS } from '@/components/ui/glass-surface';
import { GradientRing } from '@/components/ui/gradient-ring';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { tokens } from '@/constants/tokens';

/**
 * DISPUTE ROUNDS -- WAITING FOR A ROUND THAT EXISTS.
 *
 * ==========================  WHAT THIS REPLACED  ==========================
 *
 * This card read `disputeRound` from `lib/placeholder-data.ts`: "Round 2 In
 * Progress", "3 of 7 items completed", with the ring filled to 3/7. There is
 * no dispute API in this app and no dispute record anywhere in it, so every
 * one of those values was a literal. A client with no case at all saw an
 * active second round.
 *
 * ==========================  WHY IT TAKES PROPS AND DEFAULTS TO NOTHING  ==========================
 *
 * The card is kept, and it is kept unfabricated: `round` is optional, and with
 * nothing passed it renders the waiting state. When real round data is
 * connected, the caller passes it and the full card returns unchanged -- no
 * design is thrown away and no placeholder can leak back in, because there is
 * no longer a constant to import.
 */
export function DisputeRoundsCard({
  round,
}: {
  /** Real round data only. Omitted while no dispute record exists. */
  round?: { round: number; status: string; completed: number; total: number };
}) {
  return (
    <View>
      {/* violet bleed around the filled card, stronger than the neutral cards */}
      <View pointerEvents="none" className="absolute -inset-6">
        <Svg width="100%" height="100%">
          <Defs>
            <RadialGradient id="glowDispute" cx="50%" cy="50%" r="50%">
              <Stop offset="0" stopColor={tokens.violet500} stopOpacity={0.32} />
              <Stop offset="0.6" stopColor={tokens.violet500} stopOpacity={0.1} />
              <Stop offset="1" stopColor={tokens.violet500} stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Ellipse cx="50%" cy="50%" rx="50%" ry="50%" fill="url(#glowDispute)" />
        </Svg>
      </View>

      {/*
        The one filled surface on Home. A violet ramp brightening toward the
        right -- NOT the deep violet->magenta of the FAB. That gradient is what
        made this card the loudest thing on the screen.
      */}
      <LinearGradient
        colors={['#8B4DF0', '#A855F7', '#CB86E8']}
        locations={[0, 0.55, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        className="overflow-hidden rounded-card"
        style={{ borderRadius: CARD_RADIUS }}>
        {/*
          Rim light: a bright hairline along the top and bottom edges, brighter
          at the top. This is what makes the card read as a lit slab rather than
          a flat gradient rectangle.

          Two explicit hairlines rather than borderTopWidth/borderBottomWidth on
          a rounded box -- a partial border combined with a corner radius is
          rendered inconsistently across platforms.
        */}
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: 0,
            left: CARD_RADIUS * 0.5,
            right: CARD_RADIUS * 0.5,
            height: 1,
            backgroundColor: 'rgba(255,255,255,0.55)',
          }}
        />
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            bottom: 0,
            left: CARD_RADIUS * 0.5,
            right: CARD_RADIUS * 0.5,
            height: 1,
            backgroundColor: 'rgba(255,255,255,0.28)',
          }}
        />

        <View className="flex-row items-center justify-between gap-3 p-4">
          <View className="flex-1">
            <Text className="font-sans text-[13px] text-parchment/75">Dispute Rounds</Text>
            {round ? (
              <>
                <Text className="mt-0.5 font-display text-[17px] text-parchment" numberOfLines={1}>
                  Round {round.round} {round.status}
                </Text>
                <Text className="mt-1 font-sans text-[12px] text-parchment/70">
                  {round.completed} of {round.total} items completed
                </Text>
              </>
            ) : (
              <>
                <Text className="mt-0.5 font-display text-[17px] text-parchment" numberOfLines={1}>
                  No round started yet
                </Text>
                <Text className="mt-1 font-sans text-[12px] text-parchment/70">
                  Your first round begins once Zoey has reviewed your report
                </Text>
              </>
            )}
          </View>

          <View className="items-center justify-center">
            {round ? (
              <>
                <GradientRing
                  size={64}
                  strokeWidth={5}
                  progress={round.total > 0 ? round.completed / round.total : 0}
                  trackColor="rgba(255,255,255,0.22)"
                  colors={['#F2E4FF', '#FFFFFF']}
                  gradientId="disputeRing"
                />
                <View className="absolute">
                  <Text className="font-display text-[15px] text-parchment">
                    {round.completed}/{round.total}
                  </Text>
                </View>
              </>
            ) : (
              /* An empty ring would read as 0% complete -- a claim about a round
                 that does not exist. A neutral mark says "not started" instead. */
              <View
                className="h-16 w-16 items-center justify-center rounded-full"
                style={{
                  backgroundColor: 'rgba(255,255,255,0.14)',
                  borderWidth: 1,
                  borderColor: 'rgba(255,255,255,0.28)',
                }}>
                <IconSymbol name="ellipsis" size={20} color={tokens.parchment} />
              </View>
            )}
          </View>
        </View>
      </LinearGradient>
    </View>
  );
}
