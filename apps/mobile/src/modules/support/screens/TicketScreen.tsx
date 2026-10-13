// apps/mobile/src/modules/support/screens/TicketScreen.tsx
import { useLocalSearchParams, useRouter } from 'expo-router';
import { View } from 'react-native';

import { useI18n } from '@/core/i18n';
import { createStyles, useTheme } from '@/core/theme';
import { useTimeAgo } from '@/shared/hooks';
import { AppText, Badge, Card, Screen, TopBar } from '@/shared/ui';

import { useTickets } from '../hooks/useTickets';

/** One request with the conversation. The admin's reply appears here (and the status becomes Answered). */
export function TicketScreen() {
  const theme = useTheme();
  const styles = useStyles();
  const { t } = useI18n();
  const router = useRouter();
  const timeAgo = useTimeAgo();
  const { ticketId } = useLocalSearchParams<{ ticketId: string }>();
  const { tickets, loading } = useTickets();
  const ticket = tickets.find((item) => item.id === ticketId);

  return (
    <Screen scroll>
      <TopBar title={ticket?.subject ?? t('support.title')} onBack={() => router.back()} />

      {!ticket && !loading ? <AppText muted>{t('support.notFound')}</AppText> : null}

      {ticket ? (
        <>
          <Badge label={t(`support.status.${ticket.status}`)} tone={ticket.status === 'ANSWERED' ? 'primary' : 'muted'} />
          <View style={styles.list}>
            {ticket.messages.map((message) => (
              <Card key={message.id}>
                <AppText variant="caption" bold color={message.from === 'ADMIN' ? theme.colors.primary : theme.colors.textMuted}>
                  {`${message.from === 'ADMIN' ? t('support.admin') : t('support.you')} · ${timeAgo(message.createdAt)}`}
                </AppText>
                <AppText>{message.text}</AppText>
              </Card>
            ))}
          </View>
        </>
      ) : null}
    </Screen>
  );
}

const useStyles = createStyles((theme) => ({
  list: { gap: theme.spacing.sm },
}));
