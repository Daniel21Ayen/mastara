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
    <BottomSheet visible={visible} title={t('locked.title') || 'You cannot access this content'} onClose={onClose}>
      <AppText muted>
        {t('locked.body') || 'You cannot access this content without an active course purchase or free trial. Please purchase this course in the Store to unlock full access.'}
      </AppText>
      <AppButton
        label={t('locked.buy') || 'Buy Now / Pricing'}
        onPress={handleGoToStore}
      />
      <AppButton label={t('common.cancel') || 'Cancel'} variant="outline" onPress={onClose} />
    </BottomSheet>
  );
}
