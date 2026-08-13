import { useRouter } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import Svg, { Defs, Ellipse, RadialGradient, Stop } from 'react-native-svg';

import { CARD_RADIUS, GlassSurface } from '@/components/ui/glass-surface';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { RadialGlow } from '@/components/ui/radial-glow';
import { tokens } from '@/constants/tokens';
import { uploadLimits } from '@/lib/documents-data';

export function UploadZone() {
  const router = useRouter();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Upload a document"
      onPress={() => router.push('/upload')}
      className="active:opacity-70">
      <View>
        {/* glow bleeding past the dashed frame */}
        <View pointerEvents="none" className="absolute -inset-5">
          <Svg width="100%" height="100%">
            <Defs>
              <RadialGradient id="glowUpload" cx="50%" cy="50%" r="50%">
                <Stop offset="0" stopColor={tokens.violet500} stopOpacity={0.26} />
                <Stop offset="0.6" stopColor={tokens.violet500} stopOpacity={0.08} />
                <Stop offset="1" stopColor={tokens.violet500} stopOpacity={0} />
              </RadialGradient>
            </Defs>
            <Ellipse cx="50%" cy="50%" rx="50%" ry="50%" fill="url(#glowUpload)" />
          </Svg>
        </View>

        {/* Frosted like the cards, but keeping the dashed drop-target frame.
            Dashed is a real RN borderStyle, so it needs no SVG. */}
        <GlassSurface
          radius={CARD_RADIUS}
          tintOpacity={0.08}
          style={{
            borderStyle: 'dashed',
            borderColor: 'rgba(168,85,247,0.6)',
            borderTopColor: 'rgba(168,85,247,0.6)',
          }}>
          <View className="items-center px-4 py-6">
            <View className="h-14 w-14 items-center justify-center">
              <View pointerEvents="none" className="absolute">
                <RadialGlow size={72} id="uploadIconGlow" color={tokens.violet500} opacity={0.5} />
              </View>
              <View className="h-14 w-14 items-center justify-center rounded-full bg-violet-500/15">
                <IconSymbol name="icloud.and.arrow.up" size={28} color={tokens.violet400} />
              </View>
            </View>

            <Text className="mt-3 font-display text-[15px] text-parchment">
              Upload Document
            </Text>
            <Text className="mt-1 font-sans text-[14px] text-ink-600">Tap to upload</Text>
            <Text className="mt-1.5 font-mono text-[11px] text-ink-600">
              {uploadLimits.formats} · {uploadLimits.maxSize}
            </Text>
          </View>
        </GlassSurface>
      </View>
    </Pressable>
  );
}
