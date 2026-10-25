// apps/mobile/src/modules/courses/components/CourseActionButton.tsx
import type { Course } from '@mastara/contracts';
import { ERROR_CODES } from '@mastara/domain';
import { useState } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';

import { downloadStatus, downloadStore } from '@/core/downloads';
import { useI18n } from '@/core/i18n';
import { isApiError } from '@/core/network';
import { createStyles, useTheme } from '@/core/theme';
import { useIsCourseDownloaded, useTransferStatus } from '@/modules/downloads';
import { AppButton, AppText, BottomSheet, Icon } from '@/shared/ui';

import { courseDownload } from '../lib/courseDownload';

interface CourseActionButtonProps {
  course: Course;
  compact?: boolean;
}

export function CourseActionButton({ course, compact }: CourseActionButtonProps) {
  const theme = useTheme();
  const styles = useStyles();
  const { t } = useI18n();
  const unitId = `COURSE:${course.id}`;
  const isDownloaded = useIsCourseDownloaded(course.id);
  const transfer = useTransferStatus(unitId);
  const [sheet, setSheet] = useState<'delete' | 'failed' | null>(null);
  const [offline, setOffline] = useState(false);

  async function start() {
    setOffline(false);
    try {
      await downloadStatus.start(courseDownload(course));
    } catch (error) {
      setOffline(isApiError(error, ERROR_CODES.NETWORK_OFFLINE));
      setSheet('failed');
    }
  }

  function closeFailure() {
    setSheet(null);
    downloadStatus.clearFailure(unitId);
  }

  function handlePress() {
    if (transfer === 'downloading') return;
    if (isDownloaded) {
      setSheet('delete');
    } else {
      void start();
    }
  }

  async function remove() {
    setSheet(null);
    await downloadStore.removeCourse(course.id);
  }

  return (
    <>
      {transfer === 'downloading' ? (
        <View style={[styles.button, styles.busyContainer]}>
          <ActivityIndicator size="small" color={theme.colors.primary} />
          {!compact && (
            <AppText variant="caption" bold color={theme.colors.primary}>
              {t('course.download.downloading')}
            </AppText>
          )}
        </View>
      ) : isDownloaded ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('course.download.delete')}
          hitSlop={8}
          onPress={handlePress}
          style={({ pressed }) => [
            styles.button,
            styles.deleteButton,
            compact && styles.compactButton,
            pressed && styles.pressed,
          ]}
        >
          <Icon name="trash" size={compact ? 18 : 20} color={theme.colors.danger} />
          {!compact && (
            <AppText variant="caption" bold color={theme.colors.text}>
              {t('course.download.delete')}
            </AppText>
          )}
        </Pressable>
      ) : (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('course.download.action')}
          hitSlop={8}
          onPress={handlePress}
          style={({ pressed }) => [
            styles.button,
            styles.downloadButton,
            compact && styles.compactButton,
            pressed && styles.pressed,
          ]}
        >
          <Icon name="download" size={compact ? 18 : 20} color={theme.colors.primary} />
          {!compact && (
            <AppText variant="caption" bold color={theme.colors.primary}>
              {t('course.download.action')}
            </AppText>
          )}
        </Pressable>
      )}

      <BottomSheet
        visible={sheet === 'delete'}
        title={t('course.download.deleteConfirmTitle')}
        onClose={() => setSheet(null)}
      >
        <AppText muted>
          {t('course.download.deleteConfirmBody') ||
            `Are you sure you want to remove all offline materials and files for "${course.title}"?`}
        </AppText>
        <AppButton label={t('download.delete.confirm')} variant="danger" onPress={() => void remove()} />
        <AppButton label={t('common.cancel')} variant="outline" onPress={() => setSheet(null)} />
      </BottomSheet>

      <BottomSheet visible={sheet === 'failed'} title={t('download.failed.title')} onClose={closeFailure}>
        <AppText muted>{offline ? t('download.failed.offline') : t('download.failed.body')}</AppText>
        <AppButton
          label={t('common.retry')}
          onPress={() => {
            closeFailure();
            void start();
          }}
        />
        <AppButton label={t('common.cancel')} variant="outline" onPress={closeFailure} />
      </BottomSheet>
    </>
  );
}

const useStyles = createStyles((theme) => ({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 6,
    borderRadius: theme.radius.md,
    borderWidth: 1,
  },
  compactButton: {
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  busyContainer: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primarySoft,
  },
  downloadButton: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.surface,
  },
  deleteButton: {
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  pressed: {
    opacity: 0.75,
  },
}));
