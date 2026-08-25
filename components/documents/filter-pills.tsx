import { Pressable, Text, View } from 'react-native';

import { useI18n } from '@/lib/i18n/context';

/*
 * The values stay English identifiers because callers compare against them and they are part of this
 * component's contract. Only the LABEL is localised -- translating the value would have quietly
 * broken every `filter === 'All'` comparison in the documents screen.
 */
export const FILTERS = ['All', 'Uploaded', 'Generated'] as const;
export type Filter = (typeof FILTERS)[number];

const FILTER_LABEL_KEYS: Record<Filter, string> = {
  All: 'documents.filterAll',
  Uploaded: 'documents.filterUploaded',
  Generated: 'documents.filterGenerated',
};

export function FilterPills({
  active,
  onChange,
}: {
  active: Filter;
  onChange: (f: Filter) => void;
}) {
  const { t } = useI18n();
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
              {t(FILTER_LABEL_KEYS[f])}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
