// apps/mobile/src/modules/downloads/components/DownloadButton.tsx
import { ERROR_CODES } from '@mastara/domain';
import { useState } from 'react';
import { ActivityIndicator, Pressable } from 'react-native';

import { downloadStatus, downloadStore } from '@/core/downloads';
import type { DownloadUnit } from '@/core/downloads';
import { useI18n } from '@/core/i18n';
import { isApiError } from '@/core/network';
import { createStyles, useTheme } from '@/core/theme';
import { AppButton, AppText, BottomSheet, Icon } from '@/shared/ui';

import { useDownloadedIds, useTransferStatus } from '../hooks/useDownloads';

/**
 * Download for offline use: tap to download, a check when it is saved, tap again to delete it.
 * Show it only for content the student can open. Content is online first; this is the only way to keep it on the phone.
 */
export function DownloadButton({ unit }: { unit: DownloadUnit }) {
  const theme = useTheme();
  const styles = useStyles();
  const { t } = useI18n();
  const downloaded = useDownloadedIds().has(unit.unitId);
  const transfer = useTransferStatus(unit.unitId);
  const [sheet, setSheet] = useState<'delete' | 'failed' | null>(null);
  const [offline, setOffline] = useState(false);

  async function start() {
    setOffline(false);
    try {
      await downloadStatus.start(unit);
    } catch (error) {
      setOffline(isApiError(error, ERROR_CODES.NETWORK_OFFLINE));
      setSheet('failed');
    }
  }

  function closeFailure() {
    setSheet(null);
    downloadStatus.clearFailure(unit.unitId);
  }

  function onPress() {
    if (transfer === 'downloading') return;
    if (downloaded) setSheet('delete');
    else void start();
  }

  async function remove() {
    setSheet(null);
    await downloadStore.remove(unit.unitId);
  }

  const label = downloaded ? t('download.done') : transfer === 'downloading' ? t('download.busy') : t('download.action');

  return (
    <>
      <Pressable accessibilityRole="button" accessibilityLabel={label} hitSlop={8} onPress={onPress} style={styles.button}>
        {transfer === 'downloading' ? (
          <ActivityIndicator color={theme.accents.cyan.main} />
        ) : downloaded ? (
          <Icon name="downloaded" size={26} color={theme.accents.emerald.main} />
        ) : (
          <Icon name="download" size={26} color={transfer === 'failed' ? theme.colors.danger : theme.accents.cyan.main} />
        )}
      </Pressable>

      <BottomSheet visible={sheet === 'delete'} title={t('download.delete.title')} onClose={() => setSheet(null)}>
        <AppText muted>{t('download.delete.body')}</AppText>
        <AppButton label={t('download.delete.confirm')} onPress={() => void remove()} />
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
    width: theme.minTouchTarget,
    height: theme.minTouchTarget,
    alignItems: 'center',
    justifyContent: 'center',
  },
}));
