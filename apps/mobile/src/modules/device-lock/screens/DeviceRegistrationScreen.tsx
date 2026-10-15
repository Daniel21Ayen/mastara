// apps/mobile/src/modules/device-lock/screens/DeviceRegistrationScreen.tsx
import { ERROR_CODES } from '@mastara/domain';
import { useState } from 'react';

import { getDeviceId, getDeviceName } from '@/core/device';
import { useI18n } from '@/core/i18n';
import { isApiError } from '@/core/network';
import { useSession } from '@/core/session';
import { useTheme } from '@/core/theme';
import { AppButton, AppText, Card, Screen, ScreenHeader } from '@/shared/ui';

import { deviceApi } from '../api/device.api';

export function DeviceRegistrationScreen() {
  const theme = useTheme();
  const { t } = useI18n();
  const { user, bindDevice, lockDevice } = useSession();
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);

  async function register() {
    if (!user) return;
    setLoading(true);
    setFailed(false);
    try {
      await deviceApi.registerDevice({
        userId: user.id,
        deviceId: await getDeviceId(),
        deviceName: getDeviceName(),
      });
      bindDevice(); // the route guard moves the student to the next step
    } catch (error) {
      if (isApiError(error, ERROR_CODES.DEVICE_MISMATCH_LOCKED)) lockDevice();
      else setFailed(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen scroll>
      <ScreenHeader title={t('device.title')} subtitle={t('device.body')} />
      <Card>
        <AppText bold>{t('device.thisPhone')}</AppText>
        <AppText muted>{getDeviceName()}</AppText>
      </Card>
      <Card>
        <AppText variant="caption" muted>
          {t('device.switchNote')}
        </AppText>
      </Card>
      {failed ? <AppText color={theme.colors.danger}>{t('error.generic')}</AppText> : null}
      <AppButton label={t('device.action')} onPress={register} loading={loading} />
    </Screen>
  );
}
