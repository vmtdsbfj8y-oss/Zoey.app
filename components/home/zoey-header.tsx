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
      /* 44 is the floor Apple sets for a hit target. The glyph stays 24; the box around it grows. */
      style={{ width: 44, height: 44 }}>
      <IconSymbol name={name} size={24} color={tokens.parchment} />
      {children}
    </Pressable>
  );
}

/**
 * Zoey Chat, top right -- and unmistakably HERS.
 *
 * A bare speech bubble is the generic "support chat" glyph every app ships, so nothing about it said
 * the person on the other end is Zoey. Her face does that in a way no icon can, and it distinguishes
 * this from Run Zoey in the bar below: the two are different actions and now they look it.
 *
 * ==============================  THE BUBBLE BADGE IS GONE  ==============================
 *
 * It rode the avatar as a 16pt chip to say "this opens a conversation". At 28pt that was a
 * reasonable trade; at 40pt the face is large enough to be recognisably a person rather than an
 * ornament, and the badge had become a second object competing with her inside one control.
 *
 * The affordance did not go with it: `accessibilityLabel` still names the action for a screen
 * reader, and the destination is unchanged. What a sighted user loses is a hint that the portrait is
 * tappable -- worth flagging, and the reason the ring is bright rather than subtle.
 */
function ZoeyChatButton({ onPress }: { onPress: () => void }) {
  const { t } = useI18n();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('home.a11yChat')}
      onPress={onPress}
      className="items-center justify-center active:opacity-70"
      style={{ width: 46, height: 46 }}>
      <ZoeyAvatar size={40} />
    </Pressable>
  );
}

export function ZoeyHeader() {
  const { t } = useI18n();
  const router = useRouter();

  return (
    <View className="flex-row items-center justify-between px-4 pb-3 pt-0">
      {/*
        Lavender-white with a soft violet bloom behind the letterforms. RN has
        no gradient text without a mask layer, and a text shadow gets the same
        read for the size this is drawn at.
      */}
      <Text
        className="font-display text-[27px] text-parchment"
        style={{
          color: tokens.wordmark,
          /* Wide tracking is most of what makes a four-letter word read as a wordmark. */
          letterSpacing: 5,
          textShadowColor: 'rgba(168,85,247,0.55)',
          textShadowOffset: { width: 0, height: 0 },
          textShadowRadius: 14,
        }}>
        ZOEY
      </Text>

      <View className="flex-row items-center gap-1">
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
