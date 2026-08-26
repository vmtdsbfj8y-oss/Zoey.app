import { useRouter } from 'expo-router';
import { useI18n } from '@/lib/i18n/context';
import { Image } from 'expo-image';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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
      style={{ width: 44, height: 44 }}>
      <ZoeyAvatar size={42} />
    </Pressable>
  );
}


/**
 * The wordmark: one image, not four text nodes.
 *
 * ==============================  WHY IT IS AN ASSET  ==============================
 *
 * The previous attempt drew it as `<Text>Z</Text>` + an SVG ring + `<Text>EY</Text>` in a flex row.
 * That cannot hold together: `letterSpacing` adds a trailing step after every Text run and the ring
 * carried its own margin, so the gaps were uneven; and the ring's stroke came from a multiplier
 * rather than from Poppins, so its weight never matched the letters beside it. On screen it read as
 * "Z <> E Y" -- four objects, not a word.
 *
 * So the whole mark is rendered once, from the project's real Poppins Bold, as a single text run.
 * The letters keep the font's own advances, the O is a genuine Poppins O, and the star is placed in
 * its counter from the glyph's measured ink box. `tools/wordmark/` holds the generator; the asset is
 * reproducible from it.
 *
 * ==============================  THE NUMBERS ARE MEASURED, NOT GUESSED  ==============================
 *
 * The PNG is 427x164 with the ink occupying x 31..378. Sizing by the FILE would make the mark too
 * small, because roughly a fifth of the file is transparent bleed that the bloom needs. So the
 * INK is scaled to the reference's measured width and the negative margin cancels the bleed, which
 * puts the first pixel of the Z exactly on the container's left edge.
 */
const WORDMARK = { file: { w: 439, h: 132 }, ink: { left: 26, width: 387 } };
/**
 * The approved reference's wordmark, measured off it at an 853px viewport: 203x42px ink, which is
 * 95.7pt wide at 402pt. Its left edge sits at 29.7pt -- further in than the hero card's own gutter.
 */
const WORDMARK_INK_PT = 95.7;
const WORDMARK_LEFT_PT = 29.7;
/** The header's own horizontal padding, which the offset below has to cancel. */
const HEADER_PAD_PT = 14;

function ZoeyWordmark() {
  const scale = WORDMARK_INK_PT / WORDMARK.ink.width;
  return (
    <Image
      accessibilityRole="header"
      accessibilityLabel="ZOEY"
      source={require('@/assets/images/zoey-wordmark.png')}
      style={{
        width: WORDMARK.file.w * scale,
        height: WORDMARK.file.h * scale,
        /*
         * Sizing by the FILE would render the mark too small: about a fifth of it is transparent
         * bleed the bloom needs. The INK is scaled to the reference instead, and this cancels both
         * that bleed and the header's padding so the first pixel of the Z lands on the reference's
         * own left edge.
         */
        marginLeft: WORDMARK_LEFT_PT - HEADER_PAD_PT - WORDMARK.ink.left * scale,
      }}
      contentFit="contain"
    />
  );
}

export function ZoeyHeader() {
  const { t } = useI18n();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  /*
   * The reference sets the mark at 38pt from the screen top, which is inside the status bar -- and
   * horizontally on top of the clock. So this takes back everything that is takeable and no more:
   * the header starts 10pt above the safe-area line, which still clears the status bar glyphs.
   * The remainder is a hard device constraint, not a styling choice, and it is reported as such.
   */
  const top = Math.max(insets.top - 10, 8);

  return (
    <View className="flex-row items-center justify-between px-[14px] pb-2" style={{ paddingTop: top }}>
      <ZoeyWordmark />

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
