import { LinearGradient } from 'expo-linear-gradient';
import { Text, View } from 'react-native';
import Svg, { Defs, Ellipse, RadialGradient, Stop } from 'react-native-svg';

import { CARD_RADIUS } from '@/components/ui/glass-surface';
import { tokens } from '@/constants/tokens';
import { currentRound } from '@/lib/disputes-data';

const BAR_HEIGHT = 10;

/** The filled violet slab at the top of Disputes: round number, status, bar. */
export function RoundProgressCard() {
  const { round, status, completed, total } = currentRound;
  const pct = Math.max(0, Math.min(1, completed / total));

  return (
    <View>
      {/* violet bleed around the filled card */}
      <View pointerEvents="none" className="absolute -inset-6">
        <Svg width="100%" height="100%">
          <Defs>
            <RadialGradient id="glowRound" cx="50%" cy="50%" r="50%">
              <Stop offset="0" stopColor={tokens.violet500} stopOpacity={0.34} />
              <Stop offset="0.6" stopColor={tokens.violet500} stopOpacity={0.1} />
              <Stop offset="1" stopColor={tokens.violet500} stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Ellipse cx="50%" cy="50%" rx="50%" ry="50%" fill="url(#glowRound)" />
        </Svg>
      </View>

      {/*
        Outer glow. A shadow with no offset and a wide radius casts light evenly
        on all four sides, hugging the rounded shape -- which top/bottom
        hairlines could not do. The wrapper needs its own solid backgroundColor:
        iOS derives the shadow from the layer's shape, and a transparent parent
        would cast from the children's alpha instead.

        Violet, not white. A white glow around a purple card is light with no
        source -- nothing on screen is white, so it read as a sticker outline
        rather than the card giving off its own colour.
      */}
      <View
        style={{
          borderRadius: CARD_RADIUS,
          backgroundColor: '#743BC0',
          shadowColor: tokens.violet500,
          shadowOpacity: 0.45,
          shadowRadius: 18,
          shadowOffset: { width: 0, height: 0 },
        }}>
        <LinearGradient
          colors={['#5B2B9E', '#743BC0', '#8848D4']}
          locations={[0, 0.55, 1]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            borderRadius: CARD_RADIUS,
            overflow: 'hidden',
            // Soft lavender hairline, even on all four sides. The bright white
            // rim was the other half of what looked unnatural.
            borderWidth: 1,
            borderColor: 'rgba(203,160,255,0.5)',
          }}>
          <View className="p-5">
            <View className="flex-row items-center justify-between gap-3">
              <Text className="font-display text-[22px] text-parchment">Round {round}</Text>
              {/* A brighter violet than the card behind it. A white wash here
                  desaturated into grey-lilac instead of reading as violet. */}
              <View
                className="rounded-full px-3 py-1.5"
                style={{ backgroundColor: tokens.violet500 }}>
                <Text className="font-sans-semibold text-[12px] text-parchment">{status}</Text>
              </View>
            </View>

            <Text className="mt-2 font-sans text-[13px] text-parchment/80">
              {completed} of {total} items completed
            </Text>

            <View
              className="mt-4 w-full overflow-hidden"
              style={{
                height: BAR_HEIGHT,
                borderRadius: BAR_HEIGHT / 2,
                backgroundColor: 'rgba(20,8,42,0.5)',
              }}>
              {/* Percentage width on the fill, so the track stays full-bleed and
                  the bar's rounded ends are clipped by the parent. */}
              <LinearGradient
                colors={['#A855F7', '#E3CCFF']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={{ width: `${pct * 100}%`, height: '100%', borderRadius: BAR_HEIGHT / 2 }}
              />
            </View>
          </View>
        </LinearGradient>
      </View>
    </View>
  );
}
