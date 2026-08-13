import { Text, View } from 'react-native';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { tokens } from '@/constants/tokens';

/** FAB target. Presented modally from the root Stack, outside (tabs). */
export default function UploadScreen() {
  return (
    <View className="flex-1 items-center justify-center gap-2 bg-ink-950 px-4">
      <IconSymbol name="arrow.up.doc.fill" size={28} color={tokens.violet500} />
      <Text className="font-sans-semibold text-[15px] text-parchment">Upload Document</Text>
      <Text className="font-sans text-[14px] text-ink-600">Not built yet</Text>
    </View>
  );
}
