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
          <View style={styles.list}>
            {ticket.messages.map((message) => {
              const isStudent = message.from !== 'ADMIN';
              return (
                <View
                  key={message.id}
                  style={[
                    styles.bubble,
                    isStudent ? styles.studentBubble : styles.replyBubble,
                  ]}
                >
                  <AppText
                    variant="caption"
                    bold
                    color={isStudent ? theme.colors.onPrimary : theme.colors.textMuted}
                  >
                    {`${isStudent ? t('support.you') : t('support.admin')} · ${timeAgo(message.createdAt)}`}
                  </AppText>
                  <AppText color={isStudent ? theme.colors.onPrimary : theme.colors.text}>
                    {message.text}
                  </AppText>
                </View>
              );
            })}
          </View>
        </>
      ) : null}
    </Screen>
  );
}

const useStyles = createStyles((theme) => ({
  list: { gap: theme.spacing.sm, marginTop: theme.spacing.md },
  bubble: {
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    gap: theme.spacing.xs,
  },
  studentBubble: {
    backgroundColor: theme.colors.primary,
    alignSelf: 'flex-end',
    maxWidth: '85%',
  },
  replyBubble: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderWidth: 1,
    alignSelf: 'flex-start',
    maxWidth: '85%',
  },
}));
