import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { tokens } from '@/constants/tokens';
import type { DocumentSlot } from '@/lib/documents-data';
import type { SlotUploadState } from '@/lib/documents-store';

/**
 * One required-document row in the FREE Credit Services intake.
 *
 * Deliberately plain: a name, a state and an action. It is NOT the premium
 * `DocumentRow` -- no glass card per row, no dashed drop targets, no processing
 * stages, no requirement badges. This should read like a service/settings
 * intake form, because that is what it is.
 *
 * The simplicity is presentation only. The slot `id` handed to `onUpload` is
 * the SAME id the premium Documents vault uses, so both surfaces write one
 * record through one API.
 */

/*
 * There is no local label map any more. It was keyed on this app's old slot ids -- 'photo-id',
 * 'ssn' -- which the engine has never used, so every lookup already fell through to the engine's
 * own label. Keeping a dead map that silently misses is worse than not having one.
 */

export function IntakeRow({
  slot,
  upload,
  onUpload,
  isLast,
}: {
  slot: DocumentSlot;
  /** What is happening to this row right now, so a tap is visibly acknowledged. */
  upload?: SlotUploadState;
  onUpload: () => void;
  isLast: boolean;
}) {
  const received = slot.state === 'uploaded';
  const uploading = upload?.kind === 'uploading';
  const problem = upload?.kind === 'rejected' || upload?.kind === 'failed' ? upload : null;

  return (
    <View
      className="flex-row items-center gap-3 px-3.5 py-3"
      style={
        isLast ? undefined : { borderBottomWidth: 1, borderBottomColor: 'rgba(168,85,247,0.14)' }
      }>
      <View className="flex-1">
        <View className="flex-row items-center gap-2">
          <Text className="font-sans-medium text-[14px] text-parchment">{slot.name}</Text>
          {/* The engine's own requirement flag. Optional rows never gate Run Zoey. */}
          {slot.optional ? (
            <Text className="font-sans text-[11px] text-parchment/45">Optional</Text>
          ) : null}
        </View>
        {uploading || problem ? (
          <Text className="mt-0.5 font-sans text-[11px] text-parchment/45" numberOfLines={2}>
            {uploading ? 'Uploading…' : problem?.message}
          </Text>
        ) : slot.requirement ? (
          <Text className="mt-0.5 font-sans text-[11px] text-parchment/45">{slot.requirement}</Text>
        ) : null}
      </View>

      {uploading ? (
        <View className="flex-row items-center gap-1.5">
          <ActivityIndicator size="small" color={tokens.violet400} />
          <Text className="font-sans-medium text-[12.5px] text-violet-400">Sending</Text>
        </View>
      ) : problem ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${problem.kind === 'rejected' ? 'Choose another file for' : 'Retry upload of'} ${slot.name}`}
          onPress={onUpload}
          className="rounded-full px-3.5 py-1.5 active:opacity-70"
          style={{ backgroundColor: tokens.violet500 }}>
          <Text className="font-sans-medium text-[12.5px] text-parchment">
            {problem.kind === 'rejected' ? 'Choose another' : 'Retry'}
          </Text>
        </Pressable>
      ) : received ? (
        <View className="flex-row items-center gap-1.5">
          <IconSymbol name="checkmark.circle.fill" size={15} color={tokens.signalReceived} />
          <Text className="font-sans-medium text-[12.5px]" style={{ color: tokens.signalReceived }}>
            Received
          </Text>
        </View>
      ) : (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Upload ${slot.name}`}
          onPress={onUpload}
          className="rounded-full px-3.5 py-1.5 active:opacity-70"
          style={{ backgroundColor: tokens.violet500 }}>
          <Text className="font-sans-medium text-[12.5px] text-parchment">Upload</Text>
        </Pressable>
      )}
    </View>
  );
}
