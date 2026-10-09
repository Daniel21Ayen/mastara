// apps/mobile/src/modules/profile/components/SyncStatusCard.tsx
import { StyleSheet, View } from 'react-native';

import { env } from '@/core/config/env';
import { useI18n } from '@/core/i18n';
import { setForcedOffline, useOnline } from '@/core/network';
import { useSync } from '@/core/sync';
import { theme } from '@/core/theme';
import { useTimeAgo } from '@/shared/hooks';
import { AppButton, AppText, Badge, Card } from '@/shared/ui';

/** Honest sync status: online or offline, how many changes are waiting, and when the last upload happened. */
export function SyncStatusCard() {
  const { t } = useI18n();
  const timeAgo = useTimeAgo();
  const online = useOnline();
  const { pending, syncing, lastSyncAt, syncNow } = useSync();

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
      <AppText variant="caption" muted>
        {lastSyncAt ? t('sync.lastSync', { time: timeAgo(new Date(lastSyncAt).toISOString()) }) : t('sync.never')}
      </AppText>
      <AppButton label={t('sync.now')} variant="outline" disabled={!online || pending === 0} loading={syncing} onPress={() => void syncNow()} />
      {env.useMocks ? (
        <AppButton
          label={online ? t('sync.simulate') : t('sync.simulateOff')}
          variant="outline"
          onPress={() => setForcedOffline(online)}
        />
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md },
  flex: { flex: 1 },
});
