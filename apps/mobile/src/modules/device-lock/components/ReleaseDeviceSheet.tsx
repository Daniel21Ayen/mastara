// apps/mobile/src/modules/device-lock/components/ReleaseDeviceSheet.tsx
import { useState } from 'react';

import { downloadStore } from '@/core/downloads';
import { useI18n } from '@/core/i18n';
import { useSession } from '@/core/session';
import { useTheme } from '@/core/theme';
import { AppButton, AppText, BottomSheet } from '@/shared/ui';

import { deviceApi } from '../api/device.api';

interface ReleaseDeviceSheetProps {
  visible: boolean;
  onClose: () => void;
}

/** "Release Device & Log Out": frees the account for another phone, then logs out. */
export function ReleaseDeviceSheet({ visible, onClose }: ReleaseDeviceSheetProps) {
  const theme = useTheme();
  const { t } = useI18n();
  const { user, signOut } = useSession();
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  async function release() {
    if (!user) return;
    setBusy(true);
    setFailed(false);
    try {
      await deviceApi.releaseDevice(user.id);
      await downloadStore.removeAll(); // downloaded content must not stay on a phone the account has left
      onClose();
      signOut();
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <BottomSheet visible={visible} title={t('profile.release.title')} onClose={onClose}>
      <AppText muted>{t('profile.release.body')}</AppText>
      {failed ? <AppText color={theme.colors.danger}>{t('error.generic')}</AppText> : null}
      <AppButton label={t('profile.release.confirm')} variant="danger" onPress={() => void release()} loading={busy} />
      <AppButton label={t('profile.cancel')} variant="outline" onPress={onClose} />
    </BottomSheet>
  );
}
