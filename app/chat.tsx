import { useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Keyboard,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ChatOpeningState, ZoeyMessage, ZoeyThinking, UserMessage } from '@/components/chat/chat-parts';
import { PremiumLockCard } from '@/components/premium/premium-lock';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { ScreenBackground } from '@/components/ui/screen-background';
import { ZoeyAvatar } from '@/components/ui/zoey-avatar';
import { tokens } from '@/constants/tokens';
import { askZoey, getChatOpening, type ChatAction, type ChatTurn } from '@/lib/chat-api';
import { useI18n } from '@/lib/i18n/context';
import { useMembership } from '@/lib/membership-context';

/**
 * Zoey chat.
 *
 * ==============================  CONVERSATION STATE  ==============================
 *
 * Held in memory for the life of the screen and sent with each turn, so "what about Experian?"
 * resolves against what was just discussed. It is deliberately NOT persisted yet: durable chat
 * history is a store of a consumer's credit conversation, and where it lives, how long it lives
 * and who can read it are decisions that deserve their own milestone rather than a side effect of
 * this one. Leaving the screen clears it, which is honest about what this build does.
 *
 * Nothing about identity is sent. The engine decides whose file is discussed from the verified
 * session, so the body carries only the question and the turns.
 */

const ROUTES: Record<ChatAction['target'], string> = {
  scores: '/(tabs)/credit-score',
  disputes: '/(tabs)/disputes',
  documents: '/(tabs)/documents',
  dashboard: '/(tabs)',
  run: '/(tabs)/documents',
};

type Message =
  | { id: string; kind: 'user'; text: string }
  | { id: string; kind: 'zoey'; text: string; actions?: ChatAction[] };

