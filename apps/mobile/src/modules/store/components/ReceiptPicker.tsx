// apps/mobile/src/modules/store/components/ReceiptPicker.tsx
import { Image, View } from 'react-native';

import { useI18n } from '@/core/i18n';
import { createStyles, useTheme } from '@/core/theme';
import { AppButton, AppText } from '@/shared/ui';

import type { Receipt } from '../lib/compressReceipt';

interface ReceiptPickerProps {
  receipt: Receipt | null;
  busy: boolean;
  failed: boolean;
  /** Validation message shown when the student tries to submit without a receipt. */
  error?: string;
  onPick: () => void;
}

export function ReceiptPicker({ receipt, busy, failed, error, onPick }: ReceiptPickerProps) {
  const theme = useTheme();
  const styles = useStyles();
  const { t } = useI18n();

  return (
    <View style={styles.wrap}>
      {receipt ? (
        <View style={styles.preview}>
          <Image source={{ uri: receipt.uri }} style={styles.image} resizeMode="cover" accessibilityLabel={t('checkout.receipt.add')} />
          <AppText variant="caption" muted>
            {t('checkout.receipt.info', { kb: Math.round(receipt.bytes / 1024) })}
          </AppText>
        </View>
      ) : null}

      <AppButton
        label={receipt ? t('checkout.receipt.change') : t('checkout.receipt.add')}
        variant="outline"
        loading={busy}
        onPress={onPick}
      />

      {failed ? <AppText variant="caption" color={theme.colors.danger}>{t('checkout.receipt.failed')}</AppText> : null}
      {error ? <AppText variant="caption" color={theme.colors.danger}>{error}</AppText> : null}
    </View>
  );
}

const useStyles = createStyles((theme) => ({
  wrap: { gap: theme.spacing.sm },
  preview: { gap: theme.spacing.xs },
  image: { width: '100%', height: 160, borderRadius: theme.radius.md, backgroundColor: theme.colors.primarySoft },
}));
