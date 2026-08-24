import { useEffect, useState } from 'react';
import { useI18n } from '@/lib/i18n/context';
import * as Linking from 'expo-linking';
import { Alert, Pressable, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScreenBackground } from '@/components/ui/screen-background';
import { supabase } from '@/lib/supabase';

export default function ResetPasswordScreen() {
  const { t } = useI18n();
  const url = Linking.useURL(); const [password, setPassword] = useState(''); const [ready, setReady] = useState(false);
  useEffect(() => { if (!url) return; const code = Linking.parse(url).queryParams?.code; if (typeof code === 'string') supabase.auth.exchangeCodeForSession(code).then(({ error }) => setReady(!error)); else setReady(true); }, [url]);
  const update = async () => { if (password.length < 8) return void Alert.alert(t('auth.passwordTooShort')); const { error } = await supabase.auth.updateUser({ password }); Alert.alert(error ? t('auth.passwordNotChanged') : t('auth.passwordChanged'), error?.message ?? t('auth.returnToZoey')); };
  return <ScreenBackground idPrefix="reset"><SafeAreaView className="flex-1 justify-center px-6"><View className="rounded-[28px] border border-white/10 bg-ink-900/80 p-5"><Text className="font-display text-[24px] text-parchment">{t('auth.newPasswordTitle')}</Text><TextInput editable={ready} secureTextEntry value={password} onChangeText={setPassword} placeholder={ready ? t('auth.newPasswordPlaceholder') : t('auth.openingResetLink')} placeholderTextColor="#777187" className="mt-5 rounded-[18px] border border-white/10 bg-ink-800 px-4 py-4 text-parchment" /><Pressable disabled={!ready} onPress={update} className="mt-5 items-center rounded-full bg-violet-600 py-4"><Text className="text-white">{t('auth.updatePassword')}</Text></Pressable></View></SafeAreaView></ScreenBackground>;
}
