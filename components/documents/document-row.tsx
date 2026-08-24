import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { useI18n } from '@/lib/i18n/context';

import { GlassSurface } from '@/components/ui/glass-surface';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { tokens } from '@/constants/tokens';
import type { DocumentSlot } from '@/lib/documents-data';
import type { SlotUploadState } from '@/lib/documents-store';

/**
 * One document slot, on the same frosted glass as the cards.
 *
 * Pending and uploaded stay distinguishable without reading the text: pending
 * rows get a dashed border, a muted icon plate and an amber status pill;
 * uploaded rows are solid-bordered, violet-tinted, and carry a green check.
 */
export function DocumentRow({
  slot,
  upload,
  onUpload,
  onView,
}: {
  slot: DocumentSlot;
  /**
   * What is happening to THIS row right now.
   *
   * Without it the row showed nothing between the tap and the server's answer, which for a real
   * credit report is several seconds of a screen that looks like it ignored you -- so people
   * tapped again, and every one of those taps stored another copy.
   */
  upload?: SlotUploadState;
  /** Wired by the screen -- these buttons previously had no handler at all. */
  onUpload?: () => void;
  onView?: () => void;
}) {
  const { t } = useI18n();
  const uploaded = slot.state === 'uploaded';
  /*
   * Re-encoding an oversized photo shows the same busy treatment as sending it. It is one wait from
   * the person's side -- they tapped once -- and splitting it into two spinners would suggest two
   * things went wrong when neither did.
   */
  const preparing = upload?.kind === 'preparing';
  const uploading = upload?.kind === 'uploading' || preparing;
  const problem = upload?.kind === 'rejected' || upload?.kind === 'failed' ? upload : null;
  const review = upload?.kind === 'review' ? upload : null;
  // The engine says it has the file but has not accepted it. Nothing for the client to redo.
  const awaitingReview = Boolean(slot.review);

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
              <Text className="font-sans text-[11px] text-ink-600">{t('status.optional')}</Text>
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
            {preparing ? 'Preparing your photo…' : uploading ? 'Uploading…' : (problem?.message ?? review?.message ?? slot.detail)}
          </Text>

          {/*
            One pill, and only one. While uploading it says so; a real failure says what to do
            next. "Pending" returns only when nothing is in flight and nothing went wrong.
          */}
          {uploading ? (
            <View className="mt-1.5 flex-row items-center gap-1.5 self-start rounded-full bg-violet-500/15 px-2.5 py-0.5">
              <ActivityIndicator size="small" color={tokens.violet400} />
              <Text className="font-sans-medium text-[11px] text-violet-400">{preparing ? 'Preparing' : 'Uploading'}</Text>
            </View>
          ) : problem ? (
            <View className="mt-1.5 self-start rounded-full bg-signal-pending/15 px-2.5 py-0.5">
              <Text className="font-sans-medium text-[11px] text-signal-pending">
                {problem.kind === 'rejected' ? 'Not accepted' : "Didn't send"}
              </Text>
            </View>
          ) : awaitingReview ? (
            <View className="mt-1.5 self-start rounded-full bg-violet-500/15 px-2.5 py-0.5">
              <Text className="font-sans-medium text-[11px] text-violet-400">{t('status.beingReviewed')}</Text>
            </View>
          ) : !uploaded ? (
            <View className="mt-1.5 self-start rounded-full bg-signal-pending/15 px-2.5 py-0.5">
              <Text className="font-sans-medium text-[11px] text-signal-pending">{t('status.pending')}</Text>
            </View>
          ) : null}
        </View>

        {/* right-hand action */}
        <View className="flex-row items-center gap-2 pt-1">
          {uploading ? (
            // Disabled on purpose: the work is already in flight, and a second tap stores a copy.
            <View className="rounded-full bg-violet-500/40 px-3.5 py-1.5">
              <Text className="font-sans-medium text-[12px] text-parchment">{t('status.sending')}</Text>
            </View>
          ) : problem ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${problem.kind === 'rejected' ? 'Choose another file for' : 'Retry upload of'} ${slot.name}`}
              onPress={onUpload}
              className="rounded-full bg-violet-500 px-3.5 py-1.5 active:opacity-70">
              <Text className="font-sans-medium text-[12px] text-parchment">
                {problem.kind === 'rejected' ? 'Choose another' : 'Retry'}
              </Text>
            </Pressable>
          ) : awaitingReview ? (
            <IconSymbol name="clock.fill" size={18} color={tokens.violet400} />
          ) : uploaded ? (
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
