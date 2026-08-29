import { LinearGradient } from 'expo-linear-gradient';
import { View } from 'react-native';

import { AmbientBackground } from '@/components/ui/ambient-background';
import { tokens } from '@/constants/tokens';

/**
 * The page backdrop: near-black at the top and bottom with a faint purple lift
 * through the middle band where the cards sit, plus the ambient orbs. Content
 * renders above both.
 *
 * The lift is deliberately mid-page rather than top-weighted. The status bar
 * and the tab bar both need to fall away to black, or the whole screen reads
 * as flat purple and the glass surfaces have nothing to separate from.
 */
export function ScreenBackground({
  idPrefix,
  floor = false,
  children,
}: {
  /** Unique per screen -- see AmbientBackground. */
  idPrefix: string;
  /**
   * Dissolve scrolling content into the backdrop before it reaches the floating tab bar's band.
   * The bar is a pill, so without this, rows passed visibly behind and beside it and read as a
   * misalignment. Only the five tab screens want it -- modals have no bar to clear.
   */
  floor?: boolean;
  children: React.ReactNode;
}) {
  return (
    <View className="flex-1">
      <LinearGradient
        colors={[tokens.backdropTop, tokens.backdropMid, tokens.backdropBottom]}
        locations={[0, 0.42, 1]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
      />
      <AmbientBackground idPrefix={idPrefix} />
      <View className="flex-1">{children}</View>
      {floor ? (
        <LinearGradient
          pointerEvents="none"
          colors={['rgba(5,2,10,0)', 'rgba(5,2,10,0.85)', tokens.backdropBottom]}
          locations={[0, 0.55, 1]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 130 }}
        />
      ) : null}
    </View>
  );
}
