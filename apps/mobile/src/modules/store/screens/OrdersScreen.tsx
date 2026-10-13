// apps/mobile/src/modules/store/screens/OrdersScreen.tsx
import type { Order } from '@mastara/contracts';
import type { Href } from 'expo-router';
import { useRouter } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';

import { useI18n } from '@/core/i18n';
import { useSession } from '@/core/session';
import { createStyles, useTheme } from '@/core/theme';
import { AppButton, AppText, Screen, TopBar } from '@/shared/ui';

import { OrderRow } from '../components/OrderRow';
import { useOrders } from '../hooks/useStoreData';
import { useOrderDraft } from '../state/OrderDraftContext';

/** Receipts and their status. A mock admin approves each one about 10 seconds after it is sent. */
export function OrdersScreen() {
  const theme = useTheme();
  const styles = useStyles();
  const { t } = useI18n();
  const router = useRouter();
  const { user } = useSession();
  const { setDraft } = useOrderDraft();
  const { orders, loading, error, reload } = useOrders(user?.id);

  function resubmit(order: Order) {
    setDraft({
      type: order.type,
      stream: order.stream,
      courseIds: order.type === 'FULL_STREAM' || order.type === 'FULL_BOTH' ? [] : order.courseIds,
    });
    router.push('/store/checkout' as Href);
  }

  return (
    <Screen scroll>
      <TopBar title={t('orders.title')} onBack={() => router.back()} />

      {loading && orders.length === 0 ? <ActivityIndicator color={theme.colors.primary} /> : null}
      {error ? <AppButton label={t('common.retry')} variant="outline" onPress={reload} /> : null}
      {!loading && !error && orders.length === 0 ? <AppText muted>{t('orders.empty')}</AppText> : null}

      <View style={styles.list}>
        {orders.map((order) => (
          <OrderRow key={order.id} order={order} onResubmit={resubmit} />
        ))}
      </View>
    </Screen>
  );
}

const useStyles = createStyles((theme) => ({
  list: { gap: theme.spacing.sm },
}));
