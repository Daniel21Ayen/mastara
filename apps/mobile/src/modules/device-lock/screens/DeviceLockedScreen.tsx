// apps/mobile/src/modules/device-lock/screens/DeviceLockedScreen.tsx
import { Alert } from 'react-native';

import { useI18n } from '@/core/i18n';
import { useSession } from '@/core/session';
import { theme } from '@/core/theme';
import { AppButton, AppText, Card, Screen } from '@/shared/ui';

/** Full-screen block: no app content is reachable while the account is bound to another phone. */
export function DeviceLockedScreen() {
  const { t } = useI18n();
  const { signOut } = useSession();

  return (
    <Screen scroll>
      <Card>
        <AppText variant="heading" color={theme.colors.danger} accessibilityRole="header">
          {t('device.locked.title')}
        </AppText>
        <AppText variant="bodyLarge">{t('device.locked.body')}</AppText>
      </Card>
      <AppButton
        label={t('device.locked.contact')}
        onPress={() => Alert.alert(t('device.locked.contact'), t('device.locked.contactInfo'))}
      />
      <AppButton label={t('common.logout')} variant="outline" onPress={signOut} />
    </Screen>
  );
}
