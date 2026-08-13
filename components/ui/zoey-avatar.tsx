import { Image } from 'expo-image';
import { View } from 'react-native';

import { tokens } from '@/constants/tokens';

/**
 * Zoey's character avatar, circle-masked with a violet glow ring.
 *
 * The source art has a dark purple *background* rather than real
 * transparency, so it is clipped to a circle (`overflow-hidden` + full border
 * radius) instead of being composited onto the card -- otherwise you'd see a
 * square plate of near-black sitting on the surface.
 *
 * The glow is a soft violet halo behind the image, sized off `size` so it
 * scales with the avatar.
 */
export function ZoeyAvatar({ size = 36 }: { size?: number }) {
  return (
    <View style={{ width: size, height: size }} className="items-center justify-center">
      {/* glow halo */}
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          width: size + 10,
          height: size + 10,
          borderRadius: (size + 10) / 2,
          backgroundColor: tokens.violet500,
          opacity: 0.35,
        }}
      />
      <View
        style={{ width: size, height: size, borderRadius: size / 2 }}
        className="overflow-hidden border border-violet-500 bg-ink-800">
        <Image
          source={require('@/assets/images/zoey-avatar.png')}
          style={{ width: '100%', height: '100%' }}
          contentFit="cover"
        />
      </View>
    </View>
  );
}
