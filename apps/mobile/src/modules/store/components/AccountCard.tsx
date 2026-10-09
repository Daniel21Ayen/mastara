// apps/mobile/src/modules/store/components/AccountCard.tsx
import * as Clipboard from 'expo-clipboard';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { useI18n } from '@/core/i18n';
import { theme } from '@/core/theme';
import { AppButton, AppText, Card } from '@/shared/ui';

interface AccountCardProps {
  account: string;
  amount: number;
}

/** Where to send the money, with a Copy button and the exact amount. */
export function AccountCard({ account, amount }: AccountCardProps) {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);

  async function copy() {
    await Clipboard.setStringAsync(account);
    setCopied(true);
  }

  return (
    <Card>
      <AppText variant="caption" muted>
        {t('checkout.send')}
      </AppText>
      <AppText variant="title" color={theme.colors.primary}>
        {t('store.etb', { amount })}
      </AppText>
      <View style={styles.row}>
        <View style={styles.flex}>
          <AppText variant="caption" muted>
            {t('checkout.account')}
          </AppText>
          <AppText bold selectable>
            {account}
          </AppText>
        </View>
        <AppButton label={copied ? t('checkout.copied') : t('checkout.copy')} variant="outline" onPress={() => void copy()} />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md },
  flex: { flex: 1 },
});
