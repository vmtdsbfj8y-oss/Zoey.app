import { LinearGradient } from 'expo-linear-gradient';
import { Text, View } from 'react-native';
import Svg, { Defs, Ellipse, RadialGradient, Stop } from 'react-native-svg';

import { CARD_RADIUS } from '@/components/ui/glass-surface';
import { GradientRing } from '@/components/ui/gradient-ring';
import { tokens } from '@/constants/tokens';
import { disputeRound } from '@/lib/placeholder-data';

export function DisputeRoundsCard() {
  const { round, status, completed, total } = disputeRound;

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
            <Text className="mt-0.5 font-display text-[17px] text-parchment" numberOfLines={1}>
              Round {round} {status}
            </Text>
            <Text className="mt-1 font-sans text-[12px] text-parchment/70">
              {completed} of {total} items completed
            </Text>
          </View>

          <View className="items-center justify-center">
            <GradientRing
              size={64}
              strokeWidth={5}
              progress={completed / total}
              trackColor="rgba(255,255,255,0.22)"
              colors={['#F2E4FF', '#FFFFFF']}
              gradientId="disputeRing"
            />
            <View className="absolute">
              <Text className="font-display text-[15px] text-parchment">
                {completed}/{total}
              </Text>
            </View>
          </View>
        </View>
      </LinearGradient>
    </View>
  );
}
