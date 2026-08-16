import { Ionicons } from '@expo/vector-icons';
import { useRef, useState } from 'react';
import { ActivityIndicator, FlatList, KeyboardAvoidingView, Platform, Pressable, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenBackground } from '@/components/ui/screen-background';
import { ZoeyAvatar } from '@/components/ui/zoey-avatar';
import { askZoey } from '@/lib/chat-api';

type Message = { id: string; from: 'zoey' | 'client'; text: string; note?: string };
const STARTERS = ['What is my dispute status?', 'Do you have all my documents?', 'Show my credit scores'];

export default function ChatScreen() {
  const listRef = useRef<FlatList<Message>>(null);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [messages, setMessages] = useState<Message[]>([{ id: 'welcome', from: 'zoey', text: "Hi, I'm Zoey. I answer from your verified Zoey records. If something is not connected or confirmed, I'll tell you instead of guessing." }]);

  const send = async (preset?: string) => {
    const text = (preset ?? draft).trim();
    if (!text || sending) return;
    setDraft(''); setSending(true);
    setMessages((current) => [...current, { id: `c-${Date.now()}`, from: 'client', text }]);
    try {
      const answer = await askZoey(text);
      setMessages((current) => [...current, { id: `z-${Date.now()}`, from: 'zoey', text: answer.message, note: answer.needsHuman ? 'Owner review available' : undefined }]);
    } catch (error) {
      setMessages((current) => [...current, { id: `e-${Date.now()}`, from: 'zoey', text: error instanceof Error ? error.message : 'I could not connect. Please try again.' }]);
    } finally {
      setSending(false);
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 50);
    }
  };

  return (
    <ScreenBackground idPrefix="chat">
      <SafeAreaView edges={['top', 'bottom']} className="flex-1">
        <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View className="flex-row items-center gap-3 border-b border-white/10 px-4 pb-4 pt-2">
            <ZoeyAvatar size={44} />
            <View><Text className="font-display text-[20px] text-parchment">Ask Zoey</Text><Text className="font-sans text-[12px] text-emerald-300">Answers from verified records</Text></View>
          </View>
          <FlatList
            ref={listRef} data={messages} keyExtractor={(item) => item.id}
            contentContainerStyle={{ padding: 16, gap: 14 }}
            onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
            ListFooterComponent={sending ? <ActivityIndicator color="#a78bfa" /> : null}
            renderItem={({ item }) => (
              <View className={`flex-row items-end gap-2 ${item.from === 'client' ? 'justify-end' : ''}`}>
                {item.from === 'zoey' ? <ZoeyAvatar size={32} /> : null}
                <View className={`max-w-[82%] rounded-[22px] px-4 py-3 ${item.from === 'client' ? 'rounded-br-md bg-violet-600' : 'rounded-bl-md border border-white/10 bg-ink-800'}`}>
                  <Text className="font-sans text-[14px] leading-[20px] text-parchment">{item.text}</Text>
                  {item.note ? <Text className="mt-2 font-sans text-[11px] text-amber-300">{item.note}</Text> : null}
                </View>
              </View>
            )}
          />
          {messages.length === 1 ? <View className="gap-2 px-4 pb-3">{STARTERS.map((starter) => <Pressable key={starter} onPress={() => send(starter)} className="rounded-full border border-violet-400/30 bg-violet-500/10 px-4 py-2.5"><Text className="text-center font-sans text-[13px] text-violet-200">{starter}</Text></Pressable>)}</View> : null}
          <View className="flex-row items-end gap-2 border-t border-white/10 bg-ink-950/80 px-4 py-3">
            <TextInput value={draft} onChangeText={setDraft} placeholder="Ask about your credit or case..." placeholderTextColor="#777187" multiline maxLength={1200} className="max-h-28 flex-1 rounded-[22px] border border-white/10 bg-ink-800 px-4 py-3 font-sans text-[14px] text-parchment" />
            <Pressable accessibilityRole="button" accessibilityLabel="Send message" disabled={!draft.trim() || sending} onPress={() => send()} className={`h-11 w-11 items-center justify-center rounded-full ${draft.trim() && !sending ? 'bg-violet-600' : 'bg-ink-700'}`}><Ionicons name="arrow-up" size={21} color="#fff" /></Pressable>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ScreenBackground>
  );
}
