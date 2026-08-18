import { Pressable, Text, View } from 'react-native';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { tokens } from '@/constants/tokens';
import type { DocumentSlot } from '@/lib/documents-data';

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

/**
 * Plain-language labels for the intake form.
 *
 * Maps by slot id, so the underlying document ids are untouched -- only the
 * wording differs between the service form and the premium vault.
 */
const INTAKE_LABEL: Record<string, string> = {
  'photo-id': 'Government ID',
  ssn: 'Social Security Verification',
  'proof-address': 'Proof of Address',
  'credit-report': 'Credit Report',
};

export function IntakeRow({
  slot,
  onUpload,
  isLast,
}: {
  slot: DocumentSlot;
  onUpload: () => void;
  isLast: boolean;
}) {
  const received = slot.state === 'uploaded';

  return (
    <View
      className="flex-row items-center gap-3 px-3.5 py-3"
      style={
        isLast ? undefined : { borderBottomWidth: 1, borderBottomColor: 'rgba(168,85,247,0.14)' }
      }>
      <View className="flex-1">
        <Text className="font-sans-medium text-[14px] text-parchment">
          {INTAKE_LABEL[slot.id] ?? slot.name}
        </Text>
        {slot.requirement ? (
          <Text className="mt-0.5 font-sans text-[11px] text-parchment/45">{slot.requirement}</Text>
        ) : null}
      </View>

      {received ? (
        <View className="flex-row items-center gap-1.5">
          <IconSymbol name="checkmark.circle.fill" size={15} color={tokens.signalReceived} />
          <Text className="font-sans-medium text-[12.5px]" style={{ color: tokens.signalReceived }}>
            Received
          </Text>
        </View>
      ) : (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Upload ${INTAKE_LABEL[slot.id] ?? slot.name}`}
          onPress={onUpload}
          className="rounded-full px-3.5 py-1.5 active:opacity-70"
          style={{ backgroundColor: tokens.violet500 }}>
          <Text className="font-sans-medium text-[12.5px] text-parchment">Upload</Text>
        </Pressable>
      )}
    </View>
  );
}
