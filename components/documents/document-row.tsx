import { Pressable, Text, View } from 'react-native';

import { GlassSurface } from '@/components/ui/glass-surface';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { tokens } from '@/constants/tokens';
import type { DocumentSlot } from '@/lib/documents-data';

/**
 * One document slot, on the same frosted glass as the cards.
 *
 * Pending and uploaded stay distinguishable without reading the text: pending
 * rows get a dashed border, a muted icon plate and an amber status pill;
 * uploaded rows are solid-bordered, violet-tinted, and carry a green check.
 */
export function DocumentRow({
  slot,
  onUpload,
  onView,
}: {
  slot: DocumentSlot;
  /** Wired by the screen -- these buttons previously had no handler at all. */
  onUpload?: () => void;
  onView?: () => void;
}) {
  const uploaded = slot.state === 'uploaded';

  const borderOverride = uploaded
    ? undefined
    : {
        borderStyle: 'dashed' as const,
        borderColor: slot.requirement ? 'rgba(168,85,247,0.55)' : 'rgba(168,85,247,0.22)',
        borderTopColor: slot.requirement ? 'rgba(168,85,247,0.55)' : 'rgba(168,85,247,0.22)',
      };

  return (
    <GlassSurface tintOpacity={uploaded ? 0.1 : 0.05} style={borderOverride}>
      <View className="flex-row items-start gap-3 p-3">
        {/* icon plate */}
        <View
          className={`h-10 w-10 items-center justify-center rounded-2xl ${
            uploaded ? 'bg-violet-500/20' : 'bg-parchment/5'
          }`}>
          <IconSymbol
            name="doc.fill"
            size={20}
            color={uploaded ? tokens.violet400 : tokens.ink600}
          />
        </View>

        <View className="flex-1">
          <View className="flex-row items-center gap-2">
            <Text className="font-sans-medium text-[14px] text-parchment" numberOfLines={1}>
              {slot.name}
            </Text>
            {slot.optional ? (
              <Text className="font-sans text-[11px] text-ink-600">Optional</Text>
            ) : null}
          </View>

          {/* Hard requirement -- a filled badge, never small grey helper text. */}
          {slot.requirement ? (
            <View className="mt-1.5 self-start rounded-full bg-violet-500 px-2.5 py-1">
              <Text className="font-sans-semibold text-[11px] uppercase tracking-wide text-parchment">
                {slot.requirement}
              </Text>
            </View>
          ) : null}

          <Text className="mt-1 font-sans text-[12px] text-ink-600" numberOfLines={2}>
            {slot.detail}
          </Text>

          {!uploaded ? (
            <View className="mt-1.5 self-start rounded-full bg-signal-pending/15 px-2.5 py-0.5">
              <Text className="font-sans-medium text-[11px] text-signal-pending">Pending</Text>
            </View>
          ) : null}
        </View>

        {/* right-hand action */}
        <View className="flex-row items-center gap-2 pt-1">
          {uploaded ? (
            <>
              <IconSymbol name="checkmark.circle.fill" size={18} color={tokens.signalReceived} />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`View ${slot.name}`}
                onPress={onView}
                className="rounded-full border border-violet-500 px-3.5 py-1.5 active:opacity-70">
                <Text className="font-sans-medium text-[12px] text-violet-400">View</Text>
              </Pressable>
            </>
          ) : (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Upload ${slot.name}`}
              onPress={onUpload}
              className="rounded-full bg-violet-500 px-3.5 py-1.5 active:opacity-70">
              <Text className="font-sans-medium text-[12px] text-parchment">Upload</Text>
            </Pressable>
          )}
        </View>
      </View>
    </GlassSurface>
  );
}
