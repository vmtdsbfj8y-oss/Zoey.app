import { Text, View } from 'react-native';

import { Card } from '@/components/ui/card';
import { GradientRing } from '@/components/ui/gradient-ring';
import { useDocuments } from '@/lib/documents-store';

/**
 * GETTING READY, MEASURED BY SOMETHING THAT IS ACTUALLY MEASURABLE.
 *
 * ==========================  WHAT THIS REPLACED  ==========================
 *
 * The gauge read 78% and said "Good Progress!". Both came from
 * `overallProgress` in `lib/placeholder-data.ts` -- a literal, chosen to make
 * the arc look good. Nothing computed it, nothing could move it, and it showed
 * the same 78% to a client who had uploaded nothing at all.
 *
 * ==========================  WHY INTAKE, AND WHY NOT A SCORE  ==========================
 *
 * "Overall progress" on a credit case is not a number anyone can honestly
 * produce yet: it would need dispute outcomes and score movement, and neither
 * exists. Inventing a second percentage to replace the first would be the same
 * mistake with different digits.
 *
 * Document intake IS real. Which required slots are filled is recorded
 * server-side and enforced there too (`api/analysis/start.ts` refuses to open a
 * job while any are missing), so a count of them is a fact rather than a
 * decoration. The card therefore says exactly what it is measuring -- documents
 * received -- instead of implying it knows how a case is going.
 *
 * The ring, the type scale and the caption placement are untouched. Only the
 * source of the number changed, and the label changed to match it.
 */
export function ProgressGaugeCard() {
  const { slots, missing, requiredComplete, phase } = useDocuments();

  // Counts come from the engine's own checklist. Guard the divide: before the first response
  // the list is empty, and an empty list would otherwise produce NaN in the ring.
  const total = slots.length;
  const received = Math.max(0, total - missing.length);

  const analysisStarted =
    phase === 'ANALYSIS_RUNNING' || phase === 'ANALYSIS_COMPLETE' || phase === 'ANALYSIS_FAILED';

  const caption = analysisStarted
    ? 'Zoey is on it'
    : requiredComplete
      ? 'Ready for Zoey'
      : 'Getting your financial profile ready';

  return (
    <Card glowId="glowGauge">
      <View className="flex-row items-start justify-between gap-3">
        <Text className="font-display text-[15px] text-parchment">Documents Received</Text>
        <View className="items-end">
          <Text className="font-sans text-[11px] text-parchment/55">Required</Text>
          <Text className="font-sans-semibold text-[11px] text-parchment/90">{total} total</Text>
        </View>
      </View>

      <View className="mt-3 items-center">
        <View className="items-center justify-center">
          {/*
            240deg, not 300 -- the reference is a horseshoe with a wide gap at
            the bottom, and the near-closed ring was the main thing making this
            read as a dial rather than a progress arc.
          */}
          <GradientRing
            size={158}
            strokeWidth={13}
            progress={received / total}
            sweep={240}
            gradientId="overallGauge"
          />
          {/* Baseline-aligned: a big number with a smaller unit, not one run of type. */}
          <View className="absolute flex-row items-baseline">
            <Text className="font-display text-[44px] leading-[50px] text-parchment">
              {received}
            </Text>
            <Text className="font-display text-[26px] leading-[50px] text-parchment/60">
              /{total}
            </Text>
          </View>
        </View>

        {/*
          Pulled up into the arc's open gap. The ring's SVG canvas is padded on
          all four sides to give the bloom room, and a 240deg sweep leaves ~58px
          of that padding empty below the caps -- without this the caption
          floats away from the gauge.
        */}
        <Text
          className="text-center font-sans-semibold text-[15px] text-parchment"
          style={{ marginTop: -48 }}>
          {caption}
        </Text>
      </View>
    </Card>
  );
}
