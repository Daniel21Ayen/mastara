// apps/mobile/src/modules/store/components/OrderRow.tsx
import type { Order } from '@mastara/contracts';
import { StyleSheet, View } from 'react-native';

import { useI18n } from '@/core/i18n';
import { theme } from '@/core/theme';
import { useTimeAgo } from '@/shared/hooks';
import { AppButton, AppText, Badge, Card } from '@/shared/ui';

interface OrderRowProps {
  order: Order;
  onResubmit: (order: Order) => void;
}

const TONE = { PENDING: 'muted', APPROVED: 'primary', REJECTED: 'danger' } as const;

export function OrderRow({ order, onResubmit }: OrderRowProps) {
  const { t } = useI18n();
  const timeAgo = useTimeAgo();

  return (
    <Card>
      <View style={styles.head}>
        <View style={styles.flex}>
          <AppText bold>{t(`store.product.${order.type}`)}</AppText>
          <AppText variant="caption" muted>
            {`${t('orders.meta', { amount: order.amount, method: t(`checkout.method.${order.method}`) })} · ${timeAgo(order.createdAt)}`}
          </AppText>
        </View>
        <Badge label={t(`orders.status.${order.status}`)} tone={TONE[order.status]} />
      </View>

      {order.status === 'PENDING' ? (
        <AppText variant="caption" muted>
          {t('orders.pendingNote')}
        </AppText>
      ) : null}
      {order.status === 'APPROVED' ? (
        <AppText variant="caption" muted>
          {t('orders.days', { n: order.durationDays })}
        </AppText>
      ) : null}
      {order.status === 'REJECTED' ? (
        <>
          {order.rejectReason ? (
            <AppText variant="caption" color={theme.colors.danger}>
              {t('orders.reason', { reason: t(`orders.reason.${order.rejectReason}`) })}
            </AppText>
          ) : null}
          <AppButton label={t('orders.resubmit')} variant="outline" onPress={() => onResubmit(order)} />
        </>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md },
  flex: { flex: 1, gap: 2 },
});
