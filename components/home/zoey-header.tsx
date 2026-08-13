import { useRouter } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { tokens } from '@/constants/tokens';

export function ZoeyHeader() {
  const router = useRouter();

  return (
    <View className="flex-row items-center justify-between px-4 pb-3 pt-1">
      <Text className="font-display text-[22px] tracking-wide text-parchment">ZOEY</Text>

      <View className="flex-row items-center gap-4">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Chat with Zoey"
          onPress={() => router.push('/chat')}
          className="active:opacity-70">
          <IconSymbol name="bubble.left.fill" size={22} color={tokens.violet400} />
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Notifications"
          className="active:opacity-70">
          <View>
            <IconSymbol name="bell.fill" size={22} color={tokens.violet400} />
            {/* unread dot */}
            <View className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-magenta-500" />
          </View>
        </Pressable>
      </View>
    </View>
  );
}
