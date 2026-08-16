import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import { GlassSurface } from '@/components/ui/glass-surface';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { tokens } from '@/constants/tokens';

/**
 * Shared loading / empty / error presentation.
 *
 * One implementation so no screen can quietly render nothing: every fetch in
 * the More section resolves to exactly one of these three or to real content.
 */

export function LoadingState({ label = 'Loading…' }: { label?: string }) {
  return (
    <GlassSurface radius={20}>
      <View className="items-center gap-3 px-4 py-10">
        <ActivityIndicator color={tokens.violet400} />
        <Text className="font-sans text-[13px] text-parchment/60">{label}</Text>
      </View>
    </GlassSurface>
  );
}

export function EmptyState({
  icon = 'sparkles',
  title,
  body,
  action,
}: {
  icon?: Parameters<typeof IconSymbol>[0]['name'];
  title: string;
  body?: string;
  action?: { label: string; onPress: () => void };
}) {
  return (
    <GlassSurface radius={20}>
      <View className="items-center gap-2 px-5 py-9">
        <View
          className="h-12 w-12 items-center justify-center rounded-full"
          style={{
            backgroundColor: 'rgba(168,85,247,0.16)',
            borderWidth: 1,
            borderColor: 'rgba(168,85,247,0.3)',
          }}>
          <IconSymbol name={icon} size={22} color={tokens.violet300} />
        </View>
        <Text className="mt-1 text-center font-display text-[15px] text-parchment">{title}</Text>
        {body ? (
          <Text className="text-center font-sans text-[12.5px] leading-[18px] text-parchment/55">
            {body}
          </Text>
        ) : null}
        {action ? (
          <Pressable
            accessibilityRole="button"
            onPress={action.onPress}
            className="mt-2 rounded-full px-4 py-2 active:opacity-80"
            style={{ backgroundColor: tokens.violet500 }}>
            <Text className="font-sans-semibold text-[12px] text-parchment">{action.label}</Text>
          </Pressable>
        ) : null}
      </View>
    </GlassSurface>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <GlassSurface radius={20}>
      <View className="items-center gap-2 px-5 py-8">
        <IconSymbol
          name="exclamationmark.triangle.fill"
          size={22}
          color={tokens.signalPending}
        />
        <Text className="mt-1 text-center font-sans-semibold text-[14px] text-parchment">
          Something went wrong
        </Text>
        <Text className="text-center font-sans text-[12.5px] leading-[18px] text-parchment/55">
          {message}
        </Text>
        <Pressable
          accessibilityRole="button"
          onPress={onRetry}
          className="mt-2 rounded-full px-4 py-2 active:opacity-80"
          style={{ backgroundColor: tokens.violet500 }}>
          <Text className="font-sans-semibold text-[12px] text-parchment">Try again</Text>
        </Pressable>
      </View>
    </GlassSurface>
  );
}

/** Section heading used inside the sub-screens. */
export function SectionLabel({ children }: { children: string }) {
  return (
    <Text className="mb-2 mt-1 font-sans-semibold text-[11px] uppercase tracking-wider text-parchment/45">
      {children}
    </Text>
  );
}

/** A note the client should read, styled as information rather than an error. */
export function InfoNote({ children }: { children: React.ReactNode }) {
  return (
    <View
      className="rounded-2xl px-3.5 py-3"
      style={{
        backgroundColor: 'rgba(168,85,247,0.10)',
        borderWidth: 1,
        borderColor: 'rgba(168,85,247,0.24)',
      }}>
      <Text className="font-sans text-[12px] leading-[17px] text-parchment/70">{children}</Text>
    </View>
  );
}
