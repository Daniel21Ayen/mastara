// apps/mobile/src/shared/ui/ConnectivityPill.tsx
import { useState } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';

import { useI18n } from '@/core/i18n';
import { useOnline } from '@/core/network';
import { useSync } from '@/core/sync';
import { createStyles, useTheme } from '@/core/theme';
import { useTimeAgo } from '@/shared/hooks';

import { AppButton } from './AppButton';
import { AppText } from './AppText';
import { BottomSheet } from './BottomSheet';
import { Icon } from './Icon';

interface ConnectivityPillProps {
  /** Optional custom container style */
  style?: object;
  /** Whether to show a compact dot only or include label */
  compact?: boolean;
}

/**
 * An interactive network connectivity & sync status pill.
 * Displays live online/offline state, pending outbox item count, and syncing indicators.
 * Tapping opens a bottom sheet with detailed sync queue information and a manual "Sync Now" trigger.
 */
export function ConnectivityPill({ style, compact = false }: ConnectivityPillProps) {
  const theme = useTheme();
  const styles = useStyles();
  const { t } = useI18n();
  const timeAgo = useTimeAgo();
  const online = useOnline();
  const { pending, rejected, syncing, lastSyncAt, syncNow } = useSync();
  const [sheetOpen, setSheetOpen] = useState(false);

  // Derive visual palette based on current status (Online: soft blue, Offline: soft ink)
  let bg = theme.colors.primarySoft;
  let textColor = theme.colors.primary;
  let dotColor = theme.colors.primary;
  let label = t('sync.online');
  let iconName: 'wifi' | 'wifiOff' | 'sync' = 'wifi';

  if (syncing) {
    bg = theme.colors.primarySoft;
    textColor = theme.colors.primary;
    dotColor = theme.colors.primary;
    label = t('sync.syncing');
    iconName = 'sync';
  } else if (!online) {
    bg = theme.colors.border;
    textColor = theme.colors.textMuted;
    dotColor = theme.colors.textMuted;
    label = pending > 0 ? `${t('sync.offline')} (${pending})` : t('sync.offline');
    iconName = 'wifiOff';
  } else if (pending > 0) {
    bg = theme.colors.border;
    textColor = theme.colors.textMuted;
    dotColor = theme.colors.textMuted;
    label = `${pending} ${pending === 1 ? 'change' : 'changes'}`;
    iconName = 'sync';
  }

  const queueStatus = syncing
    ? t('sync.syncing')
    : pending > 0
      ? t('sync.pending', { n: pending })
      : t('sync.allDone');

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label} - ${queueStatus}`}
        onPress={() => setSheetOpen(true)}
        style={[styles.pill, { backgroundColor: bg }, style]}
      >
        {syncing ? (
          <ActivityIndicator size="small" color={textColor} style={styles.indicator} />
        ) : (
          <View style={[styles.dot, { backgroundColor: dotColor }]} />
        )}

        {!compact ? (
          <AppText variant="caption" bold color={textColor} style={styles.label}>
            {label}
          </AppText>
        ) : null}

        <Icon name={iconName} size={14} color={textColor} />
      </Pressable>

      <BottomSheet
        visible={sheetOpen}
        title={t('sync.title')}
        onClose={() => setSheetOpen(false)}
      >
        <View style={styles.sheetContent}>
          <View style={[styles.statusBox, { backgroundColor: bg }]}>
            <View style={styles.row}>
              <View style={[styles.largeDot, { backgroundColor: dotColor }]} />
              <AppText variant="heading" bold color={textColor} style={styles.flex}>
                {online ? t('sync.online') : t('sync.offline')}
              </AppText>
              <Icon name={iconName} size={22} color={textColor} />
            </View>
            <AppText color={textColor}>{queueStatus}</AppText>
          </View>

          <View style={styles.metaRow}>
            <AppText variant="caption" muted>
              {lastSyncAt
                ? t('sync.lastSync', { time: timeAgo(new Date(lastSyncAt).toISOString()) })
                : t('sync.never')}
            </AppText>
          </View>

          {rejected > 0 ? (
            <View style={styles.errorBox}>
              <AppText variant="caption" color={theme.colors.danger}>
                {t('sync.rejected', { n: rejected })}
              </AppText>
            </View>
          ) : null}

          <View style={styles.actions}>
            <AppButton
              label={t('sync.now')}
              disabled={!online || syncing || pending === 0}
              loading={syncing}
              onPress={() => void syncNow()}
            />

            <AppButton
              label={t('common.cancel')}
              variant="outline"
              onPress={() => setSheetOpen(false)}
            />
          </View>
        </View>
      </BottomSheet>
    </>
  );
}

const useStyles = createStyles((theme) => ({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 5,
    borderRadius: theme.radius.pill,
    gap: 6,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: theme.radius.pill,
  },
  largeDot: {
    width: 10,
    height: 10,
    borderRadius: theme.radius.pill,
  },
  label: {
    fontSize: 12,
    lineHeight: 14,
  },
  indicator: {
    transform: [{ scale: 0.7 }],
  },
  sheetContent: {
    gap: theme.spacing.md,
    paddingTop: theme.spacing.xs,
  },
  statusBox: {
    padding: theme.spacing.md,
    borderRadius: theme.radius.md,
    gap: theme.spacing.xs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  largeDotHolder: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  flex: {
    flex: 1,
  },
  metaRow: {
    paddingHorizontal: theme.spacing.xs,
  },
  errorBox: {
    padding: theme.spacing.sm,
    backgroundColor: theme.colors.dangerSoft,
    borderRadius: theme.radius.sm,
  },
  actions: {
    gap: theme.spacing.sm,
    marginTop: theme.spacing.xs,
  },
}));
