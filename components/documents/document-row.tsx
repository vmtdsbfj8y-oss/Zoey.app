import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { useI18n } from '@/lib/i18n/context';

import { GlassSurface } from '@/components/ui/glass-surface';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { tokens } from '@/constants/tokens';
import { DOCUMENT_ACTION_KEYS, documentDetailFor, documentNameFor } from '@/lib/document-copy';
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
  highlighted,
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
  /**
   * Briefly ringed because the consumer arrived here asking for THIS document.
   *
   * Deliberately restrained and temporary: it says "this is the one you picked", and it must not
   * become a second status. Nothing about the row's meaning changes while it is on.
   */
  highlighted?: boolean;
}) {
  const { t } = useI18n();
  /*
   * The name and the status line are rendered from the engine's id and status enum, not from the
   * English prose it also sends -- so the checklist follows the reader's language. Both fall back
   * to the engine's own words for a slot or status this build has never seen.
   */
  const name = documentNameFor(slot, t);
  const detail = documentDetailFor(slot, t);
  const highlightRing = highlighted
    ? { borderColor: tokens.violet400, borderWidth: 2, shadowColor: tokens.violet400, shadowOpacity: 0.5, shadowRadius: 12, shadowOffset: { width: 0, height: 0 } }
    : undefined;
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

  /*
   * Accepted documents become compact navigation rows. Their intake controls,
   * requirement badges and helper copy have served their purpose; keeping them
   * after acceptance makes the completed screen feel like an upload form.
   */
  if (uploaded) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('documents.a11yView', { values: { name } })}
        accessibilityState={{ disabled: !onView }}
        disabled={!onView}
        onPress={onView}
        className="active:opacity-75">
        <GlassSurface tintOpacity={0.1} style={highlightRing}>
          <View className="flex-row items-center gap-3 px-3 py-2.5">
            <View className="h-10 w-10 items-center justify-center rounded-2xl bg-violet-500/20">
              <IconSymbol name="doc.fill" size={20} color={tokens.violet400} />
            </View>

            <View className="flex-1">
              <Text className="font-sans-medium text-[14px] text-parchment" numberOfLines={1}>
                {name}
              </Text>
              <View className="mt-0.5 flex-row items-center gap-1.5">
                <IconSymbol
                  name="checkmark.circle.fill"
                  size={15}
                  color={tokens.signalReceived}
                />
                <Text className="font-sans text-[12px] text-parchment/65">
                  {t('documents.accepted')}
                </Text>
              </View>
            </View>

            <IconSymbol name="chevron.right" size={22} color={tokens.violet400} />
          </View>
        </GlassSurface>
      </Pressable>
    );
  }

  /*
   * Everything below is the NOT-accepted row.
   *
   * The accepted case returned above, so `uploaded` is false from here down. It used to be re-tested
   * at every style and in a whole second action branch, which read as though both cases were still
   * live -- and the "View" button in that branch could never render, because the accepted row that
   * would have shown it is the compact one above. Removing those tests removes no behaviour; it
   * removes the suggestion that there is behaviour here to find.
   */
  const borderOverride = {
    borderStyle: 'dashed' as const,
    borderColor: slot.requirement ? 'rgba(168,85,247,0.55)' : 'rgba(168,85,247,0.22)',
    borderTopColor: slot.requirement ? 'rgba(168,85,247,0.55)' : 'rgba(168,85,247,0.22)',
  };

  return (
    <GlassSurface tintOpacity={0.05} style={{ ...borderOverride, ...highlightRing }}>
      <View className="flex-row items-start gap-3 p-3">
        {/* icon plate */}
        <View className="h-10 w-10 items-center justify-center rounded-2xl bg-parchment/5">
          <IconSymbol name="doc.fill" size={20} color={tokens.ink600} />
        </View>

        <View className="flex-1">
          <View className="flex-row items-center gap-2">
            <Text className="font-sans-medium text-[14px] text-parchment" numberOfLines={1}>
              {name}
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
            {preparing ? t('upload.preparingPhoto') : uploading ? t('upload.uploading') : (problem?.message ?? review?.message ?? detail)}
          </Text>

          {/*
            One pill, and only one. While uploading it says so; a real failure says what to do
            next. "Pending" returns only when nothing is in flight and nothing went wrong.
          */}
          {uploading ? (
            <View className="mt-1.5 flex-row items-center gap-1.5 self-start rounded-full bg-violet-500/15 px-2.5 py-0.5">
              <ActivityIndicator size="small" color={tokens.violet400} />
              <Text className="font-sans-medium text-[11px] text-violet-400">{preparing ? t('upload.preparing') : t('upload.uploadingShort')}</Text>
            </View>
          ) : problem ? (
            <View className="mt-1.5 self-start rounded-full bg-signal-pending/15 px-2.5 py-0.5">
              <Text className="font-sans-medium text-[11px] text-signal-pending">
                {problem.kind === 'rejected' ? t('documents.notAccepted') : t('documents.didntSend')}
              </Text>
            </View>
          ) : awaitingReview ? (
            <View className="mt-1.5 self-start rounded-full bg-violet-500/15 px-2.5 py-0.5">
              <Text className="font-sans-medium text-[11px] text-violet-400">{t('status.beingReviewed')}</Text>
            </View>
          ) : (
            <View className="mt-1.5 self-start rounded-full bg-signal-pending/15 px-2.5 py-0.5">
              <Text className="font-sans-medium text-[11px] text-signal-pending">{t('status.pending')}</Text>
            </View>
          )}
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
              accessibilityLabel={t(problem.kind === 'rejected' ? 'a11y.chooseAnotherFile' : 'a11y.retryUpload', { values: { name } })}
              onPress={onUpload}
              className="rounded-full bg-violet-500 px-3.5 py-1.5 active:opacity-70">
              <Text className="font-sans-medium text-[12px] text-parchment">
                {problem.kind === 'rejected' ? t('upload.chooseAnother') : t('upload.retry')}
              </Text>
            </Pressable>
          ) : awaitingReview ? (
            <IconSymbol name="clock.fill" size={18} color={tokens.violet400} />
          ) : (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('a11y.uploadSlot', { values: { name } })}
              onPress={onUpload}
              className="rounded-full bg-violet-500 px-3.5 py-1.5 active:opacity-70">
              <Text className="font-sans-medium text-[12px] text-parchment">
                {t(slot.replaceRequested ? DOCUMENT_ACTION_KEYS.REPLACE : DOCUMENT_ACTION_KEYS.UPLOAD)}
              </Text>
            </Pressable>
          )}
        </View>
      </View>
    </GlassSurface>
  );
}
