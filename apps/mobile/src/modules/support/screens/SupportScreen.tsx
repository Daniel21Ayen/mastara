// apps/mobile/src/modules/support/screens/SupportScreen.tsx
import type { Href } from 'expo-router';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { useI18n } from '@/core/i18n';
import { theme } from '@/core/theme';
import { useTimeAgo } from '@/shared/hooks';
import { AppButton, AppText, Badge, ListRow, Screen, TopBar } from '@/shared/ui';

import { NewTicketSheet } from '../components/NewTicketSheet';
import { useTickets } from '../hooks/useTickets';

export function SupportScreen() {
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
            icon="note"
            title={ticket.subject}
            subtitle={timeAgo(ticket.createdAt)}
            trailing={<Badge label={t(`support.status.${ticket.status}`)} tone={ticket.status === 'ANSWERED' ? 'primary' : 'muted'} />}
            onPress={() => router.push(`/support/${ticket.id}` as Href)}
          />
        ))}
      </View>

      <NewTicketSheet visible={newOpen} onClose={() => setNewOpen(false)} onCreated={reload} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { gap: theme.spacing.sm },
});
