// apps/mobile/src/modules/support/screens/SupportScreen.tsx
import type { Href } from 'expo-router';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { useI18n } from '@/core/i18n';
import { createStyles, useTheme } from '@/core/theme';
import { useTimeAgo } from '@/shared/hooks';
import { AppButton, AppText, Badge, ListRow, Screen, TopBar } from '@/shared/ui';

import { NewTicketSheet } from '../components/NewTicketSheet';
import { useTickets } from '../hooks/useTickets';

export function SupportScreen() {
  const theme = useTheme();
  const styles = useStyles();
  const { t } = useI18n();
  const router = useRouter();
  const timeAgo = useTimeAgo();
  const { tickets, loading, error, reload } = useTickets();
  const [newOpen, setNewOpen] = useState(false);

  return (
    <Screen scroll>
      <TopBar title={t('support.title')} onBack={() => router.back()} />
      <AppButton label={t('support.new')} onPress={() => setNewOpen(true)} />

      {loading && tickets.length === 0 ? <ActivityIndicator color={theme.colors.primary} /> : null}
      {error ? <AppButton label={t('common.retry')} variant="outline" onPress={reload} /> : null}
      {!loading && !error && tickets.length === 0 ? <AppText muted>{t('support.empty')}</AppText> : null}

      <View style={styles.list}>
        {tickets.map((ticket) => (
          <ListRow
            key={ticket.id}
            icon="support"
            title={ticket.subject}
            subtitle={timeAgo(ticket.createdAt)}
            trailing={
              <Badge
                label={t(`support.status.${ticket.status}`)}
                tone={
                  ticket.status === 'ANSWERED' || ticket.status === 'OPEN'
                    ? 'primary'
                    : ticket.status === 'RESOLVED'
                      ? 'muted'
                      : 'danger'
                }
              />
            }
            onPress={() => router.push(`/support/${ticket.id}` as Href)}
          />
        ))}
      </View>

      <NewTicketSheet visible={newOpen} onClose={() => setNewOpen(false)} onCreated={reload} />
    </Screen>
  );
}

const useStyles = createStyles((theme) => ({
  list: { gap: theme.spacing.sm },
}));
