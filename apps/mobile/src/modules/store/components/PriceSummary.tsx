// apps/mobile/src/modules/store/components/PriceSummary.tsx
import type { OrderQuote, QuoteLine } from '@mastara/domain';
import type { TranslationKey } from '@mastara/i18n';
import { View } from 'react-native';

import { useI18n } from '@/core/i18n';
import { createStyles, useTheme } from '@/core/theme';
import { AppText, Card } from '@/shared/ui';

function lineLabel(line: QuoteLine): { key: TranslationKey; params?: Record<string, number> } {
  switch (line.kind) {
    case 'BUNDLE':
      return { key: 'store.line.bundle', params: { count: line.count } };
    case 'EXTRA':
      return { key: 'store.line.extra' };
    case 'SINGLE':
      return { key: 'store.line.single' };
    case 'FULL_STREAM':
      return { key: 'store.line.FULL_STREAM' };
    case 'FULL_BOTH':
      return { key: 'store.line.FULL_BOTH' };
  }
}

/** Itemised price. Display only: the server recalculates and its amount is the one charged. */
export function PriceSummary({ quote }: { quote: OrderQuote }) {
  const theme = useTheme();
  const styles = useStyles();
  const { t } = useI18n();

  return (
    <Card>
      {quote.lines.map((line, index) => {
        const { key, params } = lineLabel(line);
        return (
          <View key={index} style={styles.row}>
            <AppText>{t(key, params)}</AppText>
            <AppText>{t('store.etb', { amount: line.amount })}</AppText>
          </View>
        );
      })}
      <View style={[styles.row, styles.total]}>
        <AppText bold>{t('store.total')}</AppText>
        <AppText bold color={theme.colors.primary}>
          {t('store.etb', { amount: quote.total })}
        </AppText>
      </View>
    </Card>
  );
}

const useStyles = createStyles((theme) => ({
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: theme.spacing.md },
  total: { borderTopWidth: 1, borderTopColor: theme.colors.border, paddingTop: theme.spacing.sm },
}));
