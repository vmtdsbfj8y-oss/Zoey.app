import { LinearGradient } from 'expo-linear-gradient';
import { View } from 'react-native';

import { AmbientBackground } from '@/components/ui/ambient-background';
import { tokens } from '@/constants/tokens';

/**
 * The page backdrop: a vertical purple-black gradient (lighter at the top)
 * with the ambient orbs floating over it. Content renders above both.
 */
export function ScreenBackground({
  idPrefix,
  children,
}: {
  /** Unique per screen -- see AmbientBackground. */
  idPrefix: string;
  children: React.ReactNode;
}) {
  return (
    <View className="flex-1">
      <LinearGradient
        colors={[tokens.backdropTop, tokens.backdropBottom]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
      />
      <AmbientBackground idPrefix={idPrefix} />
      <View className="flex-1">{children}</View>
    </View>
  );
}
