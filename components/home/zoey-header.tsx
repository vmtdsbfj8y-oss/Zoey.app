import { useRouter } from 'expo-router';
import { useI18n } from '@/lib/i18n/context';
import { Pressable, Text, View } from 'react-native';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { ZoeyAvatar } from '@/components/ui/zoey-avatar';
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

/**
 * Zoey Chat, top right -- and unmistakably HERS.
 *
 * A bare speech bubble is the generic "support chat" glyph every app ships, so
 * nothing about it said the person on the other end is Zoey. Her face does that
 * in a way no icon can, and it distinguishes this from Run Zoey in the bar
 * below: the two are different actions and now they look it.
 *
 * The avatar leads and the bubble rides it as a small badge, rather than the
 * other way round -- at this size a face is legible and a 12px bubble is not,
 * so the face has to carry the recognition. Kept to a 34pt pill so it stays the
 * quiet header control it was and does not start competing with Run Zoey.
 */
function ZoeyChatButton({ onPress }: { onPress: () => void }) {
  const { t } = useI18n();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('home.a11yChat')}
      onPress={onPress}
      className="items-center justify-center active:opacity-70"
      style={{ width: 38, height: 34 }}>
      <View style={{ width: 30, height: 30 }} className="items-center justify-center">
        <ZoeyAvatar size={28} />
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            right: -3,
            bottom: -2,
            width: 16,
            height: 16,
            borderRadius: 8,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#1A0E33',
            borderWidth: 1,
            borderColor: 'rgba(168,85,247,0.55)',
          }}>
          <IconSymbol name="bubble.left.fill" size={8} color={tokens.violet300} />
        </View>
      </View>
    </Pressable>
  );
}

export function ZoeyHeader() {
  const { t } = useI18n();
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
        <ZoeyChatButton onPress={() => router.push('/chat')} />

        {/*
          The dot is gone, and so is the pretence.

          This bell had a permanent amber unread dot and no `onPress`. It was decoration that
          rendered the universal symbol for "you have something waiting" on every screen, forever,
          over a button that could not open anything -- and Zoey has no notification delivery at all,
          so there was never anything behind it to read.

          It now opens notification settings, which is the one honest thing a bell can do in an app
          that does not yet send notifications: take you to where you say what you would like to be
          told about.
        */}
        <HeaderIconButton
          name="bell"
          label={t('notifications.a11ySettings')}
          onPress={() => router.push('/settings')}
        />
      </View>
    </View>
  );
}
