import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, Text, View } from 'react-native';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { tokens } from '@/constants/tokens';
import type { DocumentSlot } from '@/lib/documents-data';

/**
 * One document slot.
 *
 * Pending and uploaded are deliberately distinguishable without reading the
 * text: pending rows get a dashed border, a muted icon plate and an amber
 * status pill; uploaded rows are solid, violet-tinted, and carry a green
 * check.
 */
export function DocumentRow({ slot }: { slot: DocumentSlot }) {
  const uploaded = slot.state === 'uploaded';

  // Rows are gradient surfaces too, so they read as lit panels rather than
  // flat rectangles. Border style still carries the pending/uploaded signal.
  const border = uploaded
    ? { borderStyle: 'solid' as const, borderColor: tokens.ink700 }
    : slot.requirement
      ? { borderStyle: 'dashed' as const, borderColor: 'rgba(168,85,247,0.5)' }
      : { borderStyle: 'dashed' as const, borderColor: tokens.ink700 };

  return (
    <LinearGradient
      colors={
        uploaded
          ? [tokens.surfaceTop, tokens.surfaceBottom]
          : ['rgba(29,17,57,0.55)', 'rgba(19,10,36,0.55)']
      }
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{ borderRadius: 10, borderWidth: 1, ...border }}>
      <View className="flex-row items-start gap-3 p-3">
      {/* icon plate */}
      <View
        className={`h-10 w-10 items-center justify-center rounded-lg ${
          uploaded ? 'bg-violet-500/15' : 'bg-ink-800'
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
          <View className="mt-1.5 self-start rounded-md bg-violet-500 px-2 py-1">
            <Text className="font-sans-semibold text-[11px] uppercase tracking-wide text-parchment">
              {slot.requirement}
            </Text>
          </View>
        ) : null}

        <Text className="mt-1 font-sans text-[12px] text-ink-600" numberOfLines={2}>
          {slot.detail}
        </Text>

        {!uploaded ? (
          <View className="mt-1.5 self-start rounded-full bg-signal-pending/15 px-2 py-0.5">
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
              className="rounded-full border border-violet-500 px-3 py-1 active:opacity-70">
              <Text className="font-sans-medium text-[12px] text-violet-400">View</Text>
            </Pressable>
          </>
        ) : (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Upload ${slot.name}`}
            className="rounded-full bg-violet-500 px-3 py-1 active:opacity-70">
            <Text className="font-sans-medium text-[12px] text-parchment">Upload</Text>
          </Pressable>
        )}
        </View>
      </View>
    </LinearGradient>
  );
}
