// apps/mobile/src/modules/store/screens/StoreHomeScreen.tsx
import type { OrderStream, ProductType } from '@mastara/domain';
import type { Href } from 'expo-router';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { useI18n } from '@/core/i18n';
import { useSession } from '@/core/session';
import { createStyles, useTheme } from '@/core/theme';
import { AppText, ListRow, Screen, SegmentedControl, TopBar } from '@/shared/ui';
import type { SegmentOption } from '@/shared/ui';

import { ProductCard } from '../components/ProductCard';
import { usePurchaseEligibility } from '../hooks/usePurchaseEligibility';
import { usePricing } from '../hooks/useStoreData';
import { useOrderDraft } from '../state/OrderDraftContext';

export function StoreHomeScreen() {
  const theme = useTheme();
  const styles = useStyles();
  const { t } = useI18n();
  const router = useRouter();
  const { profile } = useSession();
  const { setDraft } = useOrderDraft();
  const pricing = usePricing();
  const { hasActiveBundle } = usePurchaseEligibility();
  const [stream, setStream] = useState<OrderStream>(profile?.stream ?? 'NATURAL');

  const streams: SegmentOption<OrderStream>[] = [
    { value: 'NATURAL', label: t('courses.filter.natural') },
    { value: 'SOCIAL', label: t('courses.filter.social') },
    { value: 'BOTH', label: t('store.stream.both') },
  ];
  const both = stream === 'BOTH';
  const config = pricing.data;

  function buy(type: ProductType) {
    const isFull = type === 'FULL_STREAM' || type === 'FULL_BOTH';
    setDraft({ type, stream, courseIds: [] });
    router.push((isFull ? '/store/checkout' : '/store/builder') as Href);
  }

  return (
    <Screen scroll>
      <TopBar title={t('store.title')} onBack={() => router.back()} />

      <AppText bold>{t('store.stream')}</AppText>
      <SegmentedControl options={streams} value={stream} onChange={setStream} />

      {pricing.loading && !config ? <ActivityIndicator color={theme.colors.primary} /> : null}

      {config ? (
        <View style={styles.list}>
          <ProductCard
            icon="module"
            accent="blue"
            title={t('store.product.BUNDLE')}
            subtitle={t('store.product.BUNDLE.sub')}
            price={config.bundle.bundlePrice}
            disabled={both}
            onPress={() => buy('BUNDLE')}
          />
          <ProductCard
            icon="star"
            accent="blue"
            title={t(both ? 'store.product.FULL_BOTH' : 'store.product.FULL_STREAM')}
            subtitle={t(both ? 'store.product.FULL_BOTH.sub' : 'store.product.FULL_STREAM.sub')}
            price={both ? config.fullBothPrice : config.fullStreamPrice}
            onPress={() => buy(both ? 'FULL_BOTH' : 'FULL_STREAM')}
          />
          <ProductCard
            icon="note"
            accent="blue"
            title={t('store.product.SINGLE')}
            subtitle={t('store.product.SINGLE.sub')}
            price={config.singlePrice}
            disabled={both}
            locked={!hasActiveBundle}
            lockedMessage={t('store.singleLocked')}
            onPress={() => buy('SINGLE')}
          />

          <AppText variant="caption" muted>
            {both
              ? t('store.bothNote')
              : t('store.extraNote', {
                  max: config.bundle.maxCourses,
                  first: config.bundle.extraCoursePrices[0] ?? 0,
                  later: config.bundle.extraCoursePrices[1] ?? config.bundle.extraCoursePrices[0] ?? 0,
                })}
          </AppText>
        </View>
      ) : null}

      <ListRow
        icon="receipt"
        title={t('store.myOrders')}
        subtitle={t('store.myOrders.sub')}
        onPress={() => router.push('/store/orders' as Href)}
      />
    </Screen>
  );
}

const useStyles = createStyles((theme) => ({
  list: { gap: theme.spacing.sm },
}));
