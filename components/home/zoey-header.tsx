import { useRouter } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { RadialGlow } from '@/components/ui/radial-glow';
import { tokens } from '@/constants/tokens';

/**
 * Header icons are translucent violet-white rather than solid glyphs, sitting
 * on a soft glow so they read as part of the backdrop instead of stickers
 * placed on top of it.
 */
function GlowIconButton({
  name,
  label,
  glowId,
  onPress,
  children,
}: {
  name: Parameters<typeof IconSymbol>[0]['name'];
  label: string;
  glowId: string;
  onPress?: () => void;
  children?: React.ReactNode;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      className="items-center justify-center active:opacity-70"
      style={{ width: 34, height: 34 }}>
      <View pointerEvents="none" className="absolute items-center justify-center">
        <RadialGlow size={52} id={glowId} color={tokens.violet500} opacity={0.45} />
      </View>
      <IconSymbol name={name} size={22} color={tokens.iconTranslucent} />
      {children}
    </Pressable>
  );
}

export function ZoeyHeader() {
  const router = useRouter();

  return (
    <View className="flex-row items-center justify-between px-4 pb-3 pt-1">
      <Text className="font-display text-[22px] tracking-wide text-parchment">ZOEY</Text>

      <View className="flex-row items-center gap-3">
        <GlowIconButton
          name="bubble.left.fill"
          label="Chat with Zoey"
          glowId="hdrChat"
          onPress={() => router.push('/chat')}
        />

        <GlowIconButton name="bell.fill" label="Notifications" glowId="hdrBell">
          {/* unread dot, with its own magenta bloom */}
          <View pointerEvents="none" className="absolute right-1 top-1">
            <View className="absolute -left-2 -top-2">
              <RadialGlow size={20} id="hdrDot" color={tokens.magenta500} opacity={0.9} />
            </View>
            <View className="h-2 w-2 rounded-full bg-magenta-500" />
          </View>
        </GlowIconButton>
      </View>
    </View>
  );
}
