import 'react-native-url-polyfill/auto';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { createClient } from '@supabase/supabase-js';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
if (!url || !key) throw new Error('Zoey authentication is not configured.');

const storage = {
  async getItem(name: string) { return Platform.OS === 'web' ? globalThis.localStorage?.getItem(name) ?? null : SecureStore.getItemAsync(name); },
  async setItem(name: string, value: string) { if (Platform.OS === 'web') globalThis.localStorage?.setItem(name, value); else await SecureStore.setItemAsync(name, value, { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY }); },
  async removeItem(name: string) { if (Platform.OS === 'web') globalThis.localStorage?.removeItem(name); else await SecureStore.deleteItemAsync(name); },
};

export const supabase = createClient(url, key, { auth: { storage, autoRefreshToken: true, persistSession: true, detectSessionInUrl: false } });
