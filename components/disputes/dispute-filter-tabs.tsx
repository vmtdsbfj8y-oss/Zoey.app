import { Pressable, Text, View } from 'react-native';

import { disputeFilters, type DisputeFilter } from '@/lib/disputes-data';

/**
 * Left-aligned filter row. Only the active tab gets a surface -- a soft
 * translucent violet pill, the same treatment as the bureau tabs on Home, so
 * the two screens read as one system.
 */
export function DisputeFilterTabs({
  active,
  onChange,
}: {
  active: DisputeFilter;
  onChange: (f: DisputeFilter) => void;
}) {
  return (
    <View className="flex-row items-center gap-2">
      {disputeFilters.map((f) => {
        const on = f === active;
        return (
          <Pressable
            key={f}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            onPress={() => onChange(f)}
            className="rounded-full px-4 py-2.5"
            style={
              on
                ? {
                    backgroundColor: 'rgba(168,85,247,0.26)',
                    borderWidth: 1,
                    borderColor: 'rgba(168,85,247,0.38)',
                  }
                : undefined
            }>
            <Text
              className={
                on
                  ? 'font-sans-semibold text-[14px] text-parchment'
                  : 'font-sans text-[14px] text-parchment/45'
              }>
              {f}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
