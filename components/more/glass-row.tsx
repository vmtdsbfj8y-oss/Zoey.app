import { Pressable, Text, View } from 'react-native';

import { GlassSurface } from '@/components/ui/glass-surface';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { tokens } from '@/constants/tokens';

/**
 * The navigation row used across More and its sub-screens: glass panel, violet
 * icon plate, title, one line of description, optional status chip, chevron.
 *
 * Uses the same `GlassSurface` as the approved screens, so the sheen, border
 * and translucency stay identical -- no second glass treatment.
 */
export function GlassRow({
  icon,
  title,
  description,
  status,
  statusTone = 'neutral',
  onPress,
  disabled,
}: {
  icon: Parameters<typeof IconSymbol>[0]['name'];
  title: string;
  description?: string;
  /** Short real status, e.g. "Active". Omit rather than invent one. */
  status?: string | null;
  statusTone?: 'neutral' | 'good' | 'warn' | 'muted';
  onPress?: () => void;
  disabled?: boolean;
}) {
  const toneColor =
    statusTone === 'good'
      ? tokens.signalReceived
      : statusTone === 'warn'
        ? tokens.signalPending
        : statusTone === 'muted'
          ? 'rgba(244,239,255,0.5)'
          : tokens.violet300;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: !!disabled }}
      onPress={disabled ? undefined : onPress}
      className="active:opacity-80"
      style={disabled ? { opacity: 0.55 } : undefined}>
      <GlassSurface radius={20} glow>
        <View className="flex-row items-center gap-3 p-3.5">
          <View
            className="h-10 w-10 items-center justify-center rounded-2xl"
            style={{
              backgroundColor: 'rgba(150,110,230,0.12)',
              borderWidth: 1,
              borderColor: 'rgba(198,166,255,0.18)',
            }}>
            <IconSymbol name={icon} size={19} color={tokens.violet300} />
          </View>

          <View className="flex-1">
            <Text className="font-sans-semibold text-[15px] text-parchment" numberOfLines={1}>
              {title}
            </Text>
            {description ? (
              <Text className="mt-0.5 font-sans text-[12px] text-parchment/55" numberOfLines={2}>
                {description}
              </Text>
            ) : null}
          </View>

          {status ? (
            <View
              className="rounded-full px-2.5 py-1"
              style={{
                backgroundColor: 'rgba(150,110,230,0.1)',
                borderWidth: 1,
                borderColor: 'rgba(198,166,255,0.18)',
              }}>
              <Text
                className="font-sans-semibold text-[10px]"
                style={{ color: toneColor }}
                numberOfLines={1}>
                {status}
              </Text>
            </View>
          ) : null}

          <IconSymbol name="chevron.right" size={16} color="rgba(244,239,255,0.4)" />
        </View>
      </GlassSurface>
    </Pressable>
  );
}
