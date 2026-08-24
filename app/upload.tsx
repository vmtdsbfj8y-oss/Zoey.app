import { Text, View } from 'react-native';
import { useI18n } from '@/lib/i18n/context';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { tokens } from '@/constants/tokens';

/** FAB target. Presented modally from the root Stack, outside (tabs). */
export default function UploadScreen() {
  const { t } = useI18n();
  return (
    <View className="flex-1 items-center justify-center gap-2 bg-ink-950 px-4">
      <IconSymbol name="arrow.up.doc.fill" size={28} color={tokens.violet500} />
      <Text className="font-sans-semibold text-[15px] text-parchment">{t('upload.title')}</Text>
      <Text className="font-sans text-[14px] text-ink-600">{t('common.notBuiltYet')}</Text>
    </View>
  );
}
