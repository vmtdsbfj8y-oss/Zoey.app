import { Pressable, Text, View } from 'react-native';

import { tokens } from '@/constants/tokens';

/**
 * The bureau selector.
 *
 * All three are always present, including the ones with no score. A tab bar that hid the bureaus
 * without a number would tell a client Zoey checks one bureau, when the truth is that two of them
 * printed nothing -- and which two is often the more interesting half of their report.
 *
 * An unavailable bureau is dimmed and marked, never disabled. Tapping it is how a client finds out
 * WHY there is no number, and a tab that refuses to respond answers nothing.
 */
export type BureauKey = 'TransUnion' | 'Experian' | 'Equifax';

export const BUREAU_ORDER: BureauKey[] = ['TransUnion', 'Experian', 'Equifax'];

export function BureauTabs({
  selected,
  available,
  onSelect,
}: {
  selected: BureauKey;
  /** Which bureaus actually have a score. Absence is shown, never hidden. */
  available: Record<BureauKey, boolean>;
  onSelect: (bureau: BureauKey) => void;
}) {
  return (
    <View
      className="flex-row rounded-full p-1"
      style={{ backgroundColor: 'rgba(10,7,18,0.30)', borderWidth: 1, borderColor: 'rgba(198,166,255,0.13)' }}>
      {BUREAU_ORDER.map((bureau) => {
        const active = bureau === selected;
        const has = available[bureau];
        return (
          <Pressable
            key={bureau}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            accessibilityLabel={has ? `${bureau} score` : `${bureau}, no score on your report`}
            onPress={() => onSelect(bureau)}
            className="flex-1 items-center rounded-full py-2 active:opacity-80"
            style={active ? { backgroundColor: '#BE97FD' } : undefined}>
            <Text
              className="font-sans-semibold text-[12.5px]"
              style={{ color: active ? '#31135E' : has ? 'rgba(244,239,255,0.62)' : 'rgba(244,239,255,0.3)' }}>
              {bureau}
            </Text>
            {/* A dot, not a number: presence at a glance without implying a value. */}
            <View
              className="mt-1 h-1 w-1 rounded-full"
              style={{ backgroundColor: has ? (active ? '#31135E' : tokens.violet400) : 'transparent' }}
            />
          </Pressable>
        );
      })}
    </View>
  );
}
