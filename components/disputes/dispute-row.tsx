import { Text, View } from 'react-native';

import { GlassSurface } from '@/components/ui/glass-surface';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { tokens } from '@/constants/tokens';
import type { DisputeItem, DisputeStatus } from '@/lib/disputes-data';

const ROW_RADIUS = 18;
const BADGE = 44;

/** Badge fill + label colour per status. */
const STATUS_STYLE: Record<DisputeStatus, { bg: string; fg: string }> = {
  'In Dispute': { bg: tokens.violet500, fg: tokens.parchment },
  // Dark labels on the light fills -- white on amber or green fails contrast.
  Pending: { bg: tokens.signalPending, fg: '#2A1705' },
  Received: { bg: tokens.signalReceived, fg: '#062015' },
};

/**
 * The icon ring reads resolution, not status: warm while the item is still
 * outstanding, green once the bureau has responded. That is why an "In Dispute"
 * row carries an amber ring rather than a violet one -- the violet badge is
 * already saying what the status is, and repeating it in the ring would leave
 * nothing distinguishing a settled row at a glance.
 */
function ringColor(status: DisputeStatus) {
  return status === 'Received' ? tokens.signalReceived : tokens.signalPending;
}

export function DisputeRow({ item }: { item: DisputeItem }) {
  const badge = STATUS_STYLE[item.status];
  const ring = ringColor(item.status);

  return (
    <GlassSurface radius={ROW_RADIUS}>
      <View className="flex-row items-center gap-3 p-3">
        <View
          className="items-center justify-center"
          style={{
            width: BADGE,
            height: BADGE,
            borderRadius: BADGE / 2,
            borderWidth: 1.5,
            borderColor: ring,
            backgroundColor: 'rgba(10,5,24,0.45)',
          }}>
          <IconSymbol name="person.text.rectangle" size={20} color={ring} />
        </View>

        <View className="flex-1">
          <View className="flex-row items-start justify-between gap-2">
            <View className="flex-1">
              <Text className="font-sans-semibold text-[15px] text-parchment" numberOfLines={1}>
                {item.name}
              </Text>
              <Text className="mt-0.5 font-sans text-[13px] text-parchment/50" numberOfLines={1}>
                {item.creditor}
              </Text>
            </View>

            <View
              className="rounded-full px-2.5 py-1"
              style={{ backgroundColor: badge.bg }}>
              <Text className="font-sans-semibold text-[11px]" style={{ color: badge.fg }}>
                {item.status}
              </Text>
            </View>
          </View>

          <View className="mt-3 flex-row items-center justify-between gap-2">
            <Text className="font-sans text-[12px] text-parchment/55">{item.bureau}</Text>
            <Text className="font-sans text-[12px] text-parchment/45">Added: {item.added}</Text>
          </View>
        </View>
      </View>
    </GlassSurface>
  );
}
