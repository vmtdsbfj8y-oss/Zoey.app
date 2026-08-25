import { Image } from 'expo-image';
import { View } from 'react-native';

import { tokens } from '@/constants/tokens';

/**
 * Zoey's character avatar, circle-masked with a lit violet ring.
 *
 * The source art IS genuinely transparent -- roughly 46% of its pixels have zero alpha, and all four corners
 * are clear -- so the circle mask is not hiding a square plate. It is a crop: the portrait is framed
 * shoulders-up in a square, and a circle is what turns that into an avatar rather than a picture.
 * The `bg-ink-800` fill is what her transparent margins sit on inside the ring.
 *
 * The ring is deliberately brighter than a hairline. This control is her, and at header size a 1px
 * 50%-opacity edge read as a smudge rather than as a deliberate frame.
 */
export function ZoeyAvatar({ size = 36 }: { size?: number }) {
  const halo = size + Math.round(size * 0.28);
  return (
    <View style={{ width: size, height: size }} className="items-center justify-center">
      {/* glow halo */}
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          width: halo,
          height: halo,
          borderRadius: halo / 2,
          backgroundColor: tokens.violet500,
          opacity: 0.34,
        }}
      />
      <View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: 1.5,
          borderColor: 'rgba(201,155,255,0.85)',
        }}
        className="overflow-hidden bg-ink-800">
        <Image
          source={require('@/assets/images/zoey-avatar.png')}
          style={{ width: '100%', height: '100%' }}
          contentFit="cover"
        />
      </View>
    </View>
  );
}
