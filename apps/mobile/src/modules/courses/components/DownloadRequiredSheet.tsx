// apps/mobile/src/modules/courses/components/DownloadRequiredSheet.tsx
import type { Course } from '@mastara/contracts';

import { downloadStatus } from '@/core/downloads';
import { useI18n } from '@/core/i18n';
import { AppButton, AppText, BottomSheet } from '@/shared/ui';

import { courseDownload } from '../lib/courseDownload';

interface DownloadRequiredSheetProps {
  visible: boolean;
  course: Course | null;
  onClose: () => void;
  onDownloadStarted?: () => void;
}

export function DownloadRequiredSheet({
  visible,
  course,
  onClose,
  onDownloadStarted,
}: DownloadRequiredSheetProps) {
  const { t } = useI18n();

  if (!course) return null;

  async function handleDownload() {
    onClose();
    if (course) {
      onDownloadStarted?.();
      void downloadStatus.start(courseDownload(course));
    }
  }

  return (
    <BottomSheet
      visible={visible}
      title={t('course.download.required.title')}
      onClose={onClose}
    >
      <AppText muted>
        {t('course.download.required.body') ||
          `Each course must be downloaded before a student can access or select its materials. Please download "${course.title}" to continue.`}
      </AppText>
      <AppButton
        label={t('course.download.action')}
        onPress={() => void handleDownload()}
      />
      <AppButton label={t('common.cancel')} variant="outline" onPress={onClose} />
    </BottomSheet>
  );
}
