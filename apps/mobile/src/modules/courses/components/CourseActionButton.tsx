// apps/mobile/src/modules/courses/components/CourseActionButton.tsx
import type { Course } from '@mastara/contracts';
import { ERROR_CODES, formatBytes } from '@mastara/domain';
import { useState } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';

import { downloadStatus, downloadStore } from '@/core/downloads';
import { useI18n } from '@/core/i18n';
import { isApiError, isCellularConnection } from '@/core/network';
import { createStyles, useTheme } from '@/core/theme';
import {
  useCourseDownloadedVersion,
  useDownloadProgress,
  useIsCourseDownloaded,
  useTransferStatus,
} from '@/modules/downloads';
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
  const downloadedVersion = useCourseDownloadedVersion(course.id);
  const transfer = useTransferStatus(unitId);
  const progress = useDownloadProgress(unitId);
  const [sheet, setSheet] = useState<'delete' | 'failed' | 'cellular_warning' | null>(null);
  const [offline, setOffline] = useState(false);

  const serverVersion = (course as any).contentVersion ?? 1;
  const isUpdateAvailable =
    isDownloaded && downloadedVersion !== null && serverVersion > downloadedVersion;

  const estimatedSize = formatBytes((course as any).estimatedBytes ?? 25 * 1024 * 1024);

  async function executeDownload() {
    setOffline(false);
    try {
      await downloadStatus.start(courseDownload(course));
    } catch (error) {
      setOffline(isApiError(error, ERROR_CODES.NETWORK_OFFLINE));
      setSheet('failed');
    }
  }

  async function triggerDownload() {
    const isCellular = await isCellularConnection();
    if (isCellular) {
      setSheet('cellular_warning');
    } else {
      void executeDownload();
    }
  }

  function closeFailure() {
    setSheet(null);
    downloadStatus.clearFailure(unitId);
  }

  function handlePress() {
    if (transfer === 'downloading') return;
    if (isUpdateAvailable) {
      void triggerDownload();
    } else if (isDownloaded) {
      setSheet('delete');
    } else {
      void triggerDownload();
    }
  }

  async function remove() {
    setSheet(null);
    await downloadStore.removeCourse(course.id);
  }

  const progressLabel =
    progress && progress.total > 0
      ? `${progress.percent}% (${progress.current}/${progress.total})`
      : t('course.download.downloading');

  return (
    <>
      {transfer === 'downloading' ? (
        <View style={[styles.button, styles.busyContainer]}>
          <ActivityIndicator size="small" color={theme.colors.primary} />
          {!compact && (
            <AppText variant="caption" bold color={theme.colors.primary}>
              {progressLabel}
            </AppText>
          )}
        </View>
      ) : isUpdateAvailable ? (
        <View style={styles.group}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('course.download.updateAvailable')}
            hitSlop={8}
            onPress={handlePress}
            style={({ pressed }) => [
              styles.button,
              styles.updateButton,
              compact && styles.compactButton,
              pressed && styles.pressed,
            ]}
          >
            <Icon name="download" size={compact ? 18 : 20} color={theme.colors.primary} />
            {!compact && (
              <AppText variant="caption" bold color={theme.colors.primary}>
                {t('course.download.updateAvailable')}
              </AppText>
            )}
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('course.download.delete')}
            hitSlop={8}
            onPress={() => setSheet('delete')}
            style={({ pressed }) => [
              styles.button,
              styles.deleteButton,
              compact && styles.compactButton,
              pressed && styles.pressed,
            ]}
          >
            <Icon name="trash" size={compact ? 18 : 20} color={theme.colors.danger} />
          </Pressable>
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

      {/* Delete Confirmation Sheet */}
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

      {/* Cellular Data Warning Sheet (DWN-02) */}
      <BottomSheet
        visible={sheet === 'cellular_warning'}
        title={t('course.download.mobileDataWarningTitle')}
        onClose={() => setSheet(null)}
      >
        <AppText muted>
          {t('course.download.mobileDataWarningBody', { size: estimatedSize })}
        </AppText>
        <AppButton
          label={t('course.download.action')}
          onPress={() => {
            setSheet(null);
            void executeDownload();
          }}
        />
        <AppButton label={t('common.cancel')} variant="outline" onPress={() => setSheet(null)} />
      </BottomSheet>

      {/* Download Failed Sheet */}
      <BottomSheet visible={sheet === 'failed'} title={t('download.failed.title')} onClose={closeFailure}>
        <AppText muted>{offline ? t('download.failed.offline') : t('download.failed.body')}</AppText>
        <AppButton
          label={t('common.retry')}
          onPress={() => {
            closeFailure();
            void executeDownload();
          }}
        />
        <AppButton label={t('common.cancel')} variant="outline" onPress={closeFailure} />
      </BottomSheet>
    </>
  );
}

const useStyles = createStyles((theme) => ({
  group: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
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
  updateButton: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primarySoft,
  },
  deleteButton: {
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  pressed: {
    opacity: 0.75,
  },
}));

