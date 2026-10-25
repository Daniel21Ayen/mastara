// apps/mobile/src/modules/profile/components/SyncStatusCard.tsx
import { View } from 'react-native';

import { useI18n } from '@/core/i18n';
import { useOnline } from '@/core/network';
import { useSync } from '@/core/sync';
import { createStyles, useTheme } from '@/core/theme';
import { useTimeAgo } from '@/shared/hooks';
import { AppButton, AppText, Badge, Card } from '@/shared/ui';

/** Honest sync status: online or offline, how many changes are waiting, and when the last upload happened. */
export function SyncStatusCard() {
  const theme = useTheme();
  const styles = useStyles();
  const { t } = useI18n();
  const timeAgo = useTimeAgo();
  const online = useOnline();
  const { pending, rejected, syncing, lastSyncAt, syncNow } = useSync();

  const status = syncing
    ? t('sync.syncing')
    : pending > 0
      ? t('sync.pending', { n: pending })
      : t('sync.allDone');

  return (
    <Card>
      <View style={styles.row}>
        <AppText bold style={styles.flex}>
          {t('sync.title')}
        </AppText>
        <Badge label={online ? t('sync.online') : t('sync.offline')} tone={online ? 'primary' : 'muted'} />
      </View>
      <AppText>{status}</AppText>
      {rejected > 0 ? (
        <AppText variant="caption" color={theme.colors.danger}>
          {t('sync.rejected', { n: rejected })}
        </AppText>
      ) : null}
      <AppText variant="caption" muted>
        {lastSyncAt ? t('sync.lastSync', { time: timeAgo(new Date(lastSyncAt).toISOString()) }) : t('sync.never')}
      </AppText>
      <AppButton
        label={t('sync.now')}
        variant="outline"
        disabled={!online || pending === 0}
        loading={syncing}
        onPress={() => void syncNow()}
      />
    </Card>
  );
}

const useStyles = createStyles((theme) => ({
  row: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md },
  flex: { flex: 1 },
}));