export default function ChatScreen() {
  const router = useRouter();
  const { t, locale } = useI18n();
  const { isPremium, loading: membershipLoading } = useMembership();
  const scrollRef = useRef<ScrollView>(null);

  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [firstName, setFirstName] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);

  useEffect(() => {
    if (!isPremium) return;
    let cancelled = false;
    getChatOpening().then((opening) => {
      if (cancelled || !opening) return;
      setFirstName(opening.firstName);
      setSuggestions(opening.suggestions);
    });
    return () => {
      cancelled = true;
    };
  }, [isPremium]);

  const send = useCallback(
    async (preset?: string) => {
      const text = (preset ?? draft).trim();
      if (!text || sending) return;

      setDraft('');
      setSending(true);
      const outgoing: Message = { id: `u-${Date.now()}`, kind: 'user', text };
      setMessages((current) => [...current, outgoing]);

      /*
       * History is built from what is already on screen, so the model sees the same conversation
       * the person does. Trimmed server-side as well -- the client is not trusted to bound it.
       */
      const history: ChatTurn[] = messages.map((message) => ({
        role: message.kind === 'user' ? 'user' : 'assistant',
        content: message.text,
      }));

      try {
        const answer = await askZoey(text, history, locale);
        setMessages((current) => [
          ...current,
          { id: `z-${Date.now()}`, kind: 'zoey', text: answer.message, actions: answer.actions },
        ]);
      } catch (error) {
        // The engine's own sentence, which is written for a consumer to read.
        setMessages((current) => [
          ...current,
          {
            id: `e-${Date.now()}`,
            kind: 'zoey',
            text: error instanceof Error ? error.message : "I'm having trouble answering right now.",
          },
        ]);
      } finally {
        setSending(false);
        setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 60);
      }
    },
    /*
     * `locale` belongs here. Without it the callback closes over the language that was active when
     * the screen mounted, so switching to Spanish mid-conversation would keep sending `en` and Zoey
     * would keep answering in English -- the exact bug this feature exists to prevent.
     */
    [draft, sending, messages, locale]
  );

  if (!membershipLoading && !isPremium) {
    return (
      <ScreenBackground idPrefix="chat">
        <SafeAreaView edges={['top', 'bottom']} className="flex-1">
          <View className="flex-1 justify-center px-4">
            <PremiumLockCard
              icon="sparkles"
              title={t('chat.lockedTitle')}
              blurb={t('chat.lockedBlurb')}
              bullets={[
                t('chat.lockedBullet1'),
                t('chat.lockedBullet2'),
                t('chat.lockedBullet3'),
              ]}
            />
          </View>
        </SafeAreaView>
      </ScreenBackground>
    );
  }

  /*
   * The keyboard's own reported height, not a measured guess.
   *
   * A `measureInWindow`-against-`keyboardWillChangeFrame` version of this was tried first and it
   * broke the screen outright: `keyboardWillChangeFrame` also fires while a MODAL is still
   * presenting (this screen's own `presentation: 'modal'`), before the sheet's layout has
   * settled, so the measured window position was garbage and produced a huge one-time padding
   * that never cleared -- the composer rendered off the bottom of the screen on every open, with
   * no keyboard involved at all.
   *
   * `keyboardWillShow`/`keyboardWillHide` only fire for an actual keyboard tied to a focused
   * responder, and their `endCoordinates.height` IS the overlap: the composer's own trailing
   * safe-area spacer is skipped while the keyboard is up, so there is nothing left to reconcile.
   */
  const [keyboardPad, setKeyboardPad] = useState(0);
  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const subs = [
      Keyboard.addListener(showEvent, (e) => setKeyboardPad(e.endCoordinates.height)),
      Keyboard.addListener(hideEvent, () => setKeyboardPad(0)),
    ];
    return () => subs.forEach((sub) => sub.remove());
  }, []);

  const empty = messages.length === 0;

  return (
    <ScreenBackground idPrefix="chat">
      <SafeAreaView edges={['top']} className="flex-1">
        {/* Header: compact, no invented status. */}
        <View className="flex-row items-center gap-3 px-5 pb-3 pt-1">
          <ZoeyAvatar size={40} />
          <View className="flex-1">
            <Text className="font-display text-[20px] leading-[24px] text-parchment">Zoey</Text>
            <Text className="font-sans text-[13px] text-parchment/45">{t('chat.subtitle')}</Text>
          </View>
        </View>

        {/*
          One line, at the top of the screen where the AI actually speaks.

          The full AI Disclosure lives in Legal & Privacy and this does not try to reproduce it --
          the rule is short contextual language where it is relevant, not the whole disclaimer
          pasted onto every screen. What it must do is be present before the first answer, because
          this is the surface where a consumer is most likely to mistake a generated explanation for
          an authoritative one.
        */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('chat.a11yDisclosure')}
          accessibilityHint={t('chat.a11yDisclosureHint')}
          onPress={() => router.push('/legal/ai-disclosure')}
          className="mx-5 mb-3 flex-row items-center gap-2 rounded-2xl px-3 py-2 active:opacity-70"
          style={{ backgroundColor: 'rgba(244,239,255,0.05)' }}>
          <IconSymbol name="info.circle" size={13} color="rgba(244,239,255,0.45)" />
          <Text className="flex-1 font-sans text-[11px] leading-[15px] text-parchment/50">
            {t('chat.disclosure')}
          </Text>
          <Text className="font-sans text-[11px] text-violet-300">{t('chat.disclosureLink')}</Text>
        </Pressable>

        {/*
          `KeyboardAvoidingView`'s padding math was wrong inside this screen's own modal sheet by
          the sheet's own offset -- the composer used to sink half-behind the keyboard. The pad
          below comes straight from the keyboard's own reported height instead, which does not
          have that offset to get wrong. See the note by `keyboardPad` above.
        */}
        <View className="flex-1" style={{ paddingBottom: keyboardPad }}>
          <ScrollView
            ref={scrollRef}
            showsVerticalScrollIndicator={false}
            keyboardDismissMode="interactive"
            contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 16 }}
            onContentSizeChange={() => {
              if (!empty) scrollRef.current?.scrollToEnd({ animated: true });
            }}>
            {empty ? (
              <ChatOpeningState firstName={firstName} suggestions={suggestions} onPick={send} />
            ) : (
              <View className="pt-2">
                {messages.map((message) =>
                  message.kind === 'user' ? (
                    <UserMessage key={message.id} text={message.text} />
                  ) : (
                    <ZoeyMessage
                      key={message.id}
                      text={message.text}
                      actions={message.actions}
                      onAction={(action) => router.push(ROUTES[action.target] as never)}
                    />
                  )
                )}
                {sending ? <ZoeyThinking /> : null}
              </View>
            )}
          </ScrollView>

          {/* Composer. Sits above the keyboard, and above the tab bar via its own bottom inset. */}
          <View className="px-4 pb-2 pt-1">
            <View
              className="flex-row items-end gap-2 px-2 py-2"
              style={{
                backgroundColor: 'rgba(255,255,255,0.055)',
                borderRadius: 26,
                borderWidth: 1,
                borderColor: 'rgba(201,155,255,0.18)',
              }}>
              <TextInput
                value={draft}
                onChangeText={setDraft}
                placeholder={t('chat.placeholder')}
                placeholderTextColor="rgba(244,239,255,0.35)"
                multiline
                maxLength={1200}
                className="max-h-[110px] flex-1 px-3 py-2.5 font-sans text-[16px] leading-[22px] text-parchment"
                style={{ textAlignVertical: 'center' }}
              />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('chat.a11ySend')}
                disabled={!draft.trim() || sending}
                onPress={() => send()}
                className="h-10 w-10 items-center justify-center rounded-full active:opacity-85"
                style={{ backgroundColor: draft.trim() && !sending ? tokens.violet500 : 'rgba(255,255,255,0.08)' }}>
                <IconSymbol
                  name="paperplane.fill"
                  size={16}
                  color={draft.trim() && !sending ? tokens.parchment : 'rgba(244,239,255,0.3)'}
                />
              </Pressable>
            </View>
          </View>
          {/* Clears the home indicator without the composer floating away from the keyboard. */}
          {keyboardPad === 0 ? <SafeAreaView edges={['bottom']} /> : null}
        </View>
      </SafeAreaView>
    </ScreenBackground>
  );
}
