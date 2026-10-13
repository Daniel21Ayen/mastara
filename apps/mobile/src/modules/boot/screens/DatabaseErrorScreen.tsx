// apps/mobile/src/modules/boot/screens/DatabaseErrorScreen.tsx
import { useState } from 'react';
import { View } from 'react-native';

import { useI18n } from '@/core/i18n';
import { createStyles } from '@/core/theme';
import { AppButton, AppText, BottomSheet, IconTile, Screen } from '@/shared/ui';

interface DatabaseErrorScreenProps {
  onRetry: () => void;
  onReset: () => Promise<void>;
}

/** The phone's data could not be opened. Try again first; erasing is the last resort and asks for confirmation. */
export function DatabaseErrorScreen({ onRetry, onReset }: DatabaseErrorScreenProps) {
  const styles = useStyles();
  const { t } = useI18n();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [erasing, setErasing] = useState(false);

  async function erase() {
    setErasing(true);
    try {
      await onReset();
      setConfirmOpen(false);
    } finally {
      setErasing(false);
    }
  }

  return (
    <Screen>
      <View style={styles.wrap}>
        <IconTile icon="shield" accent="danger" solid size={64} />
        <AppText variant="heading" accessibilityRole="header">
          {t('db.error.title')}
        </AppText>
        <AppText muted>{t('db.error.body')}</AppText>
        <AppButton label={t('db.error.retry')} onPress={onRetry} />
        <AppButton label={t('db.error.reset')} variant="outline" onPress={() => setConfirmOpen(true)} />
      </View>

      <BottomSheet visible={confirmOpen} title={t('db.reset.title')} onClose={() => setConfirmOpen(false)}>
        <AppText muted>{t('db.reset.body')}</AppText>
        <AppButton label={t('db.reset.confirm')} loading={erasing} onPress={() => void erase()} />
        <AppButton label={t('db.reset.cancel')} variant="outline" onPress={() => setConfirmOpen(false)} />
      </BottomSheet>
    </Screen>
  );
}

const useStyles = createStyles((theme) => ({
  wrap: { flex: 1, justifyContent: 'center', gap: theme.spacing.md },
}));
