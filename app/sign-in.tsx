import { useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Pressable, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScreenBackground } from '@/components/ui/screen-background';
import { ZoeyAvatar } from '@/components/ui/zoey-avatar';
import { supabase } from '@/lib/supabase';

type Mode = 'sign-in' | 'create';
export default function SignInScreen() {
  const [mode, setMode] = useState<Mode>('sign-in'); const [email, setEmail] = useState(''); const [password, setPassword] = useState(''); const [busy, setBusy] = useState(false);
  const submit = async () => {
    const clean = email.trim().toLowerCase();
    if (!clean || password.length < 8) return void Alert.alert('Check your information', 'Enter a valid email and a password with at least 8 characters.');
    setBusy(true);
    try {
      if (mode === 'sign-in') { const { error } = await supabase.auth.signInWithPassword({ email: clean, password }); if (error) throw error; }
      else { const { data, error } = await supabase.auth.signUp({ email: clean, password, options: { emailRedirectTo: 'zoeyapp://sign-in' } }); if (error) throw error; if (!data.session) Alert.alert('Check your email', 'Open Zoey’s verification email before signing in.'); }
    } catch (error) { Alert.alert('Unable to continue', error instanceof Error ? error.message : 'Please try again.'); } finally { setBusy(false); }
  };
  const reset = async () => { const clean = email.trim().toLowerCase(); if (!clean) return void Alert.alert('Enter your email first'); setBusy(true); const { error } = await supabase.auth.resetPasswordForEmail(clean, { redirectTo: 'zoeyapp://reset-password' }); setBusy(false); Alert.alert(error ? 'Unable to send reset email' : 'Check your email', error?.message ?? 'We sent a secure password-reset link.'); };
  return <ScreenBackground idPrefix="auth"><SafeAreaView className="flex-1"><KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1 justify-center px-6"><View className="items-center"><ZoeyAvatar size={76} /><Text className="mt-5 font-display text-[30px] text-parchment">Welcome to Zoey</Text><Text className="mt-2 font-sans text-[14px] text-parchment/60">Your private credit workspace</Text></View><View className="mt-8 rounded-[28px] border border-white/10 bg-ink-900/80 p-5"><View className="mb-5 flex-row rounded-full bg-ink-800 p-1">{(['sign-in', 'create'] as Mode[]).map((item) => <Pressable key={item} onPress={() => setMode(item)} className={`flex-1 rounded-full py-2.5 ${mode === item ? 'bg-violet-600' : ''}`}><Text className="text-center font-sans text-[13px] text-parchment">{item === 'sign-in' ? 'Sign In' : 'Create Account'}</Text></Pressable>)}</View><TextInput autoCapitalize="none" autoComplete="email" keyboardType="email-address" placeholder="Email" placeholderTextColor="#777187" value={email} onChangeText={setEmail} className="mb-3 rounded-[18px] border border-white/10 bg-ink-800 px-4 py-4 font-sans text-parchment" /><TextInput autoCapitalize="none" autoComplete={mode === 'sign-in' ? 'current-password' : 'new-password'} secureTextEntry placeholder="Password" placeholderTextColor="#777187" value={password} onChangeText={setPassword} className="rounded-[18px] border border-white/10 bg-ink-800 px-4 py-4 font-sans text-parchment" /><Pressable disabled={busy} onPress={submit} className="mt-5 items-center rounded-full bg-violet-600 py-4">{busy ? <ActivityIndicator color="#fff" /> : <Text className="font-sans-semibold text-[15px] text-white">{mode === 'sign-in' ? 'Sign In Securely' : 'Create My Account'}</Text>}</Pressable>{mode === 'sign-in' ? <Pressable disabled={busy} onPress={reset} className="mt-4"><Text className="text-center font-sans text-[13px] text-violet-300">Forgot password?</Text></Pressable> : null}</View></KeyboardAvoidingView></SafeAreaView></ScreenBackground>;
}
