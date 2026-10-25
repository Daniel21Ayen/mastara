// apps/mobile/src/shared/ui/OfflineBanner.tsx
import { useMemo } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useI18n } from '@/core/i18n';
import { useOnline } from '@/core/network';
import { useSync } from '@/core/sync';
import { createStyles, useTheme } from '@/core/theme';
import { useTimeAgo } from '@/shared/hooks/useTimeAgo';

import { AppText } from './AppText';

/** A thin bar shown on every screen while the phone is offline with last-synced time. */
export function OfflineBanner() {
  const theme = useTheme();
  const styles = useStyles();
  const { t } = useI18n();
  const online = useOnline();
  const { lastSyncAt } = useSync();
  const formatTimeAgo = useTimeAgo();
  const insets = useSafeAreaInsets();

  const syncTimeText = useMemo(() => {
    if (!lastSyncAt) return t('sync.never');
    return t('sync.lastSync', {
      time: formatTimeAgo(new Date(lastSyncAt).toISOString()),
    });
  }, [lastSyncAt, t, formatTimeAgo]);

  if (online) return null;

  return (
    <View
      accessibilityRole="alert"
      style={[styles.bar, { paddingTop: insets.top + theme.spacing.xs }]}
    >
      <AppText variant="caption" bold color={theme.colors.text} style={styles.text}>
        {t('offline.banner')}
        {' · '}
        {syncTimeText}
      </AppText>
    </View>
  );
}

const useStyles = createStyles((theme) => ({
  bar: {
    backgroundColor: theme.colors.border,
    paddingBottom: theme.spacing.xs,
    paddingHorizontal: theme.spacing.md,
  },
  text: { textAlign: 'center' },
}));

