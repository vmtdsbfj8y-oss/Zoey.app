import { Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { tokens } from '@/constants/tokens';

/** Placeholder for the screens not built yet -- Dashboard is the only real one. */
export function ScreenStub({ title }: { title: string }) {
  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-ink-950">
      <View className="flex-1 items-center justify-center gap-2 px-4">
        <IconSymbol name="sparkles" size={28} color={tokens.ink600} />
        <Text className="font-display text-[15px] text-parchment">{title}</Text>
        <Text className="font-sans text-[14px] text-ink-600">Not built yet</Text>
      </View>
    </SafeAreaView>
  );
}
