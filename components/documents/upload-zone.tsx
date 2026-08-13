import { useRouter } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { IconSymbol } from '@/components/ui/icon-symbol';
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
      {/* Dashed border is a real RN borderStyle, so it works without an SVG. */}
      <View className="items-center rounded-card border border-dashed border-violet-500/60 bg-ink-900 px-4 py-6">
        <View className="h-14 w-14 items-center justify-center rounded-full bg-violet-500/15">
          <IconSymbol name="icloud.and.arrow.up" size={28} color={tokens.violet400} />
        </View>

        <Text className="mt-3 font-sans-semibold text-[15px] text-parchment">Upload Document</Text>
        <Text className="mt-1 font-sans text-[14px] text-ink-600">Tap to upload</Text>
        <Text className="mt-1.5 font-mono text-[11px] text-ink-600">
          {uploadLimits.formats} · {uploadLimits.maxSize}
        </Text>
      </View>
    </Pressable>
  );
}
