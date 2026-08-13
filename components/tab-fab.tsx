import { LinearGradient } from 'expo-linear-gradient';
import { Pressable } from 'react-native';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { tokens } from '@/constants/tokens';

/**
 * Center FAB, rendered as a tab bar button so it sits in the true center of
 * the 4-tab row. It never navigates to its own tab -- the layout intercepts
 * the press and pushes the /upload modal instead.
 */
export function TabFab({ onPress }: { onPress?: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Upload document"
      onPress={onPress}
      className="flex-1 items-center justify-center active:opacity-80">
      <LinearGradient
        colors={[tokens.violet500, tokens.magenta500]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          width: 52,
          height: 52,
          borderRadius: 26,
          marginTop: -24,
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: 3,
          borderColor: tokens.ink950,
        }}>
        <IconSymbol name="plus" size={24} color={tokens.parchment} />
      </LinearGradient>
    </Pressable>
  );
}
