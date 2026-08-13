import { Pressable, Text, View } from 'react-native';

export const FILTERS = ['All', 'Uploaded', 'Generated'] as const;
export type Filter = (typeof FILTERS)[number];

export function FilterPills({
  active,
  onChange,
}: {
  active: Filter;
  onChange: (f: Filter) => void;
}) {
  return (
    <View className="flex-row gap-2">
      {FILTERS.map((f) => {
        const on = f === active;
        return (
          <Pressable
            key={f}
            accessibilityRole="button"
            accessibilityState={{ selected: on }}
            onPress={() => onChange(f)}
            className={`rounded-full border px-3.5 py-1.5 active:opacity-70 ${
              on ? 'border-violet-500 bg-violet-500' : 'border-ink-700 bg-ink-900'
            }`}>
            <Text
              className={`font-sans-medium text-[12px] ${on ? 'text-parchment' : 'text-ink-600'}`}>
              {f}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
