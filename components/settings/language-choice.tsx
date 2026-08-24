import { Pressable, Text, View } from 'react-native';

import { GlassSurface } from '@/components/ui/glass-surface';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { tokens } from '@/constants/tokens';
import { useI18n } from '@/lib/i18n/context';
import { LOCALES, LOCALE_LABELS, type Locale } from '@/lib/i18n/types';

/**
 * The language picker. One component, used by Settings and by onboarding.
 *
 * Each option is labelled in ITS OWN language -- "English" and "Español" -- never translated into
 * the currently active one. Somebody looking for Spanish is looking for the word "Español"; showing
 * them "Spanish" because the app happens to be in English is the version of this control that fails
 * exactly the people it exists for.
 *
 * Selection applies immediately. There is no Save button and no confirmation, because the change is
 * visible the instant it happens and is trivially reversible.
 */
export function LanguageChoice({ compact = false }: { compact?: boolean }) {
  const { locale, setLocale, t } = useI18n();

  return (
    <GlassSurface radius={20} glow={!compact}>
      <View className="p-1">
        {LOCALES.map((option: Locale, index) => {
          const selected = option === locale;
          return (
            <Pressable
              key={option}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              accessibilityLabel={
                selected
                  ? t('language.a11ySelected', { values: { language: LOCALE_LABELS[option] } })
                  : t('language.a11ySelect', { values: { language: LOCALE_LABELS[option] } })
              }
              onPress={() => setLocale(option)}
              className="flex-row items-center gap-3 px-3.5 py-3.5 active:opacity-70"
              style={index > 0 ? { borderTopWidth: 1, borderTopColor: 'rgba(168,85,247,0.14)' } : undefined}>
              <Text className="flex-1 font-sans-medium text-[15px] text-parchment">
                {LOCALE_LABELS[option]}
              </Text>
              {selected ? (
                <IconSymbol name="checkmark.circle.fill" size={19} color={tokens.violet400} />
              ) : (
                <View
                  className="h-[19px] w-[19px] rounded-full"
                  style={{ borderWidth: 1.5, borderColor: 'rgba(244,239,255,0.25)' }}
                />
              )}
            </Pressable>
          );
        })}
      </View>
    </GlassSurface>
  );
}
