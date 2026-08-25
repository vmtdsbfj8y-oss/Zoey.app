import 'react-native-url-polyfill/auto';
import { tr } from './i18n/runtime';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

/**
 * Whether auth is configured at all. Exported so a screen can say so plainly.
 *
 * ==============================  WHY THIS IS NOT A THROW  ==============================
 *
 * This used to be `if (!url || !key) throw ...` at module scope, and that line is what took the
 * first TestFlight build down. The values come from `EXPO_PUBLIC_*`, which Expo Go reads from
 * `.env.local` on the dev server but an EAS build only gets if the profile supplies them -- and the
 * `testflight` profile supplied the two Zoey URLs and not these two. So the build shipped with them
 * undefined, this line threw during module evaluation, and the app died ~0.8s after launch.
 *
 * It did not die as a readable error. An unhandled JS exception that early goes through React
 * Native's native error path, which converts an NSException to a JS error on the TurboModule queue
 * rather than the JS thread (RCTTurboModule.mm) -- two threads then touch the same non-thread-safe
 * Hermes runtime and the process takes SIGSEGV. Every consumer saw an instant crash with no message.
 *
 * A missing environment variable must never be able to produce that again. The check stays, but it
 * fails at FIRST USE inside React, where an error is catchable and can be shown, instead of during
 * module evaluation where nothing can catch it.
 */
export const authConfigured = Boolean(url && key);

function unconfigured(): never {
  throw new Error(tr('lib.authNotConfigured'));
}

const storage = {
  async getItem(name: string) { return Platform.OS === 'web' ? globalThis.localStorage?.getItem(name) ?? null : SecureStore.getItemAsync(name); },
  async setItem(name: string, value: string) { if (Platform.OS === 'web') globalThis.localStorage?.setItem(name, value); else await SecureStore.setItemAsync(name, value, { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY }); },
  async removeItem(name: string) { if (Platform.OS === 'web') globalThis.localStorage?.removeItem(name); else await SecureStore.deleteItemAsync(name); },
};

/**
 * Created eagerly when configured, and otherwise replaced by a proxy that throws the same error the
 * moment anything actually touches it. Importing this module can no longer crash the app; using an
 * unconfigured client still fails loudly, which is the behaviour that was worth keeping.
 */
export const supabase: SupabaseClient = authConfigured
  ? createClient(url as string, key as string, {
      auth: { storage, autoRefreshToken: true, persistSession: true, detectSessionInUrl: false },
    })
  : (new Proxy({} as SupabaseClient, {
      get: unconfigured,
      apply: unconfigured,
    }) as SupabaseClient);
