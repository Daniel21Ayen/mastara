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

  const handleGoToStore = () => {
    onClose();
    router.push('/store' as Href);
  };

  return (
    <BottomSheet visible={visible} title={t('locked.title') || 'Locked Content'} onClose={onClose}>
      <AppText muted>
        {t('locked.body') || 'This content is locked. You must purchase the course to unlock full access to Modules, Notes, Amharic Notes, Tests, and Exams.'}
      </AppText>
      <AppButton
        label="Purchase Course"
        onPress={handleGoToStore}
      />
      <AppButton
        label="Return to Buy"
        variant="outline"
        onPress={handleGoToStore}
      />
      <AppButton label={t('common.back')} variant="outline" onPress={onClose} />
    </BottomSheet>
  );
}
