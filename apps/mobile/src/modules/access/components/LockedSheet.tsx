// apps/mobile/src/modules/access/components/LockedSheet.tsx
import type { Href } from 'expo-router';
import { useRouter } from 'expo-router';

import { useI18n } from '@/core/i18n';
import { AppButton, AppText, BottomSheet } from '@/shared/ui';

interface LockedSheetProps {
  visible: boolean;
  onClose: () => void;
}

/** Shown when a student taps content their access does not cover. The Buy button opens the Store. */
export function LockedSheet({ visible, onClose }: LockedSheetProps) {
  const { t } = useI18n();
  const router = useRouter();

  return (
    <BottomSheet visible={visible} title={t('locked.title')} onClose={onClose}>
      <AppText muted>{t('locked.body')}</AppText>
      <AppButton label={t('locked.buy')} onPress={() => {
          onClose();
          router.push('/store' as Href);
        }} />
      <AppButton label={t('common.back')} variant="outline" onPress={onClose} />
    </BottomSheet>
  );
}
