import { useRouter } from 'expo-router';
import { useI18n } from '@/lib/i18n/context';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Defs, LinearGradient, Path, Stop } from 'react-native-svg';

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
 * The wordmark, with the lit diamond set into the O.
 *
 * ==============================  WHY THE O IS DRAWN, NOT TYPED  ==============================
 *
 * The approved mark puts a four-point star inside the O. Typing "ZOEY" and floating a diamond over
 * it means guessing where the O lands, and that guess breaks the moment the font, the size or the
 * tracking changes -- it is a hardcoded assumption about glyph advances.
 *
 * So the O is not a glyph at all. It is a ring drawn at the cap height, with its own star, sitting
 * in a flex row between "Z" and "EY". The ring's stroke is derived from the size so it matches the
 * weight of the Poppins letterforms either side of it, and the whole mark stays centred and
 * measurable at any scale.
 */
function ZoeyWordmark({ size = 28 }: { size?: number }) {
  const cap = size * 0.72;           // Poppins cap height
  const ring = cap * 1.02;           // the O sits fractionally proud of the caps, as it does in type
  const stroke = size * 0.145;       // matched to the vertical stem weight of Poppins Bold
  const track = size * 0.52;         // measured: the reference mark runs 126pt wide at a 20pt cap
  const letter = {
    color: tokens.wordmark,
    fontSize: size,
    lineHeight: size * 1.02,
    textShadowColor: 'rgba(168,85,247,0.55)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 14,
  } as const;

  return (
    <View
      accessibilityRole="header"
      accessibilityLabel="ZOEY"
      className="flex-row items-center"
      style={{ paddingRight: track }}>
      <Text className="font-display" style={[letter, { letterSpacing: track }]}>
        Z
      </Text>
      <View style={{ width: ring, height: ring, marginRight: track }} className="items-center justify-center">
        <Svg width={ring} height={ring}>
          <Defs>
            <LinearGradient id="wordmarkO" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor="#F6EEFF" />
              <Stop offset="1" stopColor="#DFC9FF" />
            </LinearGradient>
          </Defs>
          <Circle
            cx={ring / 2}
            cy={ring / 2}
            r={(ring - stroke) / 2}
            stroke="url(#wordmarkO)"
            strokeWidth={stroke}
            fill="none"
          />
          {/* The star: a four-point diamond with concave sides, drawn from the ring's own radius. */}
          <Path
            d={(() => {
              const c = ring / 2;
              const r = ring * 0.20;
              const w = r * 0.34;
              return `M ${c} ${c - r} Q ${c + w} ${c - w} ${c + r} ${c} Q ${c + w} ${c + w} ${c} ${c + r} Q ${c - w} ${c + w} ${c - r} ${c} Q ${c - w} ${c - w} ${c} ${c - r} Z`;
            })()}
            fill="#FBF7FF"
          />
        </Svg>
      </View>
      <Text className="font-display" style={[letter, { letterSpacing: track }]}>
        EY
      </Text>
    </View>
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
    <View className="flex-row items-center justify-between px-4 pb-2" style={{ paddingTop: top }}>
      <ZoeyWordmark size={28} />

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
