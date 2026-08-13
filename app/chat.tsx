import { ScrollView, Text, View } from 'react-native';

import { ZoeyAvatar } from '@/components/ui/zoey-avatar';
import { chatMessages } from '@/lib/placeholder-data';

/**
 * Minimal chat surface -- built so the avatar has its real home (Zoey's
 * messages) rather than sitting unused. Reachable from the header's chat icon.
 * The full chat screen from the reference is not built yet.
 */
export default function ChatScreen() {
  return (
    <View className="flex-1 bg-ink-950">
      <ScrollView showsVerticalScrollIndicator={false}>
        <View className="gap-4 px-4 py-4">
          {chatMessages.map((m) => (
            <View key={m.id} className="flex-row items-end gap-2">
              <ZoeyAvatar size={36} />
              <View className="flex-1 rounded-card rounded-bl-none border border-ink-700 bg-ink-800 p-3">
                <Text className="font-sans text-[14px] leading-[20px] text-parchment">{m.text}</Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}
