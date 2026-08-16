import { useRouter } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { tokens } from '@/constants/tokens';

/**
 * Header glyphs are stroked outlines sitting directly on the backdrop -- no
 * halo behind them. The glow plates made them read as buttons pasted over the
 * page; in the reference they are quiet line icons.
 */
function HeaderIconButton({
  name,
  label,
  onPress,
  children,
}: {
  name: Parameters<typeof IconSymbol>[0]['name'];
  label: string;
  onPress?: () => void;
  children?: React.ReactNode;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      className="items-center justify-center active:opacity-60"
      style={{ width: 34, height: 34 }}>
      <IconSymbol name={name} size={24} color={tokens.parchment} />
      {children}
    </Pressable>
  );
}

export function ZoeyHeader() {
  const router = useRouter();

  return (
    <View className="flex-row items-center justify-between px-4 pb-4 pt-1">
      {/*
        Lavender-white with a soft violet bloom behind the letterforms. RN has
        no gradient text without a mask layer, and a text shadow gets the same
        read for the size this is drawn at.
      */}
      <Text
        className="font-display text-[24px] text-parchment"
        style={{
          color: tokens.wordmark,
          letterSpacing: 1.5,
          textShadowColor: 'rgba(168,85,247,0.55)',
          textShadowOffset: { width: 0, height: 0 },
          textShadowRadius: 12,
        }}>
        ZOEY
      </Text>

      <View className="flex-row items-center gap-4">
        <HeaderIconButton
          name="ellipsis.bubble"
          label="Chat with Zoey"
          onPress={() => router.push('/chat')}
        />

        <HeaderIconButton name="bell" label="Notifications">
          {/* unread dot -- amber, the pending signal colour */}
          <View
            pointerEvents="none"
            className="absolute h-[7px] w-[7px] rounded-full"
            style={{ top: 4, right: 4, backgroundColor: tokens.signalPending }}
          />
        </HeaderIconButton>
      </View>
    </View>
  );
}
